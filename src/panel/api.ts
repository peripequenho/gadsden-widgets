/** Lo que el panel le pide al Worker (worker.ts, /api/*), siempre con el token de sesión de Nexo. */
import nexo, { getSessionToken } from "@tiendanube/nexo";
import type { Config } from "../config.ts";
import type { SeccionDePagina } from "../lugares.ts";

/** El client id de la app (wrangler.toml); lo pone esbuild al construir. */
declare const CLIENT_ID: string;
export const instancia = nexo.create({ clientId: CLIENT_ID, log: false });

async function pedir(ruta: string, op: RequestInit = {}) {
  const token = await getSessionToken(instancia);
  const r = await fetch(`/api/${ruta}`, { ...op, headers: { ...op.headers, Authorization: `Bearer ${token}` } });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((datos as { error?: string }).error ?? String(r.status));
  return datos;
}

export const leerConfig = () => pedir("config") as Promise<Config>;
export const guardarConfig = (c: Config) => pedir("config", { method: "PUT", body: JSON.stringify(c), headers: { "Content-Type": "application/json" } });
export type ProductoBuscado = { id: number; nombre: string; handle: string; imagen: string | null };
export const buscarProductos = (q: string) => pedir(`productos?q=${encodeURIComponent(q)}`).then((d) => (d as { productos: ProductoBuscado[] }).productos);
export const leerSecciones = () => pedir("secciones").then((d) => (d as { producto: SeccionDePagina[] }).producto);
/** Sube una imagen: a la biblioteca de medios de la tienda si se puede (worker.ts); si no, al Worker. */
export const subirArchivo = (f: File) => pedir("imagen", { method: "POST", body: f, headers: { "Content-Type": f.type, "X-Nombre": encodeURIComponent(f.name) } }).then((d) => (d as { url: string }).url);
export type ImagenBiblioteca = { id: string; url: string; miniatura: string; nombre: string };
/** Las imágenes de la biblioteca de medios de la tienda (las de "O elegí de la biblioteca" del admin). */
export const leerBiblioteca = () => pedir("biblioteca").then((d) => (d as { imagenes: ImagenBiblioteca[] }).imagenes);
