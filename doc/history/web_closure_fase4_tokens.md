# Cierre 4.2 — Tokens semánticos y contraste

- **Estado:** issue 25 cerrada (`hecho`).
- **Referencias:** `web/app/src/index.css`, utilidades Tailwind semánticas.

Se reemplazaron clases arbitrarias construidas con variables CSS por utilidades semánticas para tipografía, tamaños, bordes, radios, acentos y transiciones. Se separaron duración/easing y se normalizaron colores de texto, estados y foregrounds de superficies en ambos temas para conservar legibilidad.

`themeContrast.test.js` lee los tokens reales de CSS y comprueba texto sobre superficies, badges/estados y texto sobre fondos de acciones con una relación mínima de 4.5:1. La revisión manual de combinaciones hover/focus/disabled permanece en la auditoría de accesibilidad (issue 26).

Verificación: no quedan clases arbitrarias con variables CSS en `web/app/src`; `pnpm exec vitest run` (28 tests), build y ESLint de los archivos de la issue pasan sin errores ni warnings.
