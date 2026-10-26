/**
 * Lo mínimo que pide Tiendanube a una app, al lado de los archivos estáticos (dist/):
 * - /callback: adonde vuelve el comerciante al instalar. La instalación se completa recién cuando la app canjea el
 *   `code` por un token. El token se guarda en KV (TOKENS, clave: el id de la tienda) para leer otros productos y sus
 *   metacampos con la API; nunca se loguea ni sale del Worker.
 * - /productos/<tienda>?handles=a,b&metacampos=<id de la ficha>: los otros productos que piden los widgets y los
 *   metacampos, leídos con ese token (src/api.ts). Cinco minutos en la caché de Cloudflare.
 * - /config/<tienda>.json: la configuración de los widgets de la tienda, la que lee el script de NubeSDK. La guarda el
 *   panel en KV (clave `config:<tienda>`); si no hay, 404 (sin widgets).
 * - /api/*: el panel (dist/panel/, dentro del admin de Tiendanube con Nexo). Cada pedido lleva el token de sesión de
 *   Nexo (src/sesion.ts) y la tienda sale de ahí: config (leer y guardar), productos (buscar) e imagen (subir; se sirve
 *   en /img/<tienda>/<id>).
 * - /tienda/<tienda>/<ruta>: la vista previa del editor del panel (una página de la tienda con los widgets y la capa de
 *   edición; tiendaEnEditor).
 * - /webhooks/store-redact, /customers-redact, /customers-data-request: obligatorios, con la firma de Tiendanube
 *   (x-linkedstore-hmac-sha256). Al desinstalar, store-redact borra el token; de compradores no se guarda nada.
 */
type KV = {
  get(k: string): Promise<string | null>;
  getWithMetadata<M>(k: string, tipo: "arrayBuffer"): Promise<{ value: ArrayBuffer | null; metadata: M | null }>;
  put(k: string, v: string | ArrayBuffer, op?: { metadata?: unknown }): Promise<void>;
  delete(k: string): Promise<void>;
  list(op: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
};
import { leerProductos, type Api } from "./src/api.ts";
import { tiendaDeSesion } from "./src/sesion.ts";
import { seccionesDelHtml } from "./src/lugares.ts";

/** SESION_DESARROLLO = "1": acepta también los tokens del modo desarrollador del portal (firmados con "THE_SECRET"). */
interface Env { ASSETS: { fetch: (r: Request) => Promise<Response> }; CLIENT_ID: string; CLIENT_SECRET?: string; SESION_DESARROLLO?: string; TOKENS: KV }

const WEBHOOKS = new Set(["/webhooks/store-redact", "/webhooks/customers-redact", "/webhooks/customers-data-request"]);

// Una ruta que empieza con "unstable:" va a esa versión de la API (los campos personalizados de imagen y la biblioteca de
// medios sólo están ahí, 25-oct). Con `cuerpo`, un POST con JSON.
const pedir = (token: string, tienda: number | string, ruta: string, cuerpo?: unknown) => fetch(`https://api.tiendanube.com/${ruta.startsWith("unstable:") ? `unstable/${tienda}${ruta.slice(9)}` : `2025-03/${tienda}${ruta}`}`, {
  ...(cuerpo !== undefined && { method: "POST", body: JSON.stringify(cuerpo) }),
  headers: { Authorization: `Bearer ${token}`, "User-Agent": "Gadsden Widgets (admin@lga-arg.com)", ...(cuerpo !== undefined && { "Content-Type": "application/json" }) },
});

type Medio = { id: string; original_filename?: string; thumbnail_url?: string; original_file_url?: string };
/**
 * Sube una imagen a la biblioteca de medios de la tienda (la de "O elegí de la biblioteca" del admin): pide la dirección
 * de subida, sube el archivo ahí (sin el token) y la confirma (409 = ya estaba). Devuelve la dirección pública.
 * Pide el permiso de la biblioteca de medios (escritura); sin él, falla y el panel sube al KV como antes.
 */
async function subirABiblioteca(acceso: string, tienda: string, datos: ArrayBuffer, tipo: string, nombre: string) {
  const meta = { original_filename: nombre, mime_type: tipo, file_size_bytes: datos.byteLength };
  const p = await pedir(acceso, tienda, "unstable:/store-media/presign", meta);
  if (!p.ok) throw new Error(`presign ${p.status}`);
  const { id, upload_url } = (await p.json()) as { id: string; upload_url: string };
  const s = await fetch(upload_url, { method: "PUT", body: datos, headers: { "Content-Type": tipo } });
  if (!s.ok) throw new Error(`subida ${s.status}`);
  const c = await pedir(acceso, tienda, `unstable:/store-media/${id}/confirm`, meta);
  if (!c.ok && c.status !== 409) throw new Error(`confirmar ${c.status}`);
  const m = (await c.json()) as Medio;
  // La confirmación no siempre trae la dirección del original (la doc no la lista): se pide la imagen.
  const url = m.original_file_url ?? ((await (await pedir(acceso, tienda, `unstable:/store-media/${m.id ?? id}`)).json()) as Medio).original_file_url;
  if (!url) throw new Error("sin dirección");
  return url;
}
/** La firma de los webhooks: HMAC-SHA256 del cuerpo con el client secret, en hexadecimal. */
async function firmaValida(cuerpo: string, firma: string | null, secreto?: string) {
  if (!firma || !secreto) return false;
  const t = new TextEncoder();
  const clave = await crypto.subtle.importKey("raw", t.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hex = [...new Uint8Array(await crypto.subtle.sign("HMAC", clave, t.encode(cuerpo)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const f = firma.trim().toLowerCase();
  let dif = hex.length ^ f.length;
  for (let i = 0; i < hex.length; i++) dif |= hex.charCodeAt(i) ^ (f.charCodeAt(i) || 0);
  return dif === 0;
}

/** Los productos para un widget: con la caché de Cloudflare adelante (cinco minutos), para no gastar la API por visita. */
async function productos(req: Request, env: Env, tienda: string, q: URLSearchParams) {
  const cache = (globalThis as unknown as { caches?: { default: { match(r: Request): Promise<Response | undefined>; put(r: Request, x: Response): Promise<void> } } }).caches?.default;
  const guardada = await cache?.match(req);
  if (guardada) return guardada;
  const token = await env.TOKENS.get(tienda);
  if (!token) return Response.json({ productos: [], metacampos: {} }, { status: 404 });
  const api: Api = (ruta) => pedir(token, tienda, ruta).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  const handles = (q.get("handles") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  const ficha = Number(q.get("metacampos")) || undefined;
  const r = Response.json(await leerProductos(api, handles, ficha), { headers: { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" } });
  await cache?.put(req, r.clone());
  return r;
}

/** La configuración que lee el script: sin caché, para que un cambio del panel se vea al recargar la tienda. */
async function config(req: Request, env: Env, tienda: string) {
  const cabeceras = { "Content-Type": "application/json", "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*" };
  const guardada = await env.TOKENS.get(`config:${tienda}`);
  // Sin configuración guardada no hay widgets (antes salía la de fábrica de las tiendas de prueba: al reinstalar
  // volvían los widgets de ejemplo en vez de arrancar vacía).
  return guardada ? new Response(guardada, { headers: cabeceras }) : Response.json(null, { status: 404, headers: cabeceras });
}

/** La config guardada, o la de fábrica, o una vacía (para el panel). */
async function configDe(req: Request, env: Env, tienda: string): Promise<string> {
  const r = await config(req, env, tienda);
  return r.ok ? r.text() : JSON.stringify({ widgets: [] });
}

const IMAGENES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "video/mp4", "video/webm"]);

/** El panel: todo pide el token de sesión de Nexo; la tienda es la del token. */
async function api(req: Request, env: Env, ruta: string, q: URLSearchParams): Promise<Response> {
  const token = /^Bearer (.+)$/.exec(req.headers.get("Authorization") ?? "")?.[1] ?? "";
  const tienda = await tiendaDeSesion(token, [env.CLIENT_SECRET ?? "", env.SESION_DESARROLLO === "1" ? "THE_SECRET" : ""]);
  if (!tienda) return Response.json({ error: "sesion" }, { status: 401 });
  if (ruta === "config" && req.method === "GET") return new Response(await configDe(req, env, tienda), { headers: { "Content-Type": "application/json" } });
  if (ruta === "config" && req.method === "PUT") {
    const texto = await req.text();
    if (texto.length > 500_000) return Response.json({ error: "grande" }, { status: 413 });
    const c = JSON.parse(texto || "null") as { widgets?: unknown } | null;
    if (!c || typeof c !== "object" || !Array.isArray(c.widgets)) return Response.json({ error: "formato" }, { status: 400 });
    await env.TOKENS.put(`config:${tienda}`, texto);
    return Response.json({ ok: true, tienda });
  }
  if (ruta === "productos") {
    const acceso = await env.TOKENS.get(tienda);
    if (!acceso) return Response.json({ error: "token", productos: [] }, { status: 409 });
    const r = await pedir(acceso, tienda, `/products?${q.get("q") ? `q=${encodeURIComponent(q.get("q")!)}&` : ""}published=true&per_page=20&fields=id,name,handle,images`).catch(() => null);
    const xs = (r?.ok ? await r.json() : []) as { id: number; name: Record<string, string>; handle: Record<string, string>; images?: { src: string }[] }[];
    const t = (x: Record<string, string> | string) => (typeof x === "string" ? x : x.es ?? Object.values(x)[0] ?? "");
    return Response.json({ productos: xs.map((p) => ({ id: p.id, nombre: t(p.name), handle: t(p.handle), imagen: p.images?.[0]?.src ?? null })) });
  }
  // Las secciones de la ficha de producto de la tienda (para "antes o después de la sección X"): las que trae el HTML
  // público de la ficha del primer producto publicado (Ipanema las marca con data-nubesdk-section-*).
  if (ruta === "secciones") {
    const acceso = await env.TOKENS.get(tienda);
    if (!acceso) return Response.json({ error: "token", producto: [] }, { status: 409 });
    const r = await pedir(acceso, tienda, "/products?published=true&per_page=1&fields=canonical_url").catch(() => null);
    const url = ((r?.ok ? await r.json() : []) as { canonical_url?: string }[])[0]?.canonical_url;
    if (!url || !/^https:\/\//.test(url)) return Response.json({ producto: [] });
    const html = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Gadsden Widgets)" } }).then((x) => (x.ok ? x.text() : "")).catch(() => "");
    return Response.json({ producto: seccionesDelHtml(html), url });
  }
  // La biblioteca de medios de la tienda, para "O elegí de la biblioteca" del selector de imagen.
  // ponytail: las primeras 100 (el tope de la API por página); filtrar por nombre o paginar si una tienda tiene más.
  if (ruta === "biblioteca") {
    const acceso = await env.TOKENS.get(tienda);
    if (!acceso) return Response.json({ error: "token", imagenes: [] }, { status: 409 });
    const r = await pedir(acceso, tienda, "unstable:/store-media?media_type=image&limit=100").catch(() => null);
    if (!r?.ok) return Response.json({ error: `biblioteca ${r?.status ?? "red"}`, imagenes: [] }, { status: 502 });
    const { data = [] } = (await r.json()) as { data?: Medio[] };
    return Response.json({ imagenes: data.filter((m) => m.original_file_url).map((m) => ({ id: m.id, url: m.original_file_url, miniatura: m.thumbnail_url ?? m.original_file_url, nombre: m.original_filename ?? "" })) });
  }
  if (ruta === "imagen" && req.method === "POST") {
    const tipo = (req.headers.get("Content-Type") ?? "").split(";")[0]!;
    if (!IMAGENES.has(tipo)) return Response.json({ error: "tipo" }, { status: 415 });
    const datos = await req.arrayBuffer();
    // Primero a la biblioteca de medios de la tienda (hasta 20 MB); si no se puede, al KV como antes (hasta 5 MB).
    const acceso = await env.TOKENS.get(tienda);
    const nombre = decodeURIComponent(req.headers.get("X-Nombre") ?? "") || `imagen.${tipo.split("/")[1]}`;
    if (acceso && datos.byteLength <= 20_000_000) {
      const url = await subirABiblioteca(acceso, tienda, datos, tipo, nombre).catch((e) => { console.log("[biblioteca]", String(e)); return null; });
      if (url) return Response.json({ url });
    }
    if (datos.byteLength > 5_000_000) return Response.json({ error: "grande" }, { status: 413 });
    const id = crypto.randomUUID();
    await env.TOKENS.put(`img:${tienda}:${id}`, datos, { metadata: { tipo } });
    return Response.json({ url: `${new URL(req.url).origin}/img/${tienda}/${id}` });
  }
  return Response.json({ error: "ruta" }, { status: 404 });
}

/** Una imagen subida desde el panel (KV `img:<tienda>:<id>`), para siempre en caché. */
async function imagen(env: Env, tienda: string, id: string) {
  const { value, metadata } = await env.TOKENS.getWithMetadata<{ tipo: string }>(`img:${tienda}:${id}`, "arrayBuffer");
  if (!value) return new Response(null, { status: 404 });
  return new Response(value, { headers: { "Content-Type": metadata?.tipo ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" } });
}

/**
 * La vista previa del editor del panel: una página pública de la tienda, traída por el Worker. La tienda sólo deja que la
 * enmarque su propio dominio (frame-ancestors), así que el panel no la puede mostrar directo. Va con <base> (sus links y
 * archivos siguen apuntando a la tienda) y con dist/editor.js (src/vista.ts, EDITOR), que dibuja los widgets y la capa de
 * edición. Sólo páginas de la tienda de ese id (el dominio sale de la API, con su token). El panel la abre en un iframe
 * con sandbox sin allow-same-origin: los scripts de la tienda corren en un origen aparte y no tocan el panel.
 */
async function tiendaEnEditor(req: Request, env: Env, tienda: string, ruta: string, busqueda: string) {
  let dominio = await env.TOKENS.get(`dominio:${tienda}`);
  if (!dominio) {
    const acceso = await env.TOKENS.get(tienda);
    if (!acceso) return pagina("Gadsden Widgets", "Falta instalar la app en esta tienda.", 409);
    const r = await pedir(acceso, tienda, "/store?fields=original_domain").catch(() => null);
    dominio = ((r?.ok ? await r.json() : {}) as { original_domain?: string }).original_domain ?? null;
    if (!dominio || !/^[a-z0-9.-]+$/i.test(dominio)) return pagina("Gadsden Widgets", "No encontramos la tienda.", 404);
    await env.TOKENS.put(`dominio:${tienda}`, dominio);
  }
  const r = await fetch(`https://${dominio}${ruta}${busqueda}`, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", "Accept-Language": "es-AR,es;q=0.9" } });
  const origen = new URL(req.url).origin;
  const html = (await r.text())
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy[^>]*>/gi, "")
    .replace(/<head([^>]*)>/i, `<head$1><base href="https://${dominio}/">`)
    .replace(/<\/body>/i, `<script src="${origen}/editor.js"></script></body>`);
  return new Response(html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

const pagina = (titulo: string, texto: string, status = 200) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${titulo}</title>` +
  `<p style="font:16px system-ui;margin:40px;max-width:560px">${texto}</p>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname, searchParams } = new URL(req.url);
    if (WEBHOOKS.has(pathname)) {
      if (req.method !== "POST") return new Response(null, { status: 405 });
      const cuerpo = await req.text();
      if (!(await firmaValida(cuerpo, req.headers.get("x-linkedstore-hmac-sha256"), env.CLIENT_SECRET))) return new Response(null, { status: 401 });
      if (pathname === "/webhooks/store-redact") {
        const tienda = (JSON.parse(cuerpo || "{}") as { store_id?: number }).store_id;
        if (tienda) {
          await Promise.all([env.TOKENS.delete(String(tienda)), env.TOKENS.delete(`config:${tienda}`), env.TOKENS.delete(`dominio:${tienda}`)]);
          // Las imágenes que subió desde el panel.
          for (let cursor: string | undefined, fin = false; !fin;) {
            const l = await env.TOKENS.list({ prefix: `img:${tienda}:`, cursor });
            await Promise.all(l.keys.map((k) => env.TOKENS.delete(k.name)));
            [cursor, fin] = [l.cursor, l.list_complete];
          }
        }
      }
      return new Response(null, { status: 200 });
    }
    const deApi = /^\/api\/([a-z]+)$/.exec(pathname);
    if (deApi) return api(req, env, deApi[1]!, searchParams).catch(() => Response.json({ error: "interno" }, { status: 500 }));
    const deImagen = /^\/img\/(\d+)\/([0-9a-f-]{36})$/.exec(pathname);
    if (deImagen) return imagen(env, deImagen[1]!, deImagen[2]!);
    const deConfig = /^\/config\/(\d+)\.json$/.exec(pathname);
    if (deConfig) return config(req, env, deConfig[1]!);
    const deTienda = /^\/tienda\/(\d+)(\/[^]*)?$/.exec(pathname);
    if (deTienda && !deTienda[2]?.startsWith("//")) return tiendaEnEditor(req, env, deTienda[1]!, deTienda[2] ?? "/", new URL(req.url).search);
    const deProductos = /^\/productos\/(\d+)$/.exec(pathname);
    if (deProductos) return productos(req, env, deProductos[1]!, searchParams);
    if (pathname !== "/callback") return env.ASSETS.fetch(req);

    const code = searchParams.get("code");
    if (!code) return pagina("Gadsden Widgets", "Falta el código de instalación. Instalá la app desde Tiendanube.", 400);
    if (!env.CLIENT_SECRET) return pagina("Gadsden Widgets", "La app no está configurada (falta CLIENT_SECRET).", 500);
    const r = await fetch("https://www.tiendanube.com/apps/authorize/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET, grant_type: "authorization_code", code }),
    });
    const datos = (await r.json().catch(() => ({}))) as { access_token?: string; user_id?: number; scope?: string; error?: string; error_description?: string };
    if (!datos.access_token) {
      console.log("canje fallido", r.status, datos.error ?? "", datos.error_description ?? "");
      return pagina("Gadsden Widgets", "No se pudo completar la instalación. Volvé a instalar la app desde Tiendanube.", 502);
    }
    await env.TOKENS.put(String(datos.user_id), datos.access_token);
    // Instalada: al panel dentro del admin de la tienda, como TicketUp (la homologación pide que la app abra en el admin).
    const r2 = await pedir(datos.access_token, datos.user_id!, "/store?fields=original_domain").catch(() => null);
    const dominio = ((r2?.ok ? await r2.json() : {}) as { original_domain?: string }).original_domain;
    if (dominio && /^[a-z0-9.-]+$/i.test(dominio)) {
      await env.TOKENS.put(`dominio:${datos.user_id}`, dominio);
      return Response.redirect(`https://${dominio}/admin/apps/${env.CLIENT_ID}`, 302);
    }
    return pagina("Gadsden Widgets", "Gadsden Widgets quedó instalada. Abrila desde Mis aplicaciones en el admin de tu tienda.");
  },
};
