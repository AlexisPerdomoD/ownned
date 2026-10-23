# [ISSUE-1.6] DTO y validación de creación de usuario

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** revisión *(implementado; validación de contraseña replicada del contrato backend)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(users): align create user contract and validation`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Consolidar DTO de creación en `createUsr.js` (devolverlo a `entities/usrs/api/index.js`), eliminar `access: []` del payload, replicar validación backend de contraseña (8–255, al menos una letra, un dígito, un símbolo).

**No tocar:** vista de usuarios ni gating de rol (fase 2).

## Archivos afectados

- `web/app/src/entities/usrs/api/createUsr.js`
- `web/app/src/entities/usrs/api/paginateUsr.js` (quitar duplicado)
- `web/app/src/entities/usrs/api/index.js`
- `web/app/src/entities/usrs/index.js`

## Criterios de aceptación

- [ ] Payload enviado contiene solo campos aceptados por el decoder backend.
- [ ] Validación de contraseña exacta (mensajes de error claros) y reutilizable.
- [ ] No quedan archivos duplicados o vacíos re-exportados.

## Prompt para agente ejecutor

> "En `web/app/src/entities/usrs`, consolida una única versión del DTO de crear usuario, sin `access`, con validación de contraseña igual a la del backend (8–255, letra+dígito+símbolo). Reexport correcto en `index.js`; elimina duplicados de `paginateUsr.js`. No toques vistas."
