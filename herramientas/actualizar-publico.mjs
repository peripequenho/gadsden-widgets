// Regenera este repo público desde el repo privado de desarrollo: copia lo commiteado (HEAD) de los archivos de la lista
// de inclusión, borra lo demás (salvo los archivos propios de este repo) y escanea la foto buscando claves, correos,
// rutas de una PC y datos personales. Si el escaneo encuentra algo grave, sale con error y no hay que commitear.
// Uso, desde la raíz de este repo:
//   node herramientas/actualizar-publico.mjs [ruta del repo privado]   (por defecto, ../gadsden-widgets-tn)
// Después: npm ci && npm test && npm run construir, y un commit nuevo con lo que cambió.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const publico = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const privado = resolve(publico, process.argv[2] ?? "../gadsden-widgets-tn");

// Lo que entra: el código que se compila y se sirve (todo eso ya lo publica el Worker o es de Gadsden, MIT) y las
// imágenes de la ficha de la Tienda de Aplicaciones (la tienda de prueba, sin datos de nadie).
const INCLUIR = [
  ".gitignore", "LICENSE", "package.json", "package-lock.json", "tsconfig.json", "construir.mjs", "worker.ts", "wrangler.toml",
  "src/", "vendor/", "arnes/",
  "docs/homologacion/imagen-1.png", "docs/homologacion/imagen-2.png", "docs/homologacion/imagen-3.png",
  "docs/homologacion/imagen-4.png", "docs/homologacion/imagen-5.png",
];
// Lo que queda afuera a propósito, con el motivo. Un archivo que no está en ninguna de las dos listas no se copia y se
// avisa, para decidir a mano.
const EXCLUIR = {
  ".claude/": "configuración interna de las sesiones de desarrollo",
  "CLAUDE.md": "reglas internas de las sesiones de desarrollo",
  "PROMPT-": "prompts internos",
  "BUILD.md": "bitácora interna: pendientes, traspasos, correo personal, rutas de la PC y otras tiendas",
  "README.md": "el de desarrollo está desactualizado; este repo tiene el suyo",
  "MATRIZ-NUBESDK.md": "relevamiento interno anterior a los iframes (desactualizado)",
  "INVENTARIO.json": "análisis interno del theme original; no se usa para compilar",
  "docs/COMO-FUNCIONA.md": "guía interna (va resumida en el README)",
  "docs/clientes/": "plan comercial, scouting, piezas y datos de personas",
  "docs/diseno/": "boceto a mano, interno",
  "docs/homologacion/": "datos y textos del trámite de homologación (sólo entran las imágenes de la ficha)",
  "capturas/": "evidencia de desarrollo: tiendas reales de terceros y propias, el admin, renders del original",
  "herramientas/": "herramientas de QA atadas a una PC (rutas locales, theme privado, OBS, videos)",
  "paso0/": "prueba inicial descartada",
  "soporte/": "registro de correos con soporte, con nombres y números de caso",
};
// Archivos que sólo existen en este repo: no se borran ni se pisan.
const PROPIOS = new Set(["README.md", "TERCEROS.md", "herramientas/actualizar-publico.mjs"]);
// Carpetas de este repo que no son de la foto.
const NO_TOCAR = new Set([".git", "node_modules", "dist", ".wrangler"]);

const git = (...a) => execFileSync("git", ["-C", privado, ...a], { maxBuffer: 1 << 28 });
const coincide = (f, p) => (p.endsWith("/") || p.endsWith("-") ? f.startsWith(p) : f === p);
const todos = git("ls-tree", "-r", "--name-only", "HEAD").toString().split("\n").filter(Boolean);
const entran = todos.filter((f) => INCLUIR.some((p) => coincide(f, p)));
const sinClasificar = todos.filter((f) => !entran.includes(f) && !Object.keys(EXCLUIR).some((p) => coincide(f, p)));

// Borra la foto anterior.
function archivos(c) {
  return readdirSync(c).flatMap((n) => {
    const r = join(c, n);
    if (c === publico && NO_TOCAR.has(n)) return [];
    return statSync(r).isDirectory() ? archivos(r) : [r];
  });
}
for (const f of archivos(publico)) if (!PROPIOS.has(relative(publico, f).replaceAll("\\", "/"))) rmSync(f);
function podar(c) {
  for (const n of readdirSync(c)) {
    const r = join(c, n);
    if (c === publico && NO_TOCAR.has(n)) continue;
    if (statSync(r).isDirectory()) { podar(r); if (!readdirSync(r).length) rmdirSync(r); }
  }
}
podar(publico);

// Copia lo commiteado (no lo que esté a medio hacer en la copia de trabajo del privado). Al Liquid de Gadsden le saca
// los comentarios, como construir.mjs (sinComentarios y sinMarcas): son notas internas de las tiendas para las que se
// hizo cada sección y no se ven; lo que se compila queda igual.
const sinComentarios = (t) => t.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, "");
const sinMarcas = (t) => t.replace(/(<style[^>]*>|\{%-?\s*style\s*-?%\})([\s\S]*?)(<\/style>|\{%-?\s*endstyle\s*-?%\})/g, (_, a, css, b) => a + css.replace(/\/\*[\s\S]*?\*\//g, "") + b);
for (const f of entran) {
  mkdirSync(dirname(join(publico, f)), { recursive: true });
  const b = git("show", `HEAD:${f}`);
  writeFileSync(join(publico, f), /^vendor\/gadsden\/(?:sections|snippets)\/.*\.liquid$/.test(f) ? sinMarcas(sinComentarios(b.toString())) : b);
}
const commit = git("rev-parse", "--short", "HEAD").toString().trim();

// Escaneo de la foto. Graves: no se publica. Avisos: menciones que hay que mirar (las de vendor/ vienen del theme
// original de Gadsden, que ya es público).
const GRAVES = [
  ["correo", /[A-Za-z0-9._%+-]+@(?!lga-arg\.com\b)[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?/g],
  ["correo personal", /gerolopezge@|@gmail\.com/gi],
  ["ruta de una PC", /\b[A-Z]:[\\/](?:PROYECTOS|Users|Usuario|_envs)\b|\/home\/[a-z]/gi],
  ["clave o token", /\b(?:ghp|gho|ghs|ghu|github_pat|sk_live|sk_test|pk_live|xox[abp])_[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["token asignado", /(?:access_token|client_secret|CLIENT_SECRET)\s*[:=]\s*["'][A-Za-z0-9]{20,}["']/g],
  ["teléfono", /\+54\s?9?\s?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{4}/g],
  ["licencia de Dawn", /Shopify Inc\.|LICENSE-DAWN/g],
];
const AVISOS = [
  ["otra tienda", /\b(?:domu|athlex|carbotiras|puntito|hornero)/gi],
  ["tienda de Tiendanube", /(?<![a-z0-9-])(?!lgademo\.|prefixlga15\.|dcdn-us\.)[a-z0-9-]+\.mitiendanube\.com\b|\b[a-z0-9-]+\.myshopify\.com\b/gi],
];
const texto = /\.(?:m?[jt]sx?|json|liquid|css|html|md|toml|svg|txt)$|^\.gitignore$|^LICENSE$/;
const graves = [], avisos = {};
for (const f of archivos(publico).map((r) => relative(publico, r).replaceAll("\\", "/"))) {
  // Este script nombra los patrones que busca.
  if (!texto.test(f.split("/").pop()) || f === "herramientas/actualizar-publico.mjs") continue;
  const t = readFileSync(join(publico, f), "utf8");
  for (const [que, re] of GRAVES) for (const m of t.matchAll(re)) graves.push(`${f}: ${que}: ${m[0]}`);
  for (const [que, re] of AVISOS) for (const m of t.matchAll(re)) {
    const k = `${que}: ${m[0].toLowerCase()}`;
    (avisos[k] ??= new Set()).add(f.startsWith("vendor/") ? "vendor/" : f);
  }
}

console.log(`Foto del commit ${commit} del privado: ${entran.length} archivos de ${todos.length}.`);
for (const [p, motivo] of Object.entries(EXCLUIR)) {
  const n = todos.filter((f) => coincide(f, p) && !entran.includes(f)).length;
  if (n) console.log(`  afuera ${p} (${n}): ${motivo}`);
}
if (sinClasificar.length) console.log(`Sin clasificar (no se copiaron; sumalos a INCLUIR o a EXCLUIR):\n  ${sinClasificar.join("\n  ")}`);
for (const [k, fs] of Object.entries(avisos)) console.log(`Aviso, ${k}: ${[...fs].join(", ")}`);
if (graves.length) {
  console.log(`GRAVE, no publicar:\n  ${graves.join("\n  ")}`);
  process.exit(1);
}
console.log("Escaneo: nada grave.");
