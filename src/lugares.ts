/**
 * Los lugares "antes o después de la sección X" de la página (los lugares dinámicos de NubeSDK). Su nombre lleva un id
 * que la tienda arma cada vez (`after_dynamic_section_<seccion>_<id>`), así que no se guarda: se guarda el tipo de
 * sección y cuál de las de ese tipo es, y se resuelve en cada carga contra las secciones de la página
 * (`nube.api.getAvailableSlots().getDynamic()` en el script; los `data-nubesdk-section-*` del HTML en la vista previa y en
 * el panel). Formato: `seccion:<before|after>:<tipo de sección>:<n>` (n desde 1, en el orden de la página).
 */

export type Lado = "before" | "after";
export type SeccionDePagina = { sectionType: string; sectionId: string; sectionIndex: number };
/** Un lugar dinámico de la página como lo da NubeSDK (o el HTML). */
export type Dinamico = SeccionDePagina & { type: `${Lado}_dynamic_section`; slotId: string };

/** Sólo donde el comerciante pegó el código del widget (el bloque Código de Ipanema; src/vista.ts con PEGADO): ni NubeSDK ni la vista previa lo dibujan. */
export const SOLO_CODIGO = "codigo";

export const esDinamico = (lugar?: string) => !!lugar && lugar.startsWith("seccion:");

export function leerDinamico(lugar: string): { lado: Lado; tipo: string; n: number } | null {
  const m = /^seccion:(before|after):([a-z0-9_-]+):(\d+)$/.exec(lugar);
  return m ? { lado: m[1] as Lado, tipo: m[2]!, n: Number(m[3]) } : null;
}

export const lugarDinamico = (lado: Lado, tipo: string, n: number) => `seccion:${lado}:${tipo}:${n}`;

/** El nombre del lugar de NubeSDK en esta página para un lugar dinámico guardado (o undefined si la sección no está). */
export function resolverDinamico(lugar: string, enPagina: Dinamico[]): string | undefined {
  const d = leerDinamico(lugar);
  if (!d) return undefined;
  const mismas = enPagina.filter((s) => s.type === `${d.lado}_dynamic_section` && s.sectionType === d.tipo).sort((a, b) => a.sectionIndex - b.sectionIndex);
  return mismas[d.n - 1]?.slotId;
}

/**
 * En un theme sin secciones de Ipanema (los clásicos: Amazonas, Rio...) no hay lugares dinámicos. Lo de la ficha va
 * debajo de la descripción del producto y el resto arriba del pie: los fijos de NubeSDK que dibujó Amazonas en la ficha
 * (prefixlga15, 25-oct; `after_main_content` y `after_section_product_main` no dibujaron). Undefined si no es de sección.
 * ponytail: un lugar fijo por caso; afinar por tipo de sección si un theme clásico tiene más lugares.
 */
export function lugarClasico(lugar: string) {
  const d = leerDinamico(normalizar(lugar));
  return d ? (d.tipo === "main-product" ? "after_product_description" : "before_footer") : undefined;
}

/**
 * Si dos lugares son el mismo: el lugar fijo de una sección (`after_dynamic_section_main_product`, el de antes de que
 * hubiera lugares por sección) es el dinámico de la primera de ese tipo (`seccion:after:main-product:1`).
 */
export const mismoLugar = (a: string, b: string) => normalizar(a) === normalizar(b);
function normalizar(l: string) {
  const m = /^(before|after)_dynamic_section_([a-z_]+)$/.exec(l);
  return m ? lugarDinamico(m[1] as Lado, m[2]!.replace(/_/g, "-"), 1) : l;
}

/** Las secciones de una página, cada una con su orden entre las de su tipo (para guardar el lugar). */
export function conOrden(secciones: SeccionDePagina[]) {
  const vistos = new Map<string, number>();
  return [...secciones].sort((a, b) => a.sectionIndex - b.sectionIndex).map((s) => {
    const n = (vistos.get(s.sectionType) ?? 0) + 1;
    vistos.set(s.sectionType, n);
    return { ...s, n };
  });
}

/** Las secciones dinámicas que trae el HTML de una página de la tienda (Ipanema las marca con data-nubesdk-section-*). */
export function seccionesDelHtml(html: string): SeccionDePagina[] {
  const vistas = new Map<string, SeccionDePagina>();
  for (const m of html.matchAll(/<[a-z]+\s[^>]*data-nubesdk-section-type="[^"]*"[^>]*>/g)) {
    const attr = (k: string) => new RegExp(`data-nubesdk-section-${k}="([^"]*)"`).exec(m[0])?.[1];
    const sectionType = attr("type"), sectionId = attr("id"), indice = Number(attr("index"));
    if (!/data-nubesdk-slot="(before|after)_dynamic_section_/.test(m[0]) || !sectionType || !sectionId || !Number.isFinite(indice)) continue;
    vistas.set(`${sectionId}|${indice}`, { sectionType, sectionId, sectionIndex: indice });
  }
  return [...vistas.values()].sort((a, b) => a.sectionIndex - b.sectionIndex);
}

/** Lo que el comerciante lee para cada tipo de sección de Ipanema. */
const NOMBRES: Record<string, string> = {
  "main-product": "la ficha del producto", "related-products": "los productos relacionados", "product-list": "una lista de productos",
  slideshow: "el carrusel de imágenes", banners: "los banners", "institutional-message": "un mensaje institucional", newsletter: "el newsletter",
  video: "un video", testimonials: "los testimonios", "image-text": "una imagen con texto",
};
/** El nombre de una sección en el árbol del editor, como lo pone el editor de diseño de Tiendanube. */
const TITULOS: Record<string, string> = {
  "navigation-bar": "Barra de navegación", header: "Encabezado", footer: "Pie de página",
  "main-product": "Información del producto", "related-products": "Productos relacionados", "product-list": "Productos destacados", slideshow: "Carrusel",
  banners: "Banners", "institutional-message": "Íconos informativos", newsletter: "Newsletter", video: "Video", testimonials: "Testimonios",
  "image-text": "Editorial de imagen y texto", "complementary-products": "Productos complementarios", "alternative-products": "Productos alternativos",
  "category-hero": "Encabezado de categoría", "page-header": "Título de la página", "main-products-grid": "Listado de productos",
  "featured-categories": "Categorías destacadas", "brands": "Marcas destacadas", faq: "Preguntas frecuentes", instagram: "Publicaciones de Instagram",
};
/**
 * Lo mismo en portugués (Nuvemshop). Los nombres de "Informações do produto", "Produtos relacionados", "Título da página",
 * "Lista de produtos", "Perguntas frequentes", "Feed do Instagram" y "Carrossel" salen de la ayuda de Nuvemshop (25-oct);
 * los demás, [VERIFICAR] contra su editor de layout. NOMBRES_PT ya lleva la preposición ("da", "dos", "de uma").
 */
const NOMBRES_PT: Record<string, string> = {
  "main-product": "da página do produto", "related-products": "dos produtos relacionados", "product-list": "de uma lista de produtos",
  slideshow: "do carrossel de imagens", banners: "dos banners", "institutional-message": "de uma mensagem institucional", newsletter: "da newsletter",
  video: "de um vídeo", testimonials: "dos depoimentos", "image-text": "de uma imagem com texto",
};
const TITULOS_PT: Record<string, string> = {
  "navigation-bar": "Barra de navegação", header: "Cabeçalho", footer: "Rodapé",
  "main-product": "Informações do produto", "related-products": "Produtos relacionados", "product-list": "Produtos em destaque", slideshow: "Carrossel",
  banners: "Banners", "institutional-message": "Ícones informativos", newsletter: "Newsletter", video: "Vídeo", testimonials: "Depoimentos",
  "image-text": "Imagem com texto", "complementary-products": "Produtos complementares", "alternative-products": "Produtos alternativos",
  "category-hero": "Cabeçalho da categoria", "page-header": "Título da página", "main-products-grid": "Lista de produtos",
  "featured-categories": "Categorias em destaque", "brands": "Marcas em destaque", faq: "Perguntas frequentes", instagram: "Feed do Instagram",
};
export const tituloDeSeccion = (tipo: string, idioma = "es") => (idioma === "pt" ? TITULOS_PT : TITULOS)[tipo] ?? tipo.replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
/** "Antes de la ficha del producto (main product)": el nombre de un lugar antes o después de una sección. */
export function lugarDeSeccion(lado: Lado, s: { sectionType: string; sectionId: string }, idioma = "es") {
  const id = `(${s.sectionId.replace(/_/g, " ")})`;
  if (idioma === "pt") return `${lado === "before" ? "Antes" : "Depois"} ${NOMBRES_PT[s.sectionType] ?? `de ${s.sectionType}`} ${id}`;
  return `${lado === "before" ? "Antes de" : "Después de"} ${NOMBRES[s.sectionType] ?? s.sectionType} ${id}`.replace(/ de el /, " del ");
}
