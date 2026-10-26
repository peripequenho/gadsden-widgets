/**
 * Los widgets de Gadsden sobre una página real de la tienda, SIN NubeSDK. El mismo motor en tres modos (construir.mjs):
 *
 * - Marcador (dist/preview.js): un marcador del navegador carga este script sobre una ficha de producto y hace lo que
 *   haría el script de NubeSDK (src/main.ts): lee la configuración guardada (/config/<tienda>.json) y mete el iframe de
 *   cada widget en su lugar ([data-nubesdk-slot], que Ipanema ya trae en el HTML; los lugares fijos, en una caja fija como
 *   la de NubeSDK). Atiende lo mismo que src/gadsden.ts: el alto, agregar al carrito (con el carrito del theme, como lo
 *   hace NubeSDK en la tienda: LS.addToCartEnhanced con un formulario), ir a otra página, los popups y el scroll. Es SÓLO
 *   para probar y mostrar: en producción los dibuja NubeSDK.
 * - PEGADO (dist/pegar.js): el código para pegar del panel. Dibuja cada widget guardado en su `<div data-gadsden="<id>">`,
 *   en cualquier página de la tienda, sin avisos en pantalla. Los widgets con el lugar "codigo" (src/lugares.ts) sólo
 *   salen así; los otros modos no los dibujan.
 * - EDITOR (dist/editor.js): la vista previa del editor del panel. El Worker trae la página de la tienda (worker.ts,
 *   /tienda/<id>/<ruta>) con este script adentro; la configuración llega del panel por postMessage (la que se está
 *   editando, sin guardar) y se vuelve a dibujar a cada cambio. Encima, la capa de edición: resalta el widget o la sección
 *   del theme al pasar el mouse (clic: elegirlo), marca lo elegido con su rótulo y deja usar el widget elegido. Los links y el
 *   carrito no hacen nada (es una muestra).
 *
 * Lo que no hace en ningún modo: dibujar los widgets de la versión anterior (componentes de NubeSDK, no iframes; el editor
 * pone un recuadro gris en su lugar) y completar la compra del botón del theme con lo elegido en un bloque.
 */
import { LUGAR, type Config, type Widget } from "./config.ts";
import { DE_PAGINA, juntarUniones, type ConfigGadsden } from "./gadsden.ts";
import { estiloDe } from "./estilos.ts";
import type { ProductoTN } from "./w/producto.ts";
import { SOLO_CODIGO, conOrden, esDinamico, lugarDeSeccion, lugarDinamico, resolverDinamico, type Dinamico } from "./lugares.ts";
import { LUGARES, LUGARES_PT } from "./panel/catalogo.ts";
import { deLaPlantilla, plantillaDe } from "./plantillas.ts";

declare const BASE: string;
declare const PEGADO: boolean;
declare const EDITOR: boolean;
type WG = Extract<Widget, { tipo: "gadsden" }>;
type VarianteLS = { id: number; product_id: number; price_number: number | null; compare_at_price_number: number | null; available: boolean; option0: string | null; option1: string | null; option2: string | null; image_url?: string };
type LSGlobal = { store?: { id: number }; product?: { id: number; name: string }; variants?: VarianteLS[]; template?: string; currency?: { code?: string }; addToCartEnhanced?: (...a: unknown[]) => void; addToCart?: (...a: unknown[]) => void };
type Mensaje = { type?: string; width?: number; height?: number; gadsden?: string; items?: { variant_id: number; product_id?: number; quantity: number; properties?: Record<string, string> }[]; url?: string; pago?: boolean; dialogo?: number; camino?: number[] | null };
/** Lo que manda el panel al editor. */
type DelPanel = { gadsden?: string; config?: Config; pantalla?: { ancho: number; alto: number }; elegido?: string | null; id?: string | null; seccion?: string | null; rotulo?: string; ir?: boolean; idioma?: string };

const LS = (window as unknown as { LS?: LSGlobal }).LS;
const MARCA = PEGADO ? "data-gadsden-pegado" : EDITOR ? "data-gadsden-editor" : "data-gadsden-vista";

function aviso(texto: string, error = false) {
  if (PEGADO || EDITOR) return void (error && console.warn(`Gadsden Widgets: ${texto}`));
  document.getElementById("gadsden-vista-aviso")?.remove();
  const d = document.createElement("div");
  d.id = "gadsden-vista-aviso";
  d.setAttribute(MARCA, "");
  d.style.cssText = `position:fixed;z-index:2147483647;left:12px;top:12px;max-width:min(420px,calc(100vw - 24px));padding:10px 14px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;color:#fff;background:${error ? "#b42318" : "#1f2937"};box-shadow:0 4px 16px rgba(0,0,0,.25)`;
  d.innerHTML = `<b>Gadsden · vista previa</b><br>${texto} <a href="#" style="color:#9ec5ff;margin-left:6px">Cerrar</a>`;
  d.querySelector("a")!.onclick = (e) => { e.preventDefault(); d.remove(); };
  document.body.append(d);
}

/** El producto de la ficha en el formato del iframe: de la API (por el Worker) o, si no está instalada, de LS. */
async function productoDeLaFicha(tienda: number): Promise<ProductoTN> {
  const handle = /\/productos\/([^/?#]+)/.exec(location.pathname)?.[1];
  const r = handle ? await fetch(`${BASE}/productos/${tienda}?handles=${encodeURIComponent(decodeURIComponent(handle))}`).then((x) => (x.ok ? x.json() : null)).catch(() => null) : null;
  const p = (r as { productos?: ProductoTN[] } | null)?.productos?.find((x) => x.id === LS?.product?.id);
  if (p) return p;
  return {
    id: LS!.product!.id, nombre: LS!.product!.name, handle: handle ?? "", url: location.pathname, opciones: [],
    imagenes: [...document.querySelectorAll<HTMLMetaElement>('meta[property="og:image"]')].map((m) => ({ src: m.content })),
    variantes: (LS!.variants ?? []).map((v) => ({
      id: v.id, precio: v.price_number ?? 0, precioAntes: v.compare_at_price_number, disponible: v.available,
      valores: [v.option0, v.option1, v.option2].filter((x): x is string => !!x), imagen: v.image_url ? new URL(v.image_url, location.href).href : null,
    })),
  };
}

/** La variante elegida en el formulario de Ipanema (los select variation[0..2]). */
function varianteElegida(): number | undefined {
  const f = document.querySelector<HTMLFormElement>("#product_form");
  const vs = LS?.variants ?? [];
  if (!f || vs.length < 2) return vs[0]?.id;
  const d = new FormData(f);
  const elegidos = [0, 1, 2].map((i) => d.get(`variation[${i}]`)).filter((x) => x !== null).map(String);
  return vs.find((v) => elegidos.every((x, i) => (v as unknown as Record<string, string | null>)[`option${i}`] === x))?.id;
}

/** Agrega con el carrito del theme, como el propio NubeSDK en la tienda: un formulario a /comprar/ y LS.addToCartEnhanced. */
function agregarAlCarrito(items: { product_id: number; variant_id: number; quantity: number; properties?: Record<string, string> }[], pago: boolean) {
  const campo = (f: HTMLFormElement, n: string, v: string | number) => { const i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = String(v); f.append(i); };
  const jq = (window as unknown as { jQuery?: (x: unknown) => unknown }).jQuery;
  for (const it of items) {
    const f = document.createElement("form");
    f.method = "post";
    f.action = document.querySelector('form[action*="buy"], form[action*="comprar"]')?.getAttribute("action") ?? "/comprar/";
    campo(f, "add_to_cart", it.product_id); campo(f, "quantity", it.quantity); campo(f, "variant_id", it.variant_id);
    for (const [k, v] of Object.entries(it.properties ?? {})) campo(f, `properties[${k}]`, v);
    const x = jq ? jq(f) : f;
    if (typeof LS?.addToCartEnhanced === "function") LS.addToCartEnhanced(x, "", "", "", true, () => {});
    else if (typeof LS?.addToCart === "function") LS.addToCart(x, "", "", "", true);
    else { document.body.append(f); f.submit(); return; }
  }
  // [VERIFICAR] en la tienda: el formulario del carrito de Ipanema lleva al pago.
  if (pago) setTimeout(() => document.querySelector<HTMLFormElement>('form[data-store="cart-form"]')?.submit(), 1500);
}

/** La caja de un lugar fijo, con el CSS que le pone NubeSDK en la tienda (#484; el mismo que usa lado.mjs). */
function cajaFija(lugar: string) {
  const d = document.createElement("div");
  d.style.cssText = lugar.startsWith("corner_")
    ? `position:fixed;z-index:9998;max-width:45vw;${lugar.includes("top") ? "top" : "bottom"}:0;${lugar.endsWith("left") ? "left" : "right"}:0`
    : `position:fixed;z-index:9997;left:50%;transform:translateX(-50%);max-width:80vw;max-height:45vh;${lugar.includes("top") ? "top" : "bottom"}:0`;
  d.setAttribute(MARCA, "");
  document.body.append(d);
  return d;
}

/** Los lugares "antes o después de la sección X" de esta página, como los da NubeSDK (src/lugares.ts). */
const dinamicosDelDom = (): Dinamico[] => [...document.querySelectorAll<HTMLElement>("[data-nubesdk-section-type][data-nubesdk-slot]")]
  .filter((e) => /^(before|after)_dynamic_section_/.test(e.dataset.nubesdkSlot!))
  .map((e) => ({ type: e.dataset.nubesdkSlot!.startsWith("before") ? "before_dynamic_section" : "after_dynamic_section", sectionType: e.dataset.nubesdkSectionType!, sectionId: e.dataset.nubesdkSectionId ?? "", sectionIndex: Number(e.dataset.nubesdkSectionIndex), slotId: e.dataset.nubesdkSlot! }));

/** Los manejadores de los mensajes de cada iframe dibujado (uno solo para toda la página: se vacía al redibujar). */
const deMarco = new Map<Window, (m: Mensaje, e: MessageEvent) => void>();
addEventListener("message", (e) => { const h = e.source && deMarco.get(e.source as Window); if (h) h(e.data as Mensaje, e); });
let marcos: HTMLIFrameElement[] = [];
/** En el editor, los recuadros de los widgets de la versión anterior (recuadroAnterior). */
let anteriores: HTMLElement[] = [];
let producto: ProductoTN | undefined;
let pantalla: { ancho: number; alto: number } | undefined;

/** Dibuja los widgets de Gadsden de la configuración en esta página (borra los que había). Devuelve los que no tienen lugar acá. */
function dibujar(cfg: Config, tienda: number, pegados: Map<string, HTMLElement>): { dibujados: number; faltan: string[] } {
  document.querySelectorAll(`[${MARCA}]`).forEach((n) => n.remove());
  deMarco.clear();
  marcos = [];
  const gadsden = cfg.widgets.filter((w): w is WG => w.tipo === "gadsden" && !w.oculto);
  const dePagina = (w: WG) => !!w.seccion && DE_PAGINA.has(w.seccion.type);
  const pagina = gadsden.filter(dePagina).map((w) => w.seccion);
  const aca = (w: WG) => (PEGADO ? !!w.id && pegados.has(w.id) : w.lugar !== SOLO_CODIGO);
  const { widgets, junto } = juntarUniones(gadsden.filter((w) => aca(w) && !dePagina(w) && (!w.productos?.length || (producto && w.productos.includes(producto.id)))
    // La plantilla del producto (el editor ya manda sólo la que se edita).
    && (EDITOR || PEGADO || deLaPlantilla(w, w.lugar || LUGAR.gadsden, plantillaDe(cfg, producto?.id)))));
  let modal: HTMLIFrameElement | null = null;
  const faltan: string[] = [];

  for (const w of widgets) {
    const lugar = w.lugar || LUGAR.gadsden;
    const fijo = !PEGADO && /^(corner|edge)_/.test(lugar);
    const nombre = esDinamico(lugar) ? resolverDinamico(lugar, dinamicosDelDom()) : lugar;
    const destino = PEGADO ? pegados.get(w.id!)! : fijo ? cajaFija(lugar) : nombre ? document.querySelector(`[data-nubesdk-slot="${nombre}"]`) : null;
    if (!destino) { faltan.push(lugar); continue; }
    const base: ConfigGadsden & Record<string, unknown> = {
      seccion: w.seccion, bloque: w.bloque, ...(junto.get(w)?.length && { junto: junto.get(w) }), inicio: Math.round(performance.timeOrigin), pagina,
      estilo: estiloDe(cfg.estilo), ...(cfg.tema && { tema: cfg.tema }), producto, variante: varianteElegida(), tienda,
      moneda: { simbolo: "$", codigo: LS?.currency?.code ?? "ARS" }, ...(fijo && { fijo: lugar }), ...(pantalla && { pantalla }),
    };
    const crear = (extra: object) => {
      const f = document.createElement("iframe");
      f.src = `${BASE}/w/#${encodeURIComponent(JSON.stringify({ ...base, ...extra }))}`;
      f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation");
      f.setAttribute(MARCA, "");
      f.style.cssText = "border:0;display:block;width:100%;height:0";
      return f;
    };
    const f = crear({});
    if (w.id) f.dataset.gadsdenId = w.id;
    destino.append(f);
    marcos.push(f);
    const atender = (m: Mensaje, e: MessageEvent) => {
      if (m?.type === "resize" && e.source === f.contentWindow) {
        if (m.height !== undefined) f.style.height = `${m.height}px`;
        // Como el Iframe de NubeSDK (y lado.mjs): un ancho 0 (nada visible) no achica el lugar; lo esconde el alto.
        if (fijo && m.width) f.style.width = `${m.width}px`;
        if (EDITOR) acomodarCapa();
      } else if (m?.gadsden === "agregar" && m.items?.length) {
        if (EDITOR) return avisarPanel({ gadsden: "aviso", texto: idioma === "pt" ? "Na sua loja, isto adiciona ao carrinho." : "En tu tienda, esto agrega al carrito." });
        const deVariante = new Map(producto?.variantes.map((v) => [v.id, producto!.id]));
        const items = m.items.map((x) => ({ product_id: x.product_id ?? deVariante.get(x.variant_id) ?? producto?.id, variant_id: x.variant_id, quantity: x.quantity, ...(x.properties && { properties: x.properties }) }));
        agregarAlCarrito(items.filter((x): x is typeof x & { product_id: number } => !!x.product_id), !!m.pago);
      } else if (m?.gadsden === "ir" && m.url) {
        if (EDITOR) return avisarPanel({ gadsden: "aviso", texto: idioma === "pt" ? "Na sua loja, isto leva a outra página." : "En tu tienda, esto lleva a otra página." });
        location.href = m.url;
      } else if (m?.gadsden === "arriba") {
        scrollTo({ top: 0, behavior: "smooth" });
      } else if (m?.gadsden === "modal" && typeof m.dialogo === "number") {
        // El popup, en otro iframe a pantalla entera (como el lugar modal_content de NubeSDK).
        modal?.remove();
        modal = crear({ modal: { dialogo: m.dialogo, camino: m.camino ?? null } });
        modal.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483646;background:transparent";
        modal.dataset.dialogo = String(m.dialogo);
        document.body.append(modal);
        deMarco.set(modal.contentWindow!, atender);
      } else if (m?.gadsden === "cerrar-modal") {
        const dialogo = Number(modal?.dataset.dialogo ?? -1);
        if (modal?.contentWindow) deMarco.delete(modal.contentWindow);
        modal?.remove(); modal = null;
        f.contentWindow?.postMessage({ gadsden: "cerrado", dialogo }, "*");
      }
    };
    deMarco.set(f.contentWindow!, atender);
    f.addEventListener("load", () => setTimeout(avisarPagina, 300));
  }
  if (EDITOR) anteriores = cfg.widgets.filter((w) => w.tipo !== "gadsden" && !w.oculto && w.lugar !== SOLO_CODIGO && (!w.productos?.length || (!!producto && w.productos.includes(producto.id)))).flatMap((w) => recuadroAnterior(w, cfg.widgets) ?? []);
  return { dibujados: marcos.length, faltan };
}

/**
 * En el editor, un widget de la versión anterior (un componente de NubeSDK, que acá no se dibuja): un recuadro gris con
 * su nombre en su lugar, en el orden de la configuración, para que el comerciante sepa dónde está.
 */
function recuadroAnterior(w: Widget, todos: Widget[]): HTMLElement | null {
  const lugar = w.lugar || LUGAR[w.tipo];
  const nombre = esDinamico(lugar) ? resolverDinamico(lugar, dinamicosDelDom()) : lugar;
  const destino = /^(corner|edge)_/.test(lugar) ? cajaFija(lugar) : nombre ? document.querySelector(`[data-nubesdk-slot="${nombre}"]`) : null;
  if (!destino) return null;
  const d = document.createElement("div");
  d.setAttribute(MARCA, "");
  if (w.id) d.dataset.gadsdenId = w.id;
  d.style.cssText = "box-sizing:border-box;margin:8px 0;padding:10px 14px;border:1px dashed #b0b0b0;border-radius:8px;background:#f6f6f6;color:#5d5d5d;font:13px/18px Geist,system-ui,sans-serif;text-align:left";
  d.innerHTML = "<b style=\"display:block;color:#0a0a0a;font-weight:500\"></b>";
  d.append(idioma === "pt" ? "Versão anterior: aparece na sua loja" : "Versión anterior: se ve en tu tienda");
  d.firstElementChild!.textContent = w.nombre || w.tipo;
  const i = todos.indexOf(w);
  const despues = [...destino.children].find((e) => todos.findIndex((x) => x.id && x.id === (e as HTMLElement).dataset.gadsdenId) > i);
  destino.insertBefore(d, despues ?? null);
  return d;
}

/** El scroll de la página (NubeSDK lo manda de a 10 %; acá, cada cuadro) y si el botón de comprar salió por arriba. */
function avisarPagina() {
  const boton = document.querySelector(".js-addtocart");
  const p = { gadsden: "pagina", scrollY, scrollHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, ...(boton && { botonArriba: boton.getBoundingClientRect().bottom < 0 }) };
  for (const f of marcos) f.contentWindow?.postMessage(p, "*");
}

function escuchar() {
  let pedido = false;
  addEventListener("scroll", () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(() => { pedido = false; avisarPagina(); if (EDITOR) acomodarCapa(); });
  }, { passive: true });
  document.querySelector("#product_form")?.addEventListener("change", () => {
    const id = varianteElegida();
    if (id) for (const f of marcos) f.contentWindow?.postMessage({ gadsden: "variante", id }, "*");
  });
}

/* ---------- El editor: la capa de edición y la charla con el panel ---------- */

const avisarPanel = (m: Record<string, unknown>) => parent.postMessage(m, "*");
/** Lo elegido en el panel: un widget (su id) o una sección del theme (su data-section-id), con su rótulo. */
let elegido: string | null = null;
let seccionElegida: string | null = null;
let rotulo = "";
let encima: HTMLElement | null = null;
/** Lo elegido en el árbol que todavía no está dibujado (un widget recién agregado): se va hasta ahí después de dibujar. */
let irAlDibujar = false;
let capa: HTMLDivElement | null = null;
/** El idioma del panel (llega con la configuración): los nombres de los lugares, los recuadros y los avisos. */
let idioma = "es";
const AZUL = "#0059d5";

/** Los lugares de esta página donde puede ir un widget: los de NubeSDK que trae el HTML, con su nombre. */
function lugaresDeLaPagina() {
  // Los de la ficha (antes y después de la ficha, los productos complementarios) son lugares por sección: van abajo.
  const fijos = Object.keys(LUGARES).filter((l) => /^(edge|corner)_/.test(l) || (!/_dynamic_section_/.test(l) && !!document.querySelector(`[data-nubesdk-slot="${l}"]`)));
  const secciones = conOrden(dinamicosDelDom().filter((d) => d.type === "after_dynamic_section"));
  return [
    ...fijos.map((l) => ({ lugar: l, nombre: (idioma === "pt" ? LUGARES_PT : LUGARES)[l]!, orden: ordenEnPagina(l) })),
    ...secciones.flatMap((s) => (["before", "after"] as const).map((lado) => ({
      lugar: lugarDinamico(lado, s.sectionType, s.n),
      nombre: lugarDeSeccion(lado, s, idioma),
      orden: ordenEnPagina(resolverDinamico(lugarDinamico(lado, s.sectionType, s.n), dinamicosDelDom()) ?? ""),
    }))),
  ].sort((a, b) => a.orden - b.orden);
}

/** Dónde queda un lugar en la página (para listarlos de arriba a abajo); los fijos, al final. */
function ordenEnPagina(slot: string) {
  const e = slot && document.querySelector(`[data-nubesdk-slot="${slot}"]`);
  return e ? e.getBoundingClientRect().top + scrollY : 1e9;
}

/** Las secciones del theme que se ven en la página (Ipanema las envuelve en .ns-section), como las lista el editor de Tiendanube. */
const seccionesDom = () => [...document.querySelectorAll<HTMLElement>(".ns-section[data-section-id]")]
  .filter((e) => !/drawer|modal|popup/.test(e.dataset.sectionType ?? "") && getComputedStyle(e).display !== "none");

function seccionesDeLaPagina() {
  const dinamicos = dinamicosDelDom();
  const lugares = lugaresDeLaPagina().map((l) => l.lugar);
  const lugarDe = (e: HTMLElement, lado: "before" | "after") => {
    const slot = e.querySelector<HTMLElement>(`[data-nubesdk-slot^="${lado}_dynamic_section_"]`)?.dataset.nubesdkSlot;
    return slot ? lugares.find((l) => l.startsWith(`seccion:${lado}:`) && resolverDinamico(l, dinamicos) === slot) : undefined;
  };
  return seccionesDom().map((e) => ({
    id: e.dataset.sectionId!, tipo: e.dataset.sectionType ?? "",
    grupo: e.closest("header") ? "encabezado" : e.closest("footer") ? "pie" : "pagina",
    antes: lugarDe(e, "before"), despues: lugarDe(e, "after"),
  }));
}

const estadoDeLaPagina = () => ({ lugares: lugaresDeLaPagina().map(({ lugar, nombre }) => ({ lugar, nombre })), secciones: seccionesDeLaPagina() });

/** La capa: un recuadro por widget (clic para elegirlo), el de lo elegido con su rótulo y el punteado de lo que está bajo el mouse. */
function armarCapa() {
  capa?.remove();
  capa = document.createElement("div");
  capa.setAttribute(MARCA, "");
  capa.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483640;pointer-events:none";
  document.body.append(capa);
  acomodarCapa();
}

function acomodarCapa() {
  if (!capa) return;
  capa.replaceChildren();
  const caja = (r: DOMRect, css: string) => {
    const d = document.createElement("div");
    d.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top + scrollY}px;width:${r.width}px;height:${Math.max(r.height, 2)}px;box-sizing:border-box;${css}`;
    capa!.append(d);
    return d;
  };
  // Lo elegido: borde azul y el rótulo arriba a la izquierda (como el editor de Tiendanube).
  const marcar = (r: DOMRect) => {
    caja(r, `outline:2px solid ${AZUL};outline-offset:-2px`);
    if (!rotulo) return;
    const chip = document.createElement("div");
    chip.textContent = rotulo;
    chip.style.cssText = `position:absolute;left:${r.left + scrollX}px;top:${r.top >= 18 ? r.top + scrollY - 18 : r.top + scrollY}px;height:18px;padding:0 6px;border-radius:4px;background:${AZUL};color:#fff;font:500 11px/18px Geist,system-ui,sans-serif;white-space:nowrap`;
    capa!.append(chip);
  };
  if (encima && encima.dataset.sectionId !== seccionElegida) caja(encima.getBoundingClientRect(), `outline:1px dashed ${AZUL};outline-offset:-1px`);
  const sec = seccionElegida ? seccionesDom().find((e) => e.dataset.sectionId === seccionElegida) : undefined;
  if (sec) marcar(sec.getBoundingClientRect());
  for (const f of [...marcos, ...anteriores]) {
    const id = f.dataset.gadsdenId;
    if (!id) continue;
    const r = f.getBoundingClientRect();
    if (r.height < 1) continue;
    // El elegido se puede usar (sin capa encima); los otros se eligen con un clic (el mouse adentro de un iframe no llega a la página).
    if (id === elegido) { marcar(r); continue; }
    const d = caja(r, "pointer-events:auto;cursor:pointer");
    d.onmouseenter = () => { d.style.outline = `1px dashed ${AZUL}`; d.style.outlineOffset = "-1px"; };
    d.onmouseleave = () => { d.style.outline = ""; };
    d.onclick = (e) => { e.preventDefault(); e.stopPropagation(); avisarPanel({ gadsden: "elegir", id }); };
  }
}

async function arrancarEditor() {
  if (!LS?.store?.id) return avisarPanel({ gadsden: "error", texto: "La página no es de una tienda de Tiendanube." });
  const tienda = LS.store.id;
  producto = LS.template === "product" && LS.product ? await productoDeLaFicha(tienda) : undefined;
  // Una muestra: los links y los formularios del theme no salen de la página; un clic en una sección la elige.
  document.addEventListener("click", (e) => {
    const t = e.target as Element;
    if (t.closest?.("a[href], button[type=submit], input[type=submit]")) { e.preventDefault(); e.stopPropagation(); }
    const sec = t.closest?.<HTMLElement>(".ns-section[data-section-id]");
    if (sec && seccionesDom().includes(sec)) avisarPanel({ gadsden: "elegir", seccion: sec.dataset.sectionId });
  }, true);
  document.addEventListener("submit", (e) => e.preventDefault(), true);
  document.addEventListener("mouseover", (e) => {
    const sec = (e.target as Element).closest?.<HTMLElement>(".ns-section[data-section-id]") ?? null;
    if (sec !== encima) { encima = sec; acomodarCapa(); }
  });
  document.documentElement.addEventListener("mouseleave", () => { encima = null; acomodarCapa(); });
  // Las marcas de la capa miden lo que el contenido (sin la barra de scroll): no tienen que abrir un scroll de costado.
  document.documentElement.style.overflowX = "hidden";
  escuchar();
  let ultima: Config | null = null;
  const elegir = (m: DelPanel) => { elegido = m.id ?? null; seccionElegida = m.seccion ?? null; rotulo = m.rotulo ?? ""; };
  addEventListener("message", (e) => {
    if (e.source !== parent) return;
    const m = e.data as DelPanel;
    if (m?.gadsden === "config" && m.config) {
      idioma = m.idioma ?? "es";
      ultima = m.config;
      pantalla = m.pantalla;
      elegir(m);
      const { faltan } = dibujar(m.config, tienda, new Map());
      armarCapa();
      if (irAlDibujar) irALoElegido();
      avisarPanel({ gadsden: "dibujado", faltan, ...estadoDeLaPagina() });
    } else if (m?.gadsden === "elegir") {
      elegir(m);
      acomodarCapa();
      // Elegido en el árbol: la página va hasta ahí.
      if (m.ir) irALoElegido();
    } else if (m?.gadsden === "redibujar" && ultima) {
      dibujar(ultima, tienda, new Map());
      armarCapa();
    }
  });
  addEventListener("resize", () => acomodarCapa());
  function irALoElegido() {
    const f = [...marcos, ...anteriores].find((x) => x.dataset.gadsdenId === elegido);
    const sec = seccionElegida ? seccionesDom().find((x) => x.dataset.sectionId === seccionElegida) : undefined;
    irAlDibujar = !!elegido && !f;
    (f ?? sec)?.scrollIntoView({ behavior: "smooth", block: f ? "center" : "start" });
  }
  avisarPanel({ gadsden: "listo", tienda, plantilla: LS.template ?? "", producto: producto?.id ?? null, ...estadoDeLaPagina() });
}

async function arrancar() {
  if (EDITOR) return arrancarEditor();
  const pegados = new Map([...document.querySelectorAll<HTMLElement>("[data-gadsden]")].map((e) => [e.dataset.gadsden!, e]));
  if (PEGADO) {
    // Si el comerciante pegó varios códigos, el script llega varias veces: dibuja una sola, todos los lugares juntos.
    const w = window as unknown as { gadsdenPegado?: boolean };
    if (w.gadsdenPegado || !pegados.size) return;
    w.gadsdenPegado = true;
  }
  if (!LS?.store?.id) return aviso("Esto se abre sobre una página de tu tienda de Tiendanube.", true);
  if (!PEGADO && (LS.template !== "product" || !LS.product)) return aviso("Abrí una ficha de producto de tu tienda y volvé a tocar el marcador.", true);
  const tienda = LS.store.id;
  const cfg = (await fetch(`${BASE}/config/${tienda}.json`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as Config | null;
  if (!cfg) return aviso("Esta tienda no tiene widgets guardados: armalos en el panel de la app y guardá.", true);
  producto = LS.template === "product" && LS.product ? await productoDeLaFicha(tienda) : undefined;
  const { dibujados, faltan } = dibujar(cfg, tienda, pegados);
  escuchar();
  const otros = cfg.widgets.filter((w) => w.tipo !== "gadsden").length;
  aviso(`${dibujados} widget${dibujados === 1 ? "" : "s"} de Gadsden en esta ficha.${otros ? ` ${otros} de la versión anterior no se ven acá.` : ""}${faltan.length ? ` Sin lugar en esta página: ${[...new Set(faltan)].join(", ")}.` : ""} Sólo para probar: en producción los dibuja NubeSDK.`);
}

const empezar = () => void arrancar().catch((e) => aviso(`No se pudo cargar (${String(e)}).`, true));
// El código pegado y el editor pueden cargar antes de que estén todos los lugares en la página.
if ((PEGADO || EDITOR) && document.readyState === "loading") document.addEventListener("DOMContentLoaded", empezar);
else empezar();
