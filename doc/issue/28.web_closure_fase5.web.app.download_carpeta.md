# [ISSUE-5.2] Descarga de carpeta

- **Fase:** 5 — Capacidades avanzadas, verificación y cierre
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente (bloqueada: endpoint `501`)
- **Depende de:** implementación backend de descarga de carpeta
- **Conflicto de archivos:** ninguno mientras permanezca oculta
- **Commit sugerido:** `chore(nodes): keep folder download out of scope` (si queda pendiente backend) / `feat(nodes): support folder download` (cuando exista contrato)
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

**No implementar** la UI de descarga de carpeta mientras el backend responda `501`. Si el backend llega a implementar, integrarla.

## Archivos afectados

- `web/app/src/pages/NodeView/index.jsx` (ocultar affordance cuando aplique)
- `web/app/src/entities/docs/api/*`

## Criterios de aceptación

- [ ] Ningún affordance de descarga de carpeta visible hasta que backend tenga contrato real.

## Prompt para agente ejecutor

> "Asegura en `web/app` que la descarga de carpeta no se muestre como disponible mientras el endpoint siga en `501`. Solo se activa cuando exista implementación backend y contrato."
