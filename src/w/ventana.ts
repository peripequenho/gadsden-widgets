/**
 * La ventana virtual. Un widget de Gadsden en Shopify vive en la ventana de la tienda: lee `scrollY`, `innerHeight`,
 * `getBoundingClientRect()`, escucha `scroll`, usa `position: fixed` y unidades `vh`. Dentro del Iframe de NubeSDK la
 * ventana es el iframe, que mide lo que su contenido y nunca scrollea: todo eso queda quieto o mide mal.
 *
 * Acá se averigua qué franja del iframe está en la pantalla de la tienda (sensores de 100 px con IntersectionObserver,
 * que dentro de un iframe de otro origen miden contra la pantalla de arriba) y se presenta esa franja como la ventana:
 * - `scrollY` / `pageYOffset`: cuánto del widget quedó arriba de la pantalla (como si el widget arrancara la página).
 * - `innerHeight` y `--gad-vh` (los `vh` del CSS se reescriben con esa variable): el alto de la pantalla.
 * - `getBoundingClientRect()` y el `clientY` de los eventos del puntero: corridos al mismo origen.
 * - un evento `scroll` cada vez que la franja se mueve.
 * - los elementos `position: fixed` se corren hasta la franja con `translate` (no pisa el `transform` de sus
 *   animaciones): los que arrancan en la mitad de abajo se pegan abajo; el resto, arriba. Los `<dialog>` modales se
 *   centran en la franja (su fondo oscuro cubre sólo el iframe: no puede tapar la tienda).
 * Los sensores tienen 1 px de resolución y llegan un cuadro tarde: un elemento fijo puede temblar al scrollear.
 */

const rectReal = Element.prototype.getBoundingClientRect;
const clientYReal = Object.getOwnPropertyDescriptor(MouseEvent.prototype, "clientY")!.get!;

let arriba = 0;
/**
 * El alto de la pantalla: se mide cuando la franja no toca ningún borde del iframe; hasta entonces, el de la ventana del
 * navegador (`outerHeight`, que en un iframe es el de la ventana de arriba: unos px más que la pantalla útil).
 */
let alto = outerHeight || screen.availHeight || 800;

export function instalarVentana() {
  const fijar = (k: string, get: () => number) => Object.defineProperty(window, k, { get, configurable: true });
  fijar("scrollY", () => Math.max(0, arriba));
  fijar("pageYOffset", () => Math.max(0, arriba));
  fijar("innerHeight", () => alto);
  Element.prototype.getBoundingClientRect = function () {
    const r = rectReal.call(this);
    return new DOMRect(r.x, r.y - arriba, r.width, r.height);
  };
  Object.defineProperty(MouseEvent.prototype, "clientY", { get() { return clientYReal.call(this) - arriba; }, configurable: true });
  document.documentElement.style.setProperty("--gad-vh", `${alto / 100}px`);
  const abrir = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function () { abrir.call(this); centrarDialogos(); };
}

/** Los `<dialog>` modales se centran en la franja que se ve, no en todo el alto del iframe. */
function centrarDialogos() {
  const real = document.documentElement.clientHeight;
  for (const d of document.querySelectorAll<HTMLDialogElement>("dialog[open]")) {
    d.style.top = `${Math.max(0, arriba)}px`;
    d.style.bottom = `${Math.max(0, real - arriba - alto)}px`;
  }
}

/** El alto de la pantalla que manda el script (`viewportHeight` de page:scroll): el de verdad, sin estimar. */
export function altoDePantalla(h: number) {
  if (!h || h === alto) return;
  alto = h;
  document.documentElement.style.setProperty("--gad-vh", `${alto / 100}px`);
}

/** `100vh` → `calc(100 * var(--gad-vh))`, y lo mismo con svh, lvh y dvh; `vmax` y `vmin`, contra ese mismo alto. */
export const sinVh = (css: string) => css
  .replace(/(-?\d*\.?\d+)(s|l|d)?vh\b/g, "calc($1 * var(--gad-vh, 1vh))")
  .replace(/(-?\d*\.?\d+)v(max|min)\b/g, "calc($1 * $2(1vw, var(--gad-vh, 1vh)))");

/**
 * Los `@media` de ancho miden el iframe, no la tienda: un bloque en la columna de la ficha (481 px) o un botón en un lugar
 * fijo (68 px) se verían como en un celular. Se resuelven contra el ancho de la ventana de la tienda (`outerWidth`, que en
 * un iframe es el de la ventana de arriba; unos px más que la pantalla útil si hay barra de scroll).
 */
export const conAnchoDePantalla = (css: string, ancho = outerWidth || screen.width) =>
  // Sólo en los @media: los @container miden su contenedor, como en la tienda.
  css.replace(/@media[^{]+\{/g, (regla) => regla.replace(/\((min|max)-width:\s*(\d*\.?\d+)px\)/g, (_, m: string, v: string) =>
    ((m === "min" ? ancho >= Number(v) : ancho <= Number(v)) ? "(min-width: 0px)" : "(min-width: 999999px)")));

let io: IntersectionObserver | null = null;
let fijos = new Map<HTMLElement, boolean>();

/** Arma los sensores sobre todo el alto y busca los elementos fijos. Se vuelve a llamar cuando cambia el alto. */
export function medir() {
  io?.disconnect();
  document.querySelector(".gad-sensores")?.remove();
  const els = [...document.body.querySelectorAll<HTMLElement>("*")].filter((e) => getComputedStyle(e).position === "fixed");
  for (const e of els) e.style.translate = "";
  const real = document.documentElement.clientHeight;
  fijos = new Map(els.map((e) => [e, rectReal.call(e).top > real / 2]));

  const caja = document.createElement("div");
  caja.className = "gad-sensores";
  caja.style.cssText = "position:absolute;top:0;left:0;width:1px;pointer-events:none;visibility:hidden";
  const total = document.documentElement.scrollHeight;
  for (let y = 0; y < total; y += 100) caja.insertAdjacentHTML("beforeend", `<i style="position:absolute;left:0;width:1px;top:${y}px;height:${Math.min(100, total - y)}px"></i>`);
  document.body.style.position = "relative";
  document.body.append(caja);

  const vistos = new Map<Element, DOMRectReadOnly | null>();
  io = new IntersectionObserver((es) => {
    for (const e of es) vistos.set(e.target, e.isIntersecting ? e.intersectionRect : null);
    const rs = [...vistos.values()].filter((r): r is DOMRectReadOnly => !!r);
    if (!rs.length) return;
    const top = Math.min(...rs.map((r) => r.top)), piso = Math.max(...rs.map((r) => r.bottom));
    const tocaArriba = top <= 1, tocaAbajo = piso >= total - 1;
    if (!tocaArriba && !tocaAbajo && Math.abs(piso - top - alto) > 1) {
      alto = piso - top;
      document.documentElement.style.setProperty("--gad-vh", `${alto / 100}px`);
    }
    // Con el borde de arriba del iframe en pantalla, la pantalla empieza antes que el widget.
    const nuevo = tocaArriba && !tocaAbajo ? piso - alto : tocaArriba ? Math.min(0, piso - alto) : top;
    for (const [el, abajo] of fijos) el.style.translate = `0 ${abajo ? nuevo + alto - real : nuevo}px`;
    if (nuevo !== arriba) { arriba = nuevo; centrarDialogos(); window.dispatchEvent(new Event("scroll")); }
  }, { threshold: Array.from({ length: 101 }, (_, i) => i / 100) });
  for (const s of caja.children) io.observe(s);
}
