import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATEGORIAS } from "./catalogo.ts";
import { PT, fijarIdioma, t } from "./textos.ts";

const fuentes = ["main.tsx", "inicio.tsx", "formulario.tsx"].map((f) => readFileSync(`src/panel/${f}`, "utf8")).join("\n");
const cadena = String.raw`"((?:[^"\\]|\\.)*)"`;

test("cada texto del panel con t() tiene su traducción al portugués", () => {
  // t("…") y t(condición ? "…" : "…").
  const usados = [...fuentes.matchAll(new RegExp(String.raw`\bt\(\s*(?:[\w.!]+(?:\s*===\s*\d+)?\s*\?\s*)?${cadena}(?:\s*:\s*${cadena})?`, "g"))].flatMap((m) => [m[1]!, m[2]].filter((x) => x !== undefined));
  // Los que pasan por t() desde una constante: las páginas, el banner y las categorías.
  const constantes = [...fuentes.matchAll(new RegExp(String.raw`(?:nombre|titulo|texto|boton): ${cadena}`, "g"))].map((m) => m[1]!);
  const faltan = [...new Set([...usados, ...constantes, ...CATEGORIAS])].filter((s) => !(s in PT));
  assert.ok(usados.length > 150, `encontró ${usados.length}`);
  assert.deepEqual(faltan, []);
});

test("el idioma sale de la tienda: Brasil o portugués es pt; el resto, español", () => {
  fijarIdioma({ country: "BR", language: "pt" });
  assert.equal(t("Guardar y publicar"), "Salvar e publicar");
  assert.equal(t("No se pudo guardar ({x}).", { x: "500" }), "Não foi possível salvar (500).");
  fijarIdioma({ country: "AR", language: "es" });
  assert.equal(t("Guardar y publicar"), "Guardar y publicar");
  fijarIdioma({ country: "MX", language: "pt" });
  assert.equal(t("Guardar y publicar"), "Salvar e publicar");
});
