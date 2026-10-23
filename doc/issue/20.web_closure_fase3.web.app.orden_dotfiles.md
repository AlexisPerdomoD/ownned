# [ISSUE-3.3] Ordenación y dotfiles

- **Fase:** 3 — Explorador, paginación y compartición usable
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** 3.1; decisiones D3 y D6 (por defecto: localStorage)
- **Conflicto de archivos:** `NodeView`/`NodeList` → después de 3.2
- **Commit sugerido:** `feat(explorer): add sorting and dotfile controls`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Orden por nombre/creación/modificación (carpetas primero, dirección clara), dotfiles ocultos por defecto con control persistente.

## Archivos afectados

- `web/app/src/pages/NodeView/index.jsx`
- `web/app/src/features/node/ui/NodeList.jsx`

## Criterios de aceptación

- [ ] Orden funciona en carpetas y archivos con nombre real.
- [ ] Visibilidad de dotfiles recordada por dispositivo.

## Prompt para agente ejecutor

> "En `web/app`, añade ordenación y control de dotfiles en NodeView; usa nombre real y persistencia local según la decisión D6."
