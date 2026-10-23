# [ISSUE-3.2] Paginación de nodos y documentos

- **Fase:** 3 — Explorador, paginación y compartición usable
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** 1.1, 3.1; decisión D3 (por defecto: paginación API para carpetas grandes, orden local para pocas)
- **Conflicto de archivos:** `NodeView` → después de 3.1
- **Commit sugerido:** `feat(nodes): consume node and document pagination`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Consumir `/nodes/paginate` y `/nodes/docs/paginate` con paginación, búsqueda y filtros coherentes con el contrato.

## Archivos afectados

- `web/app/src/entities/nodes/api/*`
- `web/app/src/features/node/usecase/usePaginateNode.js`
- `web/app/src/pages/NodeView/index.jsx`

## Criterios de aceptación

- [ ] Paginación funcional con estados vacío/error.
- [ ] No rompe navegación actual ni flujos 2.x.

## Prompt para agente ejecutor

> "En `web/app`, integra las rutas de paginación reales con hook + vista y filtros del contrato. Mantén la navegación por carpetas intacta."
