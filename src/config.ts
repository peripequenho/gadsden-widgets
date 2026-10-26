/**
 * La configuración de los widgets de una tienda: qué se muestra, dónde y con qué textos. `DEMO` es la de las tiendas de
 * prueba, con los textos de fábrica de Gadsden (los `default` de cada schema) como contenido de ejemplo.
 *
 * En los textos, lo que va entre ** sale en negrita (en Gadsden, `<strong>`); en los títulos de objeciones, lo que va
 * entre _ va resaltado (en Gadsden, `<em>`). `{ahorro}`, `{porcentaje}`: se reemplazan por la cuenta.
 */

import type { Estilo } from "./estilos.ts";
import type { ConfigGadsden } from "./gadsden.ts";
import type { Tema } from "./w/tema.ts";
import type { Plantilla } from "./plantillas.ts";

/** Un lugar de NubeSDK (src/slots.ts de los tipos). Cada widget trae uno por defecto. */
export type Lugar = string;

type Base = {
  /** Lo nombra el código para pegar (`<div data-gadsden="<id>">`); lo pone el panel. */
  id?: string;
  /** El nombre que le puso el comerciante en el editor (Renombrar); vacío = el del catálogo. */
  nombre?: string;
  /** La plantilla de producto del widget (src/plantillas.ts); vacío = la ficha base. */
  plantilla?: string;
  /** Oculto desde el editor (Ocultar): queda guardado pero no se dibuja. */
  oculto?: boolean;
  /** Dónde se dibuja; vacío = el lugar por defecto del widget. */
  lugar?: Lugar;
  /** Sólo en estos productos (ids); vacío = en todos. */
  productos?: number[];
};

/** Una opción de "llevá más": la cantidad y el % de descuento que aplica la promoción de la tienda. */
export type OpcionCantidad = { cantidad: number; descuento: number; titulo?: string; insignia?: string; beneficio?: string };

/** Un producto del combo, con lo que el widget no puede leer de la página. */
export type ItemCombo = { producto: number; variante: number; nombre: string; precio: number; precioAntes?: number; imagen?: string };

/** Un plan; un punto que empieza con "- " sale tachado (no incluido), como en gad-pricing. */
export type Plan = { nombre: string; cantidad: number; descuento: number; puntos?: string[]; destacado?: boolean; insignia?: string; boton?: string; periodo?: string };

export type Resena = { nombre: string; texto: string; estrellas?: number; titulo?: string; fecha?: string; verificado?: boolean; foto?: string };
export type Punto = { titulo: string; icono?: "mensaje" | "tienda" | "escudo" | "plata" | "calendario" };

export type Widget =
  | (Base & { tipo: "cantidad"; titulo?: string; opciones: OpcionCantidad[]; elegida?: number; ahorro?: string; boton?: string })
  | (Base & { tipo: "combo"; titulo?: string; sumarActual?: boolean; items: ItemCombo[]; descuento: number; total?: string; nota?: string; boton?: string })
  | (Base & { tipo: "planes"; titulo?: string; planes: Plan[] })
  | (Base & { tipo: "estrellas"; nota: number; texto?: string })
  | (Base & { tipo: "testimonios"; titulo?: string; resenas: Resena[] })
  | (Base & { tipo: "trustpilot"; titulo?: string; etiqueta?: string; nota: number; cantidad?: string; plataforma?: string; resenas: Resena[] })
  | (Base & { tipo: "garantia"; dias: number; volanta?: string; titulo: string; chip?: string; texto?: string; puntos?: Punto[]; boton?: string })
  | (Base & { tipo: "objeciones"; volanta?: string; titulo: string; preguntas: { p: string; r: string }[]; abrirPrimera?: boolean; pie?: string })
  | (Base & { tipo: "antesDespues"; titulo?: string; texto?: string; antes: { foto?: string; rotulo?: string }; despues: { foto?: string; rotulo?: string } })
  | (Base & { tipo: "barra"; desde?: number; boton?: string })
  /** Una sección o un bloque de Gadsden tal cual, en un Iframe (src/gadsden.ts). */
  | (Base & { tipo: "gadsden" } & ConfigGadsden)
  | (Base & { tipo: "ctaFinal"; titulo: string; pildora?: string; texto?: string; boton: string; link?: string });

export type Config = {
  /** El estilo de todos los widgets (src/estilos.ts): "tienda" (por defecto), "clasico" u "oscuro". */
  estilo?: Estilo;
  /** Los colores y la letra de la tienda para los widgets de Gadsden (estilo "tienda"; src/w/tema.ts). */
  tema?: Tema;
  widgets: Widget[];
  /** Las otras fichas de producto, cada una con sus productos (src/plantillas.ts). */
  plantillas?: Plantilla[];
};

const resena = (nombre: string, estrellas = 5): Resena => ({
  nombre, estrellas, titulo: "Excelente compra", texto: "Contá acá la experiencia del cliente con sus palabras.", fecha: "Hace 3 días", verificado: true,
});

export const DEMO: Config = {
  widgets: [
    { tipo: "estrellas", nota: 4.8, texto: "4,8 (120 reseñas)" },
    {
      tipo: "cantidad", titulo: "Llevá más y ahorrá", elegida: 0, ahorro: "Ahorrás {ahorro}",
      opciones: [
        { cantidad: 1, descuento: 0, titulo: "1 unidad" },
        { cantidad: 2, descuento: 10, titulo: "2 unidades", insignia: "Más elegido" },
        { cantidad: 3, descuento: 15, titulo: "3 unidades" },
      ],
    },
    {
      tipo: "combo", titulo: "Llevalos **juntos**", sumarActual: true, descuento: 10,
      total: "Total:", nota: "Ahorrás {porcentaje} llevándolos juntos.", boton: "Agregar los elegidos",
      items: [
        { producto: 374291669, variante: 1619178738, nombre: "Producto prueba 1", precio: 10000 },
        { producto: 374291674, variante: 1619178759, nombre: "Producto prueba 2", precio: 5000 },
      ],
    },
    {
      tipo: "planes", titulo: "Elegí tu **plan**",
      planes: [
        { nombre: "Básico", cantidad: 1, descuento: 0, puntos: ["Envío gratis", "Soporte por WhatsApp", "- Regalo de bienvenida"], boton: "Lo quiero" },
        { nombre: "Completo", cantidad: 2, descuento: 10, destacado: true, insignia: "Más elegido", puntos: ["Envío gratis", "Soporte por WhatsApp", "Regalo de bienvenida"], boton: "Lo quiero" },
        { nombre: "Premium", cantidad: 3, descuento: 15, puntos: ["Envío gratis", "Soporte por WhatsApp", "Regalo de bienvenida", "Atención prioritaria"], boton: "Lo quiero" },
      ],
    },
    { tipo: "testimonios", titulo: "Lo que dicen nuestros clientes", resenas: [resena("Nombre del cliente"), resena("Nombre del cliente"), resena("Nombre del cliente")] },
    {
      tipo: "trustpilot", titulo: "Lo que dicen nuestros **clientes**", etiqueta: "Excelente", nota: 4.8, cantidad: "Basado en **1.234** reseñas",
      resenas: [resena("Nombre del cliente"), resena("Nombre del cliente", 4), resena("Nombre del cliente")],
    },
    {
      tipo: "garantia", dias: 7, volanta: "Garantía", titulo: "7 días de garantía directa", chip: "+ 30 días de garantía de la tienda",
      texto: "Si no te convence, escribinos dentro de los 7 días y te devolvemos la plata.",
      puntos: [{ titulo: "Un mensaje y listo", icono: "mensaje" }, { titulo: "30 días de la tienda", icono: "tienda" }],
    },
    {
      tipo: "objeciones", volanta: "Lo que todos preguntan", titulo: "Sacate las _dudas_", abrirPrimera: true,
      preguntas: [
        { p: "¿Cuánto tarda en llegar?", r: "Acá va la respuesta a la primera pregunta frecuente." },
        { p: "¿Cómo lo uso?", r: "Acá va la respuesta a la segunda pregunta frecuente." },
        { p: "¿Y si no me sirve?", r: "Acá va la respuesta a la tercera pregunta frecuente." },
      ],
      pie: "Texto al pie de las preguntas.",
    },
    { tipo: "antesDespues", titulo: "Antes y después", texto: "Texto en caja.", antes: { rotulo: "Antes" }, despues: { rotulo: "Después" } },
    { tipo: "barra", desde: 20 },
    { tipo: "ctaFinal", titulo: "¿Listo para probarlo?", pildora: "Llevá 3, pagá 2", texto: "Envíos a todo el país · Garantía · 3 cuotas sin interés", boton: "Comprar ahora" },
  ],
};

/** El lugar por defecto de cada widget (Ipanema; ver MATRIZ-NUBESDK.md). */
export const LUGAR: Record<Widget["tipo"], Lugar> = {
  estrellas: "after_product_detail_name",
  cantidad: "after_product_detail_price",
  combo: "after_dynamic_section_main_product",
  planes: "after_dynamic_section_main_product",
  testimonios: "after_dynamic_section_main_product",
  trustpilot: "after_dynamic_section_main_product",
  garantia: "after_dynamic_section_main_product",
  objeciones: "after_dynamic_section_main_product",
  antesDespues: "after_dynamic_section_main_product",
  barra: "edge_bottom_center",
  ctaFinal: "after_dynamic_section_main_product",
  gadsden: "after_dynamic_section_main_product",
};
