# Cierre 3.8 — Vista de carpeta estilo Drive

- **Estado:** issue 38 cerrada (`hecho`).
- **Referencias:** `web/app/src/pages/NodeView/index.jsx`, `NodeCard.jsx`, `DocCard.jsx`.

La vista responsive presenta carpetas y archivos como tiles cuadrados en un único conjunto, con carpetas primero. Grid y lista alternativos usan los mismos hijos ordenados/paginados. `NodeCard` y `DocCard` usan botones nativos para navegación y mantienen descarga/eliminación como acciones separadas accesibles por hover y teclado. Si `doc` falta, `DocCard` conserva el nombre del nodo y el icono/tipo genéricos.

Verificación: `pnpm exec vitest run` (24 tests), `pnpm run build` y ESLint sobre los archivos afectados (`NodeView`, `NodeCard`, `DocCard`) pasan sin errores ni warnings.
