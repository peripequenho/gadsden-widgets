import { test } from "node:test";
import assert from "node:assert/strict";
import type { ProductDetails, ProductVariant } from "@tiendanube/nube-sdk-types";
import { DEMO } from "./config.ts";
import { conDescuento, conStock, fabricas, type Ctx, type ItemCarrito } from "./ofertas.ts";

// Los componentes de nube-sdk-ui leen el id de la app del Web Worker.
Object.assign(globalThis, { self: { __APP_DATA__: { id: "test" } } });

const variante = { id: 11, product_id: 1, price: "4000.00", compare_at_price: null, stock: null, stock_management: false } as ProductVariant;
const producto = { id: 1, name: { es: "Remera" }, images: [], variants: [variante] } as unknown as ProductDetails;
const ctx = (agregados: ItemCarrito[][]): Ctx => ({
  producto, variante: () => variante, plata: (n) => `$${n}`, pintar: () => {}, agregar: (x) => agregados.push(x), scroll: () => 0,
});
const dibujo = (tipo: string) => { const w = DEMO.widgets.find((x) => x.tipo === tipo)!; return (fabricas[w.tipo] as (w: unknown) => (c: Ctx) => unknown)(w); };
/** Todos los textos y los botones de un árbol de componentes. */
const recorrer = (n: unknown, xs: { s?: string; click?: () => void }[] = []) => {
  if (typeof n === "string") xs.push({ s: n });
  else if (n && typeof n === "object") {
    const o = n as { type?: string; children?: unknown; onClick?: () => void };
    if (o.type === "button" && o.onClick) xs.push({ click: o.onClick });
    for (const h of [o.children].flat()) recorrer(h, xs);
  }
  return xs;
};

test("descuento y stock", () => {
  assert.equal(conDescuento(8000, 10), 7200);
  assert.equal(conDescuento(3333.33, 15), 2833.33);
  assert.equal(conStock({ ...variante, stock_management: true, stock: 0 }), false);
  assert.equal(conStock({ ...variante, stock_management: true, stock: null }), true);
});

test("llevá más: muestra el total con descuento y agrega la cantidad elegida", () => {
  const agregados: ItemCarrito[][] = [];
  let pintadas = 0;
  const c = { ...ctx(agregados), pintar: () => { pintadas++; } };
  const d = dibujo("cantidad");
  const textos = recorrer(d(c)).map((x) => x.s).filter(Boolean);
  assert.ok(textos.includes("$7200") && textos.includes("$8000") && textos.includes("Ahorrás $800"), textos.join(" | "));
  // La segunda tarjeta (2 unidades) y después el botón de agregar.
  recorrer(d(c)).filter((x) => x.click)[1]!.click!();
  assert.equal(pintadas, 1);
  recorrer(d(c)).filter((x) => x.click).at(-1)!.click!();
  assert.deepEqual(agregados, [[{ product_id: 1, variant_id: 11, quantity: 2 }]]);
});

test("combo: suma el producto de la página y los del combo", () => {
  const agregados: ItemCarrito[][] = [];
  const nodos = recorrer(dibujo("combo")(ctx(agregados)));
  assert.ok(nodos.some((x) => x.s === "$17100"), "4000 + 10000 + 5000 con 10 %");
  nodos.filter((x) => x.click).at(-1)!.click!();
  assert.deepEqual(agregados[0]!.map((x) => x.variant_id), [11, 1619178738, 1619178759]);
});
