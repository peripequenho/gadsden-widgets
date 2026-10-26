/**
 * Los estilos de los widgets: variables CSS (`--g-*`) que se ponen en la raíz de cada lugar y que leen todas las piezas
 * (src/ui.ts y los widgets). Tres juegos:
 *
 * - **tienda** (el que va por defecto): hereda los colores y la letra del theme de la tienda (Ipanema: `--main-foreground`,
 *   `--main-background`, `--heading-font`, `--body-font`), con neutros donde el original tiene colores propios.
 * - **clasico**: el preset de fábrica de Gadsden (texto #121212, fondo blanco, gris #F3F3F3, Poppins e Inter).
 * - **oscuro**: un preset opcional, medido del original con getComputedStyle el 22-oct: Poppins (títulos 700), texto
 *   #1B1B1B (cuerpo al 75 %), fondo #F5F7FA, botón azul #0B1F3A con letra #F3F1EC y radio 8 px, el esquema 2 beige
 *   #C8B89A, y los colores propios de los widgets de garantía, objeciones y llamado final.
 */
export type Estilo = "tienda" | "clasico" | "oscuro";

const FG_T = "var(--main-foreground, #121212)";
const BG_T = "var(--main-background, #FFFFFF)";
const mixT = (pct: number) => `color-mix(in srgb, ${FG_T} ${pct}%, ${BG_T})`;

const VARIABLES: Record<Estilo, Record<string, string>> = {
  oscuro: {
    texto: "#1B1B1B", cuerpo: "rgba(27, 27, 27, 0.75)", fondo: "#F5F7FA", tarjeta: "#F5F7FA", gris: "#C8B89A", acento: "#0B1F3A",
    boton: "#0B1F3A", "boton-texto": "#F3F1EC", "boton-sec": "#2E7D32", "boton-radio": "8px", "boton-ls": "1px",
    insignia: "#1E3A5F", "insignia-texto": "#F3F1EC", destacada: "#1B1B1B", "destacada-texto": "#F5F7FA",
    fuente: "Poppins, sans-serif", titulos: "Poppins, sans-serif", "peso-titulos": "700",
    tam: "15px", "tam-d": "16px", lh: "1.8", ls: "0.6px", "titulo-m": "30px", "titulo-d": "40px", "titulo-ls": "0.6px",
    "gar-fondo": "#F5F7FA", "gar-tinta": "#0B0B0B", "gar-menta": "#9FE1CB", "gar-texto": "#3D3C39", "gar-titulo": "#1B1B1B",
    "obj-fondo": "#D6CDB6", "obj-papel": "#E6DFCE", "obj-tinta": "#141210", "obj-resalte": "#93D920", "obj-resalte-texto": "#141210",
    "obj-impacto": "'Archivo Black', 'Arial Black', Haettenschweiler, Impact, sans-serif", "obj-letra": "'Barlow Semi Condensed', 'Barlow', 'Segoe UI Semibold', Arial, sans-serif",
    "cta-fondo": "#FFFFFF", "cta-tarjeta": "#0B1F3A", "cta-texto": "#FFFFFF", "cta-sub": "#C9E0CF", "cta-boton-texto": "#2E7D32", "cta-brillo": "rgba(46, 125, 50, 0.5)",
    "ad-marco": "#E4E3DE",
  },
  clasico: {
    texto: "#121212", cuerpo: "rgba(18, 18, 18, 0.75)", fondo: "#FFFFFF", tarjeta: "#FFFFFF", gris: "#F3F3F3", acento: "#121212",
    boton: "#121212", "boton-texto": "#FFFFFF", "boton-sec": "#121212", "boton-radio": "6px", "boton-ls": "1px",
    insignia: "#3A3A3A", "insignia-texto": "#FFFFFF", destacada: "#242424", "destacada-texto": "#FFFFFF",
    fuente: "Inter, sans-serif", titulos: "Poppins, sans-serif", "peso-titulos": "400",
    tam: "15.75px", "tam-d": "16.8px", lh: "1.8", ls: "0.63px", "titulo-m": "33px", "titulo-d": "44px", "titulo-ls": "0.66px",
    "gar-fondo": "#F5F5F5", "gar-tinta": "#121212", "gar-menta": "#FFFFFF", "gar-texto": "rgba(18, 18, 18, 0.8)", "gar-titulo": "#121212",
    "obj-fondo": "#EBEBEB", "obj-papel": "#FFFFFF", "obj-tinta": "#121212", "obj-resalte": "#DCDCDC", "obj-resalte-texto": "#121212",
    "obj-impacto": "Poppins, sans-serif", "obj-letra": "Inter, sans-serif",
    "cta-fondo": "#FFFFFF", "cta-tarjeta": "#121212", "cta-texto": "#FFFFFF", "cta-sub": "rgba(255, 255, 255, 0.78)", "cta-boton-texto": "#121212", "cta-brillo": "rgba(255, 255, 255, 0.14)",
    "ad-marco": "#E7E7E7",
  },
  tienda: {
    texto: FG_T, cuerpo: `color-mix(in srgb, ${FG_T} 75%, transparent)`, fondo: BG_T, tarjeta: BG_T, gris: mixT(5), acento: FG_T,
    boton: FG_T, "boton-texto": BG_T, "boton-sec": FG_T, "boton-radio": "var(--border-radius, 6px)", "boton-ls": "1px",
    insignia: mixT(83), "insignia-texto": BG_T, destacada: mixT(92), "destacada-texto": BG_T,
    fuente: "var(--body-font, inherit)", titulos: "var(--heading-font, inherit)", "peso-titulos": "700",
    tam: "inherit", "tam-d": "inherit", lh: "inherit", ls: "normal", "titulo-m": "33px", "titulo-d": "44px", "titulo-ls": "0.66px",
    "gar-fondo": mixT(4), "gar-tinta": FG_T, "gar-menta": BG_T, "gar-texto": `color-mix(in srgb, ${FG_T} 80%, transparent)`, "gar-titulo": FG_T,
    "obj-fondo": mixT(9), "obj-papel": BG_T, "obj-tinta": FG_T, "obj-resalte": mixT(16), "obj-resalte-texto": FG_T,
    "obj-impacto": "var(--heading-font, inherit)", "obj-letra": "var(--body-font, inherit)",
    "cta-fondo": BG_T, "cta-tarjeta": FG_T, "cta-texto": BG_T, "cta-sub": `color-mix(in srgb, ${BG_T} 78%, ${FG_T})`, "cta-boton-texto": FG_T, "cta-brillo": "rgba(255, 255, 255, 0.14)",
    "ad-marco": mixT(10),
  },
};

export const ESTILOS = Object.keys(VARIABLES) as Estilo[];
/** El estilo que corresponde; sin estilo (o uno que no existe), el de la tienda. */
export const estiloDe = (e?: string): Estilo => (e === "oscuro" || e === "clasico" ? e : "tienda");

/** El CSS de la raíz de un lugar: las variables del estilo y la letra del cuerpo (tamaño 1,5 rem, 1,6 rem desde 750 px). */
export const cssDe = (e: Estilo) =>
  Object.entries(VARIABLES[estiloDe(e)]).map(([k, v]) => `--g-${k}: ${v};`).join(" ") +
  " font-family: var(--g-fuente); color: var(--g-cuerpo); font-size: var(--g-tam); line-height: var(--g-lh); letter-spacing: var(--g-ls);" +
  " @media (min-width: 750px) { font-size: var(--g-tam-d); }";
