# [ISSUE-1.4] Alinear contrato de comentarios (rutas, límite, DTO)

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** revisión *(implementado; edición PATCH ya expuesta para fase 2)*
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

- [ ] Rutas/métodos exactos del backend en cada función.
- [ ] Payload respeta límite 255 y campos del decoder.
- [ ] Listar/crear/borrar funcionan con la vista actual; ningún cambio de UX visible.

## Prompt para agente ejecutor

> "En `web/app/src/entities/comments/api/`, corrige rutas/métodos/límites de comentarios para coincidir 1:1 con el contrato backend (revisa `doc/frontend/contract-coverage.md`, filas de comentarios). Ajusta `features/comments/usecase/index.js` sin alterar la vista. Prioridad: contratos correctos, no rediseño."
