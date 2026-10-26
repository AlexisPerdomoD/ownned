# Cierre 5.2 — Descarga de carpeta

- **Estado:** issue 28 cerrada (`hecho`).
- **Decisión del usuario:** el botón Download folder permanece **visible** aunque el backend responda `501`; al pulsarlo se notifica el error.

El flujo usa `apiDownloadFolder` → `reqBlob` contra `GET /api/v1/nodes/{nodeID}/download`. El cliente mapea el `501` a `ApiNotImplementedError` y `handleDownloadFolder` muestra `toast.error` con el `reason` del backend (`"This resource is not implemented yet"`), con fallback propio ante fallos de red. No existe toast de éxito cuando la petición falla, por lo que un stub nunca se presenta como capacidad completada.

Cuando el backend implemente la descarga real, la misma llamada pasará a descargar sin cambios de UI;🔗 [`contract-coverage.md`](../frontend/contract-coverage.md) documenta el stub y los pendientes backend (formato de archivo, límites y errores).

Verificación: revisión de código y contrato (`node_handler.go` líneas 132/212 devuelven `ErrNotImplemented` → `view.go` responde `501`); suite de frontend en verde al cierre de la issue 27 (`57` tests, build y ESLint). No se ejecutó smoke manual de este botón.
