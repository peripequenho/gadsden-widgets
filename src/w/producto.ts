/**
 * El producto de la ficha de Tiendanube (lo que el script lee de NubeSDK) como el objeto `product` de Shopify que lee
 * el Liquid de Gadsden: precios en centavos, variantes con option1..3, `selected_or_first_available_variant`.
 */
import { imagen } from "./motor.ts";

export type ProductoTN = {
  id: number; nombre: string; handle: string; url: string;
  imagenes: { src: string; alt?: string; width?: number; height?: number }[];
  opciones: string[];
  variantes: { id: number; precio: number; precioAntes: number | null; disponible: boolean; valores: string[]; imagen?: string | null }[];
};

/** Un metacampo como lo da Shopify: se imprime solo y tiene `.value`. */
const metacampo = (v: string) => ({ value: v, toString: () => v, valueOf: () => v });
/** Los metacampos de la API (src/api.ts) como `product.metafields.<namespace>.<key>`; o lo que se pase (un Proxy). */
export const metafieldsLiquid = (m: Record<string, Record<string, string>>) =>
  Object.fromEntries(Object.entries(m).map(([ns, xs]) => [ns, Object.fromEntries(Object.entries(xs).map(([k, v]) => [k, metacampo(v)]))]));

const centavos = (pesos: number | null | undefined) => (pesos == null ? null : Math.round(pesos * 100));

export function productoLiquid(p: ProductoTN, varianteId?: number, metafields: object = {}) {
  const imgs = p.imagenes.map((i) => imagen(i.src, i.width ?? 1000, i.height ?? 1000, i.alt ?? p.nombre));
  const variants = p.variantes.map((v, i) => ({
    id: v.id, title: v.valores.join(" / ") || "Default Title", price: centavos(v.precio), compare_at_price: centavos(v.precioAntes),
    available: v.disponible, option1: v.valores[0] ?? null, option2: v.valores[1] ?? null, option3: v.valores[2] ?? null,
    options: v.valores, featured_image: v.imagen ? imagen(v.imagen) : imgs[0] ?? null, position: i + 1,
    unit_price_measurement: null, requires_selling_plan: false, inventory_management: null,
  }));
  const elegida = variants.find((v) => v.id === varianteId) ?? variants.find((v) => v.available) ?? variants[0];
  const precios = variants.map((v) => v.price ?? 0);
  const media = imgs.map((i, k) => ({ ...i, id: k + 1, media_type: "image", preview_image: i }));
  return {
    id: p.id, title: p.nombre, handle: p.handle, url: p.url, available: variants.some((v) => v.available),
    featured_image: imgs[0] ?? null, images: imgs, media, featured_media: media[0] ?? null,
    variants, selected_variant: elegida, selected_or_first_available_variant: elegida, first_available_variant: elegida,
    has_only_default_variant: variants.length <= 1 && !p.opciones.length,
    options: p.opciones, options_with_values: p.opciones.map((name, i) => ({
      name, position: i + 1, values: [...new Set(variants.map((v) => v.options[i]).filter(Boolean))], selected_value: elegida?.options[i] ?? null,
    })),
    price: elegida?.price ?? 0, compare_at_price: elegida?.compare_at_price ?? null,
    price_min: Math.min(...precios), price_max: Math.max(...precios), price_varies: new Set(precios).size > 1,
    compare_at_price_max: Math.max(...variants.map((v) => v.compare_at_price ?? 0)),
    metafields, tags: [], vendor: "", type: "",
  };
}
