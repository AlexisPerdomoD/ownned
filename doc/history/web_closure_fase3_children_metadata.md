# Cierre 3.1 — Metadata y acceso por hijo

- **Estado:** issue 18 cerrada (`hecho`).
- **Referencias:** `doc/frontend/contract-coverage.md`, `GET /api/v1/nodes/{nodeID}`.

`NodeView` consume los datos propios de cada hijo: muestra el filename completo de `Node.name` (o `Doc.filename`) y el mimetype cuando `doc` está disponible; si falta, conserva el nombre del nodo y usa el fallback visual genérico. Las acciones de descarga y eliminación se gobiernan con el `access_level` del hijo, nunca con el del padre.

Para limitar el costo de renderizado, la lista pagina localmente a **100 hijos por página**, manteniendo carpetas antes que archivos. El endpoint de detalle todavía entrega todos los hijos; esta paginación limita los elementos montados en el DOM, no el tamaño de la respuesta HTTP.

Verificación: test sintético con 250 hijos confirma el límite, el orden folder-first y el clamping de página; `pnpm exec vitest run` (17 tests) y `pnpm run build` pasan. ESLint no reporta errores; quedan warnings preexistentes en `NodeView`.
