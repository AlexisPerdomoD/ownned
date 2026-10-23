# [ISSUE-1.1] Unificar transporte API, credenciales y normalización de errores

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** revisión *(código hecho en `31eb6fe`; criterios 1-2 verificados estáticamente, criterio 3 requiere smoke E2E — ver Cierre)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(web): unify api transport and error handling`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Centralizar **todas** las llamadas HTTP en `shared/api/client.js`: JSON, multipart y blob comparten base URL (`shared/config/env.js`), credenciales, headers y mapeo de errores incluyendo `422` con `detail`. Migrar logout, subida, descarga y borrado de documentos.

**No tocar:** UI, gating de permisos, ni el backend.

## Archivos afectados

- `web/app/src/shared/api/client.js`
- `web/app/src/entities/usrs/api/logout.js`
- `web/app/src/entities/docs/api/index.js`
- `web/app/src/features/node/usecase/useCreateDoc.js`
- `web/app/src/features/node/usecase/useDeleteDoc.js`

## Criterios de aceptación

- [x] Cero `fetch()` directos fuera de `client.js` en el árbol `src/` (grep: cero coincidencias).
- [x] Errores `400/401/403/404/409/422/429/500/501` normalizados sin perder `detail` (`throwForApiError` por status; añadidos `413/415` y `ApiValidationError` con `detail` adjunto).
- [ ] Login → logout → upload → download funcionan con cookies en modo local (Vite + API local).

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `31eb6fe`.
- Verificado: `pnpm build` y `eslint src` limpios; grep confirma cero `fetch()` fuera de `client.js`.
- Pendiente para la próxima sesión: smoke E2E local (login → logout → upload → download) contra API en `MODE=local`; va en el Handoff de Fase 2 del tablero.

## Prompt para agente ejecutor

> "En `web/app`, migra los `fetch` directos de `entities/usrs/api/logout.js`, `entities/docs/api/index.js` y `features/node/usecase/useCreateDoc.js` para usen los helpers de `shared/api/client.js` (mismo base URL, credenciales y mapping de errores que ya maneja 422). No cambies UI ni lógica de negocio; conserva firmas de hooks. Verifica con build y con una sesión local de Vite contra la API en modo local."
