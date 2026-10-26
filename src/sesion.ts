/**
 * El token de sesión del panel: lo da Nexo en el admin de Tiendanube (`getSessionToken`) y el panel lo manda en cada
 * pedido al Worker. Es un JWT firmado con el client secret de la app (HS256, como lo valida la plantilla oficial de apps
 * integradas, TiendaNube/tiendanube-app-native-template-node: passport-jwt con el claim `storeId`). En el modo
 * desarrollador del portal viene firmado con "THE_SECRET" (README de esa plantilla): sólo se acepta si el Worker lo
 * permite (`SESION_DESARROLLO`).
 */

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64(s))) as Record<string, unknown>;

async function firmaHS256(datos: string, secreto: string) {
  const t = new TextEncoder();
  const clave = await crypto.subtle.importKey("raw", t.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", clave, t.encode(datos)));
}

const iguales = (a: Uint8Array, b: Uint8Array) => {
  let dif = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) dif |= a[i]! ^ (b[i] ?? 0);
  return dif === 0;
};

/** La tienda del token si la firma es de alguno de los secretos y no venció; si no, null. */
export async function tiendaDeSesion(token: string, secretos: string[], ahora = Date.now() / 1000): Promise<string | null> {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [cabeza, cuerpo, firma] = partes as [string, string, string];
  try {
    if (json(cabeza).alg !== "HS256") return null;
    const datos = json(cuerpo);
    let valida = false;
    for (const s of secretos) if (s && iguales(await firmaHS256(`${cabeza}.${cuerpo}`, s), b64(firma))) valida = true;
    if (!valida) return null;
    if (typeof datos.exp === "number" && datos.exp < ahora - 30) return null;
    if (typeof datos.nbf === "number" && datos.nbf > ahora + 30) return null;
    const tienda = datos.storeId ?? datos.store_id;
    return tienda != null && /^\d+$/.test(String(tienda)) ? String(tienda) : null;
  } catch {
    return null;
  }
}

/** Arma un token firmado (para las pruebas y el admin simulado del arnés). */
export async function firmarSesion(datos: Record<string, unknown>, secreto: string) {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const base = `${enc({ alg: "HS256", typ: "JWT" })}.${enc(datos)}`;
  const firma = btoa(String.fromCharCode(...(await firmaHS256(base, secreto)))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${base}.${firma}`;
}
