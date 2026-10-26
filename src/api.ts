/**
 * Lo que el Worker lee de la API de Tiendanube con el token de la tienda: otros productos (los que un widget elige por
 * handle, como `all_products[...]` o un ajuste `product` en Shopify) y los metacampos, en el formato que el script le
 * manda al iframe (src/w/producto.ts). Sólo productos publicados; del stock, sólo si hay.
 */
import type { ProductoTN } from "./w/producto.ts";

/** Pide una ruta de la API de la tienda y devuelve el JSON (o null si no se pudo). */
export type Api = (ruta: string) => Promise<unknown>;

/** Los metacampos de un producto como los lee el Liquid: `product.metafields.<namespace>.<key>`. */
export type Metacampos = Record<string, Record<string, string>>;
export type ProductoConMetacampos = ProductoTN & { metacampos?: Metacampos };

type Idiomas = Record<string, string> | string | null | undefined;
type ProductoApi = {
  id: number; name: Idiomas; handle: Idiomas; canonical_url?: string; published?: boolean; attributes?: Idiomas[];
  images?: { id: number; src: string; alt?: Idiomas[] | Idiomas }[];
  variants?: { id: number; price: string | null; promotional_price?: string | null; compare_at_price?: string | null; stock?: number | null; stock_management?: boolean; values?: Idiomas[]; image_id?: number | null }[];
};

const texto = (x: Idiomas) => (x && typeof x === "object" ? x.es ?? Object.values(x)[0] ?? "" : String(x ?? ""));
const plata = (x: string | null | undefined) => (x == null || x === "" ? null : Number(x));
const CAMPOS = "id,name,handle,canonical_url,published,attributes,images,variants";

/**
 * Un producto de la API como el de la ficha. El precio de venta es el promocional si lo hay, y el de antes, el precio
 * normal (en NubeSDK son `price` y `compare_at_price`). [VERIFICAR] contra una ficha real que el precio tachado coincida.
 */
export function aProductoTN(p: ProductoApi): ProductoTN {
  const imagenes = p.images ?? [];
  const handle = texto(p.handle);
  return {
    id: p.id, nombre: texto(p.name), handle, url: p.canonical_url ?? `/productos/${handle}/`,
    imagenes: imagenes.map((i) => ({ src: i.src, alt: Array.isArray(i.alt) ? texto(i.alt[0]) : texto(i.alt) || undefined })),
    opciones: (p.attributes ?? []).map(texto),
    variantes: (p.variants ?? []).map((v) => {
      const promo = plata(v.promotional_price);
      const precio = promo ?? plata(v.price) ?? 0;
      // Sin rebaja la API da el precio normal también como "antes" (lgademo, 24-oct): va vacío, como en la ficha.
      const antes = promo != null ? plata(v.price) : plata(v.compare_at_price);
      return {
        id: v.id, precio, precioAntes: antes != null && antes > precio ? antes : null,
        disponible: !v.stock_management || v.stock == null || v.stock > 0,
        valores: (v.values ?? []).map(texto), imagen: imagenes.find((i) => i.id === v.image_id)?.src ?? null,
      };
    }),
  };
}

/**
 * Los metacampos de un producto, más los campos personalizados del admin de Tiendanube (Configuración > Campos
 * personalizados; la API de Custom Fields los da por nombre). Los widgets de Gadsden leen `custom.<clave>`: ahí van
 * también, sin pisar uno que ya esté, las claves de otros namespaces y los campos personalizados por su nombre.
 * Probado con un campo del admin (24-oct, lgademo): llega a custom.<nombre>. Los de imagen (25-oct) sólo vienen en la
 * versión `unstable`, como "@media-lib:<id>": van como la dirección de la imagen.
 */
async function metacampos(api: Api, id: number): Promise<Metacampos> {
  const [xs, campos] = await Promise.all([
    api(`/metafields/products?owner_id=${id}&per_page=200&fields=namespace,key,value`) as Promise<{ namespace: string; key: string; value: string }[] | null>,
    (api(`unstable:/products/${id}/custom-fields`).then((x) => x ?? api(`/products/${id}/custom-fields`))) as Promise<{ name: string; value: unknown; value_type?: string }[] | null>,
  ]);
  const out: Metacampos = {};
  for (const m of Array.isArray(xs) ? xs : []) (out[m.namespace] ??= {})[m.key] = m.value;
  const custom: Record<string, string> = (out.custom ??= {});
  for (const [ns, claves] of Object.entries(out)) if (ns !== "custom") for (const [k, v] of Object.entries(claves)) custom[k] ??= v;
  const valores = await Promise.all((Array.isArray(campos) ? campos : []).map(async (c) =>
    [c.name, c.value_type === "media" ? await urlDeImagen(api, c.value) : Array.isArray(c.value) ? c.value.join(", ") : c.value] as const));
  for (const [k, v] of valores) if (k && v != null && v !== "") custom[k] ??= String(v);
  if (!Object.keys(custom).length) delete out.custom;
  return out;
}

/**
 * Un campo de imagen ("@media-lib:<id>") a la dirección de la imagen original: `/store-media/<id>` pide el permiso de la
 * biblioteca de medios; sin él, vacío. Medido el 25-oct: trae `original_file_url` y `thumbnail_url` (AVIF de 800 px).
 */
async function urlDeImagen(api: Api, v: unknown) {
  const id = /^@media-lib:(.+)$/.exec(String(v))?.[1];
  const m = id ? ((await api(`unstable:/store-media/${id}`)) as { original_file_url?: string; thumbnail_url?: string } | null) : null;
  return m?.original_file_url ?? m?.thumbnail_url ?? "";
}

/** Los productos pedidos por handle (hasta 10) con sus metacampos, y los metacampos de la ficha si se piden. */
export async function leerProductos(api: Api, handles: string[], idFicha?: number) {
  const encontrados = await Promise.all(handles.slice(0, 10).map(async (h) => {
    const xs = (await api(`/products?handle=${encodeURIComponent(h)}&published=true&fields=${CAMPOS}`)) as ProductoApi[] | null;
    const p = Array.isArray(xs) ? xs.find((x) => x.published !== false) : undefined;
    return p ? { ...aProductoTN(p), metacampos: await metacampos(api, p.id) } satisfies ProductoConMetacampos : null;
  }));
  return { productos: encontrados.filter((p) => p !== null), metacampos: idFicha ? await metacampos(api, idFicha) : {} };
}
