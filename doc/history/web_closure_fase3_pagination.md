# Cierre 3.2 — Paginación de nodos y documentos

- **Estado:** issue 19 cerrada (`hecho`).
- **Referencias:** `doc/frontend/contract-coverage.md`, `GET /api/v1/nodes/paginate`, `GET /api/v1/nodes/docs/paginate`.

`NodeView` consume ambos endpoints para sus resultados de búsqueda: la búsqueda rápida pagina carpetas y la búsqueda avanzada pagina documentos con filtros de mimetype y tamaño. Los hooks leen el contrato real (`page`, `total_pages`, `total_count`), conservan la navegación al resultado y exponen estados de carga, vacío y error. Las respuestas de búsquedas anteriores se ignoran si ya comenzó una petición más reciente.

La lista principal de hijos continúa basada en `GET /nodes/{id}`; limita localmente a 100 elementos renderizados por página. Esto mantiene la navegación existente y no presenta ese límite de render como paginación backend.

Verificación: pruebas de hooks para metadatos de páginas y respuestas obsoletas; `pnpm exec vitest run` (20 tests) y `pnpm run build` pasan. ESLint no reporta errores; permanecen warnings preexistentes en `NodeView`.
