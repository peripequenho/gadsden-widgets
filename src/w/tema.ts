/**
 * Los ajustes del theme que leen los widgets (`settings` en Liquid) y las variables CSS que en Shopify pone
 * layout/theme.liquid: se arman acá con código propio a partir de los ajustes de Gadsden (vendor/gadsden/config).
 *
 * Tres estilos: "tienda" (el que va por defecto: los colores y la letra que carga el comerciante, sobre el preset de
 * fábrica), "clasico" (el preset de fábrica de Gadsden) y "oscuro" (el preset con la paleta oscura y Poppins).
 */
import { Color } from "./motor.ts";

export type Ajustes = Record<string, unknown> & { color_schemes: Record<string, { settings: Record<string, unknown> }> };

/** Las letras de Shopify ("poppins_n7") como objetos con family/weight/style; las que Google Fonts no tiene, a Poppins. */
const LETRAS: Record<string, string> = { poppins: "Poppins", inter: "Inter", harmonia_sans: "Poppins", assistant: "Assistant", montserrat: "Montserrat" };
/** La letra del sistema: la que se usa cuando el comerciante no cargó la de su tienda (no se pide a Google Fonts). */
export const LETRA_SISTEMA = { family: "system-ui", fallback_families: "-apple-system, 'Segoe UI', Roboto, sans-serif", style: "normal", weight: 400, system: true, toString: () => "system-ui" };
export function letra(id: unknown) {
  if (id && typeof id === "object" && "family" in id) return id as typeof LETRA_SISTEMA;
  const [, nombre = "poppins", estilo = "n", peso = "4"] = /^([a-z_]+?)_([ni])(\d)$/.exec(String(id ?? "")) ?? [];
  const family = LETRAS[nombre] ?? nombre.split("_").map((p) => p[0]!.toUpperCase() + p.slice(1)).join(" ");
  return { family, fallback_families: "sans-serif", style: estilo === "i" ? "italic" : "normal", weight: Number(peso) * 100, system: false, toString: () => family };
}

/** Los colores y la letra de la tienda, que carga el comerciante en la configuración (estilo "tienda"). */
export type Tema = { fondo?: string; texto?: string; boton?: string; botonTexto?: string; letra?: string; letraTitulos?: string; pesoTitulos?: number };

const hex = (c: Color) => c.toString();
/** Mezcla dos colores: p = cuánto del segundo (0 a 1). */
const mezcla = (a: Color, b: Color, p: number) => hex(new Color(a.red + (b.red - a.red) * p, a.green + (b.green - a.green) * p, a.blue + (b.blue - a.blue) * p));
/** Una letra por su nombre de Google Fonts ("Montserrat"), con su peso; sin nombre, la del sistema. */
const letraDeTienda = (nombre: string | undefined, peso: number) => (nombre ? { ...LETRA_SISTEMA, family: nombre, fallback_families: "sans-serif", weight: peso, system: false, toString: () => nombre } : { ...LETRA_SISTEMA, weight: peso });

/**
 * Los ajustes del estilo "tienda": el preset de fábrica con las seis combinaciones de color armadas con los colores del
 * comerciante (las mismas mezclas que tiene el preset: sin colores cargados queda igual, blanco y #121212) y su letra.
 */
export function ajustesTienda(clasico: Record<string, unknown>, tema: Tema = {}): Record<string, unknown> {
  const F = Color.de(tema.fondo) ?? new Color(255, 255, 255), T = Color.de(tema.texto) ?? new Color(18, 18, 18);
  const B = Color.de(tema.boton) ?? T, BT = Color.de(tema.botonTexto) ?? F;
  const esq = (bg: string, texto: Color, boton: Color, etiqueta: string) => ({ settings: { background: bg, background_gradient: "", text: hex(texto), accent: hex(boton), button: hex(boton), button_label: etiqueta, secondary_button_label: hex(texto), shadow: hex(T) } });
  const claro = (p: number) => { const bg = mezcla(F, T, p); return esq(bg, T, B, p ? bg : hex(BT)); };
  const oscuro = (p: number) => { const bg = mezcla(T, F, p); return esq(bg, F, F, bg); };
  return {
    ...clasico,
    color_schemes: { "scheme-1": claro(0), "scheme-2": claro(0.05), "scheme-3": oscuro(0.07), "scheme-4": oscuro(0), "scheme-5": oscuro(0.15), "scheme-6": claro(0.07) },
    type_body_font: letraDeTienda(tema.letra, 400),
    type_header_font: letraDeTienda(tema.letraTitulos ?? tema.letra, tema.pesoTitulos ?? 700),
  };
}

/** Los ajustes listos para Liquid: los colores de las combinaciones como objetos Color, las letras como objetos. */
export function ajustesLiquid(base: Record<string, unknown>, propios: Record<string, unknown>): Ajustes {
  const a = { ...base, ...propios } as Ajustes;
  const esquemas: Ajustes["color_schemes"] = {};
  for (const [id, sc] of Object.entries(a.color_schemes ?? {})) {
    const s: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(sc.settings)) s[k] = Color.de(v) ?? v;
    esquemas[id] = { settings: s, id } as never;
  }
  a.color_schemes = esquemas;
  a.type_body_font = letra(a.type_body_font);
  a.type_header_font = letra(a.type_header_font);
  return a;
}

const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const rgb = (c: unknown, d = "18,18,18") => { const x = Color.de(c); return x ? `${x.red},${x.green},${x.blue}` : d; };

/** El CSS de las combinaciones de color: las mismas variables que define el theme (las lee todo gadsden.css). */
function cssEsquemas(a: Ajustes) {
  return Object.entries(a.color_schemes).map(([id, { settings: s }], i) => {
    const bg = Color.de(s.background) ?? new Color(255, 255, 255);
    const contraste = bg.brillo <= 26 ? bg.luz(50) : bg.brillo <= 65 ? bg.luz(5) : bg.luz(-25);
    const acento = s.accent || s.button;
    // Propia (no la define el theme): el fondo con un 5 % del texto, para las franjas suaves de las secciones configurables.
    const fg = Color.de(s.text) ?? new Color(18, 18, 18);
    const suave = new Color(...[[bg.red, fg.red], [bg.green, fg.green], [bg.blue, fg.blue]].map(([a, b]) => Math.round(a! + (b! - a!) * 0.05)) as [number, number, number]);
    return `${i === 0 ? ":root, " : ""}.color-${id} {
  --color-background: ${rgb(bg)}; --gradient-background: ${String(s.background_gradient || bg)};
  --color-foreground: ${rgb(s.text)}; --color-accent: ${rgb(acento)}; --color-background-contrast: ${rgb(contraste)}; --color-background-suave: ${rgb(suave)};
  --color-shadow: ${rgb(s.shadow)}; --color-button: ${rgb(s.button)}; --color-button-text: ${rgb(s.button_label)};
  --color-secondary-button: ${rgb(bg)}; --color-secondary-button-text: ${rgb(s.secondary_button_label)}; --color-link: ${rgb(s.secondary_button_label)};
  --color-badge-foreground: ${rgb(s.text)}; --color-badge-background: ${rgb(bg)}; --color-badge-border: ${rgb(s.text)};
  --payment-terms-background-color: rgb(${rgb(bg)});
}
body.color-${id}, .color-${id} { color: rgba(var(--color-foreground), 0.75); background-color: rgb(var(--color-background)); }`;
  }).join("\n");
}

/** Las variables globales (letras, radios, sombras, espaciados, reveal y carrusel de Gadsden). */
export function cssTema(a: Ajustes) {
  const cuerpo = a.type_body_font as ReturnType<typeof letra>, titulo = a.type_header_font as ReturnType<typeof letra>;
  const v: Record<string, string | number> = {
    "font-body-family": `${cuerpo.family}, ${cuerpo.fallback_families}`, "font-body-style": cuerpo.style, "font-body-weight": cuerpo.weight,
    "font-body-weight-bold": Math.min(cuerpo.weight + 300, 1000),
    "font-heading-family": `${titulo.family}, ${titulo.fallback_families}`, "font-heading-style": titulo.style, "font-heading-weight": titulo.weight,
    "font-body-scale": n(a.body_scale, 100) / 100, "font-heading-scale": n(a.heading_scale, 100) / n(a.body_scale, 100),
    "media-radius": `${n(a.media_radius)}px`, "media-padding": `${n(a.media_padding)}px`,
    "page-width": `${n(a.page_width, 1200) / 10}rem`, "page-width-margin": "0rem",
    "product-card-corner-radius": `${n(a.card_corner_radius) / 10}rem`, "badge-corner-radius": `${n(a.badge_corner_radius) / 10}rem`,
    "popup-corner-radius": `${n(a.popup_corner_radius)}px`, "popup-border-width": `${n(a.popup_border_thickness)}px`,
    "popup-border-opacity": n(a.popup_border_opacity) / 100, "popup-shadow-opacity": n(a.popup_shadow_opacity) / 100,
    "popup-shadow-horizontal-offset": `${n(a.popup_shadow_horizontal_offset)}px`, "popup-shadow-vertical-offset": `${n(a.popup_shadow_vertical_offset)}px`,
    "popup-shadow-blur-radius": `${n(a.popup_shadow_blur)}px`,
    "spacing-sections-desktop": `${n(a.spacing_sections)}px`, "spacing-sections-mobile": `${n(a.spacing_sections) < 24 ? n(a.spacing_sections) : Math.round(n(a.spacing_sections) * 0.7)}px`,
    "grid-desktop-vertical-spacing": `${n(a.spacing_grid_vertical, 8)}px`, "grid-desktop-horizontal-spacing": `${n(a.spacing_grid_horizontal, 8)}px`,
    "grid-mobile-vertical-spacing": `${n(a.spacing_grid_vertical, 8) / 2}px`, "grid-mobile-horizontal-spacing": `${n(a.spacing_grid_horizontal, 8) / 2}px`,
    "text-boxes-radius": `${n(a.text_boxes_radius)}px`, "text-boxes-border-width": `${n(a.text_boxes_border_thickness)}px`,
    "text-boxes-border-opacity": n(a.text_boxes_border_opacity) / 100, "text-boxes-shadow-opacity": n(a.text_boxes_shadow_opacity) / 100,
    "text-boxes-shadow-horizontal-offset": `${n(a.text_boxes_shadow_horizontal_offset)}px`, "text-boxes-shadow-vertical-offset": `${n(a.text_boxes_shadow_vertical_offset)}px`,
    "text-boxes-shadow-blur-radius": `${n(a.text_boxes_shadow_blur)}px`,
    "buttons-radius": `${n(a.buttons_radius)}px`,
    "buttons-border-offset": `${n(a.buttons_radius) > 0 || n(a.buttons_shadow_opacity) > 0 ? 0.3 : 0}px`,
    "buttons-radius-outset": `${n(a.buttons_radius) > 0 ? n(a.buttons_radius) + n(a.buttons_border_thickness) : 0}px`,
    "buttons-border-width": `${n(a.buttons_border_opacity) > 0 ? n(a.buttons_border_thickness) : 0}px`,
    "buttons-border-opacity": n(a.buttons_border_opacity) / 100, "buttons-shadow-opacity": n(a.buttons_shadow_opacity) / 100,
    "buttons-shadow-horizontal-offset": `${n(a.buttons_shadow_horizontal_offset)}px`, "buttons-shadow-vertical-offset": `${n(a.buttons_shadow_vertical_offset)}px`,
    "buttons-shadow-blur-radius": `${n(a.buttons_shadow_blur)}px`,
    "inputs-shadow-opacity": n(a.inputs_shadow_opacity) / 100, "inputs-shadow-horizontal-offset": `${n(a.inputs_shadow_horizontal_offset)}px`,
    "inputs-shadow-vertical-offset": `${n(a.inputs_shadow_vertical_offset)}px`, "inputs-shadow-blur-radius": `${n(a.inputs_shadow_blur)}px`,
    "inputs-radius": `${n(a.inputs_radius)}px`, "inputs-border-width": `${n(a.inputs_border_thickness)}px`,
    "inputs-border-opacity": n(a.inputs_border_opacity) / 100, "inputs-radius-outset": `${n(a.inputs_radius) > 0 ? n(a.inputs_radius) + n(a.inputs_border_thickness) : 0}px`,
    "variant-pills-radius": `${n(a.variant_pills_radius)}px`, "variant-pills-border-width": `${n(a.variant_pills_border_thickness)}px`,
    "variant-pills-border-opacity": n(a.variant_pills_border_opacity) / 100,
    "duration-short": "100ms", "duration-default": "200ms", "duration-medium": "300ms", "duration-long": "500ms",
    "duration-extra-long": "600ms", "ease-out-slow": "cubic-bezier(0, 0, 0.3, 1)",
    "gad-reveal-duration": `${n(a.reveal_duration, 650)}ms`, "gad-reveal-delay": `${n(a.reveal_delay)}ms`, "gad-reveal-stagger": `${n(a.reveal_stagger)}ms`,
    "gad-reveal-opacity": Math.max(n(a.reveal_opacity) / 100, 0.01), "gad-reveal-x": `${n(a.reveal_x)}%`, "gad-reveal-y": `${n(a.reveal_y)}%`,
    "gad-reveal-scale": n(a.reveal_zoom, 100) / 100,
    "gad-arrow-size": `${n(a.carousel_arrow_size, 40)}px`, "gad-arrow-radius": `${n(a.carousel_arrow_radius, 100) / 2}%`, "gad-arrow-icon": `${n(a.carousel_arrow_icon, 50)}%`,
    "gad-dot-w": `${n(a.carousel_dot_width, 8)}px`, "gad-dot-h": `${n(a.carousel_dot_height, 8)}px`, "gad-dot-scale": n(a.carousel_dot_active_scale, 130) / 100,
    "gad-dot-gap": `${n(a.carousel_dot_gap, 8)}px`, "gad-dot-radius": `${n(a.carousel_dot_radius, 8)}px`,
  };
  const raiz = `:root {\n${Object.entries(v).map(([k, x]) => `  --${k}: ${x};`).join("\n")}\n}`;
  return `${raiz}\n${cssEsquemas(a)}`;
}

/** Los atributos del <html> que leen gadsden.js y gadsden.css (estilo base, carrusel, íconos, movimiento). */
export function atributosHtml(a: Ajustes, reducir: boolean) {
  return {
    clases: [a.animations_reveal_on_scroll && (!reducir || a.motion_ignore_reduce) ? "gad-motion" : "", reducir && !a.motion_ignore_reduce ? "gad-reduce" : ""].filter(Boolean),
    datos: {
      gadStyle: String(a.base_style ?? "clasico"), gadBp: String(a.carousel_breakpoint ?? "750"),
      gadBare: String(a.carousel_arrow_bare_color ?? "text"), gadIcons: String(a.icon_weight ?? "normal"),
      ...(a.reveal_repeat ? { gadRevealRepeat: "true" } : {}),
    },
  };
}

/**
 * Las letras a cargar de Google Fonts: sólo las caras que pone theme.liquid (la del cuerpo, su negrita 700, las dos
 * itálicas y la de los títulos). Un `font-weight: 600` cae, como en la tienda, en la cara de 700.
 */
export function urlLetras(a: Ajustes) {
  const cuerpo = a.type_body_font as ReturnType<typeof letra>, titulo = a.type_header_font as ReturnType<typeof letra>;
  const caras = new Map<string, Set<string>>();
  const sumar = (f: string, ital: number, peso: number) => (caras.get(f) ?? caras.set(f, new Set()).get(f)!).add(`${ital},${peso}`);
  // La del sistema no se pide.
  if (!cuerpo.system) for (const ital of [0, 1]) for (const peso of [cuerpo.weight, 700]) sumar(cuerpo.family, ital, peso);
  if (!titulo.system) sumar(titulo.family, titulo.style === "italic" ? 1 : 0, titulo.weight);
  return caras.size ? urlCaras(caras) : "";
}

/** La URL de Google Fonts para unas caras: familia → {"ital,peso"}. */
export function urlCaras(caras: Map<string, Set<string>>) {
  const lista = (xs: Set<string>) => [...xs].sort((x, y) => x.split(",").reduce((d, v, i) => d || Number(v) - Number(y.split(",")[i]), 0)).join(";");
  return `https://fonts.googleapis.com/css2?${[...caras].map(([f, xs]) => `family=${f.replace(/ /g, "+")}:ital,wght@${lista(xs)}`).join("&")}&display=swap`;
}
