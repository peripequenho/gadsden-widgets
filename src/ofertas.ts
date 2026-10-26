/**
 * Lo que vende en la ficha, con el diseño de Gadsden: "llevá más" (bloque quantity_offers, snippets/gad-quantity-offers +
 * gad-product.css), combo (gad-bundle + snippets/gad-bundle-box), planes (gad-pricing) y la barra fija de compra (bloque
 * sticky_bar, gad-product.css). NubeSDK no cambia precios: el widget muestra el que da la promoción de la tienda y suma
 * al carrito con `cart:add`.
 */
import type { ProductDetails, ProductVariant } from "@tiendanube/nube-sdk-types";
import { box, button, styled, txt } from "@tiendanube/nube-sdk-ui";
import type { ItemCombo, Widget } from "./config.ts";
import { boton, C, casilla, hijos, encabezado, foto, grilla, mezcla, pila, seccion, sinFoto, t, transparente, trazo, type Nodo } from "./ui.ts";

export type ItemCarrito = { product_id: number; variant_id: number; quantity: number; properties?: Record<string, string> };
export type Ctx = {
  producto: ProductDetails;
  /** La variante elegida en la ficha (o la primera con stock). */
  variante: () => ProductVariant | undefined;
  plata: (pesos: number) => string;
  pintar: () => void;
  agregar: (items: ItemCarrito[], pago?: boolean) => void;
  /** El último % de scroll que avisó NubeSDK (0, 10, … 100). */
  scroll: () => number;
};
export type Dibujo = (ctx: Ctx) => Nodo;
export type Fabricas = { [T in Widget["tipo"]]?: (w: Extract<Widget, { tipo: T }>) => Dibujo };

/** El total con el % de descuento, redondeado a centavos. */
export const conDescuento = (total: number, pct: number) => Math.round(total * (100 - pct)) / 100;

export const precio = (v?: { price: string | null } | null) => Number(v?.price ?? 0);
/** El precio "antes" de la variante: el de lista si tiene, si no el mismo precio (como `compare_unit` en Gadsden). */
export const precioAntes = (v?: { price: string | null; compare_at_price: string | null } | null) => Number(v?.compare_at_price || v?.price || 0);

export const conStock = (v: ProductVariant) => !v.stock_management || v.stock === null || v.stock > 0;

const nombreDe = (p: ProductDetails) => p.name.es ?? Object.values(p.name)[0] ?? "";

/** Los textos con `{ahorro}`, `{porcentaje}` (gad-offer-text). */
const llenar = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);

/* ---------- Llevá más (quantity_offers, estilo "cards") ---------- */

const radio = (elegida: boolean) => box({
  style: {
    width: "18px", height: "18px", borderRadius: "50%", boxSizing: "border-box", flex: "none",
    border: `2px solid ${elegida ? C.boton : transparente(40)}`,
    ...(elegida ? { boxShadow: `inset 0 0 0 3px ${C.fondo}, inset 0 0 0 10px ${C.boton}` } : {}),
  },
});

function cantidad(w: Extract<Widget, { tipo: "cantidad" }>): Dibujo {
  let elegida = Math.min(w.elegida ?? 0, w.opciones.length - 1);
  return (c) => {
    const v = c.variante();
    const o = w.opciones[elegida]!;
    return pila(0, [
      w.titulo && t(w.titulo, { fontWeight: "700", margin: "0 0 10px" }),
      pila(10, w.opciones.map((op, i) => {
        const sel = i === elegida;
        const total = conDescuento(precio(v) * op.cantidad, op.descuento);
        const antes = precioAntes(v) * op.cantidad;
        const ahorro = antes - total;
        return button({
          ariaLabel: op.titulo ?? `${op.cantidad}`,
          onClick: () => { elegida = i; c.pintar(); },
          children: hijos([
            op.insignia && t(op.insignia, {
              position: "absolute", top: "-10px", right: "12px", padding: "2px 10px", borderRadius: "100px",
              background: C.insignia, color: C.insigniaTexto, fontSize: "11px", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: "1.4",
            }),
            radio(sel),
            pila(2, [
              box({ direction: "row", alignItems: "center", style: { flexWrap: "wrap", gap: "4px 8px" }, children: [
                t(op.titulo ?? `${op.cantidad}`, { fontWeight: "700" }),
                ...(op.beneficio ? [t(op.beneficio, { padding: "2px 8px", border: `1px solid ${C.boton}`, color: C.boton, borderRadius: "100px", fontSize: "12px", fontWeight: "700", lineHeight: "1.4" })] : []),
              ] }),
            ], { minWidth: "0" }),
            pila(2, [
              t(c.plata(total), { fontWeight: "700" }),
              ahorro > 0 && t(c.plata(antes), { fontSize: "13px", opacity: 0.6, textDecoration: "line-through" }),
              ahorro > 0 && w.ahorro && t(llenar(w.ahorro, { ahorro: c.plata(ahorro) }), { fontSize: "12px", fontWeight: "700", color: C.boton }),
            ], { alignItems: "flex-end", textAlign: "right" }),
          ]),
          style: {
            position: "relative", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: "12px",
            padding: "14px 16px", borderRadius: "6px", cursor: "pointer", width: "100%", textAlign: "left", font: "inherit", color: C.cuerpo,
            border: `1px solid ${sel ? C.boton : transparente(20)}`,
            background: sel ? "color-mix(in srgb, var(--g-boton) 5%, transparent)" : "transparent",
            boxShadow: sel ? `inset 0 0 0 1px ${C.boton}` : "none",
          },
        });
      })),
      v && conStock(v)
        ? boton(w.boton ?? `Agregar ${o.cantidad === 1 ? "1 unidad" : `${o.cantidad} unidades`} al carrito`,
          () => c.agregar([{ product_id: c.producto.id, variant_id: v.id, quantity: o.cantidad }]), "primario", { ancho: true, style: { marginTop: "15px" } })
        : boton("Sin stock", () => {}, "primario", { deshabilitado: true, ancho: true, style: { marginTop: "15px" } }),
    ], { margin: "15px 0" });
  };
}

/* ---------- Combo (gad-bundle) ---------- */

const CajaCombo = styled(box)`
  display: grid; gap: 24px; max-width: 960px; margin: 0 auto;
  @media (min-width: 750px) { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); align-items: start; }
`;

function combo(w: Extract<Widget, { tipo: "combo" }>): Dibujo {
  const fuera = new Set<number>();
  return (c) => {
    const v = c.variante();
    const actual: ItemCombo | null = w.sumarActual && v && conStock(v)
      ? { producto: c.producto.id, variante: v.id, nombre: nombreDe(c.producto), precio: precio(v), precioAntes: precioAntes(v), imagen: c.producto.images[0]?.src }
      : null;
    const todos = [actual, ...w.items].filter((x): x is ItemCombo => !!x);
    const elegidos = todos.filter((x) => !fuera.has(x.variante));
    const antes = elegidos.reduce((s, x) => s + (x.precioAntes ?? x.precio), 0);
    const total = conDescuento(elegidos.reduce((s, x) => s + x.precio, 0), elegidos.length > 1 ? w.descuento : 0);
    const fila = (x: ItemCombo) => {
      const si = !fuera.has(x.variante);
      return grilla("auto 70px minmax(0, 1fr)", [
        casilla(`combo-${x.variante}`, si, (on) => { if (on) fuera.delete(x.variante); else fuera.add(x.variante); c.pintar(); }),
        x.imagen ? foto(x.imagen, x.nombre, 70, 4) : sinFoto({ width: "70px", height: "70px", borderRadius: "4px" }),
        pila(0, [
          t(x.nombre, { fontSize: "15px", fontWeight: "600", lineHeight: "1.3" }),
          box({ direction: "row", gap: "6px", children: [
            ...(x.precioAntes && x.precioAntes > x.precio ? [t(c.plata(x.precioAntes), { fontSize: "14px", opacity: 0.6, textDecoration: "line-through" })] : []),
            t(c.plata(x.precio), { fontSize: "14px" }),
          ] }),
        ]),
      ], 12, "center", { padding: "10px 12px", border: `1px solid ${C.borde}`, borderRadius: "8px", opacity: si ? 1 : 0.55 });
    };
    return seccion([
      encabezado(w.titulo),
      CajaCombo({ children: [
        pila(10, todos.map(fila)),
        pila(0, [
          box({ direction: "row", style: { alignItems: "baseline", flexWrap: "wrap", gap: "4px 8px", margin: "0 0 10px", fontSize: "18px" }, children: [
            t(w.total ?? "Total:"),
            ...(antes > total ? [t(c.plata(antes), { fontSize: "15px", opacity: 0.6, textDecoration: "line-through" })] : []),
            t(c.plata(total), { fontWeight: "700", color: C.texto }),
          ] }),
          elegidos.length > 1 && w.descuento > 0 && w.nota && t(llenar(w.nota, { porcentaje: `${w.descuento} %` }), { fontSize: "13px", margin: "0 0 12px" }),
          boton(w.boton ?? "Agregar los elegidos", () => c.agregar(elegidos.map((x) => ({ product_id: x.producto, variant_id: x.variante, quantity: 1 }))),
            "primario", { ancho: true, deshabilitado: !elegidos.length }),
        ], { padding: "20px", borderRadius: "8px", background: C.tinte }),
      ] }),
    ]);
  };
}

/* ---------- Planes (gad-pricing) ---------- */

const GrillaPlanes = styled(box)`
  display: grid; grid-auto-flow: column; grid-auto-columns: 82%; gap: 16px; align-items: stretch;
  overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 16px 2px;
  @media (min-width: 750px) {
    grid-auto-flow: row; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 1140px; margin: 0 auto; overflow: visible;
  }
`;
const Destacada = styled(box)`
  @media (min-width: 750px) { transform: scale(1.03); }
`;
const TILDE = "M5 12.5l4.5 4.5L19 7.5";
const CRUZ = "M7 7l10 10M17 7L7 17";

function planes(w: Extract<Widget, { tipo: "planes" }>): Dibujo {
  return (c) => {
    const v = c.variante();
    return seccion([
      encabezado(w.titulo),
      GrillaPlanes({ children: w.planes.map((p) => {
        const total = conDescuento(precio(v) * p.cantidad, p.descuento);
        const antes = precioAntes(v) * p.cantidad;
        const hl = !!p.destacado;
        const tarjeta = hl ? Destacada : box;
        return tarjeta({
          direction: "col", gap: "12px",
          children: hijos([
            p.insignia && t(p.insignia, {
              position: "absolute", top: "0", left: "50%", transform: "translate(-50%, -50%)", padding: "4px 12px", borderRadius: "99px",
              background: hl ? C.destacadaTexto : C.boton, color: hl ? C.destacada : C.botonTexto, fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap",
            }),
            t(p.nombre, { fontFamily: C.titulos, fontWeight: "700", fontSize: "17px", color: "inherit" }),
            box({ direction: "row", gap: "6px", style: { alignItems: "baseline", flexWrap: "wrap" }, children: [
              ...(antes > total ? [t(c.plata(antes), { fontSize: "14px", opacity: 0.7, textDecoration: "line-through" })] : []),
              t(c.plata(total), { fontFamily: C.titulos, fontWeight: "700", fontSize: "26px", color: "inherit" }),
              ...(p.periodo ? [t(p.periodo, { fontSize: "14px", opacity: 0.7 })] : []),
            ] }),
            pila(8, (p.puntos ?? []).map((x) => {
              const no = x.startsWith("- ");
              return box({ direction: "row", gap: "8px", style: { alignItems: "flex-start", fontSize: "14px", opacity: no ? 0.5 : 1 },
                children: [trazo(no ? CRUZ : TILDE, 20, 1.5), t(no ? x.slice(2) : x)] });
            })),
            pila(0, [v && conStock(v)
              ? boton(p.boton ?? "Lo quiero", () => c.agregar([{ product_id: c.producto.id, variant_id: v.id, quantity: p.cantidad }]), hl ? "claro" : "secundario", { ancho: true })
              : boton("Sin stock", () => {}, hl ? "claro" : "secundario", { deshabilitado: true, ancho: true })], { marginTop: "auto", paddingTop: "8px" }),
          ]),
          style: {
            position: "relative", padding: "28px 24px", borderRadius: "12px", scrollSnapAlign: "center", boxSizing: "border-box",
            ...(hl
              ? { background: C.destacada, color: C.destacadaTexto, border: `1px solid ${C.destacadaTexto}`, boxShadow: "0 10px 30px rgba(18, 18, 18, 0.12)" }
              : { background: C.tarjeta, color: C.texto, border: `1px solid ${C.borde}` }),
          },
        });
      }) }),
    ], C.gris);
  };
}

/* ---------- Barra fija de compra (sticky_bar) ---------- */

const Barra = styled(box)`
  display: flex; align-items: center; gap: 8px; box-sizing: border-box; width: 80vw; padding: 8px; font-size: 13px;
  & img { width: 40px !important; height: 40px !important; }
  & button { min-height: 44px !important; padding: 0 12px !important; font-size: 14px !important; letter-spacing: 0.5px !important; }
  @media (min-width: 750px) {
    gap: 12px; padding: 8px 16px; font-size: 14px;
    & img { width: 48px !important; height: 48px !important; }
    & button { min-height: 49px !important; padding: 0 30px !important; font-size: 15px !important; letter-spacing: 1px !important; min-width: 180px; }
  }
`;

/** En mobile la barra de fábrica no muestra el título (m_title: false). */
const TituloBarra = styled(txt)`
  display: none; margin: 0; font-size: 14px; font-weight: 700; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  @media (min-width: 750px) { display: block; }
`;

function barra(w: Extract<Widget, { tipo: "barra" }>): Dibujo {
  return (c) => {
    const v = c.variante();
    if (c.scroll() < (w.desde ?? 20) || !v) return null;
    const nombre = nombreDe(c.producto);
    const imagen = c.producto.images[0]?.src;
    const antes = precioAntes(v);
    return Barra({ children: hijos([
      imagen ? foto(imagen, nombre, 48) : null,
      pila(2, [
        TituloBarra({ children: nombre }),
        box({ direction: "row", alignItems: "center", style: { flexWrap: "wrap", gap: "2px 8px" }, children: [
          ...(antes > precio(v) ? [t(c.plata(antes), { opacity: 0.6, textDecoration: "line-through" })] : []),
          t(c.plata(precio(v))),
          ...(antes > precio(v) ? [t(`Ahorrás ${Math.round((1 - precio(v) / antes) * 100)} %`, { padding: "2px 8px", borderRadius: "6px", background: C.insignia, color: C.insigniaTexto, fontSize: "11px", letterSpacing: "1px" })] : []),
        ] }),
      ], { flex: "1 1 auto", minWidth: "0" }),
      conStock(v)
        ? boton(w.boton ?? "Agregar al carrito", () => c.agregar([{ product_id: c.producto.id, variant_id: v.id, quantity: 1 }]), "primario", { style: { flex: "0 0 auto", padding: "0 20px" } })
        : boton("Sin stock", () => {}, "primario", { deshabilitado: true, style: { flex: "0 0 auto" } }),
    ]), style: { background: C.fondo, color: C.cuerpo, borderRadius: "12px 12px 0 0", borderTop: `1px solid ${transparente(12)}`, boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.08)" } });
  };
}

export const fabricas: Fabricas = { cantidad, combo, planes, barra };
