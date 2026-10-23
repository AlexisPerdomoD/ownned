# [ISSUE-1.3] Helper compartido de autorización frontend

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** revisión *(implementado sin consumirse en vistas — eso es fase 2; revisado interamente vs matriz de canonical-flows.md)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `feat(authz): add shared frontend access helpers`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Crear módulo puro `shared/authz/` con funciones `canRead/canCreate/canDelete/canComment/canManageUsrs(usr, accessLevel)` según la semántica acordada: **rol = techo**, **asignación (access_level) = actualmente permitido**, **acción = regla específica**. Documentar en JSDoc que no es autoridad final (el backend lo es). **No consumirlo** todavía en vistas (eso es fase 2). Sin motor de políticas genérico.

## Archivos afectados

- `web/app/src/shared/authz/` (nuevo; `index.js` + funciones)
- `web/app/src/entities/nodes/index.js` (reexport si aplica)

## Criterios de aceptación

- [ ] Módulo puro, sin imports de UI ni API.
- [ ] Maneja `access_level` absent/unknown → ninguna acción mutable habilitada.
- [ ] Cubre matriz de `canonical-flows.md` (super/normal/limited × read/write/write_delete/owner + sin nivel).
- [ ] D1 resuelta: `canComment` devuelve `false` siempre que el rol sea `limited_usr_role`, independiente del `access_level` (techo de rol sobre la capacidad de modificar). Regla explícita en el código, no difuminada.

## Prompt para agente ejecutor

> "Crea `web/app/src/shared/authz/` con funciones puras de gating: rol como techo, `access_level` jerárquico (read_only_access < write_access < write_delete_access < owner_access), y reglas de acción (leer/comentar/crear/borrar/admin global). Sin UI ni fetch. INCLUYE YA LA REGLA D1 CONFIRMADA: `canComment(usr, accessLevel)` es `false` si el rol es limited aunque el access sea read_only. Sin framework de políticas; funciones simples y testeadas manualmente contra la matriz de `doc/frontend/canonical-flows.md`."
