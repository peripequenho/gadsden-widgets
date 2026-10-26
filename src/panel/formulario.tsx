/**
 * El formulario de un widget, armado con su {% schema %} y con los controles del editor de diseño de Tiendanube (tn.css):
 * un campo por ajuste (texto, color, interruptor, lista, rango con su barra, imagen subida, producto con buscador...).
 * Los bloques no van acá: son hijos del widget en el árbol (main.tsx), como en Tiendanube. Guarda sólo lo que el
 * comerciante cambia: lo demás sale de los valores de fábrica.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, CameraIcon, CloseIcon, LinkIcon, PictureIcon, PlusCircleIcon, SearchIcon, TrashIcon } from "@nimbus-ds/icons";
import type { Ajuste } from "./catalogo.ts";
import { buscarProductos, leerBiblioteca, subirArchivo, type ImagenBiblioteca, type ProductoBuscado } from "./api.ts";
import { t } from "./textos.ts";

export type Valores = Record<string, unknown>;
export type Bloque = { type: string; settings?: Valores };

const COMBINACIONES = ["scheme-1", "scheme-2", "scheme-3", "scheme-4", "scheme-5", "scheme-6"];
/** Letras de Google Fonts para los ajustes de letra (como el selector de Shopify, con el peso). */
const LETRAS = ["", "inter_n4", "poppins_n4", "poppins_n7", "montserrat_n4", "montserrat_n7", "assistant_n4", "lora_n4", "playfair_display_n7", "archivo_black_n4", "barlow_n4", "barlow_semi_condensed_n4", "roboto_n4", "open_sans_n4"];
const ALINEACION: Record<string, JSX.Element> = { left: <AlignLeftIcon />, center: <AlignCenterIcon />, right: <AlignRightIcon /> };

/** El valor de un campo. */
export const val = (e: { target: EventTarget }) => (e.target as HTMLInputElement).value;
const texto = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "object" ? String((v as { src?: string }).src ?? "") : String(v));
let n = 0;
const nuevoId = (p: string) => `${p}-${++n}`;

function Etiqueta({ a, id }: { a: Ajuste; id?: string }) {
  return <label className="tn-etiqueta" htmlFor={id}>{a.label ?? a.id}</label>;
}
const Ayuda = ({ t: s }: { t?: string }) => (s ? <div className="tn-ayuda">{s}</div> : null);

function Rango({ a, id, valor, cambiar }: { a: Ajuste; id: string; valor: unknown; cambiar: (v: unknown) => void }) {
  const min = a.min ?? 0, max = a.max ?? 100;
  const v = valor === undefined || valor === "" ? min : Number(valor);
  const pct = max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0;
  return (
    <div className="tn-rango">
      <div className="tn-rango-numero">
        <input id={id} type="number" min={min} max={max} step={a.step} value={texto(valor)} onChange={(e) => cambiar(val(e) === "" ? undefined : Number(val(e)))} />
        {a.unit && <small>{a.unit}</small>}
      </div>
      <div className="tn-rango-barra">
        <i><i style={{ width: `${pct}%` }} /></i>
        <input type="range" aria-label={a.label} min={min} max={max} step={a.step ?? 1} value={v} onChange={(e) => cambiar(Number(val(e)))} />
        <b style={{ left: `calc(4px + (100% - 8px) * ${pct / 100})` }} />
      </div>
    </div>
  );
}

function Campo({ a, valor, cambiar }: { a: Ajuste; valor: unknown; cambiar: (v: unknown) => void }) {
  const id = useRef(nuevoId(a.id ?? a.type)).current;
  const ayuda = a.info;
  switch (a.type) {
    case "header":
      return <h3 className="tn-titulo-ajustes">{a.content}</h3>;
    case "paragraph":
      return <div className="tn-parrafo">{a.content}</div>;
    case "checkbox":
      return (
        <div className="tn-campo">
          <div className="tn-interruptor">
            <label htmlFor={id}>{a.label ?? a.id}</label>
            <button id={id} type="button" role="switch" aria-checked={!!valor} className={valor ? "tn-on" : ""} onClick={() => cambiar(!valor)}><span /></button>
          </div>
          <Ayuda t={ayuda} />
        </div>
      );
    case "radio":
    case "text_alignment": {
      const ops = a.options ?? ["left", "center", "right"].map((v) => ({ value: v, label: v }));
      return (
        <div className="tn-campo">
          <Etiqueta a={a} />
          <div className="tn-segmentos">
            {ops.map((o) => (
              <button key={o.value} type="button" title={o.label} className={texto(valor) === o.value ? "tn-on" : ""} onClick={() => cambiar(o.value)}>
                {a.type === "text_alignment" && ALINEACION[o.value] ? ALINEACION[o.value] : o.label}
              </button>
            ))}
          </div>
          <Ayuda t={ayuda} />
        </div>
      );
    }
    case "select":
    case "color_scheme":
    case "font_picker": {
      const ops = a.type === "select" ? a.options ?? []
        : a.type === "color_scheme" ? COMBINACIONES.map((c, i) => ({ value: c, label: t("Combinación {n}", { n: i + 1 }) }))
        : [...new Set([...LETRAS, texto(valor)])].map((l) => ({ value: l, label: l ? l.replace(/_([ni])(\d)$/, " ($200)").replace(/_/g, " ") : t("La de la tienda") }));
      return (
        <div className="tn-campo">
          <Etiqueta a={a} id={id} />
          <select id={id} className="tn-select" value={texto(valor)} onChange={(e) => cambiar(a.type === "font_picker" ? val(e) || undefined : val(e))}>
            {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Ayuda t={ayuda} />
        </div>
      );
    }
    case "range":
      return <div className="tn-campo"><Etiqueta a={a} id={id} /><Rango a={a} id={id} valor={valor} cambiar={cambiar} /><Ayuda t={ayuda} /></div>;
    case "number":
      return <div className="tn-campo"><Etiqueta a={a} id={id} /><input id={id} className="tn-input" type="number" min={a.min} max={a.max} step={a.step} value={texto(valor)} onChange={(e) => cambiar(val(e) === "" ? undefined : Number(val(e)))} /><Ayuda t={ayuda} /></div>;
    case "color":
    case "color_background": {
      const c = texto(valor);
      return (
        <div className="tn-campo">
          <Etiqueta a={a} id={id} />
          <div className="tn-color">
            <span className="tn-color-muestra" style={{ background: c || "linear-gradient(135deg,#fff 45%,#c80003 45% 55%,#fff 55%)" }}>
              <input type="color" aria-label={a.label} value={/^#[0-9a-f]{6}$/i.test(c) ? c : "#ffffff"} onChange={(e) => cambiar(val(e).toUpperCase())} />
            </span>
            <input id={id} type="text" value={c} placeholder={t("Sin relleno")} onChange={(e) => cambiar(val(e) || undefined)} />
          </div>
          <Ayuda t={ayuda} />
        </div>
      );
    }
    case "textarea":
    case "richtext":
    case "liquid":
    case "html":
      return <div className="tn-campo"><Etiqueta a={a} id={id} /><textarea id={id} className="tn-area" rows={4} value={texto(valor)} onChange={(e) => cambiar(val(e))} /><Ayuda t={ayuda ?? (a.type === "richtext" ? t("Admite HTML: <p>, <strong>, <em>, <a>.") : undefined)} /></div>;
    case "image_picker":
    case "video":
      return <Archivo a={a} valor={texto(valor)} cambiar={cambiar} />;
    case "url":
    case "video_url":
      return (
        <div className="tn-campo">
          <Etiqueta a={a} id={id} />
          <div className="tn-con-icono"><LinkIcon /><input id={id} className="tn-input" value={texto(valor)} placeholder={a.placeholder} onChange={(e) => cambiar(val(e))} /></div>
          <Ayuda t={ayuda} />
        </div>
      );
    case "product":
      return <Productos a={a} valor={valor ? [String(valor)] : []} cambiar={(hs) => cambiar(hs[0])} uno />;
    case "product_list":
      return <Productos a={a} valor={Array.isArray(valor) ? valor.map(String) : []} cambiar={(hs) => cambiar(hs.length ? hs : undefined)} />;
    default:
      // text, inline_richtext y lo que venga.
      return <div className="tn-campo"><Etiqueta a={a} id={id} /><input id={id} className="tn-input" value={texto(valor)} placeholder={a.placeholder} onChange={(e) => cambiar(val(e))} /><Ayuda t={ayuda ?? (a.type === "inline_richtext" ? t("Admite <strong> y <em>.") : undefined)} /></div>;
  }
}

/**
 * Una imagen o un video, subido al Worker (como el selector de imagen de Tiendanube: el recuadro y la cámara). Una imagen
 * también puede salir de un campo personalizado de imagen del producto (la fuente dinámica de Shopify).
 */
function Archivo({ a, valor, cambiar }: { a: Ajuste; valor: string; cambiar: (v: unknown) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const video = a.type === "video";
  const campo = /product\.metafields\.custom\.(\w*)/.exec(valor)?.[1];
  const [usarCampo, setUsarCampo] = useState(campo !== undefined);
  const [biblioteca, setBiblioteca] = useState(false);
  const subir = async (f?: File | null) => {
    if (!f) return;
    setSubiendo(true); setError("");
    try { cambiar(await subirArchivo(f)); setUsarCampo(false); } catch (e) { setError(t("No se pudo subir ({x}).", { x: (e as Error).message })); }
    setSubiendo(false);
  };
  return (
    <div className="tn-campo">
      <Etiqueta a={a} />
      <div className="tn-imagen" onClick={() => archivo.current?.click()} role="button" aria-label={t(video ? "Elegir video" : "Elegir imagen")}>
        {campo !== undefined ? <span>{t("Imagen del campo {x}", { x: campo || "…" })}</span> : valor ? (video ? <video src={valor} muted /> : <img src={valor} alt="" />) : subiendo ? <span>{t("Subiendo...")}</span> : <PictureIcon size={32} />}
        <div className="tn-imagen-botones">
          <button type="button" title={t("Subir")} onClick={(e) => { e.stopPropagation(); archivo.current?.click(); }}><CameraIcon /></button>
          {valor && <button type="button" title={t("Sacar")} onClick={(e) => { e.stopPropagation(); cambiar(undefined); setUsarCampo(false); }}><TrashIcon /></button>}
        </div>
      </div>
      <input ref={archivo} type="file" hidden accept={video ? "video/mp4,video/webm" : "image/*"} onChange={(e) => void subir(e.target.files?.[0])} />
      {!video && <button type="button" className="tn-enlace" onClick={() => setBiblioteca(true)}>{t("O elegí de la biblioteca")}</button>}
      {biblioteca && <Biblioteca cerrar={() => setBiblioteca(false)} elegir={(url) => { cambiar(url); setUsarCampo(false); setBiblioteca(false); }} />}
      {!video && (usarCampo ? (
        <input className="tn-input" aria-label={t("Nombre del campo personalizado")} placeholder={t("Nombre del campo, ej.: foto_extra")} value={campo ?? ""} autoFocus={campo === undefined}
          onChange={(e) => { const n = e.target.value.replace(/\W/g, ""); cambiar(`{{ product.metafields.custom.${n}.value }}`); }} />
      ) : <button type="button" className="tn-enlace" onClick={() => setUsarCampo(true)}>{t("Usar un campo personalizado del producto")}</button>)}
      <Ayuda t={error || a.info || (video ? t("MP4 o WebM.") : usarCampo ? t("Un campo de tipo Imagen con Lectura pública (Configuración > Campos personalizados).") : undefined)} />
    </div>
  );
}

/** El modal del editor (el de "Agregar sección" y los avisos): Esc o el fondo lo cierran. */
export function Modal({ titulo, chico, cerrar, children }: { titulo: string; chico?: boolean; cerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });
  return (
    <>
      <div className="tn-velo" onClick={cerrar} />
      <div className={`tn-modal${chico ? " tn-modal-chico" : ""}`} role="dialog" aria-label={titulo}>
        <div className="tn-modal-cab"><h2>{titulo}</h2><button type="button" className="tn-ib" aria-label={t("Cerrar")} onClick={cerrar}><CloseIcon /></button></div>
        {children}
      </div>
    </>
  );
}

/**
 * "O elegí de la biblioteca", como el de los campos de imagen del admin de Tiendanube: arriba, soltar o elegir archivos
 * (van a la biblioteca de la tienda); abajo, las imágenes que ya tiene; se elige una y "Agregar".
 */
function Biblioteca({ elegir, cerrar }: { elegir: (url: string) => void; cerrar: () => void }) {
  const [imagenes, setImagenes] = useState<ImagenBiblioteca[] | null>(null);
  const [elegida, setElegida] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const cargar = () => leerBiblioteca().then(setImagenes).catch((e) => { setImagenes([]); setError(t("No se pudo leer la biblioteca ({x}).", { x: (e as Error).message })); });
  useEffect(() => { void cargar(); }, []);
  const subir = async (fs?: FileList | null) => {
    if (!fs?.length) return;
    setSubiendo(true); setError("");
    try { for (const f of fs) setElegida(await subirArchivo(f)); await cargar(); } catch (e) { setError(t("No se pudo subir ({x}).", { x: (e as Error).message })); }
    setSubiendo(false);
  };
  return (
    <Modal titulo={t("Seleccionar archivo")} cerrar={cerrar}>
      <div className="tn-biblio">
        <div className="tn-biblio-soltar" role="button" onClick={() => archivo.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void subir(e.dataTransfer.files); }}>
          <PlusCircleIcon size={20} />
          <b>{subiendo ? t("Subiendo...") : t("Arrastrá o hacé clic para agregar imágenes")}</b>
          <span>PNG, JPG, GIF o WEBP</span>
        </div>
        <input ref={archivo} type="file" hidden multiple accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => void subir(e.target.files)} />
        {error && <p className="tn-biblio-error">{error}</p>}
        {imagenes === null ? <p className="tn-biblio-vacia">{t("Cargando...")}</p>
          : !imagenes.length ? <p className="tn-biblio-vacia"><PictureIcon size={24} /><br />{t("Todavía no hay imágenes en tu biblioteca.")}</p>
          : (
            <div className="tn-biblio-grilla">
              {imagenes.map((i) => (
                <button type="button" key={i.id} className={i.url === elegida ? "tn-on" : ""} title={i.nombre} onClick={() => setElegida(i.url)}>
                  <img src={i.miniatura} alt={i.nombre} loading="lazy" /><span>{i.nombre}</span>
                </button>
              ))}
            </div>
          )}
      </div>
      <div className="tn-modal-pie" style={{ borderTop: "1px solid var(--border)" }}><button type="button" className="tn-boton" disabled={!elegida} onClick={() => elegir(elegida)}>{t("Agregar")}</button></div>
    </Modal>
  );
}

/** Uno o varios productos de la tienda, con buscador (la API de la tienda, por el Worker). */
function Productos({ a, valor, cambiar, uno = false }: { a: Ajuste; valor: string[]; cambiar: (hs: string[]) => void; uno?: boolean }) {
  const id = useRef(nuevoId("producto")).current;
  const [q, setQ] = useState("");
  const [res, setRes] = useState<ProductoBuscado[]>([]);
  const [estado, setEstado] = useState("");
  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const espera = setTimeout(() => {
      setEstado(t("Buscando..."));
      buscarProductos(q).then((r) => { setRes(r); setEstado(r.length ? "" : t("Sin resultados.")); })
        .catch((e) => setEstado((e as Error).message === "token" ? t("Falta el permiso de productos: reinstalá la app.") : t("No se pudo buscar.")));
    }, 300);
    return () => clearTimeout(espera);
  }, [q]);
  return (
    <div className="tn-campo">
      <Etiqueta a={a} id={id} />
      {valor.length > 0 && (
        <div className="tn-chips">
          {valor.map((h) => <span key={h}>{h}<button type="button" aria-label={t("Sacar {x}", { x: h })} onClick={() => cambiar(valor.filter((x) => x !== h))}>✕</button></span>)}
        </div>
      )}
      <div className="tn-con-icono"><SearchIcon /><input id={id} className="tn-input" placeholder={t("Buscá un producto")} value={q} onChange={(e) => setQ(val(e))} /></div>
      {res.length > 0 && (
        <div className="tn-resultados">
          {res.map((p) => (
            <button key={p.id} type="button" onClick={() => { cambiar(uno ? [p.handle] : [...new Set([...valor, p.handle])]); setQ(""); }}>
              {p.imagen && <img src={p.imagen} alt="" />}{p.nombre}
            </button>
          ))}
        </div>
      )}
      <Ayuda t={estado || a.info} />
    </div>
  );
}

/** Los ajustes de un esquema; el valor de cada uno es el guardado o el de fábrica. */
export function Formulario({ ajustes = [], valores, cambiar }: { ajustes?: Ajuste[]; valores: Valores; cambiar: (v: Valores) => void }) {
  return (
    <>
      {ajustes.map((a, i) => (
        <Campo key={a.id ?? `${a.type}-${i}`} a={a} valor={a.id && a.id in valores ? valores[a.id] : a.default}
          cambiar={(v) => { if (!a.id) return; const x = { ...valores }; if (v === undefined) delete x[a.id]; else x[a.id] = v; cambiar(x); }} />
      ))}
    </>
  );
}
