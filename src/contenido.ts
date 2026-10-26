/**
 * La landing debajo de la ficha, con el diseño de Gadsden: garantía (gad-guarantee, el anillo de "7 días" con el chip),
 * objeciones (gad-objections: lista con borde grueso, títulos en mayúscula y +/−), antes y después (gad-before-after:
 * texto al lado y la foto partida con la línea y el círculo) y el llamado final (gad-cta-final: la tarjeta oscura con la
 * píldora). Los colores de marca de los originales pasan a los neutros de la tienda (texto y fondo).
 */
import type { Punto, Widget } from "./config.ts";
import { conStock, type Dibujo, type Fabricas } from "./ofertas.ts";
import { box, button, img, keyframes, styled, svgCircle, svgPath, svgRoot, txt } from "@tiendanube/nube-sdk-ui";
import { botonLink, C, caja, encabezado, hijos, mezcla, pila, t, transparente, trazo, type Nodo } from "./ui.ts";

/* ---------- Garantía (gad-guarantee) ---------- */

const ICONO: Record<NonNullable<Punto["icono"]>, string> = {
  mensaje: "M4 5h16v11H9l-5 4zM8 10h8M8 13h5",
  tienda: "M4 9l1.5-5h13L20 9M4 9h16v1.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 10.5zM5.5 13v7h13v-7M10 20v-4h4v4",
  escudo: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4",
  plata: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7 9.5v5M17 9.5v5",
  calendario: "M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM4 10h16M9 3v4M15 3v4",
};

const Garantia = styled(box)`
  position: relative; overflow: hidden; padding: 24px 16px;
  @media (min-width: 990px) { padding: 56px 16px; }
`;
const Fila = styled(box)`
  display: flex; align-items: center; gap: 14px; max-width: 560px; margin: 0 auto;
  @media (min-width: 990px) { gap: 36px; max-width: 880px; }
`;
const Anillo = styled(box)`
  position: relative; flex: none; width: 160px; height: 160px; margin-left: -56px;
  @media (min-width: 990px) { width: 184px; height: 184px; margin-left: 0; }
`;
const NumeroAnillo = styled(txt)`
  margin: 0; font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1;
  @media (min-width: 990px) { font-size: 55px; }
`;
const Volanta = styled(txt)`
  margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.6;
  @media (min-width: 990px) { font-size: 13px; }
`;
const TituloGar = styled(txt)`
  margin: 0 0 8px; font-family: var(--g-titulos); font-weight: var(--g-peso-titulos); color: var(--g-gar-titulo); letter-spacing: var(--g-titulo-ls);
  font-size: 22px; line-height: 1.12; text-wrap: balance;
  @media (min-width: 990px) { font-size: 34px; }
`;
const Chip = styled(box)`
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 100px; font-size: 12px; font-weight: 700;
  @media (min-width: 990px) { font-size: 14px; padding: 6px 14px; }
`;
const TextoGar = styled(txt)`
  margin: 14px 0 0; font-size: 15px; line-height: 1.45;
  @media (min-width: 990px) { max-width: 62ch; margin-top: 24px; font-size: 17px; }
`;
const Lista = styled(box)`
  margin: 16px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;
  font-size: 14px; line-height: 1.25; font-weight: 700;
  @media (min-width: 990px) { grid-template-columns: repeat(2, max-content); gap: 16px 48px; margin-top: 22px; font-size: 16px; }
`;
const Cuerpo = styled(box)`
  max-width: 560px; margin: 0 auto;
  @media (min-width: 990px) { max-width: 880px; }
`;

const garantia = (w: Extract<Widget, { tipo: "garantia" }>): Dibujo => (c) => {
  const v = c.variante();
  return Garantia({ children: [
    Fila({ children: [
      Anillo({ children: [
        svgRoot({ viewBox: "0 0 100 100", width: "100%", height: "100%", style: { display: "block" }, children: [
          svgCircle({ cx: 50, cy: 50, r: 45, fill: "none", stroke: "var(--g-gar-tinta)", strokeWidth: 10 }),
        ] }),
        pila(2, [NumeroAnillo({ children: String(w.dias) }), t("días", { fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 })],
          { position: "absolute", inset: "0", alignItems: "center", justifyContent: "center", lineHeight: "1" }),
      ] }),
      caja([
        w.volanta && Volanta({ children: w.volanta }),
        TituloGar({ children: w.titulo }),
        w.chip && Chip({ children: [trazo(ICONO.escudo, 14, 2.4), w.chip], style: { background: "var(--g-gar-tinta)", color: "var(--g-gar-menta)" } }),
      ]),
    ] }),
    Cuerpo({ children: hijos([
      w.texto && TextoGar({ children: w.texto, style: { color: "var(--g-gar-texto)" } }),
      !!w.puntos?.length && Lista({ children: w.puntos.map((p) => box({ direction: "row", gap: "10px", alignItems: "center", children: [
        box({ children: [trazo(ICONO[p.icono ?? "escudo"], 19)], style: { flex: "none", display: "grid", placeItems: "center", width: "34px", height: "34px", borderRadius: "50%", background: "var(--g-gar-tinta)", color: "var(--g-gar-menta)" } }),
        t(p.titulo),
      ] })) }),
      w.boton && v && conStock(v) && button({
        children: [w.boton, trazo("M5 12h14M13 6l6 6-6 6", 18, 2.6)],
        onClick: () => c.agregar([{ product_id: c.producto.id, variant_id: v.id, quantity: 1 }]),
        style: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", marginTop: "18px", minHeight: "54px", borderRadius: "12px",
          border: "0", background: "var(--g-gar-tinta)", color: "#FFFFFF", fontWeight: "800", fontSize: "15px", letterSpacing: "0.03em", textTransform: "uppercase", cursor: "pointer", font: "inherit" },
      }),
    ]) }),
  ], style: { background: "var(--g-gar-fondo)", color: "var(--g-gar-tinta)" } });
};

/* ---------- Objeciones (gad-objections) ---------- */

const Objeciones = styled(box)`
  padding: 44px 20px;
  @media (min-width: 900px) { padding: 74px 28px; }
`;
const Etiqueta = styled(box)`
  display: block; width: max-content; max-width: 100%; margin: 0 0 16px; padding: 7px 12px; transform: skewX(-9deg);
  font-family: var(--g-obj-impacto); font-weight: 900; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  @media (min-width: 900px) { font-size: 10.5px; letter-spacing: 0.19em; padding: 7px 14px; margin-bottom: 24px; }
`;
const TituloObj = styled(box)`
  display: inline-block; margin: 0 0 22px; transform: skewX(-9deg);
  font-family: var(--g-obj-impacto); font-weight: 900; text-transform: uppercase;
  font-size: clamp(25px, 7.2vw, 34px); line-height: 1.02; letter-spacing: -0.02em;
  @media (min-width: 900px) { font-size: clamp(34px, 4.3vw, 50px); margin-bottom: 34px; }
`;
const ListaObj = styled(box)`
  border-style: solid; border-width: 3px;
  @media (min-width: 900px) { border-width: 4px; }
`;
const Pregunta = styled(button)`
  position: relative; display: flex; align-items: center; width: 100%; min-height: 44px; padding: 16px 50px 16px 18px;
  border: 0; text-align: left; cursor: pointer; color: inherit;
  font-family: var(--g-obj-impacto); font-weight: 900; text-transform: uppercase; font-size: 15.5px; line-height: 1.2; letter-spacing: -0.005em;
  @media (min-width: 900px) { padding: 21px 58px 21px 24px; font-size: 17.5px; }
`;
const Mas = styled(box)`
  position: absolute; top: 50%; right: 18px; width: 15px; height: 15px; transform: translateY(-50%);
  @media (min-width: 900px) { right: 24px; width: 17px; height: 17px; }
`;
const Respuesta = styled(txt)`
  margin: 0; max-width: 60ch; padding: 12px 18px 18px; font-size: 16.5px; line-height: 1.5;
  @media (min-width: 900px) { padding: 2px 24px 24px; font-size: 17px; line-height: 1.55; }
`;
const Pie = styled(txt)`
  margin: 22px 0 0; max-width: 60ch; font-size: 16px; line-height: 1.5; opacity: 0.78;
  @media (min-width: 900px) { margin-top: 28px; }
`;

/** El título con lo resaltado entre _ (en el original, `<em>` con fondo). */
const resaltado = (s: string): Nodo[] => s.split(/_(.+?)_/).map((x, i) => (i % 2
  ? txt({ children: x, style: { margin: "0", display: "inline", padding: "1px 8px", background: "var(--g-obj-resalte)", color: "var(--g-obj-resalte-texto)", boxDecorationBreak: "clone" } })
  : x)).filter(Boolean);

function objeciones(w: Extract<Widget, { tipo: "objeciones" }>): Dibujo {
  const abiertas = new Set<number>(w.abrirPrimera ? [0] : []);
  return (c) => Objeciones({ children: [box({ children: hijos([
    w.volanta && Etiqueta({ children: [txt({ children: w.volanta, style: { margin: "0", display: "inline-block", transform: "skewX(9deg)" } })], style: { background: "var(--g-obj-tinta)", color: "var(--g-obj-papel)" } }),
    caja([TituloObj({ children: hijos(resaltado(w.titulo)) })]),
    ListaObj({ children: w.preguntas.map((q, i) => {
      const abierta = abiertas.has(i);
      return box({ children: hijos([
        Pregunta({
          children: [q.p, Mas({ children: hijos([
            box({ style: { position: "absolute", top: "50%", left: "0", right: "0", height: "3px", transform: "translateY(-50%)", background: "var(--g-obj-tinta)" } }),
            !abierta && box({ style: { position: "absolute", left: "50%", top: "0", bottom: "0", width: "3px", transform: "translateX(-50%)", background: "var(--g-obj-tinta)" } }),
          ]) })],
          onClick: () => { if (abierta) abiertas.delete(i); else abiertas.add(i); c.pintar(); },
          style: { background: abierta ? "var(--g-obj-resalte)" : "transparent" },
        }),
        abierta && Respuesta({ children: q.r }),
      ]), style: { borderBottom: i < w.preguntas.length - 1 ? "2px solid var(--g-obj-tinta)" : "0" } });
    }), style: { borderColor: "var(--g-obj-tinta)", background: "var(--g-obj-papel)" } }),
    w.pie && Pie({ children: w.pie }),
  ]), style: { maxWidth: "820px", margin: "0 auto" } })], style: { background: "var(--g-obj-fondo)", color: "var(--g-obj-tinta)", fontFamily: "var(--g-obj-letra)", borderBottom: "4px solid var(--g-obj-tinta)" } });
}

/* ---------- Antes y después (gad-compare-reveal) ---------- */

const SeccionAD = styled(box)`
  padding: 24px 16px;
  @media (min-width: 990px) { padding: 48px 16px; }
`;
const TituloAD = styled(txt)`
  margin: 0 0 12px; text-align: center; line-height: 1.15; text-wrap: balance; color: var(--g-texto);
  font-family: var(--g-titulos); font-weight: var(--g-peso-titulos); letter-spacing: var(--g-titulo-ls); font-size: 20px;
  @media (min-width: 750px) { font-size: 24px; }
`;
const Marco = styled(box)`
  position: relative; overflow: hidden; width: 100%; max-width: 360px; margin: 0 auto; aspect-ratio: 4 / 5; border-radius: 20px;
  @media (min-width: 990px) { max-width: 860px; aspect-ratio: 16 / 9; border-radius: 24px; }
`;
// NubeSDK no deja arrastrar: la línea va y viene sola (en el original, la mueve el comprador).
const vaivenCorte = keyframes`
  0%, 100% { clip-path: inset(0 50% 0 0); } 25% { clip-path: inset(0 78% 0 0); } 75% { clip-path: inset(0 22% 0 0); }
`;
const vaivenLinea = keyframes`
  0%, 100% { left: 50%; } 25% { left: 22%; } 75% { left: 78%; }
`;
const Antes = styled(box)`
  position: absolute; inset: 0; clip-path: inset(0 50% 0 0); animation: ${vaivenCorte} 7s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
const Linea = styled(box)`
  position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; transform: translateX(-50%); background: #FFFFFF;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.3)); animation: ${vaivenLinea} 7s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
const Perilla = styled(box)`
  position: absolute; top: 50%; left: 50%; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%;
  display: grid; place-items: center; background: #FFFFFF; color: #0B0B0B; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  animation: ${vaivenLinea} 7s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const capa = (foto: string | undefined, gris: number) => foto
  ? img({ src: foto, alt: "", style: { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", display: "block" } })
  : box({ style: { position: "absolute", inset: "0", background: mezcla(gris) } });
const etiqueta = (s: string, lado: "left" | "right") => t(s, {
  position: "absolute", top: "14px", [lado]: "14px", padding: "5px 12px", borderRadius: "100px", fontSize: "13px", fontWeight: "700", lineHeight: "1.6",
  color: "#FFFFFF", background: "rgba(11, 11, 11, 0.55)", backdropFilter: "blur(6px)",
});

const antesDespues = (w: Extract<Widget, { tipo: "antesDespues" }>): Dibujo => () => SeccionAD({ children: hijos([
  w.titulo && TituloAD({ children: w.titulo }),
  Marco({ children: [
    capa(w.despues.foto, 10),
    Antes({ children: [capa(w.antes.foto, 4)] }),
    Linea({}),
    Perilla({ children: [svgRoot({ viewBox: "0 0 16 10", width: 16, height: 10, children: [
      svgPath({ d: "M5 1 1 5l4 4M11 1l4 4-4 4", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }),
    ] })] }),
    etiqueta(w.antes.rotulo ?? "Antes", "left"),
    etiqueta(w.despues.rotulo ?? "Después", "right"),
  ], style: { background: "var(--g-ad-marco)" } }),
  w.texto && t(w.texto, { margin: "8px 0 0", textAlign: "center", fontSize: "12px", opacity: 0.6 }),
]), style: { background: C.fondo, color: C.texto } });

/* ---------- Llamado final (gad-cta-final) ---------- */

const Tarjeta = styled(box)`
  position: relative; overflow: hidden; max-width: 1180px; margin: 0 auto; padding: 66px 40px; border-radius: 32px; text-align: center;
  @media (max-width: 760px) { padding: 52px 24px; border-radius: 24px; }
`;
const TituloCta = styled(txt)`
  margin: 0; font-family: var(--g-titulos); font-size: 46px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15;
  @media (max-width: 760px) { font-size: 30px; }
`;
const BotonCta = styled(button)`
  display: inline-flex; align-items: center; justify-content: center; min-width: 300px; padding: 19px 46px; border: 0; border-radius: 14px;
  font: inherit; font-weight: 800; font-size: 18px; cursor: pointer; text-decoration: none; transition: transform .2s, box-shadow .2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22); }
  @media (max-width: 760px) { width: 100%; min-width: 0; }
`;

const ctaFinal = (w: Extract<Widget, { tipo: "ctaFinal" }>): Dibujo => (c) => {
  const v = c.variante();
  const estiloBoton = { background: "var(--g-cta-texto)", color: "var(--g-cta-boton-texto)" };
  return box({ children: [Tarjeta({ children: hijos([
    // El brillo de la esquina (en el original, verde de marca); acá, el color del fondo bien suave.
    box({ style: { position: "absolute", inset: "0", background: "radial-gradient(600px 320px at 82% 120%, var(--g-cta-brillo), transparent 62%)" } }),
    box({ children: hijos([
      TituloCta({ children: w.titulo, style: { color: "var(--g-cta-texto)" } }),
      w.pildora && t(w.pildora, { display: "inline-block", margin: "26px 0 18px", padding: "14px 32px", borderRadius: "100px", border: "1.5px solid color-mix(in srgb, var(--g-cta-texto) 55%, transparent)", color: "var(--g-cta-texto)", fontWeight: "700", fontSize: "21px" }),
      w.texto && t(w.texto, { margin: "0 0 28px", fontSize: "17px", color: "var(--g-cta-sub)" }),
      w.link
        ? botonLink(w.boton, w.link, "claro", { minWidth: "300px", padding: "19px 46px", borderRadius: "14px", fontWeight: "800", fontSize: "18px", background: "var(--g-cta-texto)", color: "var(--g-cta-boton-texto)", border: "0" })
        : v && conStock(v) && BotonCta({ children: w.boton, onClick: () => c.agregar([{ product_id: c.producto.id, variant_id: v.id, quantity: 1 }]), style: estiloBoton }),
    ]), style: { position: "relative", zIndex: 1 } }),
  ]), style: { background: "var(--g-cta-tarjeta)", color: "var(--g-cta-texto)" } })], style: { padding: "70px 20px", background: "var(--g-cta-fondo)" } });
};

export const fabricas: Fabricas = { garantia, objeciones, antesDespues, ctaFinal };
