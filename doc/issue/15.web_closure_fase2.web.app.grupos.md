# [ISSUE-2.4] Cerrar gestión básica de grupos

- **Fase:** 2 — Flujos críticos rotos
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** 1.5, 1.3
- **Conflicto de archivos:** ninguno dentro de fase 2
- **Commit sugerido:** `fix(groups): align group management flows`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Verificar CRUD, usuarios, nodos, update `PATCH` y permisos `403`, sin selector visual (fase 3). Sin UUIDs visibles donde se pueda mostrar un nombre.

## Archivos afectados

- `web/app/src/pages/GroupsView/index.jsx`
- `web/app/src/pages/GroupView/index.jsx`
- `web/app/src/features/group/ui/*`

## Criterios de aceptación

- [ ] CRUD + membresías con rutas correctas (PATCH incluido).
- [ ] `403` manejado sin estado optimista.
- [ ] No obliga a pegar UUID de usuario entre los existentes si la API ya da el listado.

## Prompt para agente ejecutor

> "En `web/app`, cierra el flujo de grupos: no inventes el selector visual todavía, corrige `403`, revisa los listados y asegura el PATCH. Deja marcadas las mejoras visuales para la fase 3 (selector de nodos)."
