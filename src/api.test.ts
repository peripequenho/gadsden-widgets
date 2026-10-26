import { test } from "node:test";
import assert from "node:assert/strict";
import { leerProductos } from "./api.ts";

// Un producto con la forma de los ejemplos de la documentación de la API (GET /products).
const API: Record<string, unknown> = {
  "/products?handle=remera&published=true&fields=id,name,handle,canonical_url,published,attributes,images,variants": [{
    id: 7, name: { es: "Remera" }, handle: { es: "remera" }, published: true, attributes: [{ es: "Talle" }],
    images: [{ id: 70, src: "https://cdn.test/r.jpg" }, { id: 71, src: "https://cdn.test/r2.jpg" }],
    variants: [
      { id: 701, price: "1500.00", promotional_price: "1200.00", stock: 3, stock_management: true, values: [{ es: "M" }], image_id: 71 },
      { id: 702, price: "1500.00", promotional_price: null, stock: 0, stock_management: true, values: [{ es: "L" }] },
    ],
  }],
  "/metafields/products?owner_id=7&per_page=200&fields=namespace,key,value": [{ namespace: "custom", key: "sold_text", value: "+743" }],
  "/metafields/products?owner_id=1&per_page=200&fields=namespace,key,value": [{ namespace: "marca", key: "inci", value: "Aqua" }, { namespace: "custom", key: "rating_avg", value: "4,5" }],
  // Un campo personalizado del admin (API de Custom Fields), con la forma del ejemplo de la documentación.
  "/products/1/custom-fields": [{ id: "57358282", name: "sold_text", owner_resource: "product", value_type: "text_list", value: "+743" }, { id: "x", name: "rating_avg", value: "9" }],
};
const api = async (ruta: string) => API[ruta] ?? null;

test("otros productos de la API, con el formato del de la ficha y sus metacampos", async () => {
  const r = await leerProductos(api, ["remera", "no-existe"], 1);
  assert.equal(r.productos.length, 1);
  const p = r.productos[0]!;
  assert.deepEqual({ id: p.id, nombre: p.nombre, handle: p.handle, url: p.url, opciones: p.opciones }, { id: 7, nombre: "Remera", handle: "remera", url: "/productos/remera/", opciones: ["Talle"] });
  assert.deepEqual(p.variantes[0], { id: 701, precio: 1200, precioAntes: 1500, disponible: true, valores: ["M"], imagen: "https://cdn.test/r2.jpg" });
  assert.deepEqual(p.variantes[1], { id: 702, precio: 1500, precioAntes: null, disponible: false, valores: ["L"], imagen: null });
  assert.deepEqual(p.metacampos, { custom: { sold_text: "+743" } });
  // Los de otro namespace y los campos personalizados quedan también en custom, sin pisar un metacampo custom.
  assert.deepEqual(r.metacampos, { marca: { inci: "Aqua" }, custom: { rating_avg: "4,5", inci: "Aqua", sold_text: "+743" } });
});
