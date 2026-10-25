# Cierre 3.6 — Confirmaciones y modales

- **Estado:** issue 23 cerrada (`hecho`).
- **Referencias:** `web/app/src/shared/ui/Modal.jsx`, `ConfirmDialog.jsx`.

Los formularios de carpeta, grupo y usuario ahora usan el `Modal` compartido; `ConfirmDialog` ya se construía sobre él. El modal mueve el foco al contenido (o al control marcado `data-autofocus`), mantiene Tab/Shift+Tab dentro del panel, cierra con Escape y devuelve el foco al elemento que lo abrió. También restaura el scroll del documento al cerrar.

No quedan llamadas a `window.confirm` ni `window.alert` en `web/app/src`. El backdrop del drawer móvil de comentarios se conserva como parte del drawer, no como un diálogo de confirmación.

Verificación: búsqueda estática de `confirm`/`alert` y overlays inline, `pnpm exec vitest run` (24 tests) y `pnpm run build` pasan. ESLint no reporta errores; quedan warnings preexistentes en `NodeView` y `UsrsView`.
