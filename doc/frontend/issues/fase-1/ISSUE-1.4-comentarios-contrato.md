# [ISSUE-1.4] Alinear contrato de comentarios (rutas, límite, DTO)

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** revisión *(código hecho en `49a47d6`; criterios 1-2 verificados estáticamente, criterio 3 requiere runtime con API — ver Cierre)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(comments): align comment api contract`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Mover GET/POST/DELETE del comentario a las rutas vigentes del contrato y ajustar límite de contenido a 255. Exponer la API lista para que la fase 2 añada edición inline.

**No tocar:** `CommentsList.jsx` ni UX (solo si algún prop cambia de nombre, ajustar mínimo).

## Archivos afectados

- `web/app/src/entities/comments/api/index.js`
- `web/app/src/features/comments/usecase/index.js`

## Criterios de aceptación

- [x] Rutas/métodos exactos del backend en cada función (`GET/POST /nodes/{nodeID}/comments`, `PATCH/DELETE /nodes/comments/{nodeCommentID}`).
- [x] Payload respeta límite 255 y campos del decoder (`CreateCommentDTO` serializa solo `{content}` — el id viaja en la ruta; `UpdateCommentDTO` listo para Fase 2).
- [ ] Listar/crear/borrar funcionan con la vista actual; ningún cambio de UX visible.

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `49a47d6`.
- Verificado estáticamente: rutas contra `contract-coverage.md` y handlers backend; límite 255 validado por Zod en create y update; vista intacta (los hooks conservan firmas).
- Pendiente para la próxima sesión: smoke manual listar/crear/borrar comentarios desde `NodeView` contra API local.

## Prompt para agente ejecutor

> "En `web/app/src/entities/comments/api/`, corrige rutas/métodos/límites de comentarios para coincidir 1:1 con el contrato backend (revisa `doc/frontend/contract-coverage.md`, filas de comentarios). Ajusta `features/comments/usecase/index.js` sin alterar la vista. Prioridad: contratos correctos, no rediseño."
