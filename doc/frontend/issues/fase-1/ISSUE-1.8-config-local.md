# [ISSUE-1.8] Configuración local de CORS/cookies

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** revisión *(implementado en `3b55cfd` + README en `2921de5`; criterio 1 verificado, criterio 2 requiere smoke Vite+API — ver Cierre)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(config): align local development mode`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Dejar documentado y funcional el modo `MODE=local` para desarrollo Vite + API local, evitando sorpresas de cookies/CORS.

## Archivos afectados

- `.env.example`
- `README.md` (solo sección de desarrollo local; el README tiene modificaciones del usuario hoy, coordinar antes de tocarlo)

## Criterios de aceptación

- [x] `.env.example` con `MODE=local` comentado como valor de desarrollo (comentario de modos: `local` / `dev` / `test`).
- [ ] Login/logout desde Vite funciona sin tocar código.

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commits `3b55cfd` (`.env.example` con `MODE=local` y explicación) y `2921de5` (README: modos de ejecución + fila de `make test-local`).
- Los healthchecks de Postgres (`702197c`) eliminan una race de arranque que afectaba este mismo flujo en primera ejecución.
- Pendiente para la próxima sesión: smoke login/logout desde Vite (`localhost:5173`) contra API local.

## Prompt para agente ejecutor

> "Documenta el modo de desarrollo local (CORS/cookies) en `.env.example` y README (coordinar: README tiene cambios en curso del usuario). Verifica con `make db-local-up` + API local + Vite que login/logout funcionan desde `localhost:5173`."
