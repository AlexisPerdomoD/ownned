# Cierre 4.1 — Tema persistente y movimiento reducido

- **Estado:** issue 24 cerrada (`hecho`).
- **Decisión D6:** tema y preferencia de dotfiles se persisten solo en `localStorage`; el tema guardado prevalece sobre la preferencia del sistema.

Un script síncrono en el `<head>` aplica el tema antes de montar Solid, con `prefers-color-scheme` como fallback. `Navbar` lee ese valor inicial y persiste cambios del toggle. La hoja global reduce animaciones y transiciones cuando `prefers-reduced-motion: reduce` está activo.

Verificación: bootstrap antes del módulo de la app revisado en `web/app/index.html`; `pnpm exec vitest run` (24 tests) y `pnpm run build` pasan.
