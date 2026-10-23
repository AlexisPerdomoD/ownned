# [ISSUE-1.5] Actualización de grupo vía PATCH

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** hecho *(implementado en `5bfe18a`; ambos criterios verificados — ver Cierre)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(groups): update groups with patch`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Cambiar `apiUpdateGroup` de `PUT` a `PATCH` y ajustar consumo en hooks/vistas sin cambio de UX.

## Archivos afectados

- `web/app/src/entities/groups/api/index.js`
- `web/app/src/features/group/usecase/useUpdateGroup.js`

## Criterios de aceptación

- [x] Petición = `PATCH /api/v1/groups/{groupID}` con payload anticipado por el contrato.
- [x] Errores `403`/validación propagados sin estado optimista incorrecto (hook devuelve `[false, {general}]`; sin estado previo mutado).

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `5bfe18a`.
- Verificado estáticamente: método PATCH en `apiUpdateGroup`; `useUpdateGroup.js` consume igual la respuesta.
- Pendiente: ninguno; el smoke de grupos reales queda bajo el alcance de `ISSUE-2.4-grupos`.

## Prompt para agente ejecutor

> "Cambia `apiUpdateGroup` a `PATCH` y verifica en `features/group/usecase/useUpdateGroup.js` que la respuesta se consuma igual. Sin cambios de UI."
