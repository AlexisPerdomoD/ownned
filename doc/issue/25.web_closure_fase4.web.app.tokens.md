# [ISSUE-4.2] Limpieza de tokens y clases arbitrarias

- **Fase:** 4 — Consistencia global
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** pendiente
- **Depende de:** fase 3 (evitar conflictos de estilo con vistas en refactor)
- **Conflicto de archivos:** amplio (`web/app/src/**` clases) → después de fase 3
- **Commit sugerido:** `refactor(ui): use semantic theme tokens`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Migrar clases tipo `text-[--color-*]` a tokens semánticos donde existan (revisar `web/app/AGENTS.md` para las reglas de tokens) y revisar contraste.

## Archivos afectados

- `web/app/src/**` (clases)
- `web/app/AGENTS.md` (si se consolida una regla nueva)

## Criterios de aceptación

- [ ] Sin clases arbitrarias de variables CSS en las vistas principales.
- [ ] Contraste mínimo AA en textos y estados.

## Prompt para agente ejecutor

> "En `web/app`, reemplaza clases arbitrarias de variables CSS por los tokens semánticos del tema, según las reglas de `web/app/AGENTS.md`. No cambies jerarquía visual percibida."
