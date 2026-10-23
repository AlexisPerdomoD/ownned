# [ISSUE-3.5] Consolidar vista de explorador (responsive, estados, densidad)

- **Fase:** 3 — Explorador, paginación y compartición usable
- **Tipo:** Módulo específico (refactor)
- **Estado:** pendiente
- **Depende de:** 2.1, 2.2, 3.1 (y preferiblemente 3.2/3.3 terminadas, comparté contenido con ellas)
- **Conflicto de archivos:** `NodeView`/`features/node/ui` — última issue de fase 3 sobre el explorador
- **Commit sugerido:** `refactor(nodes): consolidate explorer view states`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Eliminar secciones duplicadas en `NodeView`, unificar responsive/keyboard/estados vacíos, **sin** introducir nueva vista no acordada.

## Archivos afectados

- `web/app/src/pages/NodeView/index.jsx`
- `web/app/src/features/node/ui/*`
- `web/app/src/shared/ui/*` (solo si un átomo falta)

## Criterios de aceptación

- [ ] Una sola fuente de verdad para bloques duplicados.
- [ ] Navegación por teclado y foco visibles en acciones principales.

## Prompt para agente ejecutor

> "Refactoriza `NodeView` para quitar la duplicación de secciones y estados, mejorando en responsive/accesibilidad básica. No cambies el comportamiento de flujo ya cerrado; solo consolida."
