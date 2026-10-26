/**
 * El panel de Gadsden Widgets, dentro del admin de Tiendanube (app integrada: Nexo). Es un clon del editor de diseño de
 * Tiendanube (admin/brand-editor, medido el 24-oct; los estilos en tn.css), para que el comerciante no tenga que
 * aprender nada nuevo:
 *
 * - Arriba: la × (con aviso si hay cambios sin publicar), "Editar widgets", la ruedita de los ajustes globales; la página
 *   que se edita (y en la ficha, "Previsualizar: <producto>"); celular | computadora, deshacer | rehacer, salir de pantalla
 *   completa; ver en la tienda, si está publicado y "Guardar y publicar".
 * - A la izquierda, el árbol: Encabezado / la página / Pie de página con las secciones del theme (las lee src/vista.ts de
 *   la página: Ipanema las envuelve en .ns-section) y los widgets entre ellas; los bloques de un widget cuelgan de él. Se
 *   arrastra para ordenar, la línea entre dos filas inserta ahí, y cada fila tiene borrar, duplicar y ocultar.
 * - En el centro, la página entera de la tienda (la trae el Worker, /tienda/<id>/<ruta>, con la capa de src/vista.ts: clic
 *   en un widget o en una sección la elige). El botón de abajo a la derecha esconde los costados.
 * - A la derecha, los ajustes de lo elegido (su schema; formulario.tsx) y el menú ⋮ (duplicar, renombrar, ocultar, borrar).
 *
 * Las secciones del theme se ven pero no se editan desde acá (la app no tiene acceso al theme): eso sigue en "Editar
 * diseño". Guarda en el Worker (/api/config); el script de NubeSDK lee esa configuración.
 */
import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Input, ToastProvider, useToast } from "@nimbus-ds/components";
import {
  AppsIcon, ArrowsDiagonalInIcon, ArrowsDiagonalOutIcon, ArrowsExpandIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CodeIcon,
  CogIcon, ColorPaletteIcon, CopyIcon, DesktopIcon, DiscountCircleIcon, DragDotsIcon, EditingColumnsIcon, EllipsisIcon, ExternalLinkIcon, EyeIcon,
  EyeOffIcon, FooterIcon, HeaderIcon, HomeIcon, InfoCircleIcon, LayoutIcon, ListIcon, MobileIcon, PencilIcon, PictureIcon, PlusCircleIcon, PlusIcon,
  RedoIcon, SearchIcon, SlideshowIcon, TagIcon, TrashIcon, UndoIcon,
} from "@nimbus-ds/icons";
import { ErrorBoundary, connect, getStoreInfo, iAmReady, navigateFullscreen } from "@tiendanube/nexo";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "@nimbus-ds/styles/dist/index.css";
import "./tn.css";
import { LUGAR, type Config, type Widget } from "../config.ts";
import type { Tema } from "../w/tema.ts";
import { CATEGORIAS, type Ajuste, type ItemCatalogo } from "./catalogo.ts";
import { buscarProductos, guardarConfig, instancia, leerConfig, type ProductoBuscado } from "./api.ts";
import { SOLO_CODIGO, mismoLugar, tituloDeSeccion } from "../lugares.ts";
import { Formulario, Modal, val, type Bloque, type Valores } from "./formulario.tsx";
import { deLaPlantilla, esComun, type Plantilla } from "../plantillas.ts";
import { Inicio, PantallaError } from "./inicio.tsx";
import { fijarIdioma, idioma, t } from "./textos.ts";

type WG = Extract<Widget, { tipo: "gadsden" }>;
type Tienda = { id: string; name: string; url: string; currency?: string };
type Zona = { lugar: string; nombre: string };
/** Una sección del theme en la página (src/vista.ts): sus lugares de antes y después, si NubeSDK los tiene. */
type SeccionTheme = { id: string; tipo: string; grupo: "encabezado" | "pagina" | "pie"; antes?: string; despues?: string };
type Dispositivo = "computadora" | "celular";
type Global = "estilo" | "codigo" | "descuentos";
/** Lo elegido: un widget (o uno de sus bloques), una sección del theme o un grupo de ajustes globales. */
type Eleccion = { k: "widget"; id: string; bloque?: number } | { k: "seccion"; id: string } | { k: "global"; cual: Global } | null;
/** Dónde se agrega: el primero de estos lugares donde pueda ir el widget elegido; antes de un widget, si se insertó entre dos. */
type Destino = { titulo: string; lugares: string[]; antesDe?: string };

/** Las páginas de la tienda (las del selector de Tiendanube que tienen lugares para widgets). */
const PAGINAS = {
  inicio: { nombre: "Inicio", ruta: "/", icono: <HomeIcon /> },
  producto: { nombre: "Producto", ruta: "", icono: <TagIcon /> },
  categoria: { nombre: "Categoría", ruta: "/productos/", icono: <ListIcon /> },
  busqueda: { nombre: "Búsqueda", ruta: "/search/?q=a", icono: <SearchIcon /> },
} as const;
type PaginaId = keyof typeof PAGINAS;
const ICONO_SECCION: Record<string, JSX.Element> = {
  "navigation-bar": <LayoutIcon />, header: <HeaderIcon />, footer: <FooterIcon />, slideshow: <SlideshowIcon />, "product-list": <TagIcon />,
  banners: <PictureIcon />, "main-product": <TagIcon />, "related-products": <TagIcon />,
};
const ENCABEZADO = ["after_header", "before_main_content"], PIE = ["before_footer"];
const esFijo = (l: string) => /^(edge|corner)_/.test(l);
const esFicha = (l: string) => /^(before|after)_product_detail_/.test(l);

const claseDe = (w: Widget) => (w.tipo !== "gadsden" ? null : w.bloque ? "bloque" : "seccion");
const tipoDe = (w: Widget) => (w.tipo !== "gadsden" ? w.tipo : (w.bloque?.type ?? w.seccion?.type ?? ""));
const lugarDe = (w: Widget) => w.lugar || LUGAR[w.tipo];
/** Los bloques de una sección como lista (el panel los guarda así; la config también acepta el mapa de Shopify). */
const listaDe = (s: WG["seccion"]): Bloque[] => {
  const b = s?.blocks as Bloque[] | Record<string, Bloque> | undefined;
  if (Array.isArray(b)) return b;
  if (b) return (s?.block_order ?? Object.keys(b)).map((k) => b[k]!).filter(Boolean);
  return [];
};
const conBloques = (w: WG, b: Bloque[]): WG => ({ ...w, seccion: { ...w.seccion!, blocks: b, block_order: undefined } });
const nuevoId = () => crypto.randomUUID().slice(0, 8);
/** Todos los widgets con id: el editor los elige y los arrastra por su id (y el código para pegar los nombra así). */
const conIds = (c: Config): Config => ({ ...c, widgets: c.widgets.map((w) => (w.id ? w : { ...w, id: nuevoId() })) });

/** Un widget nuevo del catálogo, con los ajustes y bloques de su preset (como al agregarlo en el editor de Shopify). */
function nuevo(c: ItemCatalogo, lugar: string): WG {
  if (c.clase === "bloque") return { tipo: "gadsden", id: nuevoId(), bloque: { type: c.type, settings: {} }, lugar };
  const p = c.esquema.presets?.[0];
  return { tipo: "gadsden", id: nuevoId(), seccion: { type: c.type, settings: { ...p?.settings }, blocks: (p?.blocks ?? []).map((b) => ({ type: b.type, settings: { ...b.settings } })) }, lugar };
}

/** Si un widget del catálogo puede ir en un lugar: los de la ficha y los fijos, sólo los suyos; los anchos, también junto a cualquier sección. */
const puedeIr = (c: ItemCatalogo, lugar: string) => c.lugares.includes(lugar) || (lugar.startsWith("seccion:") && c.lugares.includes("after_dynamic_section_main_product"));

/**
 * Las opciones de "llevá más" con descuento (las del bloque de Gadsden o las del widget de la versión anterior): el
 * widget MUESTRA el precio con descuento, pero el carrito cobra lo que diga la tienda.
 */
function descuentosPorCantidad(w: Widget, ajustes?: Ajuste[]): string[] {
  if (w.tipo === "cantidad") return w.opciones.filter((o) => o.descuento > 0).map((o) => t("{n} unidades, {p} %", { n: o.cantidad, p: o.descuento }));
  if (w.tipo !== "gadsden" || w.bloque?.type !== "quantity_offers") return [];
  const s = w.bloque.settings ?? {};
  const de = (id: string) => (id in s ? s[id] : ajustes?.find((a) => a.id === id)?.default);
  return [1, 2, 3, 4].filter((n) => de(`offer_${n}_on`) && (Number(de(`offer_${n}_pct`)) > 0 || Number(de(`offer_${n}_fixed`)) > 0))
    .map((n) => Number(de(`offer_${n}_pct`)) > 0 ? t("{n} unidades, {p} %", { n: String(de(`offer_${n}_qty`)), p: String(de(`offer_${n}_pct`)) }) : t("{n} unidades, ${x} menos", { n: String(de(`offer_${n}_qty`)), x: String(de(`offer_${n}_fixed`)) }));
}

/** Los textos con **negrita** del diccionario (textos.ts). */
const negritas = (s: string) => s.split("**").map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));

function AvisoDescuento({ lista }: { lista: string[] }) {
  if (!lista.length) return null;
  return <div className="tn-aviso">{negritas(t("**El descuento lo cobra tu tienda, no el widget.** Creá una promoción por cantidad en **Descuentos > Promociones** con los mismos descuentos: {x}.", { x: lista.join(" · ") }))}</div>;
}

/**
 * El código para pegar un widget en la tienda sin NubeSDK (dist/pegar.js; src/vista.ts): un lugar con el id del widget y
 * el script, que lo dibuja con lo guardado.
 */
function CodigoParaPegar({ w }: { w: Widget }) {
  const { addToast } = useToast();
  const codigo = `<div data-gadsden="${w.id}"></div>\n<script src="${location.origin}/pegar.js" async></script>`;
  const campo = useRef<HTMLTextAreaElement>(null);
  const copiar = async () => {
    // Dentro del admin el portapapeles puede no estar permitido al iframe: se copia con la selección.
    try { await navigator.clipboard.writeText(codigo); } catch { campo.current?.select(); document.execCommand("copy"); }
    addToast({ id: `codigo-${Date.now()}`, type: "success", text: t("Código copiado."), duration: 4000 });
  };
  return (
    <>
      <textarea ref={campo} className="tn-area" readOnly rows={2} value={codigo} onFocus={(e) => e.target.select()} style={{ minHeight: 0, fontSize: 12 }} />
      <div style={{ marginTop: 8 }}><button type="button" className="tn-boton-sec" onClick={() => void copiar()}>{t("Copiar código")}</button></div>
    </>
  );
}

/* ---------- Piezas chicas: menú desplegable y modal ---------- */

/** Un menú que se abre debajo de su botón y se cierra al tocar afuera. */
function Desplegable({ boton, children, ancho = 300, derecha = false }: { boton: (abrir: () => void, abierto: boolean) => ReactNode; children: (cerrar: () => void) => ReactNode; ancho?: number; derecha?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const h = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    addEventListener("mousedown", h);
    return () => removeEventListener("mousedown", h);
  }, [abierto]);
  return (
    <div ref={caja} style={{ position: "relative" }}>
      {boton(() => setAbierto(!abierto), abierto)}
      {abierto && <div className="tn-menu" style={{ top: "calc(100% + 4px)", width: ancho, ...(derecha ? { right: 0 } : { left: 0 }) }}>{children(() => setAbierto(false))}</div>}
    </div>
  );
}

/** "Agregar sección" / "Agregar bloque", como el de Tiendanube: los nombres a la izquierda, la miniatura de cada uno a la derecha. */
function ModalAgregar({ destino, catalogo, agregar, cerrar }: { destino: Destino; catalogo: ItemCatalogo[]; agregar: (c: ItemCatalogo) => void; cerrar: () => void }) {
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<ItemCatalogo | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const posibles = catalogo.filter((c) => destino.lugares.some((l) => puedeIr(c, l)) && (!q || c.nombre.toLowerCase().includes(q.toLowerCase())));
  const ir = (c: ItemCatalogo) => lista.current?.querySelector(`[data-item="${c.clase}-${c.type}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <Modal titulo={destino.titulo} cerrar={cerrar}>
      <div className="tn-modal-cuerpo">
        <nav className="tn-modal-nav">
          <div style={{ flexShrink: 0, paddingRight: 4 }}><Input.Search id="buscar-widget" name="buscar-widget" placeholder={t("Buscar")} value={q} onChange={(e) => setQ(val(e))} /></div>
          {posibles.map((c) => <button key={`${c.clase}-${c.type}`} type="button" className={elegido === c ? "tn-on" : ""} onClick={() => { setElegido(c); ir(c); }}>{c.nombre}</button>)}
          {!posibles.length && <span style={{ fontSize: 14, color: "var(--muted-fg)" }}>{t("No hay widgets para este lugar con ese nombre.")}</span>}
        </nav>
        <div className="tn-modal-lista" ref={lista}>
          {posibles.map((c) => (
            <div key={`${c.clase}-${c.type}`} className="tn-modal-grupo" data-item={`${c.clase}-${c.type}`}>
              <h3>{c.nombre}</h3>
              <div>
                <button type="button" className={`tn-tarjeta${elegido === c ? " tn-on" : ""}`} onClick={() => setElegido(c)} onDoubleClick={() => agregar(c)}>
                  <div>{t("Se arma con tus fotos, videos o productos.")}<img src={`miniaturas/${c.clase}-${c.type}.jpg`} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>
                  {c.aviso && <p>{c.aviso}</p>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="tn-modal-pie"><button type="button" className="tn-boton" disabled={!elegido} onClick={() => elegido && agregar(elegido)}>{t("Agregar")}</button></div>
    </Modal>
  );
}

/** "Agregar bloque" en la columna de la ficha, como el de Tiendanube: un menú chico con buscador y los bloques por categoría. */
function MenuBloques({ bloques, agregar, cerrar }: { bloques: ItemCatalogo[]; agregar: (c: ItemCatalogo) => void; cerrar: () => void }) {
  const [q, setQ] = useState("");
  const vistos = bloques.filter((c) => c.nombre.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="tn-menu-buscar"><Input.Search autoFocus id="buscar-bloque" name="buscar-bloque" placeholder="Buscar..." value={q} onChange={(e) => setQ(val(e))} /></div>
      <div style={{ padding: "4px 0", maxHeight: "50vh", overflowY: "auto" }}>
        {CATEGORIAS.map((cat) => {
          const de = vistos.filter((c) => (c.categoria ?? "Otros") === cat);
          return de.length > 0 && (
            <div key={cat}>
              <div className="tn-menu-rotulo">{t(cat)}</div>
              {de.map((c) => <button key={c.type} type="button" className="tn-menu-item" onClick={() => { agregar(c); cerrar(); }}><span><EditingColumnsIcon /><span>{c.nombre}</span></span></button>)}
            </div>
          );
        })}
        {!vistos.length && <div className="tn-menu-rotulo" style={{ padding: "8px 12px" }}>{t("No hay bloques con ese nombre.")}</div>}
      </div>
    </>
  );
}

/**
 * Crear o editar una plantilla de producto: su nombre y sus productos (cada producto, en una sola plantilla: al sumarlo
 * acá sale de la otra). Al borrarla se borran sus widgets.
 */
function ModalPlantilla({ inicial, guardar, eliminar, cerrar }: { inicial: Plantilla | null; guardar: (p: Plantilla) => void; eliminar?: () => void; cerrar: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [elegidos, setElegidos] = useState(inicial?.vista ?? []);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<ProductoBuscado[]>([]);
  const [seguro, setSeguro] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => { buscarProductos(q).then(setRes).catch(() => setRes([])); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const listo = nombre.trim() && elegidos.length;
  return (
    <Modal titulo={t(inicial ? "Editar plantilla" : "Crear plantilla")} chico cerrar={cerrar}>
      <div style={{ padding: "0 24px 16px" }}>
        <div className="tn-campo">
          <label className="tn-etiqueta" htmlFor="plantilla-nombre">{t("Nombre")}</label>
          <input id="plantilla-nombre" className="tn-input" autoFocus value={nombre} placeholder={t("Por ejemplo, Remeras")} onChange={(e) => setNombre(val(e))} />
        </div>
        <div className="tn-campo">
          <label className="tn-etiqueta" htmlFor="plantilla-buscar">{t("Productos que usan esta plantilla")}</label>
          {elegidos.length > 0 && (
            <div className="tn-chips">
              {elegidos.map((x) => <span key={x.id}>{x.nombre}<button type="button" aria-label={t("Sacar {x}", { x: x.nombre })} onClick={() => setElegidos(elegidos.filter((y) => y.id !== x.id))}>✕</button></span>)}
            </div>
          )}
          <div className="tn-con-icono"><SearchIcon /><input id="plantilla-buscar" className="tn-input" placeholder={t("Buscá un producto")} value={q} onChange={(e) => setQ(val(e))} /></div>
          {res.length > 0 && (
            <div className="tn-resultados">
              {res.filter((r) => !elegidos.some((x) => x.id === r.id)).map((r) => (
                <button key={r.id} type="button" onClick={() => { setElegidos([...elegidos, { id: r.id, nombre: r.nombre, handle: r.handle }]); setQ(""); }}>
                  {r.imagen && <img src={r.imagen} alt="" />}{r.nombre}
                </button>
              ))}
            </div>
          )}
          <div className="tn-ayuda">{t("Los demás productos usan la plantilla base. Si un producto ya estaba en otra plantilla, pasa a esta.")}</div>
        </div>
      </div>
      <div className="tn-modal-pie" style={{ borderTop: "1px solid var(--border)", justifyContent: eliminar ? "space-between" : "flex-end" }}>
        {eliminar && (
          <button type="button" className="tn-boton-sec" style={{ color: "var(--destructive)", whiteSpace: "nowrap" }} onClick={() => (seguro ? eliminar() : setSeguro(true))}>
            {t(seguro ? "¿Seguro? Se borran sus widgets" : "Eliminar plantilla")}
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="tn-boton-sec" onClick={cerrar}>{t("Cancelar")}</button>
          <button type="button" className="tn-boton" disabled={!listo} onClick={() => guardar({ id: inicial?.id ?? nuevoId(), nombre: nombre.trim(), productos: elegidos.map((x) => x.id), vista: elegidos })}>{t(inicial ? "Guardar" : "Crear")}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- El árbol ---------- */

type PropsFila = {
  icono: ReactNode; texto: string; secundario?: string; sel?: boolean; apagada?: boolean; titulo?: string;
  abierto?: boolean; alternar?: () => void; elegir: () => void; acciones?: ReactNode; asa?: Record<string, unknown>;
};
function Fila({ icono, texto, secundario, sel, apagada, titulo, abierto, alternar, elegir, acciones, asa }: PropsFila) {
  return (
    <div className={`tn-fila${sel ? " tn-sel" : ""}${apagada ? " tn-apagada" : ""}${asa ? " tn-arrastrable" : ""}`} onClick={elegir} title={titulo}>
      {alternar ? (
        <button type="button" className={`tn-chev${abierto ? "" : " tn-cerrado"}`} aria-label={t(abierto ? "Cerrar" : "Abrir")} onClick={(e) => { e.stopPropagation(); alternar(); }}><Chevron /></button>
      ) : <span style={{ width: 20, flexShrink: 0 }} />}
      <span className="tn-fila-icono">
        <span className="tn-tipo">{icono}</span>
        {asa && <span className="tn-asa" {...asa} onClick={(e) => e.stopPropagation()}><DragDotsIcon /></span>}
      </span>
      <span className="tn-fila-texto">{texto}{secundario && <small>{secundario}</small>}</span>
      {acciones && <span className="tn-acciones" onClick={(e) => e.stopPropagation()}>{acciones}</span>}
    </div>
  );
}
/** La flechita de 12 px del árbol de Tiendanube (no es de Nimbus). */
const Chevron = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 4.75L6 7.25L8.5 4.75" /></svg>;

function Ordenable({ id, children }: { id: string; children: (asa: Record<string, unknown>) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>{children({ ...attributes, ...listeners })}</div>;
}

/** Una sección del theme: se elige (sus datos van en Editar diseño) y se le suelta un widget, que queda debajo de ella. */
function SoltarEn({ lugar, children }: { lugar?: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `zona:${lugar}`, disabled: !lugar });
  return <div ref={setNodeRef} className={isOver ? "tn-sobre" : ""}>{children}</div>;
}

function Insertar({ al }: { al: () => void }) {
  return <div className="tn-insertar"><button type="button" aria-label={t("Agregar acá")} onClick={al}><span><PlusIcon size={8} /></span></button></div>;
}

function Agregar({ texto, al }: { texto: string; al: () => void }) {
  return <button type="button" className="tn-agregar" onClick={al}><span /><PlusCircleIcon /><span>{texto}</span></button>;
}

function Grupo({ titulo, mas, children }: { titulo: string; mas?: () => void; children: ReactNode }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <div className="tn-grupo">
      <div className="tn-grupo-cab">
        <button type="button" onClick={() => setAbierto(!abierto)}>
          <span className={`tn-chev${abierto ? "" : " tn-cerrado"}`} style={{ color: "var(--fg)" }}><Chevron /></span>
          <b>{titulo}</b>
        </button>
        {mas && <button type="button" className="tn-ib" aria-label={t("Agregar sección")} onClick={mas} style={{ padding: 6 }}><PlusIcon size={14} /></button>}
      </div>
      {abierto && <div className="tn-grupo-cuerpo">{children}</div>}
    </div>
  );
}

/* ---------- El centro: la página de la tienda con los widgets ---------- */

function VistaDePagina({ tienda, ruta, dispositivo, cfg, plantilla, eleccion, rotulo, alMensaje, marco }: {
  tienda: string; ruta: string; dispositivo: Dispositivo; cfg: Config; plantilla: string | undefined | null; eleccion: Eleccion; rotulo: string;
  alMensaje: (m: Record<string, unknown>) => void; marco: React.MutableRefObject<HTMLIFrameElement | null>;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState({ ancho: 1024, alto: 700 });
  const [lista, setLista] = useState(false);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setMedida({ ancho: Math.round(e!.contentRect.width), alto: Math.round(e!.contentRect.height) }));
    if (caja.current) ro.observe(caja.current);
    return () => ro.disconnect();
  }, []);
  // Otra página u otro dispositivo: otra carga (los @media de la tienda se resuelven contra el ancho del iframe).
  useEffect(() => setLista(false), [ruta, dispositivo]);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return;
      const m = e.data as Record<string, unknown>;
      if (m?.gadsden === "listo") setLista(true);
      alMensaje(m);
    };
    addEventListener("message", h);
    return () => removeEventListener("message", h);
  });
  const sel = { id: eleccion?.k === "widget" ? eleccion.id : null, seccion: eleccion?.k === "seccion" ? eleccion.id : null, rotulo };
  // La configuración que se está editando, a cada cambio (con una pausa corta).
  useEffect(() => {
    if (!lista) return;
    // En la ficha, los de la plantilla que se edita (null: otra página, todos).
    const config = plantilla === null ? cfg : { ...cfg, widgets: cfg.widgets.filter((w) => deLaPlantilla(w, lugarDe(w), plantilla)) };
    const t = setTimeout(() => marco.current?.contentWindow?.postMessage({ gadsden: "config", config, pantalla: medida, idioma, ...sel }, "*"), 250);
    return () => clearTimeout(t);
  }, [lista, cfg, dispositivo, plantilla]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lista) marco.current?.contentWindow?.postMessage({ gadsden: "elegir", ...sel, ir: true }, "*"); }, [sel.id, sel.seccion, rotulo, lista]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="tn-preview">
      <div ref={caja} className={`tn-marco${dispositivo === "celular" ? " tn-celular" : ""}`}>
        <iframe key={`${ruta}|${dispositivo}`} ref={marco} title={t("Vista previa de la página")} src={`/tienda/${tienda}${ruta}`}
          sandbox="allow-scripts allow-popups allow-forms" style={{ border: 0, display: "block", width: "100%", height: "100%", visibility: lista ? "visible" : "hidden" }} />
      </div>
    </div>
  );
}

/* ---------- El editor ---------- */

function Panel() {
  const { addToast } = useToast();
  const [catalogo, setCatalogo] = useState<ItemCatalogo[] | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [historia, setHistoria] = useState<{ atras: Config[]; adelante: Config[] }>({ atras: [], adelante: [] });
  const [guardada, setGuardada] = useState("");
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState<PaginaId>("producto");
  const [producto, setProducto] = useState<ProductoBuscado | null>(null);
  const [dispositivo, setDispositivo] = useState<Dispositivo>("computadora");
  const [eleccion, setEleccion] = useState<Eleccion>(null);
  const [modo, setModo] = useState<"arbol" | "ajustes">("arbol");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [secciones, setSecciones] = useState<SeccionTheme[]>([]);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set(["main-product"]));
  const [destino, setDestino] = useState<Destino | null>(null);
  const [guardando, setGuardando] = useState(false);
  // El inicio (Nimbus) o el editor, que abre a pantalla completa como "Editar diseño".
  const [editor, setEditor] = useState(false);
  const [completa, setCompleta] = useState(true);
  const [costados, setCostados] = useState(true);
  const [salir, setSalir] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  const [buscarProducto, setBuscarProducto] = useState("");
  const [productos, setProductos] = useState<ProductoBuscado[]>([]);
  const [buscarPagina, setBuscarPagina] = useState("");
  // La plantilla de producto que se edita (undefined: la base), el submenú de Producto y el modal de plantilla.
  const [plantilla, setPlantilla] = useState<string | undefined>();
  const [submenu, setSubmenu] = useState(false);
  const [editando, setEditando] = useState<Plantilla | "nueva" | null>(null);
  const marco = useRef<HTMLIFrameElement | null>(null);
  // Con el mouse, y con el teclado (espacio para agarrar, flechas para mover, espacio para soltar).
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    Promise.all([fetch(idioma === "pt" ? "catalogo.pt.json" : "catalogo.json").then((r) => r.json() as Promise<ItemCatalogo[]>), leerConfig(), getStoreInfo(instancia) as Promise<Tienda>])
      .then(([c, x, t]) => { const y = conIds(x); setCatalogo(c); setCfg(y); setGuardada(JSON.stringify(y)); setTienda(t); })
      .catch((e) => setError((e as Error).message === "sesion" ? t("La sesión no es válida: volvé a abrir la app desde el admin.") : t("No se pudo cargar la configuración ({x}).", { x: (e as Error).message })));
    // La ficha que se edita: la del primer producto publicado (sin el permiso de productos, la página de inicio).
    buscarProductos("").then((ps) => { if (ps[0]) setProducto(ps[0]); else setPagina("inicio"); }).catch(() => setPagina("inicio"));
  }, []);
  useEffect(() => {
    if (buscarProducto.trim().length < 2) { setProductos([]); return; }
    const t = setTimeout(() => { buscarProductos(buscarProducto).then(setProductos).catch(() => setProductos([])); }, 300);
    return () => clearTimeout(t);
  }, [buscarProducto]);
  const porTipo = useMemo(() => new Map((catalogo ?? []).map((c) => [`${c.clase}:${c.type}`, c])), [catalogo]);

  // Deshacer y rehacer con el teclado, como en Tiendanube (fuera de los campos de texto).
  const teclas = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => { const h = (e: KeyboardEvent) => teclas.current(e); addEventListener("keydown", h); return () => removeEventListener("keydown", h); }, []);

  if (error) return <PantallaError motivo={error} />;
  if (!cfg || !catalogo || !tienda) return <div className="tn"><div className="tn-vacio">{t("Cargando...")}</div></div>;

  if (!editor) return <Inicio cfg={JSON.parse(guardada) as Config} alEditar={() => { navigateFullscreen(instancia, "fullscreen"); setCompleta(true); setEditor(true); }} />;

  const cambios = JSON.stringify(cfg) !== guardada;
  const itemDe = (w: Widget) => porTipo.get(`${claseDe(w)}:${tipoDe(w)}`);
  const nombreDe = (w: Widget) => w.nombre || itemDe(w)?.nombre || tipoDe(w);
  // Cada cambio queda en la historia (deshacer y rehacer, como en el editor de Tiendanube).
  const cambiar = (c: Config) => { setHistoria((h) => ({ atras: [...h.atras.slice(-49), cfg], adelante: [] })); setCfg(c); };
  const deshacer = () => { const c = historia.atras.at(-1); if (c) { setHistoria({ atras: historia.atras.slice(0, -1), adelante: [cfg, ...historia.adelante] }); setCfg(c); } };
  const rehacer = () => { const [c, ...resto] = historia.adelante; if (c) { setHistoria({ atras: [...historia.atras, cfg], adelante: resto }); setCfg(c); } };
  teclas.current = (e) => {
    if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).closest?.("input, textarea, select")) return;
    if (e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) rehacer(); else deshacer(); } else if (e.key.toLowerCase() === "y") { e.preventDefault(); rehacer(); }
  };
  const guardar = async () => {
    setGuardando(true);
    try { await guardarConfig(cfg); setGuardada(JSON.stringify(cfg)); addToast({ id: `ok-${Date.now()}`, type: "success", text: t("Guardado: ya se ve en tu tienda."), duration: 4000 }); }
    catch (e) { addToast({ id: `mal-${Date.now()}`, type: "danger", text: t("No se pudo guardar ({x}).", { x: (e as Error).message }), duration: 8000 }); }
    finally { setGuardando(false); }
  };
  // La × vuelve al inicio sin lo que no se guardó.
  const irse = () => { navigateFullscreen(instancia, "normal"); setCfg(JSON.parse(guardada) as Config); setHistoria({ atras: [], adelante: [] }); setEleccion(null); setSalir(false); setEditor(false); };

  const ruta = pagina === "producto" ? (producto ? `/productos/${producto.handle}/` : "/") : PAGINAS[pagina].ruta;
  const widgetDe = (id: string) => cfg.widgets.find((x) => x.id === id);
  const cambiarWidget = (w: Widget) => cambiar({ ...cfg, widgets: cfg.widgets.map((x) => (x.id === w.id ? w : x)) });
  const sacar = (id: string) => { cambiar({ ...cfg, widgets: cfg.widgets.filter((x) => x.id !== id) }); if (eleccion?.k === "widget" && eleccion.id === id) setEleccion(null); };
  const duplicar = (w: Widget) => {
    const copia = { ...structuredClone(w), id: nuevoId() } as Widget;
    const i = cfg.widgets.indexOf(w);
    cambiar({ ...cfg, widgets: [...cfg.widgets.slice(0, i + 1), copia, ...cfg.widgets.slice(i + 1)] });
    setEleccion({ k: "widget", id: copia.id! });
  };
  const ocultar = (w: Widget) => cambiarWidget({ ...w, oculto: !w.oculto || undefined } as Widget);
  // En la ficha, los de la plantilla que se edita y los de toda la tienda.
  const visible = (w: Widget) => pagina !== "producto" || deLaPlantilla(w, lugarDe(w), plantilla);
  const deLugar = (l: string) => cfg.widgets.filter((w) => visible(w) && w.lugar !== SOLO_CODIGO && mismoLugar(lugarDe(w), l));
  const enOtras = cfg.widgets.filter((w) => visible(w) && !zonas.some((z) => mismoLugar(lugarDe(w), z.lugar)));
  const plantillas = cfg.plantillas ?? [];
  const laPlantilla = plantillas.find((x) => x.id === plantilla);
  const irAPlantilla = (id: string | undefined) => {
    setPagina("producto"); setPlantilla(id); setEleccion(null);
    const muestra = plantillas.find((x) => x.id === id)?.vista?.[0];
    if (muestra) setProducto({ ...muestra, imagen: null });
  };
  const guardarPlantilla = (x: Plantilla) => {
    const nueva = !plantillas.some((y) => y.id === x.id);
    // Cada producto, en una sola plantilla; una nueva arranca con los widgets de la ficha base.
    const resto = plantillas.map((y) => (y.id === x.id ? x : { ...y, productos: y.productos.filter((id) => !x.productos.includes(id)), vista: y.vista?.filter((v) => !x.productos.includes(v.id)) }));
    const copias = nueva ? cfg.widgets.filter((w) => !w.plantilla && !esComun(lugarDe(w)) && w.lugar !== SOLO_CODIGO && /product|_dynamic_section_main/.test(lugarDe(w))).map((w) => ({ ...structuredClone(w), id: nuevoId(), plantilla: x.id }) as Widget) : [];
    cambiar({ ...cfg, plantillas: nueva ? [...resto, x] : resto, widgets: [...cfg.widgets, ...copias] });
    setEditando(null);
    if (nueva) { irAPlantilla(x.id); if (x.vista?.[0]) setProducto({ ...x.vista[0], imagen: null }); }
  };
  const eliminarPlantilla = (id: string) => {
    const resto = plantillas.filter((y) => y.id !== id);
    cambiar({ ...cfg, plantillas: resto.length ? resto : undefined, widgets: cfg.widgets.filter((w) => w.plantilla !== id) });
    setEditando(null);
    if (plantilla === id) irAPlantilla(undefined);
  };
  const elegir = (e: Eleccion) => { setEleccion(e); setRenombrando(false); if (e?.k === "widget") setAbiertos((a) => new Set(a).add(e.id)); };
  const alternar = (k: string) => setAbiertos((a) => { const b = new Set(a); if (b.has(k)) b.delete(k); else b.add(k); return b; });

  const alMensaje = (m: Record<string, unknown>) => {
    if ((m.gadsden === "listo" || m.gadsden === "dibujado") && Array.isArray(m.lugares)) { setZonas(m.lugares as Zona[]); setSecciones((m.secciones as SeccionTheme[]) ?? []); }
    else if (m.gadsden === "elegir" && m.id) elegir({ k: "widget", id: String(m.id) });
    else if (m.gadsden === "elegir" && m.seccion) { setModo("arbol"); elegir({ k: "seccion", id: String(m.seccion) }); }
    else if (m.gadsden === "aviso") addToast({ id: `aviso-${Date.now()}`, type: "primary", text: t("Vista previa: {x}", { x: String(m.texto) }), duration: 4000 });
  };

  // Agregar del catálogo: en el primer lugar del destino donde pueda ir; antes de un widget si se insertó entre dos.
  const agregarDelCatalogo = (c: ItemCatalogo, d = destino) => {
    if (!d) return;
    const w = nuevo(c, d.lugares.find((l) => puedeIr(c, l)) ?? c.lugar);
    if (pagina === "producto" && plantilla && !esComun(w.lugar)) w.plantilla = plantilla;
    const i = d.antesDe ? cfg.widgets.findIndex((x) => x.id === d.antesDe) : -1;
    const ws = [...cfg.widgets];
    ws.splice(i >= 0 && mismoLugar(lugarDe(ws[i]!), w.lugar!) ? i : ws.length, 0, w);
    cambiar({ ...cfg, widgets: ws });
    elegir({ k: "widget", id: w.id! });
    setDestino(null);
  };

  // Arrastrar: un widget a otro widget (queda antes de él, en su lugar) o a una sección del theme (queda último debajo de
  // ella); un bloque, entre los bloques de su widget.
  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const a = String(active.id), o = String(over.id);
    if (a.startsWith("b|")) {
      const [, wid, i] = a.split("|"), [, wid2, j] = o.split("|");
      const w = widgetDe(wid!);
      if (wid !== wid2 || !w || w.tipo !== "gadsden" || !w.seccion) return;
      const b = [...listaDe(w.seccion)];
      const [x] = b.splice(Number(i), 1);
      b.splice(Number(j), 0, x!);
      cambiarWidget(conBloques(w, b));
      return;
    }
    const w = widgetDe(a);
    if (!w) return;
    const sobre = widgetDe(o);
    if (!sobre && !o.startsWith("zona:")) return;
    // El lugar de la página (un widget de la versión anterior guarda el nombre viejo del lugar, que Ipanema ya no tiene).
    const lugar = sobre ? (zonas.find((z) => mismoLugar(z.lugar, lugarDe(sobre)))?.lugar ?? lugarDe(sobre)) : o.replace(/^zona:/, "");
    const item = itemDe(w);
    if (item && !puedeIr(item, lugar) && !mismoLugar(lugar, lugarDe(w))) {
      addToast({ id: `lugar-${Date.now()}`, type: "danger", text: t("{x} no puede ir en ese lugar.", { x: item.nombre }), duration: 4000 });
      return;
    }
    const resto = cfg.widgets.filter((x) => x.id !== w.id);
    const movido = { ...w, lugar } as Widget;
    let i = sobre ? resto.indexOf(sobre) : -1;
    if (!sobre) { const ultimo = [...resto].reverse().find((x) => mismoLugar(lugarDe(x), lugar)); i = ultimo ? resto.indexOf(ultimo) + 1 : resto.length; }
    else if (cfg.widgets.indexOf(w) < cfg.widgets.indexOf(sobre)) i += 1;
    resto.splice(i, 0, movido);
    cambiar({ ...cfg, widgets: resto });
  };

  /* --- El árbol: Encabezado / la página / Pie de página, con las secciones del theme y los widgets entre ellas --- */
  const hay = (l: string) => zonas.some((z) => z.lugar === l);
  const nombreZona = (l: string) => zonas.find((z) => z.lugar === l)?.nombre ?? l;
  const enc = ENCABEZADO.filter(hay), pie = PIE.filter(hay);
  const fijos = zonas.filter((z) => esFijo(z.lugar)).map((z) => z.lugar);
  const ficha = zonas.filter((z) => esFicha(z.lugar)).map((z) => z.lugar)
    .sort((a, b) => Number(b === "after_product_detail_add_to_cart") - Number(a === "after_product_detail_add_to_cart"));
  const deSecciones = new Set(secciones.flatMap((s) => [s.antes, s.despues]).filter(Boolean));
  const sueltas = zonas.map((z) => z.lugar).filter((l) => !enc.includes(l) && !pie.includes(l) && !esFijo(l) && !esFicha(l) && !deSecciones.has(l));
  const tituloSeccion = (s: SeccionTheme) => tituloDeSeccion(s.tipo, idioma);
  const delGrupo = (g: SeccionTheme["grupo"]) => secciones.filter((s) => s.grupo === g);
  const agregarEn = (titulo: string, lugares: string[], antesDe?: string) => { if (lugares.length) setDestino({ titulo, lugares, antesDe }); };

  // "Agregar <bloque>": si el widget tiene un solo tipo de bloque, directo; si tiene varios, el menú con los tipos.
  const agregarBloque = (w: WG, item: ItemCatalogo, bloques: Bloque[]) => {
    const tipos = item.esquema.blocks ?? [];
    const lleno = item.esquema.max_blocks !== undefined && bloques.length >= item.esquema.max_blocks;
    const puede = (t: string) => { const l = tipos.find((b) => b.type === t)?.limit; return !lleno && (l === undefined || bloques.filter((b) => b.type === t).length < l); };
    const sumar = (t: string) => { cambiarWidget(conBloques(w, [...bloques, { type: t, settings: {} }])); elegir({ k: "widget", id: w.id!, bloque: bloques.length }); };
    if (lleno) return null;
    if (tipos.length === 1) return puede(tipos[0]!.type) ? <Agregar texto={t("Agregar {x}", { x: tipos[0]!.name ?? t("bloque") })} al={() => sumar(tipos[0]!.type)} /> : null;
    return (
      <Desplegable ancho={240} boton={(abrir) => <Agregar texto={t("Agregar bloque")} al={abrir} />}>
        {(cerrar) => tipos.filter((t) => puede(t.type)).map((t) => <button key={t.type} type="button" className="tn-menu-item" onClick={() => { sumar(t.type); cerrar(); }}><span><ListIcon /><span>{t.name ?? t.type}</span></span></button>)}
      </Desplegable>
    );
  };

  const filaWidget = (w: Widget, detalle?: string): ReactNode => {
    const item = itemDe(w);
    const sel = eleccion?.k === "widget" && eleccion.id === w.id;
    const bloques = w.tipo === "gadsden" && w.seccion && item?.esquema.blocks?.length ? listaDe(w.seccion) : null;
    const abierto = abiertos.has(w.id!);
    const icono = esFijo(lugarDe(w)) ? <AppsIcon /> : claseDe(w) === "bloque" ? <EditingColumnsIcon /> : <LayoutIcon />;
    return (
      <div key={w.id}>
        <Ordenable id={w.id!}>
          {(asa) => (
            <Fila icono={icono} texto={nombreDe(w)} secundario={!item ? t("versión anterior") : detalle} sel={sel && eleccion.bloque === undefined} apagada={w.oculto} asa={asa}
              abierto={abierto} alternar={bloques ? () => alternar(w.id!) : undefined} elegir={() => elegir({ k: "widget", id: w.id! })}
              acciones={<>
                <button type="button" className="tn-borrar" title={t("Eliminar")} onClick={() => sacar(w.id!)}><TrashIcon size={14} /></button>
                <button type="button" title={t("Duplicar")} onClick={() => duplicar(w)}><CopyIcon size={14} /></button>
                <button type="button" className="tn-ojo" title={t(w.oculto ? "Mostrar" : "Ocultar")} onClick={() => ocultar(w)}>{w.oculto ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}</button>
              </>} />
          )}
        </Ordenable>
        {bloques && abierto && w.tipo === "gadsden" && (
          <div className={`tn-hijos tn-hijo${sel ? " tn-de-sel" : ""}`}>
            <SortableContext items={bloques.map((_, i) => `b|${w.id}|${i}`)} strategy={verticalListSortingStrategy}>
              {bloques.map((b, i) => {
                const eb = item!.esquema.blocks!.find((x) => x.type === b.type);
                const resumen = Object.values(b.settings ?? {}).find((v) => typeof v === "string" && v && !v.startsWith("#") && v.length < 60) as string | undefined;
                return (
                  <Ordenable key={`b|${w.id}|${i}`} id={`b|${w.id}|${i}`}>
                    {(asa) => (
                      <Fila icono={<ListIcon />} texto={eb?.name ?? b.type} secundario={resumen?.replace(/<[^>]+>/g, "")} asa={asa}
                        sel={eleccion?.k === "widget" && eleccion.id === w.id && eleccion.bloque === i} elegir={() => elegir({ k: "widget", id: w.id!, bloque: i })}
                        acciones={<>
                          <button type="button" className="tn-borrar" title={t("Eliminar")} onClick={() => { cambiarWidget(conBloques(w, bloques.filter((_, k) => k !== i))); elegir({ k: "widget", id: w.id! }); }}><TrashIcon size={14} /></button>
                          <button type="button" title={t("Duplicar")} onClick={() => cambiarWidget(conBloques(w, [...bloques.slice(0, i + 1), structuredClone(b), ...bloques.slice(i + 1)]))}><CopyIcon size={14} /></button>
                        </>} />
                    )}
                  </Ordenable>
                );
              })}
            </SortableContext>
            {agregarBloque(w, item!, bloques)}
          </div>
        )}
      </div>
    );
  };

  /** Las filas de un lugar, cada una con su línea para insertar antes de ella. */
  const lista = (l: string, detalle?: string) => {
    const ws = deLugar(l);
    if (!ws.length) return null;
    return (
      <SortableContext key={l} items={ws.map((w) => w.id!)} strategy={verticalListSortingStrategy}>
        {ws.map((w) => <div key={w.id}><Insertar al={() => agregarEn(t("Agregar sección"), [l], w.id)} />{filaWidget(w, detalle)}</div>)}
      </SortableContext>
    );
  };
  const filaSeccion = (s: SeccionTheme, hijos?: ReactNode) => {
    const k = s.tipo === "main-product" ? "main-product" : `s:${s.id}`;
    const abierto = abiertos.has(k);
    return (
      <SoltarEn key={s.id} lugar={s.despues ?? (s.grupo === "pie" ? pie[0] : s.grupo === "encabezado" ? enc.at(-1) : undefined)}>
        <Fila icono={ICONO_SECCION[s.tipo] ?? <LayoutIcon />} texto={tituloSeccion(s)} titulo={t("Es de tu theme: se edita en Editar diseño")}
          sel={eleccion?.k === "seccion" && eleccion.id === s.id} elegir={() => elegir({ k: "seccion", id: s.id })}
          abierto={abierto} alternar={hijos ? () => alternar(k) : undefined} />
        {hijos && abierto && <div className="tn-hijos tn-hijo">{hijos}</div>}
      </SoltarEn>
    );
  };
  // Los hijos de "Información del producto": las fotos y la columna de compra, con los widgets de la ficha.
  const hijosDeLaFicha = (
    <>
      <Fila icono={<PictureIcon />} texto={t("Multimedia")} titulo={t("Es de tu theme: se edita en Editar diseño")} elegir={() => {}} />
      {lista("after_product_detail_image", t("debajo de las fotos"))}
      <Fila icono={<InfoCircleIcon />} texto={t("Información de compra")} titulo={t("Es de tu theme: se edita en Editar diseño")} elegir={() => {}} />
      {ficha.filter((l) => l !== "after_product_detail_image").map((l) => lista(l, nombreZona(l).replace(/^(Columna|Coluna): /, "")))}
      {ficha.length > 0 && (
        <Desplegable ancho={256} boton={(abrir) => <Agregar texto={t("Agregar bloque")} al={abrir} />}>
          {(cerrar) => <MenuBloques bloques={catalogo.filter((c) => c.clase === "bloque" && ficha.some((l) => puedeIr(c, l)))} agregar={(c) => agregarDelCatalogo(c, { titulo: t("Agregar bloque"), lugares: ficha })} cerrar={cerrar} />}
        </Desplegable>
      )}
    </>
  );
  const hayFicha = secciones.some((s) => s.tipo === "main-product");
  const paginaSecs = delGrupo("pagina");
  const paraLaPagina = [...[...paginaSecs].reverse().map((s) => s.despues).filter((l): l is string => !!l), ...sueltas];
  const nombrePagina = pagina === "producto" && laPlantilla ? laPlantilla.nombre : t(PAGINAS[pagina].nombre);

  const arbol = (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <Grupo titulo={t("Encabezado")} mas={enc.length ? () => agregarEn(t("Agregar sección"), enc) : undefined}>
        {delGrupo("encabezado").map((s) => filaSeccion(s))}
        {enc.map((l) => lista(l))}
        {enc.length > 0 && <Agregar texto={t("Agregar sección")} al={() => agregarEn(t("Agregar sección"), enc)} />}
      </Grupo>
      <Grupo titulo={nombrePagina} mas={paraLaPagina.length ? () => agregarEn(t("Agregar sección"), paraLaPagina) : undefined}>
        {paginaSecs.map((s, i) => {
          const antes = s.antes ?? paginaSecs[i - 1]?.despues;
          return (
            <div key={s.id}>
              {lista(s.antes ?? "")}
              {antes && <Insertar al={() => agregarEn(t("Agregar sección"), [antes])} />}
              {filaSeccion(s, s.tipo === "main-product" ? hijosDeLaFicha : undefined)}
              {lista(s.despues ?? "")}
            </div>
          );
        })}
        {!hayFicha && ficha.map((l) => lista(l, nombreZona(l).replace(/^(Columna|Coluna): /, "")))}
        {sueltas.map((l) => lista(l, nombreZona(l)))}
        {paraLaPagina.length > 0 && <Agregar texto={t("Agregar sección")} al={() => agregarEn(t("Agregar sección"), paraLaPagina)} />}
      </Grupo>
      <Grupo titulo={t("Pie de página")} mas={pie.length ? () => agregarEn(t("Agregar sección"), pie) : undefined}>
        {pie.map((l) => lista(l))}
        {pie.length > 0 && <Insertar al={() => agregarEn(t("Agregar sección"), pie)} />}
        {delGrupo("pie").map((s) => filaSeccion(s))}
        {pie.length > 0 && <Agregar texto={t("Agregar sección")} al={() => agregarEn(t("Agregar sección"), pie)} />}
      </Grupo>
      {fijos.length > 0 && (
        <Grupo titulo={t("Fijos en la pantalla")} mas={() => agregarEn(t("Agregar sección"), fijos)}>
          {fijos.map((l) => lista(l, nombreZona(l).replace(/^(Fija|Fixa) /, "")))}
          <Agregar texto={t("Agregar sección")} al={() => agregarEn(t("Agregar sección"), fijos)} />
        </Grupo>
      )}
      {enOtras.length > 0 && (
        <Grupo titulo={t("En otras páginas")}>
          <SortableContext items={enOtras.map((w) => w.id!)} strategy={verticalListSortingStrategy}>
            {enOtras.map((w) => filaWidget(w, w.lugar === SOLO_CODIGO ? t("sólo con código") : undefined))}
          </SortableContext>
        </Grupo>
      )}
    </DndContext>
  );

  /* --- Ajustes globales (la ruedita) --- */
  const tema: Tema = cfg.tema ?? {};
  const AJUSTES_ESTILO: Ajuste[] = [
    { type: "select", id: "estilo", label: t("Estilo de los widgets"), options: [{ value: "tienda", label: t("El de mi tienda") }, { value: "clasico", label: t("Clásico de Gadsden") }, { value: "oscuro", label: t("Oscuro") }] },
    { type: "header", content: t("Colores") },
    { type: "color", id: "fondo", label: t("Fondo") }, { type: "color", id: "texto", label: t("Texto") },
    { type: "color", id: "boton", label: t("Botón") }, { type: "color", id: "botonTexto", label: t("Texto del botón") },
    { type: "header", content: t("Tipografía") },
    { type: "text", id: "letra", label: t("Letra del texto"), info: t("El nombre en Google Fonts (por ejemplo, Inter). Vacío: la del sistema.") },
    { type: "text", id: "letraTitulos", label: t("Letra de los títulos") },
    { type: "range", id: "pesoTitulos", label: t("Grosor de los títulos"), min: 100, max: 900, step: 100 },
  ];
  const cambiarEstilo = (v: Valores) => {
    const { estilo, ...t } = v;
    cambiar({ ...cfg, estilo: (estilo as Config["estilo"]) ?? undefined, tema: Object.fromEntries(Object.entries(t).filter(([, x]) => x !== "" && x !== undefined)) as Tema });
  };
  const GLOBALES: { cual: Global; nombre: string; icono: ReactNode }[] = [
    { cual: "estilo", nombre: t("Estilo y colores"), icono: <ColorPaletteIcon /> },
    { cual: "codigo", nombre: t("Código para pegar"), icono: <CodeIcon /> },
    { cual: "descuentos", nombre: t("Precios con descuento"), icono: <DiscountCircleIcon /> },
  ];

  /* --- La derecha: los ajustes de lo elegido --- */
  const w = eleccion?.k === "widget" ? widgetDe(eleccion.id) : undefined;
  const item = w ? itemDe(w) : undefined;
  const bloqueI = eleccion?.k === "widget" ? eleccion.bloque : undefined;
  const sec = eleccion?.k === "seccion" ? secciones.find((s) => s.id === eleccion.id) : undefined;
  const rotulo = w ? (bloqueI !== undefined && w.tipo === "gadsden" && w.seccion ? (item?.esquema.blocks?.find((b) => b.type === listaDe(w.seccion)[bloqueI]?.type)?.name ?? "") : nombreDe(w)) : sec ? tituloSeccion(sec) : "";
  const lugaresDelElegido = item ? zonas.filter((z) => puedeIr(item, z.lugar)) : [];

  const cabecera = (titulo: string, menu?: (cerrar: () => void) => ReactNode, renombrar?: (t: string) => void) => (
    <div className="tn-panel-cab">
      {renombrando && renombrar ? (
        <input autoFocus defaultValue={titulo} onBlur={(e) => { renombrar(e.target.value.trim()); setRenombrando(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenombrando(false); }} />
      ) : <b onClick={() => renombrar && setRenombrando(true)} style={{ cursor: renombrar ? "text" : undefined }}>{titulo}</b>}
      {menu && (
        <Desplegable derecha ancho={180} boton={(abrir) => <button type="button" className="tn-ib" style={{ padding: 4 }} aria-label={t("Más opciones")} onClick={abrir}><EllipsisIcon size={20} /></button>}>
          {menu}
        </Desplegable>
      )}
    </div>
  );
  const itemMenu = (icono: ReactNode, texto: string, al: () => void, cerrar: () => void, peligro = false) => (
    <button type="button" className={`tn-menu-item${peligro ? " tn-peligro" : ""}`} onClick={() => { al(); cerrar(); }}><span>{icono}<span>{texto}</span></span></button>
  );

  let derecha: ReactNode = <div className="tn-vacio">{t("Seleccioná una sección o bloque para editar sus ajustes")}</div>;
  if (eleccion?.k === "global") {
    const g = GLOBALES.find((x) => x.cual === eleccion.cual)!;
    const gadsden = cfg.widgets.filter((x): x is WG => x.tipo === "gadsden");
    derecha = (
      <>
        {cabecera(g.nombre)}
        <div className="tn-ajustes">
          {g.cual === "estilo" && <Formulario ajustes={AJUSTES_ESTILO} valores={{ estilo: cfg.estilo ?? "tienda", ...tema }} cambiar={cambiarEstilo} />}
          {g.cual === "codigo" && (
            <>
              <div className="tn-parrafo">{negritas(t("Para poner un widget en cualquier lugar desde Editar diseño: agregá una sección **Personalizada** con un bloque **Código** y pegá el código del widget."))}</div>
              {!gadsden.length && <div className="tn-parrafo">{t("Todavía no hay widgets.")}</div>}
              {gadsden.map((x) => <div key={x.id} className="tn-campo"><label className="tn-etiqueta">{nombreDe(x)}</label><CodigoParaPegar w={x} /></div>)}
            </>
          )}
          {g.cual === "descuentos" && <div className="tn-parrafo">{negritas(t("Los widgets que muestran un precio con descuento (ofertas por cantidad, combos, planes) no cambian lo que cobra el carrito: el descuento lo aplica tu tienda. Creá la promoción en **Descuentos > Promociones**, con los mismos porcentajes que pusiste en el widget."))}</div>}
        </div>
      </>
    );
  } else if (sec) {
    derecha = (
      <>
        {cabecera(tituloSeccion(sec))}
        <div className="tn-ajustes"><div className="tn-parrafo">{negritas(t("Esta sección es de tu theme: sus ajustes se editan en **Tienda online > Diseño > Editar diseño**. Acá podés poner widgets arriba o abajo de ella: usá la línea entre dos filas del árbol o arrastrá un widget sobre esta fila."))}</div></div>
      </>
    );
  } else if (w && bloqueI !== undefined && w.tipo === "gadsden" && w.seccion && item) {
    const bloques = listaDe(w.seccion);
    const b = bloques[bloqueI];
    if (b) {
      const eb = item.esquema.blocks?.find((x) => x.type === b.type);
      derecha = (
        <>
          {cabecera(eb?.name ?? b.type, (cerrar) => <>
            {itemMenu(<CopyIcon />, t("Duplicar"), () => cambiarWidget(conBloques(w, [...bloques.slice(0, bloqueI + 1), structuredClone(b), ...bloques.slice(bloqueI + 1)])), cerrar)}
            <hr />
            {itemMenu(<TrashIcon />, t("Eliminar"), () => { cambiarWidget(conBloques(w, bloques.filter((_, k) => k !== bloqueI))); elegir({ k: "widget", id: w.id! }); }, cerrar, true)}
          </>)}
          <div className="tn-ajustes"><Formulario ajustes={eb?.settings} valores={b.settings ?? {}} cambiar={(v) => cambiarWidget(conBloques(w, bloques.map((x, k) => (k === bloqueI ? { ...x, settings: v } : x))))} /></div>
        </>
      );
    }
  } else if (w) {
    const menu = (cerrar: () => void) => <>
      {itemMenu(<CopyIcon />, t("Duplicar"), () => duplicar(w), cerrar)}
      {item && itemMenu(<PencilIcon />, t("Renombrar"), () => setRenombrando(true), cerrar)}
      {itemMenu(w.oculto ? <EyeIcon /> : <EyeOffIcon />, t(w.oculto ? "Mostrar" : "Ocultar"), () => ocultar(w), cerrar)}
      <hr />
      {itemMenu(<TrashIcon />, t("Eliminar"), () => sacar(w.id!), cerrar, true)}
    </>;
    const parte = w.tipo === "gadsden" ? w.bloque ?? w.seccion : undefined;
    const enZona = zonas.find((z) => mismoLugar(z.lugar, lugarDe(w)));
    derecha = (
      <>
        {cabecera(nombreDe(w), menu, item ? (t) => cambiarWidget({ ...w, nombre: t && t !== item.nombre ? t : undefined } as Widget) : undefined)}
        <div className="tn-ajustes">
          {!item && <div className="tn-parrafo">{t("Es un widget de la versión anterior: no tiene ajustes. Podés eliminarlo y agregar el de Gadsden equivalente.")}</div>}
          {item?.aviso && <div className="tn-aviso">{item.aviso}</div>}
          <AvisoDescuento lista={descuentosPorCantidad(w, item?.esquema.settings)} />
          {item && parte && w.tipo === "gadsden" && (
            <Formulario ajustes={item.esquema.settings} valores={parte.settings ?? {}} cambiar={(v: Valores) => cambiarWidget(w.bloque ? { ...w, bloque: { ...w.bloque, settings: v } } : { ...w, seccion: { ...w.seccion!, settings: v } })} />
          )}
          {item && (
            <>
              <h3 className="tn-titulo-ajustes">{t("Ubicación")}</h3>
              <div className="tn-campo">
                <label className="tn-etiqueta" htmlFor="lugar-elegido">{t("Dónde va")}</label>
                <select id="lugar-elegido" className="tn-select" value={enZona ? enZona.lugar : lugarDe(w)} onChange={(e) => cambiarWidget({ ...w, lugar: val(e) } as Widget)}>
                  {lugaresDelElegido.map((z) => <option key={z.lugar} value={z.lugar}>{z.nombre}</option>)}
                  {!enZona && w.lugar !== SOLO_CODIGO && <option value={lugarDe(w)}>{t("Un lugar de otra página")}</option>}
                  <option value={SOLO_CODIGO}>{t("Sólo donde pegue su código")}</option>
                </select>
              </div>
              {w.lugar === SOLO_CODIGO && <div className="tn-campo"><CodigoParaPegar w={w} /></div>}
            </>
          )}
        </div>
      </>
    );
  }

  const paginasFiltradas = (Object.keys(PAGINAS) as PaginaId[]).filter((k) => t(PAGINAS[k].nombre).toLowerCase().includes(buscarPagina.toLowerCase()));
  const enLaTienda = `${tienda.url.replace(/\/$/, "")}${ruta}`;

  return (
    <div className="tn">
      {/* Arriba. */}
      <header className="tn-header">
        <div className="tn-header-izq">
          {modo === "ajustes" ? (
            <>
              <span className="tn-header-titulo" style={{ fontWeight: 600, paddingLeft: 4 }}>{t("Ajustes globales")}</span>
              <button type="button" className="tn-ib" aria-label={t("Cerrar ajustes")} onClick={() => { setModo("arbol"); if (eleccion?.k === "global") setEleccion(null); }}><CloseIcon /></button>
            </>
          ) : (
            <>
              <button type="button" className="tn-ib" aria-label={t("Cerrar")} title={t("Cerrar")} onClick={() => (cambios ? setSalir(true) : irse())}><CloseIcon /></button>
              <span className="tn-header-titulo">{t("Editar widgets")}</span>
              <button type="button" className="tn-ib" aria-label={t("Ajustes globales")} title={t("Ajustes globales")} onClick={() => { setModo("ajustes"); elegir({ k: "global", cual: "estilo" }); }}><CogIcon /></button>
            </>
          )}
        </div>
        <div className="tn-header-centro">
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <Desplegable boton={(abrir) => (
              <button type="button" className="tn-pagina" onClick={() => { setSubmenu(false); abrir(); }}>
                <span style={{ display: "flex", color: "var(--muted-fg)" }}>{PAGINAS[pagina].icono}</span><b>{nombrePagina}</b><ChevronDownIcon size={14} />
              </button>
            )}>
              {(cerrar) => submenu ? (
                <>
                  <button type="button" className="tn-menu-titulo" style={{ width: "100%" }} onClick={() => setSubmenu(false)}><ChevronLeftIcon size={14} />{t("Producto")}</button>
                  <div className="tn-menu-buscar"><Input.Search autoFocus id="buscar-plantilla" name="buscar-plantilla" placeholder={t("Buscar plantillas...")} value={buscarPagina} onChange={(e) => setBuscarPagina(val(e))} /></div>
                  <div style={{ padding: "4px 0", maxHeight: "60vh", overflowY: "auto" }}>
                    <div className="tn-menu-rotulo">{t("Plantilla base")}</div>
                    <button type="button" className={`tn-menu-item${pagina === "producto" && !plantilla ? " tn-actual" : ""}`} disabled={!producto} onClick={() => { irAPlantilla(undefined); setSubmenu(false); cerrar(); }}>
                      <span><TagIcon /><span>{t("Producto")}</span></span>
                    </button>
                    {plantillas.filter((x) => x.nombre.toLowerCase().includes(buscarPagina.toLowerCase())).length > 0 && <div className="tn-menu-rotulo">{t("Plantillas")}</div>}
                    {plantillas.filter((x) => x.nombre.toLowerCase().includes(buscarPagina.toLowerCase())).map((x) => (
                      <div key={x.id} className={`tn-menu-item${pagina === "producto" && plantilla === x.id ? " tn-actual" : ""}`} style={{ cursor: "pointer" }} onClick={() => { irAPlantilla(x.id); setSubmenu(false); cerrar(); }}>
                        <span><TagIcon /><span>{x.nombre}</span></span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <small style={{ fontSize: 12, color: "var(--disabled-text)" }}>{t(x.productos.length === 1 ? "{n} producto" : "{n} productos", { n: x.productos.length })}</small>
                          <button type="button" className="tn-ib" style={{ padding: 4 }} aria-label={t("Editar {x}", { x: x.nombre })} title={t("Editar plantilla")} onClick={(e) => { e.stopPropagation(); setEditando(x); cerrar(); }}><PencilIcon size={14} /></button>
                        </span>
                      </div>
                    ))}
                    <hr />
                    <button type="button" className="tn-menu-item" style={{ color: "var(--primary)" }} onClick={() => { setEditando("nueva"); setSubmenu(false); cerrar(); }}>
                      <span><PlusCircleIcon /><span style={{ color: "var(--primary)" }}>{t("Crear plantilla")}</span></span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="tn-menu-buscar"><Input.Search autoFocus id="buscar-pagina" name="buscar-pagina" placeholder={t("Buscar plantillas...")} value={buscarPagina} onChange={(e) => setBuscarPagina(val(e))} /></div>
                  <div style={{ padding: "4px 0", maxHeight: "60vh", overflowY: "auto" }}>
                    {paginasFiltradas.map((k) => (
                      <div key={k}>
                        {k === "busqueda" && <hr />}
                        <button type="button" className={`tn-menu-item${k === pagina ? " tn-actual" : ""}`}
                          onClick={() => { if (k === "producto") { setSubmenu(true); setBuscarPagina(""); return; } setPagina(k); setEleccion(null); cerrar(); }}>
                          <span>{PAGINAS[k].icono}<span>{t(PAGINAS[k].nombre)}</span></span>
                          {k === "producto" && <ChevronRightIcon />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Desplegable>
            {pagina === "producto" && producto && (
              <Desplegable boton={(abrir) => <button type="button" className="tn-previsualizar" onClick={abrir}><span>{t("Previsualizar:")}</span><b>“{producto.nombre}”</b><ChevronDownIcon size={14} /></button>}>
                {(cerrar) => (
                  <>
                    <div className="tn-menu-buscar"><Input.Search autoFocus id="buscar-producto" name="buscar-producto" placeholder={t("Buscar productos...")} value={buscarProducto} onChange={(e) => setBuscarProducto(val(e))} /></div>
                    <div style={{ padding: "4px 0", maxHeight: "50vh", overflowY: "auto" }}>
                      {!productos.length && !laPlantilla?.vista?.length && <div className="tn-menu-rotulo" style={{ padding: "8px 12px" }}>{t("Escribí para buscar un producto.")}</div>}
                      {(productos.length ? productos : (laPlantilla?.vista ?? []).map((v) => ({ ...v, imagen: null }))).map((p) => (
                        <button key={p.id} type="button" className={`tn-menu-item${p.id === producto.id ? " tn-actual" : ""}`} onClick={() => { setProducto(p); setBuscarProducto(""); cerrar(); }}>
                          <span>{p.imagen ? <img src={p.imagen} alt="" style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4 }} /> : <TagIcon />}<span>{p.nombre}</span></span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </Desplegable>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div className="tn-dispositivos">
              <button type="button" className={dispositivo === "celular" ? "tn-on" : ""} aria-label={t("Celular")} title={t("Celular")} disabled={!costados} onClick={() => setDispositivo("celular")}><MobileIcon size={14} /></button>
              <button type="button" className={dispositivo === "computadora" ? "tn-on" : ""} aria-label={t("Computadora")} title={t("Computadora")} disabled={!costados} onClick={() => setDispositivo("computadora")}><DesktopIcon size={14} /></button>
            </div>
            <div className="tn-historia">
              <button type="button" aria-label={t("Deshacer")} title={t("Deshacer")} disabled={!historia.atras.length} onClick={deshacer}><UndoIcon size={12} /></button>
              <i />
              <button type="button" aria-label={t("Rehacer")} title={t("Rehacer")} disabled={!historia.adelante.length} onClick={rehacer}><RedoIcon size={12} /></button>
            </div>
            <button type="button" className="tn-boton-borde" aria-label={t(completa ? "Salir de pantalla completa" : "Pantalla completa")} title={t(completa ? "Salir de pantalla completa" : "Pantalla completa")}
              onClick={() => { navigateFullscreen(instancia, completa ? "normal" : "fullscreen"); setCompleta(!completa); }}>
              {completa ? <ArrowsDiagonalInIcon size={14} /> : <ArrowsDiagonalOutIcon size={14} />}
            </button>
          </div>
        </div>
        <div className="tn-header-der">
          <button type="button" className="tn-boton-plano" aria-label={t("Ver en la tienda")} title={t("Ver en la tienda (lo publicado)")} onClick={() => window.open(enLaTienda, "_blank", "noopener")}><ExternalLinkIcon size={14} /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`tn-pildora${cambios ? " tn-sin" : ""}`}>{t(cambios ? "Sin publicar" : "Publicado")}</span>
            <button type="button" className="tn-publicar" disabled={!cambios || guardando} onClick={() => void guardar()}>{t(guardando ? "Publicando..." : "Guardar y publicar")}</button>
          </div>
        </div>
      </header>

      <div className="tn-cuerpo">
        {/* Izquierda: el árbol de la página o los ajustes globales. */}
        <aside className={`tn-izq${costados ? "" : " tn-oculto"}`}>
          {modo === "ajustes" ? (
            <>
              <div className="tn-ajustes-rotulo">Gadsden Widgets</div>
              {GLOBALES.map((g) => (
                <button key={g.cual} type="button" className={`tn-ajustes-item${eleccion?.k === "global" && eleccion.cual === g.cual ? " tn-sel" : ""}`} onClick={() => elegir({ k: "global", cual: g.cual })}>
                  {g.icono}<span>{g.nombre}</span><ChevronRightIcon />
                </button>
              ))}
            </>
          ) : !zonas.length && !secciones.length ? <div className="tn-vacio">{t("Cargando la página...")}</div> : arbol}
        </aside>
        {/* Centro: la página entera de la tienda con los widgets. */}
        <main className="tn-centro">
          <VistaDePagina tienda={tienda.id} ruta={ruta} dispositivo={dispositivo} cfg={cfg} plantilla={pagina === "producto" ? plantilla : null} eleccion={eleccion} rotulo={rotulo} alMensaje={alMensaje} marco={marco} />
          <div className="tn-expandir">
            <button type="button" aria-label={t(costados ? "Ver la página entera" : "Mostrar los paneles")} title={t(costados ? "Ver la página entera" : "Mostrar los paneles")} onClick={() => setCostados(!costados)}>
              {costados ? <ArrowsExpandIcon /> : <ChevronLeftIcon />}
            </button>
          </div>
        </main>
        {/* Derecha: los ajustes de lo elegido. */}
        <aside className={`tn-der${costados ? "" : " tn-oculto"}`}>{derecha}</aside>
      </div>

      {destino && <ModalAgregar destino={destino} catalogo={catalogo} agregar={agregarDelCatalogo} cerrar={() => setDestino(null)} />}
      {editando && (
        <ModalPlantilla inicial={editando === "nueva" ? null : editando} guardar={guardarPlantilla} cerrar={() => setEditando(null)}
          eliminar={editando === "nueva" ? undefined : () => eliminarPlantilla(editando.id)} />
      )}
      {salir && (
        <Modal titulo={t("¿Querés salir sin guardar los cambios?")} chico cerrar={() => setSalir(false)}>
          <div className="tn-modal-texto">{t("Al salir, vas a perder los cambios que no guardaste.")}</div>
          <div className="tn-modal-pie" style={{ borderTop: "1px solid var(--border)" }}>
            {/* Como el cartel de salida del editor de diseño de Tiendanube (mismos textos). */}
            <button type="button" className="tn-agregar" style={{ width: "auto", margin: 0 }} onClick={() => setSalir(false)}>{t("No, quiero guardar los cambios")}</button>
            <button type="button" className="tn-boton" onClick={irse}>{t("Sí, quiero salir")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function App() {
  const [conectado, setConectado] = useState<boolean | null>(null);
  useEffect(() => {
    connect(instancia)
      .then(async () => { fijarIdioma(await getStoreInfo(instancia).catch(() => undefined)); setConectado(true); iAmReady(instancia); })
      .catch(() => { fijarIdioma(); setConectado(false); });
  }, []);
  if (conectado === null) return <div className="tn"><div className="tn-vacio">Conectando...</div></div>;
  if (!conectado) return <PantallaError motivo={t("Abrí esta app desde el administrador de tu tienda: Mis aplicaciones > Gadsden Widgets.")} />;
  return (
    <ErrorBoundary nexo={instancia}>
      <ToastProvider><Panel /></ToastProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("raiz")!).render(<StrictMode><App /></StrictMode>);
