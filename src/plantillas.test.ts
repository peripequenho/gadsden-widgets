import { test } from "node:test";
import assert from "node:assert/strict";
import type { Widget } from "./config.ts";
import { deLaPlantilla, plantillaDe } from "./plantillas.ts";

const cfg = { plantillas: [{ id: "remeras", nombre: "Remeras", productos: [10, 11] }] };
const w = (plantilla?: string): Widget => ({ tipo: "gadsden", bloque: { type: "benefits" }, ...(plantilla && { plantilla }) });

test("plantillas: cada producto usa la suya o la base; los lugares comunes son de todas", () => {
  assert.equal(plantillaDe(cfg, 10), "remeras");
  assert.equal(plantillaDe(cfg, 99), undefined);
  assert.equal(plantillaDe({}, 10), undefined);
  // En la ficha: el de la base sólo en la base, el de una plantilla sólo en ella.
  assert.equal(deLaPlantilla(w(), "after_product_detail_price", undefined), true);
  assert.equal(deLaPlantilla(w(), "after_product_detail_price", "remeras"), false);
  assert.equal(deLaPlantilla(w("remeras"), "after_product_detail_price", "remeras"), true);
  assert.equal(deLaPlantilla(w("remeras"), "seccion:after:main-product:1", undefined), false);
  // Debajo del encabezado, arriba del pie y fijo en la pantalla: en todas.
  for (const l of ["after_header", "before_footer", "edge_bottom_center", "corner_bottom_left"]) {
    assert.equal(deLaPlantilla(w(), l, "remeras"), true);
    assert.equal(deLaPlantilla(w("remeras"), l, undefined), true);
  }
});
