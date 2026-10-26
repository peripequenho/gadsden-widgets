/**
 * Prueba social con el diseño de Gadsden: estrellas debajo del nombre (bloque stars de la ficha), testimonios
 * (gad-testimonials: tarjetas tintadas con comillas y estrellas) y reseñas con estrellas verdes en cuadros
 * (gad-trustpilot, sin el logo de Trustpilot; el nombre de la plataforma sale sólo si la configuración lo pone).
 */
import type { Resena, Widget } from "./config.ts";
import type { Dibujo, Fabricas } from "./ofertas.ts";
import { box, styled, svgCircle, svgPath, svgRoot } from "@tiendanube/nube-sdk-ui";
import { C, conNegritas, encabezado, enLinea, estrella, estrellas, foto, hijos, mezcla, pila, seccion, t, transparente } from "./ui.ts";

const VERDE = "#00B67A";
const GRIS_TP = "#DCDCE6";

/** Cinco cuadros con la estrella blanca (gad-tp__stars); el último se llena en parte con la nota. */
const cuadros = (nota: number, lado: number) => box({
  direction: "row", gap: "2px",
  children: Array.from({ length: 5 }, (_, i) => {
    const f = Math.round(Math.max(0, Math.min(1, nota - i)) * 100);
    return box({
      children: [estrella(Math.round(lado * 0.75), "#FFFFFF")],
      style: { width: `${lado}px`, height: `${lado}px`, display: "grid", placeItems: "center", background: `linear-gradient(90deg, ${VERDE} ${f}%, ${GRIS_TP} ${f}%)` },
    });
  }),
  style: { display: "inline-flex", flex: "none" },
});

/** Las tarjetas: en mobile, un carrusel de a una; desde 750 px, grilla de 3 (d_carousel: false, d_per_view: 3). */
const Tarjetas = styled(box)`
  display: grid; grid-auto-flow: column; grid-auto-columns: 100%; gap: 12px;
  overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
  & > * { scroll-snap-align: start; }
  @media (min-width: 750px) { grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; overflow: visible; }
`;

const estrellasDibujo = (w: Extract<Widget, { tipo: "estrellas" }>): Dibujo => () =>
  enLinea(8, [estrellas(w.nota, 18), w.texto && t(w.texto, { fontSize: "14px" })], { margin: "0 0 15px", flexWrap: "nowrap" });

/** gad-testimonials con los valores de fábrica: card_style tint, comillas, estrellas, texto centrado. */
const testimonio = (r: Resena) => pila(12, [
  t("“", { position: "absolute", top: "10px", left: "16px", fontSize: "50px", lineHeight: "1", opacity: 0.35, fontFamily: "Georgia, serif" }),
  r.foto && foto(r.foto, r.nombre, 120, 12),
  r.estrellas ? box({ direction: "row", gap: "2px", children: Array.from({ length: r.estrellas }, () => estrella(20, "#F5B301")) }) : null,
  r.titulo && t(r.titulo, { fontSize: "17px", fontWeight: "700", color: C.texto }),
  t(r.texto),
  t(r.nombre, { marginTop: "auto", fontSize: "14px" }),
], { position: "relative", padding: "24px", borderRadius: "24px", background: C.tinte, alignItems: "center", textAlign: "center", height: "100%", boxSizing: "border-box" });

const testimonios = (w: Extract<Widget, { tipo: "testimonios" }>): Dibujo => () =>
  seccion([encabezado(w.titulo), Tarjetas({ children: w.resenas.map(testimonio) })]);

/** El check_circle relleno de Material, con el tilde del color del fondo. */
const verificado = () => svgRoot({ viewBox: "0 0 24 24", width: 14, height: 14, style: { display: "block", flex: "none" }, children: [
  svgCircle({ cx: 12, cy: 12, r: 10, fill: "currentColor" }),
  svgPath({ d: "M7.5 12.2l3 3 6-6", fill: "none", stroke: "#FFFFFF", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }),
] });

const tarjetaTp = (r: Resena) => pila(10, [
  box({ direction: "row", style: { flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }, children: hijos([
    cuadros(r.estrellas ?? 5, 20),
    r.verificado && enLinea(4, [verificado(), t("Comprador verificado", { fontSize: "12px" })], { opacity: 0.75 }),
  ]) }),
  r.titulo && t(r.titulo, { fontFamily: C.titulos, fontWeight: "700", fontSize: "13px", color: C.texto }),
  t(r.texto, { fontSize: "14px" }),
  box({ direction: "row", style: { flexWrap: "wrap", justifyContent: "space-between", gap: "6px", marginTop: "auto", fontSize: "13px" }, children: hijos([
    t(r.nombre, { fontWeight: "600", color: C.texto }),
    r.fecha && t(r.fecha, { opacity: 0.7 }),
  ]) }),
], { padding: "20px", border: `1px solid ${transparente(10)}`, borderRadius: "4px", background: C.tarjeta, height: "100%", boxSizing: "border-box" });

const trustpilot = (w: Extract<Widget, { tipo: "trustpilot" }>): Dibujo => () => seccion([
  encabezado(w.titulo),
  box({ direction: "row", style: { flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px 16px", marginBottom: "32px" }, children: hijos([
    w.etiqueta && t(w.etiqueta, { fontFamily: C.titulos, fontWeight: "700", fontSize: "18px", color: C.texto }),
    cuadros(w.nota, 28),
    w.cantidad && conNegritas(w.cantidad, { fontSize: "14px" }),
    w.plataforma && enLinea(4, [estrella(18, VERDE), t(w.plataforma, { fontWeight: "700" })]),
  ]) }),
  Tarjetas({ children: w.resenas.map(tarjetaTp) }),
], C.gris);

export const fabricas: Fabricas = { estrellas: estrellasDibujo, testimonios, trustpilot };
