import { test } from "node:test";
import assert from "node:assert/strict";
import { firmarSesion, tiendaDeSesion } from "./sesion.ts";

test("el token de sesión del panel: firma, vencimiento y tienda", async () => {
  const ahora = 1_800_000_000;
  const bueno = await firmarSesion({ storeId: 8359789, exp: ahora + 60 }, "secreto");
  assert.equal(await tiendaDeSesion(bueno, ["secreto"], ahora), "8359789");
  // Con el secreto del modo desarrollador sólo si se lo pasa.
  const dev = await firmarSesion({ storeId: 8359789, exp: ahora + 60 }, "THE_SECRET");
  assert.equal(await tiendaDeSesion(dev, ["secreto"], ahora), null);
  assert.equal(await tiendaDeSesion(dev, ["secreto", "THE_SECRET"], ahora), "8359789");
  // Vencido, adulterado, sin tienda, con otro algoritmo.
  assert.equal(await tiendaDeSesion(await firmarSesion({ storeId: 1, exp: ahora - 120 }, "secreto"), ["secreto"], ahora), null);
  const [c, , f] = bueno.split(".");
  const otro = Buffer.from(JSON.stringify({ storeId: 1, exp: ahora + 60 })).toString("base64url");
  assert.equal(await tiendaDeSesion(`${c}.${otro}.${f}`, ["secreto"], ahora), null);
  assert.equal(await tiendaDeSesion(await firmarSesion({ exp: ahora + 60 }, "secreto"), ["secreto"], ahora), null);
  const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${otro}.`;
  assert.equal(await tiendaDeSesion(none, ["secreto"], ahora), null);
  assert.equal(await tiendaDeSesion("basura", ["secreto"], ahora), null);
});
