# [ISSUE-1.3] Helper compartido de autorización frontend

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** hecho *(implementado en `a3478a7`; los 4 criterios verificados por revisión estática — ver Cierre)*
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

- [x] Módulo puro, sin imports de UI ni API (`shared/authz/index.js`: solo JSDoc y funciones).
- [x] Maneja `access_level` absent/unknown → ninguna acción mutable habilitada (`effectiveRank` produce 0 ante nivel desconocido).
- [x] Cubre matriz de `canonical-flows.md` (`roleCeilingRank` clampa limited → read_only; reglas espejo de `GroupUsrAccess.IsValidAccessToRole` y `UsrRole.CanAssignGroupUsr`).
- [x] D1 resuelta: `canCommentOnNode` devuelve `false` siempre que el rol sea `limited_usr_role`, independiente del `access_level` (regla explícita y documentada; compensa que el backend todavía lo permite).

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `a3478a7` (`web/app/src/shared/authz/index.js`).
- Sin consumo en vistas por diseño — `ISSUE-2.1-gating-nodos` y `ISSUE-2.2-comentarios-completo` lo consumen en Fase 2.
- Pendiente: ninguno. Si el dominio backend cambia reglas (p. ej. otra restricción en `IsValidAccessToRole`), actualizar el módulo espejo.

## Prompt para agente ejecutor

> "Crea `web/app/src/shared/authz/` con funciones puras de gating: rol como techo, `access_level` jerárquico (read_only_access < write_access < write_delete_access < owner_access), y reglas de acción (leer/comentar/crear/borrar/admin global). Sin UI ni fetch. INCLUYE YA LA REGLA D1 CONFIRMADA: `canComment(usr, accessLevel)` es `false` si el rol es limited aunque el access sea read_only. Sin framework de políticas; funciones simples y testeadas manualmente contra la matriz de `doc/frontend/canonical-flows.md`."
