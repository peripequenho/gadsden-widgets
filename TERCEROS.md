# Archivos de terceros

| Qué | Dónde | Licencia |
| --- | --- | --- |
| Secciones, snippets, CSS, JS, íconos y ajustes de Gadsden | `vendor/gadsden/` | MIT, Copyright (c) 2026 Gero ([gadsden-theme](https://github.com/peripequenho/gadsden-theme)) |
| Fuente Material Symbols Outlined | `vendor/gadsden/assets/material-symbols-outlined.woff2` | Apache License 2.0, Google (<https://www.apache.org/licenses/LICENSE-2.0>) |

De Gadsden sólo están los archivos propios (`gad-*`), que son MIT. El theme del que viene Gadsden tiene además código
con otra licencia, que no se puede usar fuera de su plataforma: ese código no está en este repositorio. Lo que los widgets
necesitan de él (la base de estilos y los snippets `price` y `loading-spinner`) está escrito de cero en `src/w/`.

`vendor/gadsden/config/defaults.json` es la lista de los valores por defecto de los ajustes del theme Gadsden (id del
ajuste y su valor: números, colores, textos). Son datos, no código, y vienen del theme Gadsden.

A los archivos Liquid de `vendor/gadsden/` se les sacaron los comentarios (notas internas que no se ven en la página);
el código es el original.

Las dependencias de npm (`package.json`) tienen cada una su licencia, en `node_modules/<paquete>/`.
