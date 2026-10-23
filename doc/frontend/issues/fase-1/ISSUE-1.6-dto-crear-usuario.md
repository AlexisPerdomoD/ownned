# [ISSUE-1.6] DTO y validación de creación de usuario

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (entidad)
- **Estado:** hecho *(implementado en `7f37d10` junto con 1.7; superficies compartidas en `entities/usrs` — ver Cierre)*
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

- [x] Payload enviado contiene solo campos aceptados por el decoder backend (sin `access`).
- [x] Validación de contraseña exacta (8–255, letra+dígito+símbolo, mensajes claros) y reutilizable (`CreateUsrDTO.#passwordSchema`).
- [x] No quedan archivos duplicados o vacíos re-exportados (DTO consolidado en `createUsr.js`; duplicado eliminado de `paginateUsr.js`; `import z` sin uso retirado).

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `7f37d10` (mismo commit que 1.7; la vista de usuarios no se tocó — el hook absorbió el cambio de firma).
- Pendiente: ninguno estático; el smoke de contraseña débil/fuerte entra en el smoke manual general del proceso de usuarios (se puede en el mismo ciclo del E2E de 1.1).

## Prompt para agente ejecutor

> "En `web/app/src/entities/usrs`, consolida una única versión del DTO de crear usuario, sin `access`, con validación de contraseña igual a la del backend (8–255, letra+dígito+símbolo). Reexport correcto en `index.js`; elimina duplicados de `paginateUsr.js`. No toques vistas."
