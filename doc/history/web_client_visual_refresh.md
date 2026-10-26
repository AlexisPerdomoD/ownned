# Renovación visual del cliente web

- **Estado:** implementación registrada; no cierra issues del tracker.
- **Alcance:** `web/app` — paletas, tipografía local, iconografía, movimiento y controles de apariencia.
- **Propuesta:** [`../proposal/theme-palettes.md`](../proposal/theme-palettes.md), con preview en [`../proposal/theme-palettes-preview.html`](../proposal/theme-palettes-preview.html).

Se adoptó Obsidian como paleta inicial y se conservaron las seis alternativas seleccionables. Inter y JetBrains Mono se sirven desde `public/fonts` con sus licencias OFL, sin solicitudes de fuentes a Google en runtime. Los títulos pasan a sans, los iconos de navegación usan SVG y el Navbar cambia a menú compacto en móvil con selector flotante de paleta.

Los tokens de ambos temas mantienen estados semánticos y comprobaciones WCAG AA. Se añadieron transiciones discretas para vistas y modales, con soporte para `prefers-reduced-motion`.

**Fuera de alcance:** no se modificó `internal/` ni se corrigió el aislamiento de hijos de carpetas en backend; ese trabajo queda con el responsable backend. No se cerró ni alteró ningún issue.

**Verificación:** `pnpm test` (49 pruebas), `pnpm build` y `pnpm exec eslint src` pasan. El build ya no emite la advertencia de importación dinámica de comentarios; permanece una advertencia de deprecación de Node (`module.register`) proveniente del entorno de build. No se hizo comprobación visual manual en navegador.
