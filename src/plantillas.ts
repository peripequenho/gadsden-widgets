/**
 * Las plantillas de producto, como las de Tiendanube (Editar diseño > Producto > Crear plantilla): la ficha base y otras
 * fichas para algunos productos. Cada producto usa una sola: la plantilla que lo tiene o, si ninguna, la base.
 *
 * Los widgets de la ficha son de una plantilla (`plantilla` con su id; sin `plantilla`, de la base). Los de los lugares
 * comunes a toda la tienda (debajo del encabezado, arriba del pie, los fijos en la pantalla) son de todas, como el
 * encabezado y el pie de página en Tiendanube.
 */
import type { Config, Widget } from "./config.ts";

/** `vista`: el nombre y el handle de cada producto, para el panel (los chips y la vista previa). */
export type Plantilla = { id: string; nombre: string; productos: number[]; vista?: { id: number; nombre: string; handle: string }[] };

const COMUNES = new Set(["after_header", "before_main_content", "before_footer"]);
/** Si un lugar es de toda la tienda (no de una plantilla). */
export const esComun = (lugar?: string) => !!lugar && (COMUNES.has(lugar) || /^(edge|corner)_/.test(lugar));

/** La plantilla de un producto (undefined: la base). */
export const plantillaDe = (cfg: Pick<Config, "plantillas">, producto?: number) =>
  producto === undefined ? undefined : cfg.plantillas?.find((p) => p.productos.includes(producto))?.id;

/** Si un widget se ve en la ficha que usa esta plantilla (undefined: la base). */
export const deLaPlantilla = (w: Widget, lugar: string, plantilla: string | undefined) => esComun(lugar) || (w.plantilla || undefined) === plantilla;
