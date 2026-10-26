// Arnés local: hace de NubeSDK en la página (sin Web Worker) para ver los widgets antes de tener la app instalada.
// Un `nube` falso con el estado de una ficha de la demo (la "Remera prueba" de lgademo) y un traductor chico de
// componentes de NubeSDK a HTML (la idea de shopify-upsell-mp/tiendanube/panel/editor/VistaPrevia.tsx).
// Es una aproximación: el SDK de verdad puede dibujar distinto (la prueba de verdad es en la tienda). Las imágenes de
// ejemplo son recuadros grises, como el placeholder de Gadsden.
// Uso: npm run construir y abrir /arnes/ del Worker (o cualquier servidor estático sobre dist/).

self.__APP_DATA__ = { id: "arnes" };

const variantes = [1620003711, 1620003712, 1620003713].map((id, i) => ({
  id, product_id: 374510023, price: "4000.00", compare_at_price: null, stock: i === 2 ? 0 : null, stock_management: i === 2,
  options: [{ name: "Talle", value: ["S", "M", "L"][i] }],
}));
const estado = {
  store: { id: 8359789, currency: "ARS", currency_details: { code: "ARS" }, language: "es" },
  location: {
    url: location.href, queries: {},
    page: { type: "product", data: { product: {
      id: 374510023, name: { es: "Remera prueba" }, handle: { es: "remera-prueba" }, quantity: 1, images: [{ id: 1, src: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22%3E%3Crect width=%2210%22 height=%2210%22 fill=%22%23ddd%22/%3E%3C/svg%3E", alt: "" }],
      variants: variantes,
    } } },
  },
  cart: { items: [] },
};

const oyentes = {};
const registro = document.getElementById("registro");
const anotar = (s) => { registro.textContent = `${new Date().toLocaleTimeString()} ${s}\n` + registro.textContent; };
const emitir = (ev, eventPayload) => (oyentes[ev] ?? []).forEach((f) => f({ ...estado, eventPayload }, ev));

const nube = {
  getState: () => estado,
  on: (ev, f) => { (oyentes[ev] ??= []).push(f); },
  off: (ev, f) => { oyentes[ev] = (oyentes[ev] ?? []).filter((x) => x !== f); },
  send: (ev, mod) => {
    const r = mod?.(estado);
    anotar(`${ev} ${r ? JSON.stringify(r) : ""}`);
    if (ev === "cart:add") for (const it of r?.cart?.items ?? []) setTimeout(() => emitir("cart:add:success", { id: Date.now(), ...it }), 50);
  },
  render: (lugar, c) => pintar(typeof lugar === "string" ? lugar : lugar.slotId, typeof c === "function" ? c(estado) : c),
  clearSlot: (lugar) => pintar(typeof lugar === "string" ? lugar : lugar.slotId, null),
  getAppSettings: () => ({}),
  getBrowserAPIs: () => ({
    postMessageToIframe: (c, m) => iframes.get(c.__internalId)?.el.contentWindow?.postMessage(m, "*"),
    navigate: (ruta) => anotar(`navigate("${ruta}")`),
    scrollTo: (op) => { anotar(`scrollTo(${JSON.stringify(op)})`); window.scrollTo(op); },
  }),
  api: { getAvailableSlots: () => ({ getDynamic: async () => [
    { type: "after_dynamic_section", sectionType: "product", sectionId: "main_product", sectionIndex: 1, slotId: "after_dynamic_section_main_product" },
  ] }) },
};

// Los Iframes conservan su elemento entre dibujos (por el id interno), como NubeSDK. Mover un iframe en el DOM lo
// recarga, así que un lugar que se vuelve a dibujar igual no se toca.
const iframes = new Map();
const ultimo = new Map();
addEventListener("message", (e) => {
  for (const r of iframes.values()) {
    if (e.source !== r.el.contentWindow) continue;
    if (e.data?.type === "resize" && r.n.autoresize) r.el.style.height = `${e.data.height}px`;
    else r.n.onMessage?.({ type: "message", value: e.data });
  }
});

function pintar(lugar, c) {
  const el = document.querySelector(`[data-lugar="${lugar}"]`);
  if (!el) return anotar(`render en un lugar que el arnés no tiene: ${lugar}`);
  const firma = JSON.stringify(c);
  if (ultimo.get(lugar) === firma && el.querySelector("iframe")) return;
  ultimo.set(lugar, firma);
  el.replaceChildren(...(c ? [aHtml(c)] : []));
  el.classList.toggle("vacio", !c);
}

const tam = (v) => (typeof v === "number" ? `${v}px` : v);
const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const estilo = (el, s = {}) => { for (const [k, v] of Object.entries(s)) if (v !== undefined && v !== null) el.style.setProperty(kebab(k), String(v)); };

// `styled()` deja el CSS en `componente.styled` ("prop:valor;&:hover{…}@media(…){…}"): acá va a un <style> con
// anidado nativo, sobre un atributo propio; los @keyframes se sacan afuera (no se pueden anidar).
const hoja = document.head.appendChild(document.createElement("style"));
const vistos = new Set();
let nid = 0;
function conEstilo(el, css) {
  if (!css) return el;
  const id = `n${++nid}`;
  el.setAttribute("data-nid", id);
  let resto = css;
  for (const m of css.matchAll(/@keyframes [\w-]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g)) {
    resto = resto.replace(m[0], "");
    if (!vistos.has(m[0])) { vistos.add(m[0]); hoja.append(m[0] + "\n"); }
  }
  hoja.append(`[data-nid="${id}"]{${resto}}\n`);
  return el;
}

const SVG = { svgRoot: "svg", svgCircle: "circle", svgPath: "path", svgRect: "rect", svgLine: "line", svgG: "g", svgText: "text", svgPolygon: "polygon" };
const ATRIB_SVG = ["viewBox", "width", "height", "fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "strokeDasharray", "d", "cx", "cy", "r", "x", "y", "x1", "y1", "x2", "y2", "rx", "points", "opacity"];

/** Un nodo de NubeSDK como elemento del DOM. */
function aHtml(n) {
  if (n === null || n === undefined || n === false || n === "") return document.createTextNode("");
  if (typeof n === "string" || typeof n === "number") return document.createTextNode(String(n));
  const hijos = () => [n.children].flat().filter((x) => x !== undefined && x !== null && x !== false).map(aHtml);
  const llamar = (f, value) => typeof f === "function" && f({ type: "evento", value });
  const crear = (tag, s, kids = hijos()) => { const el = document.createElement(tag); estilo(el, s); el.append(...kids); return conEstilo(el, n.styled); };
  if (SVG[n.type]) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", SVG[n.type]);
    for (const k of ATRIB_SVG) if (n[k] !== undefined) el.setAttribute(k === "viewBox" ? k : kebab(k), String(n[k]));
    estilo(el, n.style); el.append(...hijos());
    return conEstilo(el, n.styled);
  }
  switch (n.type) {
    case "box": case "col": case "row": case "fragment": {
      const dir = n.type === "row" ? "row" : n.type === "col" ? "column" : n.direction === "row" ? "row" : n.direction === "col" ? "column" : null;
      return crear("div", { ...(dir ? { display: "flex", flexDirection: dir } : {}), gap: tam(n.gap), alignItems: n.alignItems, justifyContent: n.justifyContent,
        padding: tam(n.padding), margin: tam(n.margin), width: tam(n.width), height: tam(n.height), background: n.background, color: n.color, borderRadius: tam(n.borderRadius), ...n.style });
    }
    case "txt": {
      const m = n.modifiers ?? [];
      return crear(n.heading ? `h${n.heading}` : "p", { fontWeight: m.includes("bold") ? "700" : undefined, textDecoration: m.includes("strike") ? "line-through" : undefined, ...n.style });
    }
    case "button": {
      const el = crear("button", n.style); el.type = "button"; el.disabled = !!n.disabled;
      if (n.ariaLabel) el.setAttribute("aria-label", n.ariaLabel);
      el.onclick = () => llamar(n.onClick); return el;
    }
    case "link": { const el = crear("a", n.style); el.href = n.href; el.target = "_blank"; return el; }
    case "img": { const el = crear("img", n.style, []); el.src = n.src; el.alt = n.alt ?? ""; return el; }
    case "check": {
      const el = crear("label", { display: "flex", gap: "8px", alignItems: "center" }, []);
      const i = document.createElement("input"); i.type = "checkbox"; i.checked = !!n.checked; i.disabled = !!n.disabled;
      i.style.cssText = "width:20px;height:20px;margin:0;accent-color:var(--main-foreground)";
      i.onchange = () => llamar(n.onChange, i.checked);
      el.append(i, n.label ?? ""); return el;
    }
    case "iframe": {
      let r = iframes.get(n.__internalId);
      if (!r) {
        const el = document.createElement("iframe");
        el.src = n.src; el.setAttribute("sandbox", n.sandbox ?? "allow-scripts");
        estilo(el, { width: tam(n.width ?? "100%"), height: tam(n.height ?? 150), ...n.style });
        r = { el, n }; iframes.set(n.__internalId, r);
      }
      r.n = n;
      return r.el;
    }
    case "sidescroll":
      return crear("div", { display: "flex", overflowX: "auto", gap: tam(n.gap), ...n.style });
    default: anotar(`componente sin traducir: ${n.type}`); return crear("div", n.style);
  }
}

// Controles del arnés: variante y scroll (NubeSDK avisa el scroll de a 10 %).
document.getElementById("talle").onchange = (e) => emitir("product:variant_selected", variantes[Number(e.target.value)]);
// El selector de cantidad y el botón de comprar del theme: la tienda avisa la cantidad y, al agregar, el ítem.
document.getElementById("cantidad").oninput = (e) => {
  estado.location.page.data.product.quantity = Number(e.target.value) || 1;
  emitir("product:quantity_changed", { quantity: estado.location.page.data.product.quantity });
};
document.getElementById("comprar").onclick = () => {
  const v = variantes[Number(document.getElementById("talle").value)];
  const item = { id: Date.now(), product_id: v.product_id, variant_id: v.id, quantity: estado.location.page.data.product.quantity, properties: {} };
  anotar(`el theme agrega ${JSON.stringify(item)}`);
  setTimeout(() => emitir("cart:add:success", item), 50);
};
document.getElementById("scroll").oninput = (e) => {
  document.getElementById("scrollValor").textContent = `${e.target.value} %`;
  // Como NubeSDK: la banda de 10 % y el scroll, el alto del documento y el de la pantalla.
  const pct = Number(e.target.value), alto = document.documentElement.scrollHeight;
  emitir("page:scroll", { scrollPercentage: Math.round(pct / 10) * 10, scrollY: Math.round(((alto - innerHeight) * pct) / 100), scrollHeight: alto, viewportHeight: innerHeight });
};

document.getElementById("marcas").onchange = (e) => document.body.classList.toggle("marcas", e.target.checked);

// El estilo se elige con ?estilo=tienda|clasico|oscuro: el arnés lo mete en la configuración que pide el script.
const estiloPedido = new URLSearchParams(location.search).get("estilo");
const selEstilo = document.getElementById("estilo");
if (estiloPedido) selEstilo.value = estiloPedido;
selEstilo.onchange = () => { const u = new URL(location.href); u.searchParams.set("estilo", selEstilo.value); location.href = u.href; };
const fetchOriginal = window.fetch.bind(window);
window.fetch = async (url, op) => {
  const r = await fetchOriginal(url, op);
  // ?gadsden=gad-guarantee,gad-faq y ?bloque=quantity_offers: sólo esos widgets de Gadsden tal cual (Iframe), con los
  // valores de fábrica.
  const q = new URLSearchParams(location.search);
  const tal = [
    ...(q.get("gadsden")?.split(",") ?? []).map((type) => ({ tipo: "gadsden", seccion: { type } })),
    // &ajustes={"qty_gifts":{"gift_1":"remera-prueba"}}: ajustes por tipo de bloque.
    // La barra fija va en su lugar fijo, como en la tienda.
    ...(q.get("bloque")?.split(",") ?? []).map((type) => ({ tipo: "gadsden", bloque: { type, settings: JSON.parse(q.get("ajustes") ?? "{}")[type] ?? {} }, lugar: type === "sticky_bar" ? "edge_bottom_center" : "after_product_detail_add_to_cart" })),
  ];
  if ((!estiloPedido && !tal.length && !q.get("tema")) || !String(url).includes("/config/")) return r;
  const cfg = await r.json();
  // &tema={"fondo":"#FFF8F0","boton":"#7A1F2B",...}: los colores y la letra de la tienda (estilo "tienda").
  const tema = q.get("tema") ? JSON.parse(q.get("tema")) : null;
  return new Response(JSON.stringify({ ...cfg, ...(estiloPedido && { estilo: estiloPedido }), ...(tema && { tema }), ...(tal.length && { widgets: tal }) }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const { App } = await import("./widgets.min.js");
App(nube);
anotar("App arrancada");
