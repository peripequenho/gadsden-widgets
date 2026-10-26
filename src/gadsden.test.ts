import { test } from "node:test";
import assert from "node:assert/strict";
import { juntarUniones } from "./gadsden.ts";

test("gad-merge se lleva las dos secciones de sus anclas (con handleize) y las demás quedan sueltas", () => {
  const texto = { seccion: { type: "gad-divider", settings: { anchor: "Texto Único" } } };
  const video = { seccion: { type: "gad-guarantee", settings: { anchor: "video" } } };
  const otra = { seccion: { type: "gad-tabs", settings: { anchor: "otra" } } };
  const union = { seccion: { type: "gad-merge", settings: { anchor_1: "#texto-unico", anchor_2: "video" } } };
  const { widgets, junto } = juntarUniones([texto, union, video, otra]);
  assert.deepEqual(widgets, [union, otra]);
  assert.deepEqual(junto.get(union), [texto.seccion, video.seccion]);
});
