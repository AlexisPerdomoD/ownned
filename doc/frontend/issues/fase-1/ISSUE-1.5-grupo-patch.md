# [ISSUE-1.5] Actualización de grupo vía PATCH

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** revisión *(implementado)*
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

- [ ] Petición = `PATCH /api/v1/groups/{groupID}` con payload anticipado por el contrato.
- [ ] Errores `403`/validación propagados sin estado optimista incorrecto.

## Prompt para agente ejecutor

> "Cambia `apiUpdateGroup` a `PATCH` y verifica en `features/group/usecase/useUpdateGroup.js` que la respuesta se consuma igual. Sin cambios de UI."
