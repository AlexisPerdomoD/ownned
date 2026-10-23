# [ISSUE-4.1] Tema claro/oscuro persistente y movimiento reducido

- **Fase:** 4 — Consistencia global
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** pendiente
- **Depende de:** decisión D6 (por defecto: localStorage); puede paralelizarse con fase 3 si no comparte archivos (coordinar con 3.5 por `Navbar`)
- **Conflicto de archivos:** `shared/ui/Navbar.jsx` (comparte con 2.3 de fase 2 y 3.5 de fase 3)
- **Commit sugerido:** `feat(theme): add persisted theme and reduced motion`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Toggle en `Navbar`, persistencia en `localStorage`, sin flash de tema en la carga, respetar `prefers-color-scheme` como valor inicial y `prefers-reduced-motion` en animaciones globales.

## Archivos afectados

- `web/app/src/shared/ui/Navbar.jsx`
- `web/app/src/shared/ui/index.jsx` (proveedor de tema)
- CSS global de `web/app`

## Criterios de aceptación

- [ ] Sin flash con tema preferido al recargar.
- [ ] Animaciones desactivadas si el usuario lo pide a nivel de OS.

## Prompt para agente ejecutor

> "En `web/app`, añade un toggle de tema con persistencia local e inicialización desde `prefers-color-scheme` sin FOUC. Añade soporte `prefers-reduced-motion` a nivel de estilos."
