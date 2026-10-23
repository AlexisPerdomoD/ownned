# [ISSUE-4.3] Auditoría de accesibilidad y estados globales

- **Fase:** 4 — Consistencia global
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** pendiente
- **Depende de:** 3.5 y 4.1
- **Conflicto de archivos:** amplio según auditoría → última de fase 4
- **Commit sugerido:** `fix(ui): improve accessibility and global states`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Foco visible, teclado, nombres accesibles, contraste, carga/vacío/error coherentes en todos los flujos.

## Archivos afectados

- `web/app/src/**` (según auditoría)

## Criterios de aceptación

- [ ] Auditoría manual documentada en notas de la PR/commit.
- [ ] Estados globales coherentes en los 9 flujos canónicos.

## Prompt para agente ejecutor

> "Realiza auditoría de accesibilidad manual en `web/app`: foco, teclado, nombres y contraste. Documenta hallazgos y arreglos mínimos en la descripción del commit/PR."
