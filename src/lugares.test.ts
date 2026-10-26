import { test } from "node:test";
import assert from "node:assert/strict";
import { conOrden, leerDinamico, lugarClasico, lugarDeSeccion, lugarDinamico, mismoLugar, resolverDinamico, seccionesDelHtml, tituloDeSeccion, type Dinamico } from "./lugares.ts";
import { LUGARES, LUGARES_PT } from "./panel/catalogo.ts";

// Como el HTML de la ficha de lgademo (23-oct), con una sección de más que el comerciante sumó.
const HTML = `
<div class="x" data-nubesdk-slot="before_dynamic_section_main_product" data-nubesdk-section-type="main-product" data-nubesdk-section-id="main_product" data-nubesdk-section-index="1" ></div>
<div data-nubesdk-slot="after_dynamic_section_main_product" data-nubesdk-section-type="main-product" data-nubesdk-section-id="main_product" data-nubesdk-section-index="1" ></div>
<div data-nubesdk-slot="before_dynamic_section_product-list_1782228052519" data-nubesdk-section-type="product-list" data-nubesdk-section-id="product-list_1782228052519" data-nubesdk-section-index="2"></div>
<div data-nubesdk-section-id="related-products-alternative_products" data-nubesdk-section-type="related-products"></div>
<div data-nubesdk-slot="before_dynamic_section_alternative_products" data-nubesdk-section-type="related-products" data-nubesdk-section-id="alternative_products" data-nubesdk-section-index="3" ></div>`;

test("lugares por sección: del HTML, con su orden, y resueltos en otra carga con otros ids", () => {
  const s = seccionesDelHtml(HTML);
  assert.deepEqual(s.map((x) => x.sectionId), ["main_product", "product-list_1782228052519", "alternative_products"]);
  assert.deepEqual(conOrden(s).map((x) => `${x.sectionType}:${x.n}`), ["main-product:1", "product-list:1", "related-products:1"]);
  const lugar = lugarDinamico("after", "product-list", 1);
  assert.deepEqual(leerDinamico(lugar), { lado: "after", tipo: "product-list", n: 1 });
  // En la carga siguiente la sección tiene otro id: se encuentra por tipo y orden.
  const enPagina: Dinamico[] = [
    { type: "before_dynamic_section", sectionType: "product-list", sectionId: "product-list_99", sectionIndex: 4, slotId: "before_dynamic_section_product-list_99" },
    { type: "after_dynamic_section", sectionType: "product-list", sectionId: "product-list_99", sectionIndex: 4, slotId: "after_dynamic_section_product-list_99" },
    { type: "after_dynamic_section", sectionType: "product-list", sectionId: "product-list_98", sectionIndex: 2, slotId: "after_dynamic_section_product-list_98" },
  ];
  assert.equal(resolverDinamico(lugar, enPagina), "after_dynamic_section_product-list_98");
  assert.equal(resolverDinamico(lugarDinamico("after", "product-list", 2), enPagina), "after_dynamic_section_product-list_99");
  assert.equal(resolverDinamico(lugarDinamico("before", "banners", 1), enPagina), undefined);
  assert.equal(leerDinamico("after_product_detail_name"), null);
});

test("el lugar fijo de una sección es el dinámico de la primera de su tipo", () => {
  assert.ok(mismoLugar("after_dynamic_section_main_product", lugarDinamico("after", "main-product", 1)));
  assert.ok(!mismoLugar("after_dynamic_section_main_product", lugarDinamico("before", "main-product", 1)));
  assert.ok(mismoLugar("after_product_detail_price", "after_product_detail_price"));
});

test("en un theme clásico, los lugares de sección van a los fijos que dibuja", () => {
  assert.equal(lugarClasico(lugarDinamico("after", "main-product", 1)), "after_product_description");
  assert.equal(lugarClasico("after_dynamic_section_main_product"), "after_product_description");
  assert.equal(lugarClasico(lugarDinamico("after", "product-list", 2)), "before_footer");
  assert.equal(lugarClasico("before_product_detail_add_to_cart"), undefined);
});

test("los nombres de lugares y secciones en portugués", () => {
  assert.deepEqual(Object.keys(LUGARES_PT).sort(), Object.keys(LUGARES).sort());
  const ficha = { sectionType: "main-product", sectionId: "main_product" };
  assert.equal(lugarDeSeccion("after", ficha), "Después de la ficha del producto (main product)");
  assert.equal(lugarDeSeccion("before", ficha, "pt"), "Antes da página do produto (main product)");
  assert.equal(lugarDeSeccion("after", { sectionType: "nueva", sectionId: "x" }, "pt"), "Depois de nueva (x)");
  assert.equal(tituloDeSeccion("main-product", "pt"), "Informações do produto");
  assert.equal(tituloDeSeccion("main-product"), "Información del producto");
});
