# Cierre 3.5 — Consolidación del explorador

- **Estado:** issue 22 cerrada (`hecho`).
- **Referencias:** `web/app/src/pages/NodeView/index.jsx`, `doc/frontend/canonical-flows.md`.

Grid y lista consumen los mismos selectores de hijos ordenados y paginados; las filas compactas también se comparten entre lista y búsqueda. Las acciones primarias usan botones nativos, las acciones contextuales permanecen accesibles por teclado/foco y la carga del nodo comunica errores con una acción de reintento.

`NodeCard` y `DocCard` separan el botón principal de las acciones secundarias, evitando controles interactivos anidados. `useGetNode` ignora respuestas obsoletas al navegar rápidamente entre carpetas.

Verificación: `pnpm exec vitest run` (24 tests) y `pnpm run build` pasan. ESLint no reporta errores; quedan cinco warnings preexistentes en `NodeView`.
