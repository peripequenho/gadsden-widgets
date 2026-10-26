/**
 * Arma el objeto `section` (o `block`) que lee el Liquid de Gadsden, como lo arma Shopify: los ajustes guardados encima
 * de los `default` del {% schema %}, y los bloques del preset si la configuración no trae bloques.
 */
import { Color, imagen } from "./motor.ts";
import { letra } from "./tema.ts";

export type Esquema = {
  settings?: { id?: string; type?: string; default?: unknown }[];
  blocks?: { type: string; settings?: { id?: string; type?: string; default?: unknown }[] }[];
  presets?: { name?: string; settings?: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }[];
};

/** La configuración de un widget: como un pedazo de un template JSON de Shopify. */
/** `clave`: la del template (el id de la sección queda `template--gadsden__<clave>`, como en Shopify). */
export type ConfigSeccion = { type: string; clave?: string; settings?: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] | Record<string, { type: string; settings?: Record<string, unknown> }>; block_order?: string[] };

export function esquemaDe(fuente: string): Esquema {
  const m = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/.exec(fuente);
  return m ? JSON.parse(m[1]!) : {};
}

/** Un valor de ajuste como lo ve Liquid: colores como Color, imágenes como objeto con src, letras como objeto. */
/** Los productos que conoce el widget, por handle: el de la ficha y los que trae el Worker (src/api.ts). */
type Buscar = ((handle: string) => unknown) | undefined;

function valor(tipo: string | undefined, v: unknown, buscar?: Buscar): unknown {
  if (v === undefined || v === null || v === "") return v;
  // Un producto elegido en el editor; si no se conoce, vacío (como un producto que no existe en Shopify).
  if (tipo === "product" && typeof v === "string") return buscar?.(v) ?? null;
  if (tipo === "product_list" && Array.isArray(v)) return v.map((h) => valor("product", h, buscar)).filter(Boolean);
  if (tipo === "collection" && typeof v === "string") return null;
  if (tipo === "color" && typeof v === "string") return Color.de(v) ?? v;
  if (tipo === "image_picker" && typeof v === "string") return imagen(v.startsWith("shopify://") ? "" : v);
  // Con sus medidas (las de la foto subida): reservan el lugar antes de que cargue, como en Shopify.
  if (tipo === "image_picker" && typeof v === "object" && "src" in v) {
    const i = v as { src: string; width?: number; height?: number; alt?: string };
    return imagen(i.src, i.width, i.height, i.alt);
  }
  if (tipo === "font_picker" && typeof v === "string") return letra(v);
  return v;
}

function ajustes(defs: { id?: string; type?: string; default?: unknown }[] = [], guardados: Record<string, unknown> = {}, buscar?: Buscar) {
  const out: Record<string, unknown> = {};
  for (const d of defs) if (d.id) out[d.id] = valor(d.type, d.id in guardados ? guardados[d.id] : d.default, buscar);
  for (const [k, v] of Object.entries(guardados)) if (!(k in out)) out[k] = v;
  return out;
}

const listaDeBloques = (c: ConfigSeccion) => {
  if (Array.isArray(c.blocks)) return c.blocks;
  if (c.blocks && typeof c.blocks === "object") {
    const orden = c.block_order ?? Object.keys(c.blocks);
    return orden.map((k) => (c.blocks as Record<string, { type: string; settings?: Record<string, unknown> }>)[k]!).filter(Boolean);
  }
  return null;
};

/** `estilo`: lo que pone el estilo elegido en la sección (el "oscuro", src/w/oscuro.json), debajo de la configuración. */
export function armarSeccion(id: string, fuente: string, c: ConfigSeccion, conPreset = true, buscar?: Buscar, estilo: Record<string, unknown> = {}) {
  const esq = esquemaDe(fuente);
  const preset = esq.presets?.[0];
  const bloquesCfg = listaDeBloques(c) ?? (conPreset ? preset?.blocks ?? [] : []);
  const blocks = bloquesCfg.map((b, i) => ({
    id: `${b.type}-${i + 1}`, type: b.type, shopify_attributes: "",
    settings: ajustes(esq.blocks?.find((x) => x.type === b.type)?.settings, b.settings ?? {}, buscar),
  }));
  const settings = ajustes(esq.settings, { ...(conPreset && !c.settings ? preset?.settings : {}), ...estilo, ...c.settings }, buscar);
  return { id, settings, blocks, index: 1, location: "template" };
}

/** Un bloque de la ficha (gad-product-block) con los valores de fábrica de su schema (config/bloques.json). */
export function armarBloque(c: { type: string; settings?: Record<string, unknown> }, esquemas: Esquema["blocks"] = [], buscar?: Buscar) {
  return { id: `bloque-${c.type}`, type: c.type, shopify_attributes: "", settings: ajustes(esquemas.find((x) => x.type === c.type)?.settings, c.settings ?? {}, buscar) };
}
