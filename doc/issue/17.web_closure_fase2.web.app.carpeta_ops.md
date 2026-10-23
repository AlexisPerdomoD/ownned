# [ISSUE-2.6] Normalizar operaciones de carpeta (crear, editar 501, borrado recursivo con confirmación)

- **Fase:** 2 — Flujos críticos rotos
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** 1.3, 2.1
- **Conflicto de archivos:** `pages/NodeView/index.jsx` (montaje de acciones; coordinar con 2.1/2.5)
- **Commit sugerido:** `fix(nodes): normalize folder operations`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Crear carpeta con validación; edición debe mostrar muy claramente que no está disponible mientras el backend sigue en `501` (no fingir que funciona); borrado recursivo con confirmación explícita en `ConfirmDialog` (no `window.confirm`).

## Archivos afectados

- `web/app/src/features/node/usecase/useCreateFolder.js`
- `web/app/src/features/node/usecase/useUpdateNode.js`
- `web/app/src/features/node/usecase/useDeleteNode.js`
- `web/app/src/pages/NodeView/index.jsx` (montaje de acciones)

## Criterios de aceptación

- [ ] Crear y borrar funcionan según permisos.
- [ ] Editar no aparece como funcional mientras sea `501`, pero no se rompe el flujo.
- [ ] Confirmación de borrado recursivo usa el `ConfirmDialog` compartido.

## Prompt para agente ejecutor

> "En `web/app`, estabiliza creación/edición/borrado de carpetas: maneja `501` de edición como capacidad no disponible (por ejemplo deshabilitar el botón con tooltip) y usa `ConfirmDialog` para delete recursivo. Refresca la vista tras operaciones."
