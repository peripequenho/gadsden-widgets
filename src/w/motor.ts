/**
 * El motor que dibuja los widgets de Gadsden con su Liquid original (vendor/gadsden: secciones y snippets gad-*), con
 * LiquidJS y los filtros y tags de Shopify que usan. Anda igual en el navegador (el iframe) y en Node (los tests).
 *
 * Lo que es de Shopify y no de Gadsden se resuelve acá con código propio: los colores de los ajustes como objetos con
 * .red/.green/.blue, `money`, `image_url`/`image_tag`, `placeholder_svg_tag` (un recuadro gris, no los dibujos de
 * Shopify), `inline_asset_content` (íconos propios), y los tags `schema`, `stylesheet`, `javascript`, `style` y `form`.
 */
import { Liquid, Tag, TagToken, type Context, type Emitter, type TopLevelToken, type Template } from "liquidjs";

type TagImplOptions = Parameters<Liquid["registerTag"]>[1];

export type Fuentes = {
  secciones: Record<string, string>;
  snippets: Record<string, string>;
  /** Las traducciones: las de Gadsden (es.json) y las cadenas de Dawn que usan los widgets, escritas de nuevo. */
  textos: Record<string, unknown>;
};

export type Moneda = { simbolo: string; codigo: string };

/* ---------- Colores ---------- */

/** Un color de los ajustes, como en Shopify: se imprime en hex y tiene .red/.green/.blue/.alpha/.rgb. */
export class Color {
  red: number; green: number; blue: number; alpha: number;
  constructor(red: number, green: number, blue: number, alpha = 1) { this.red = red; this.green = green; this.blue = blue; this.alpha = alpha; }
  static de(v: unknown): Color | null {
    if (v instanceof Color) return v;
    if (typeof v !== "string") return null;
    const s = v.trim();
    let m = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (m) {
      let h = m[1]!;
      if (h.length <= 4) h = [...h].map((c) => c + c).join("");
      const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
      return new Color(n(0), n(2), n(4), h.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1);
    }
    m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(s);
    if (m) return new Color(+m[1]!, +m[2]!, +m[3]!, m[4] === undefined ? 1 : +m[4]);
    return null;
  }
  get rgb() { return `${this.red} ${this.green} ${this.blue}`; }
  get brillo() { return (this.red * 299 + this.green * 587 + this.blue * 114) / 1000; }
  toString() {
    const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return this.alpha < 1 ? `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})` : `#${h(this.red)}${h(this.green)}${h(this.blue)}`;
  }
  /** Para comparar con `==` y `blank` en Liquid. */
  valueOf() { return this.toString(); }
  /** Aclara u oscurece en HSL, como color_lighten / color_darken de Shopify. */
  luz(delta: number) {
    const [r, g, b] = [this.red / 255, this.green / 255, this.blue / 255];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    const l2 = Math.max(0, Math.min(1, l + delta / 100));
    const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s, p = 2 * l2 - q;
    const t = (x: number) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    return s === 0 ? new Color(l2 * 255, l2 * 255, l2 * 255, this.alpha) : new Color(t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255, this.alpha);
  }
}

/** Una imagen de los ajustes: se imprime como su URL. */
export type Imagen = { src: string; width: number; height: number; alt: string; aspect_ratio: number; toString(): string };
export const imagen = (src: string, width = 1200, height = 1200, alt = ""): Imagen => ({ src, width, height, alt, aspect_ratio: width / height, toString: () => src });

const srcDe = (v: unknown): string => (v && typeof v === "object" && "src" in v ? String((v as { src: unknown }).src) : String(v ?? ""));
const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Los argumentos con nombre de un filtro (LiquidJS los pasa como pares [clave, valor]). */
const conNombre = (args: unknown[]) => Object.fromEntries(args.filter((a): a is [string, unknown] => Array.isArray(a) && a.length === 2) as [string, unknown][]);

/* ---------- Íconos que en Shopify son assets de Dawn (dibujados de nuevo) ---------- */

// Con la clase y la proporción de cada ícono del theme, que es lo que su CSS mide (`summary .icon-caret`, `.icon-arrow`).
const svg = (clase: string, d: string, caja = "0 0 20 20", ancho = 1.6) => `<svg aria-hidden="true" focusable="false" class="icon ${clase}" viewBox="${caja}" fill="none"><path d="${d}" stroke="currentColor" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONOS: Record<string, string> = {
  "icon-caret.svg": svg("icon-caret", "M1 1l4 4 4-4", "0 0 10 6", 1),
  "icon-arrow.svg": svg("icon-arrow", "M1 5h12M9 1l4 4-4 4", "0 0 14 10", 1.2),
  "icon-close.svg": svg("icon-close", "M5 5l10 10M15 5L5 15"),
  "icon-success.svg": svg("icon-success", "M4 10.5l4 4 8-9"),
  "icon-error.svg": svg("icon-error", "M10 6v5M10 14h.01M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"),
  "icon-discount.svg": svg("icon-discount", "M3 10V3h7l7 7-7 7-7-7zM7 7h.01"),
};
// El relleno sin foto: dibujo propio (el de Shopify no se puede copiar), del mismo tamaño y en el mismo lugar, sin fondo
// ni colores propios: los pone el CSS (`fill` y `background` de .placeholder-svg), como en la tienda.
const PLACEHOLDER = (clase = "") => `<svg class="placeholder-svg ${clase}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525.5 525.5"><path fill-rule="evenodd" d="M200 212.7h127.4v98.1H200zM204 216.7v90.1h119.4v-90.1z"/><path d="M212 300l30-38 22 26 16-18 33 30z"/><circle cx="232" cy="238" r="8"/></svg>`;

/* ---------- Tags ---------- */

/** Junta el texto crudo hasta el tag de cierre (schema, stylesheet, javascript, doc). */
function crudo(nombre: string, token: TagToken, resto: TopLevelToken[]) {
  let texto = "";
  while (resto.length) {
    const t = resto.shift()!;
    if (t instanceof TagToken && t.name === `end${nombre}`) return texto;
    texto += t.getText();
  }
  throw new Error(`{% ${nombre} %} sin cerrar (${token.getText()})`);
}

/** Un tag de bloque que dibuja lo de adentro, envuelto (style, form). */
function envolvente(nombre: string, abrir: (args: string) => string, cerrar: string): TagImplOptions {
  return class extends Tag {
    templates: Template[] = [];
    args: string;
    constructor(token: TagToken, resto: TopLevelToken[], liquid: Liquid) {
      super(token, resto, liquid);
      this.args = token.args;
      const stream = liquid.parser.parseStream(resto)
        .on(`tag:end${nombre}`, () => stream.stop())
        .on("template", (tpl: Template) => this.templates.push(tpl))
        .on("end", () => { throw new Error(`{% ${nombre} %} sin cerrar`); });
      stream.start();
    }
    *render(ctx: Context, emitter: Emitter): Generator<unknown, void, unknown> {
      emitter.write(abrir(this.args));
      yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
      emitter.write(cerrar);
    }
  } as unknown as TagImplOptions;
}

/* ---------- El motor ---------- */

/** `letras`: las caras que pidió font_face, como "Familia|ital,peso". */
export type Salida = { html: string; css: string[]; js: string[]; letras: string[] };

export function crearMotor(fuentes: Fuentes, moneda: Moneda, baseAssets: string, assetsTienda = baseAssets) {
  const css = new Map<string, string>();
  const js = new Map<string, string>();
  const letras = new Set<string>();
  let archivo = "";

  const liquid = new Liquid({
    relativeReference: false,
    extname: ".liquid",
    jsTruthy: false,
    strictFilters: false,
    strictVariables: false,
    ownPropertyOnly: false,
    // Una variable suelta `size`, `first` o `last` sin definir: en LiquidJS lee la cantidad de claves del alcance (un
    // `{% if size != blank %}` da verdadero); en Shopify es nil.
    globals: { size: undefined, first: undefined, last: undefined },
    fs: {
      readFileSync: (f: string) => fuentes.snippets[nombreDe(f)] ?? "",
      readFile: async (f: string) => fuentes.snippets[nombreDe(f)] ?? "",
      existsSync: (f: string) => nombreDe(f) in fuentes.snippets,
      exists: async (f: string) => nombreDe(f) in fuentes.snippets,
      resolve: (_root: string, f: string, ext: string) => (f.endsWith(ext) ? f : f + ext),
      contains: async () => true,
      sep: "/",
    },
  });
  function nombreDe(f: string) { return f.replace(/^.*[\\/]/, "").replace(/\.liquid$/, ""); }

  liquid.registerTag("schema", class extends Tag { constructor(t: TagToken, r: TopLevelToken[], l: Liquid) { super(t, r, l); crudo("schema", t, r); } render() {} } as unknown as TagImplOptions);
  liquid.registerTag("doc", class extends Tag { constructor(t: TagToken, r: TopLevelToken[], l: Liquid) { super(t, r, l); crudo("doc", t, r); } render() {} } as unknown as TagImplOptions);
  liquid.registerTag("stylesheet", class extends Tag { constructor(t: TagToken, r: TopLevelToken[], l: Liquid) { super(t, r, l); const c = crudo("stylesheet", t, r); css.set(c, c); } render() {} } as unknown as TagImplOptions);
  liquid.registerTag("javascript", class extends Tag { constructor(t: TagToken, r: TopLevelToken[], l: Liquid) { super(t, r, l); const c = crudo("javascript", t, r); js.set(c, c); } render() {} } as unknown as TagImplOptions);
  liquid.registerTag("style", envolvente("style", () => "<style>", "</style>"));
  liquid.registerTag("form", envolvente("form", (args) => {
    const attrs = Object.fromEntries([...args.matchAll(/(\w+):\s*'([^']*)'/g)].map((m) => [m[1]!, m[2]!]));
    const tipo = /^\s*'([^']+)'/.exec(args)?.[1] ?? "";
    return `<form method="post" action="${tipo === "product" ? "/cart/add" : "#"}" accept-charset="UTF-8"${Object.entries(attrs).map(([k, v]) => ` ${k}="${escapar(v)}"`).join("")}>`;
  }, "</form>"));

  /* Filtros de Shopify */
  const textos = fuentes.textos;
  liquid.registerFilter("t", (clave: string, ...args: unknown[]) => {
    let v: unknown = textos;
    for (const p of String(clave).split(".")) v = v && typeof v === "object" ? (v as Record<string, unknown>)[p] : undefined;
    const ps = conNombre(args);
    if (v && typeof v === "object") v = Number(ps.count) === 1 ? (v as { one?: string }).one : (v as { other?: string }).other;
    if (typeof v !== "string") return clave;
    return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(ps[k] ?? ""));
  });
  const plata = (centavos: unknown) => {
    const n = Number(centavos ?? 0) / 100;
    return moneda.simbolo + new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };
  liquid.registerFilter("money", plata);
  liquid.registerFilter("money_with_currency", (c: unknown) => `${plata(c)} ${moneda.codigo}`);
  liquid.registerFilter("money_without_currency", (c: unknown) => plata(c).replace(moneda.simbolo, ""));
  liquid.registerFilter("money_without_trailing_zeros", (c: unknown) => plata(c).replace(/,00$/, ""));
  liquid.registerFilter("unit_price_with_measurement", () => "");
  // Como en Shopify, la URL que devuelve image_url recuerda las medidas de la imagen y el ancho pedido: image_tag las
  // escribe (width/height), y eso reserva el lugar antes de que la foto cargue.
  liquid.registerFilter("image_url", (v: unknown, ...args: unknown[]) => {
    const src = srcDe(v), o = v as { width?: number; height?: number } | null;
    if (!o || typeof o !== "object" || !o.width || !o.height) return src;
    const pedido = Number(conNombre(args).width) || o.width;
    return { src, width: o.width, height: o.height, pedido, toString: () => src };
  });
  liquid.registerFilter("img_url", (v: unknown) => srcDe(v));
  // Los metacampos de Tiendanube no tienen tipo: van como texto de varias líneas (el tipo más común en Shopify), con los saltos
  // de línea como <br />.
  liquid.registerFilter("metafield_tag", (v: unknown) => {
    const t = String((v as { value?: unknown } | null)?.value ?? v ?? "");
    return t ? `<span class="metafield-multi_line_text_field">${escapar(t).replace(/\r?\n/g, "<br />")}</span>` : "";
  });
  liquid.registerFilter("image_tag", (url: unknown, ...args: unknown[]) => {
    const ps = conNombre(args), u = url as { width?: number; height?: number; pedido?: number } | null;
    if (u && typeof u === "object" && u.width && u.height && !("width" in ps) && !("height" in ps)) {
      const w = Math.min(u.pedido ?? u.width, u.width);
      Object.assign(ps, { width: w, height: Math.round((w * u.height) / u.width) });
    }
    const attrs = Object.entries(ps).filter(([k]) => !["widths", "preload"].includes(k)).map(([k, v]) => ` ${k}="${escapar(String(v ?? ""))}"`).join("");
    return `<img src="${escapar(srcDe(url))}"${"alt" in ps ? "" : ' alt=""'}${attrs}>`;
  });
  liquid.registerFilter("video_tag", (v: unknown, ...args: unknown[]) => {
    const ps = conNombre(args);
    // Como el de Shopify: siempre playsinline, y el póster también como <img> de respaldo adentro.
    const o = (v && typeof v === "object" ? v : {}) as { sources?: { url: string; mime_type?: string }[]; preview_image?: unknown; poster?: string };
    const fuentesVideo = o.sources ?? [{ url: srcDe(v) }];
    const poster = o.poster ?? (o.preview_image ? srcDe(o.preview_image) : "");
    const atributos = ["playsinline", ...["autoplay", "loop", "muted", "controls"].filter((k) => ps[k])].map((k) => `${k}="${k}"`).join(" ");
    return `<video ${atributos} preload="${escapar(String(ps.preload ?? "metadata"))}"${poster ? ` poster="${escapar(poster)}"` : ""}>`
      + fuentesVideo.map((s) => `<source src="${escapar(s.url)}" type="${escapar(s.mime_type ?? "video/mp4")}">`).join("")
      + (poster ? `<img src="${escapar(poster)}">` : "") + "</video>";
  });
  liquid.registerFilter("placeholder_svg_tag", (_n: unknown, clase?: unknown) => PLACEHOLDER(String(clase ?? "")));
  liquid.registerFilter("asset_url", (n: unknown) => `${/\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(String(n)) ? assetsTienda : baseAssets}${String(n)}`);
  liquid.registerFilter("inline_asset_content", (n: unknown) => ICONOS[String(n)] ?? "");
  liquid.registerFilter("stylesheet_tag", (u: unknown) => `<link rel="stylesheet" href="${escapar(String(u))}">`);
  // font_face no escribe el @font-face (los archivos de Shopify no se pueden usar acá): anota la cara, y la página la
  // pide a Google Fonts.
  liquid.registerFilter("font_face", (f: unknown) => {
    const l = f as { family?: string; style?: string; weight?: number } | null;
    if (l?.family) letras.add(`${l.family}|${l.style === "italic" ? 1 : 0},${l.weight ?? 400}`);
    return "";
  });
  liquid.registerFilter("font_modify", (f: unknown, prop: unknown, v: unknown) => {
    const l = f as { family?: string; style?: string; weight?: number } | null;
    if (!l?.family) return f;
    const w = Number(l.weight) || 400, x = String(v);
    const n = { ...l, toString: () => String(l.family) };
    if (prop === "style") n.style = x;
    else if (prop === "weight") n.weight = x === "bold" ? 700 : x === "normal" ? 400 : x === "bolder" ? Math.min(900, w + 100) : x === "lighter" ? Math.max(100, w - 100) : /^[+-]\d+$/.test(x) ? w + Number(x) : Number(x) || w;
    return n;
  });
  liquid.registerFilter("font_url", () => "");
  liquid.registerFilter("handleize", (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  liquid.registerFilter("handle", (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  liquid.registerFilter("color_brightness", (c: unknown) => Color.de(c)?.brillo ?? 0);
  liquid.registerFilter("color_lighten", (c: unknown, p: unknown) => Color.de(c)?.luz(Number(p)) ?? c);
  liquid.registerFilter("color_darken", (c: unknown, p: unknown) => Color.de(c)?.luz(-Number(p)) ?? c);
  liquid.registerFilter("color_modify", (c: unknown, prop: unknown, v: unknown) => {
    const col = Color.de(c);
    if (!col) return c;
    const n = new Color(col.red, col.green, col.blue, col.alpha);
    if (prop === "alpha") n.alpha = Number(v);
    else if (prop === "red" || prop === "green" || prop === "blue") n[prop] = Number(v);
    return n;
  });
  liquid.registerFilter("color_to_rgb", (c: unknown) => { const x = Color.de(c); return x ? `rgb(${x.red}, ${x.green}, ${x.blue})` : c; });
  liquid.registerFilter("color_extract", (c: unknown, p: unknown) => (Color.de(c) as unknown as Record<string, unknown>)?.[String(p)] ?? "");
  liquid.registerFilter("structured_data", () => "");

  /** Dibuja un archivo (sección o snippet) con su contexto; devuelve el HTML y el CSS/JS que juntaron los tags. */
  async function dibujar(nombre: string, fuente: string, contexto: Record<string, unknown>): Promise<Salida> {
    archivo = nombre;
    // Como en Shopify, los objetos globales (shop, settings, request, product...) se ven también desde los {% render %};
    // section y block, no.
    const { section: _s, block: _b, ...globales } = contexto;
    const html = await liquid.parseAndRender(fuente, contexto, { globals: { ...liquid.options.globals, ...globales } });
    return { html, css: [...css.values()], js: [...js.values()], letras: [...letras] };
  }
  return { liquid, dibujar };
}
