# Propuesta: paletas y dirección visual para el cliente web (`web/app`)

> **Estado:** decisiones acordadas; implementación aplicada en el árbol de trabajo.  
> **Ámbito:** sistema visual del cliente SolidJS (`web/app/src/index.css`, tokens `@theme`, componentes `src/shared/ui/*`).  
> **Relacionado:** issues `24` (tema persistente + reduced motion) y `25` (tokens semánticos / limpieza de clases arbitrarias), `doc/frontend/product-plan.md` §C.  
> **Preview interactivo:** [`theme-palettes-preview.html`](./theme-palettes-preview.html) (abrir en navegador; toggle claro/oscuro + selector de paleta).

---

## 1. Objetivo

Dar al cliente un look **moderno, fluido y consistente** sin perder la arquitectura de tokens semánticos existente, con foco en **modo oscuro tipo “black”** y una experiencia visual más pulida (radios, sombras, motion, tipografía, iconografía). La propuesta conserva las opciones comparadas y registra las decisiones acordadas y su aplicación.

Principios guía (alineados con `product-plan.md`):

- Paleta neutra moderna; tokens centralizados en `@theme`; ningún componente duplica la paleta.
- Claro/oscuro con elección explícita y persistencia; respeto a `prefers-color-scheme` como fallback inicial.
- Contraste legible en ambos temas y estados hover/focus/disabled (verificar antes de fijar).
- Animación discreta, corta y consistente; `prefers-reduced-motion`.

---

## 2. Diagnóstico del estado actual

Tokens actuales (`web/app/src/index.css`):

- **Light:** fondo cálido `#f5f0e8`, superficie `#fdfbf7`, acento terracota `#c4714a`, texto `#2a2520`.
- **Dark:** fondo `#1c1916`, superficie `#2e2923`, acento `#d4845c`.
- Tipografía: `DM Sans` (UI) + `Lora` (serif, títulos) + `DM Mono`.
- Radios pequeños (`2/4/8/12px`), transición `150ms ease`, sin sombras ni blur definidos.
- Iconografía: emojis (`📁`, `👥`, `👤`) en `Navbar` y vistas.

**Fortalezas:** tokens semánticos bien nombrados, mecanismo `[data-theme='dark']`, reduced motion ya declarado.

**Brechas visuales frente a “moderno/fluido”:**

1. La paleta tierra es distintiva pero poco “tech/moderna”; el dark es marrón, no “black”.
2. Radios pequeños y ausencia de sombras/blur hacen la UI plana.
3. Emojis como iconos rompen consistencia y escalado.
4. Serif en títulos (`Lora`) da tono editorial; puede chocar con un look SaaS moderno.
5. Clases arbitrarias `bg-[--color-*]` (issue 25) en lugar de utilidades generadas (`bg-bg`, `bg-surface`).

---

## 3. Tokens semánticos (contrato a mantener)

Independientemente de la paleta elegida, se conserva el conjunto de tokens y su semántica. Toda opción de abajo se expresa en estos mismos nombres:

| Token                   | Rol                                         |
| ----------------------- | ------------------------------------------- |
| `--color-bg`            | Fondo de página                             |
| `--color-bg-2`          | Fondo secundario (sidebar, navbar)          |
| `--color-surface`       | Superficie elevada (cards, modales, inputs) |
| `--color-surface-hover` | Hover de superficie                         |
| `--color-border`        | Borde principal                             |
| `--color-border-subtle` | Borde sutil / divisores                     |
| `--color-border-danger` | Borde de error                              |
| `--color-muted`         | Texto secundario / placeholder              |
| `--color-ink`           | Texto base                                  |
| `--color-ink-dark`      | Texto de alto contraste / títulos           |
| `--color-accent`        | Acento principal (CTA, focus)               |
| `--color-accent-hover`  | Acento hover                                |
| `--color-accent-pale`   | Fondo tenue del acento                      |
| `--color-success`       | Éxito                                       |
| `--color-danger`        | Error / peligro                             |

Tokens de forma/motion a **añadir** (propuesta, ver §6):

- `--radius-*` (ampliar escala), `--shadow-sm/md/lg/glow`, `--blur-sm/md`, `--ease-base` (cubic-bezier), `--duration-fast/base/slow`.

---

## 4. Opciones de paleta

Seis direcciones. Cada una incluye light + dark, acento, personalidad, pros/contras y contraste estimado. Los hex están listos para copiar en `@theme` / override `[data-theme='dark']`.

### Opción A — “Obsidian” (true black + cyan/teal) ⭐ recomendada para dark “black”

Inspiración: Linear, Vercel, Raycast. Fondo casi negro puro, superficies elevadas por luminancia, acento cyan frío y de alto contraste.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#fafafa` | `#09090b` |
| `--color-bg-2`          | `#f4f4f5` | `#111113` |
| `--color-surface`       | `#ffffff` | `#18181b` |
| `--color-surface-hover` | `#f4f4f5` | `#1f1f23` |
| `--color-border`        | `#e4e4e7` | `#27272a` |
| `--color-border-subtle` | `#f4f4f5` | `#1f1f23` |
| `--color-muted`         | `#71717a` | `#71717a` |
| `--color-ink`           | `#52525b` | `#a1a1aa` |
| `--color-ink-dark`      | `#09090b` | `#fafafa` |
| `--color-accent`        | `#0891b2` | `#22d3ee` |
| `--color-accent-hover`  | `#0e7490` | `#67e8f9` |
| `--color-accent-pale`   | `#cffafe` | `#0c2a33` |
| `--color-success`       | `#16a34a` | `#22c55e` |
| `--color-danger`        | `#dc2626` | `#f87171` |
| `--color-border-danger` | `#dc2626` | `#f87171` |

- **Personalidad:** técnica, precisa, “dev tool”.
- **Pros:** máxima sensación de “black”; acento cyan muy legible sobre negro; excelente para datos/tablas.
- **Cons:** puede sentirse fría/corporativa; requiere cuidado con fatiga visual en uso prolongado (mitigar con superficies no puras).
- **Contraste:** texto principal dark `#fafafa` sobre `#09090b` ≈ 19:1 (AAA); muted `#71717a` sobre `#09090b` ≈ 4.6:1 (AA).

### Opción B — “Carbon” (gris neutro + azul)

Inspiración: GitHub Dark / VS Code. Gris neutro con acento azul confiable.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#ffffff` | `#0d1117` |
| `--color-bg-2`          | `#f6f8fa` | `#161b22` |
| `--color-surface`       | `#ffffff` | `#21262d` |
| `--color-surface-hover` | `#f6f8fa` | `#1c2128` |
| `--color-border`        | `#d0d7de` | `#30363d` |
| `--color-border-subtle` | `#eaeef2` | `#21262d` |
| `--color-muted`         | `#6e7781` | `#8b949e` |
| `--color-ink`           | `#24292f` | `#c9d1d9` |
| `--color-ink-dark`      | `#1f2328` | `#f0f6fc` |
| `--color-accent`        | `#0969da` | `#58a6ff` |
| `--color-accent-hover`  | `#0550ae` | `#79c0ff` |
| `--color-accent-pale`   | `#ddf4ff` | `#1f3a5f` |
| `--color-success`       | `#1a7f37` | `#3fb950` |
| `--color-danger`        | `#cf222e` | `#f85149` |
| `--color-border-danger` | `#cf222e` | `#f85149` |

- **Personalidad:** familiar, confiable, “herramienta de trabajo”.
- **Pros:** usuarios ya la reconocen; excelente legibilidad; acento azul neutro.
- **Cons:** menos distintiva; se parece a muchos productos.

### Opción C — “Graphite” (gris cálido + violeta)

Inspiración: shadcn/ui, Stripe dark. Gris con matiz cálido y acento violeta moderno.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#fafafa` | `#18181b` |
| `--color-bg-2`          | `#f4f4f5` | `#27272a` |
| `--color-surface`       | `#ffffff` | `#3f3f46` |
| `--color-surface-hover` | `#f4f4f5` | `#2f2f33` |
| `--color-border`        | `#e4e4e7` | `#52525b` |
| `--color-border-subtle` | `#f4f4f5` | `#3f3f46` |
| `--color-muted`         | `#71717a` | `#a1a1aa` |
| `--color-ink`           | `#52525b` | `#d4d4d8` |
| `--color-ink-dark`      | `#18181b` | `#fafafa` |
| `--color-accent`        | `#7c3aed` | `#a78bfa` |
| `--color-accent-hover`  | `#6d28d9` | `#c4b5fd` |
| `--color-accent-pale`   | `#ede9fe` | `#2e1f5e` |
| `--color-success`       | `#16a34a` | `#4ade80` |
| `--color-danger`        | `#dc2626` | `#f87171` |
| `--color-border-danger` | `#dc2626` | `#f87171` |

- **Personalidad:** moderna, “startup/SaaS”.
- **Pros:** violeta muy de moda; buena para CTAs; superficies más suaves que true black (menos fatiga).
- **Cons:** el dark no es “black” (gris medio); puede sentirse menos dramático.

### Opción D — “Slate” (azul-gris + sky)

Inspiración: Tailwind docs, Radix. Azul-gris fresco, acento sky.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#f8fafc` | `#020617` |
| `--color-bg-2`          | `#f1f5f9` | `#0f172a` |
| `--color-surface`       | `#ffffff` | `#1e293b` |
| `--color-surface-hover` | `#f1f5f9` | `#172033` |
| `--color-border`        | `#cbd5e1` | `#334155` |
| `--color-border-subtle` | `#e2e8f0` | `#1e293b` |
| `--color-muted`         | `#64748b` | `#94a3b8` |
| `--color-ink`           | `#334155` | `#cbd5e1` |
| `--color-ink-dark`      | `#0f172a` | `#f1f5f9` |
| `--color-accent`        | `#0284c7` | `#38bdf8` |
| `--color-accent-hover`  | `#0369a1` | `#7dd3fc` |
| `--color-accent-pale`   | `#e0f2fe` | `#0c2a45` |
| `--color-success`       | `#16a34a` | `#4ade80` |
| `--color-danger`        | `#dc2626` | `#f87171` |
| `--color-border-danger` | `#dc2626` | `#f87171` |

- **Personalidad:** fresca, técnica, “docs/developer”.
- **Pros:** muy legible; sensación de “black” en dark (`#020617`); acento sky luminoso.
- **Cons:** puede parecer genérica (Tailwind default); menos cálida.

### Opción E — “Warm Dark” (evolución del actual, sepia/terracota)

Inspiración: editorial, Notion warm. Conserva identidad actual pero con mejor contraste y superficies.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#f5f0e8` | `#1a1612` |
| `--color-bg-2`          | `#ede6d8` | `#241f19` |
| `--color-surface`       | `#fdfbf7` | `#2f2922` |
| `--color-surface-hover` | `#f5f0e8` | `#27221c` |
| `--color-border`        | `#d6cfc2` | `#3d352b` |
| `--color-border-subtle` | `#e8e2d9` | `#322c24` |
| `--color-muted`         | `#8c8478` | `#8a8074` |
| `--color-ink`           | `#4a453e` | `#c8bfb0` |
| `--color-ink-dark`      | `#2a2520` | `#ede6d8` |
| `--color-accent`        | `#c4714a` | `#d4845c` |
| `--color-accent-hover`  | `#b05e39` | `#e09070` |
| `--color-accent-pale`   | `#f0ddd4` | `#3a2e28` |
| `--color-success`       | `#4a9b5f` | `#5fb373` |
| `--color-danger`        | `#b05e39` | `#d07050` |
| `--color-border-danger` | `#b05e39` | `#d07050` |

- **Personalidad:** cálida, editorial, familiar (evolución, no ruptura).
- **Pros:** bajo riesgo; mantiene marca/identidad; menos fatiga visual cálida.
- **Cons:** no responde al pedido de “black”; menos “moderno SaaS”.

### Opción F — “Aurora” (dark + gradiente + acento magenta/violeta)

Inspiración: Arc, Cosmos. Fondo oscuro con tinte violeta y acento magenta; sensación de profundidad.

| Token                   | Light     | Dark      |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#fafaff` | `#0b0b12` |
| `--color-bg-2`          | `#f3f3ff` | `#14141f` |
| `--color-surface`       | `#ffffff` | `#1e1e2e` |
| `--color-surface-hover` | `#f3f3ff` | `#181825` |
| `--color-border`        | `#d4d4e8` | `#2e2e44` |
| `--color-border-subtle` | `#e8e8f5` | `#232336` |
| `--color-muted`         | `#6b6b8a` | `#8b8ba7` |
| `--color-ink`           | `#3a3a5c` | `#c4c4dd` |
| `--color-ink-dark`      | `#1a1a2e` | `#f0f0fa` |
| `--color-accent`        | `#7c3aed` | `#f472b6` |
| `--color-accent-hover`  | `#6d28d9` | `#f9a8d4` |
| `--color-accent-pale`   | `#ede9fe` | `#2a1f4a` |
| `--color-success`       | `#16a34a` | `#4ade80` |
| `--color-danger`        | `#dc2626` | `#fb7185` |
| `--color-border-danger` | `#dc2626` | `#fb7185` |

- **Personalidad:** expresiva, creativa, “premium”.
- **Pros:** muy distintiva; gradiente sutil aporta profundidad/fluidz.
- **Cons:** mayor riesgo de fatiga; acento magenta puede competir con estados de error; requiere disciplina.

---

## 5. Matriz de decisión (propuesta de puntuación)

Escala 1–5 por criterio. Puntuaciones sugeridas (ajustar con el equipo):

| Opción      | Modernidad | Sensación “black” | Legibilidad/contraste | Fatiga visual (↑ mejor) | Distintividad | Riesgo de implementación (↑ mejor) | Total |
| ----------- | ---------- | ----------------- | --------------------- | ----------------------- | ------------- | ---------------------------------- | ----- |
| A Obsidian  | 5          | 5                 | 4                     | 3                       | 4             | 5                                  | 26    |
| B Carbon    | 4          | 4                 | 5                     | 4                       | 2             | 5                                  | 24    |
| C Graphite  | 4          | 2                 | 4                     | 4                       | 4             | 5                                  | 23    |
| D Slate     | 4          | 5                 | 5                     | 4                       | 3             | 5                                  | 26    |
| E Warm Dark | 2          | 1                 | 4                     | 5                       | 3             | 5                                  | 20    |
| F Aurora    | 5          | 4                 | 3                     | 2                       | 5             | 3                                  | 22    |

**Lectura:** si priorizas “black + moderno” con bajo riesgo, **A (Obsidian)** o **D (Slate)**. Si priorizas confort en uso prolongado, **B (Carbon)** o **C (Graphite)**. **E** es la opción de continuidad. **F** es la más expresiva y la de mayor riesgo.

---

## 6. Look & feel “moderno y fluido” (además del color)

### 6.1 Forma (radios)

Propuesta de escala moderna (vs actual `2/4/8/12`):

| Token           | Actual   | Propuesta      |
| --------------- | -------- | -------------- |
| `--radius-xs`   | `2px`    | `4px`          |
| `--radius-sm`   | `4px`    | `6px`          |
| `--radius-md`   | `8px`    | `10px`         |
| `--radius-lg`   | `12px`   | `14px`         |
| `--radius-xl`   | —        | `20px` (nuevo) |
| `--radius-full` | `9999px` | `9999px`       |

Componentes de superficie (cards, modales) usarían `lg/xl`; controles (botones, inputs) `sm/md`.

### 6.2 Elevación y profundidad

Añadir tokens de sombra (hoy inexistentes):

- `--shadow-sm`: `0 1px 2px rgba(0,0,0,.06)` (light) / `0 1px 2px rgba(0,0,0,.4)` (dark).
- `--shadow-md`: `0 4px 12px rgba(0,0,0,.08)` / `0 4px 16px rgba(0,0,0,.5)`.
- `--shadow-lg`: `0 12px 32px rgba(0,0,0,.12)` / `0 12px 40px rgba(0,0,0,.6)`.
- `--shadow-glow`: halo del acento para focus/CTA primario (`0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)`).

Superficies dark: elevación por **luminancia** (surface > bg-2 > bg) + sombra sutil; evitar bordes gruesos.

### 6.3 Glass / blur (fluido)

- Navbar y modales: `backdrop-blur-md` + superficie con alpha (`color-mix(... 70%, transparent)`) sobre contenido scrolleable.
- Toasts: glass + sombra md.

### 6.4 Motion (fluido)

- `--ease-base`: `cubic-bezier(0.4, 0, 0.2, 1)` (actual `ease`).
- Duraciones: `--duration-fast` 100ms, `--duration-base` 200ms, `--duration-slow` 300ms.
- Transiciones: color, transform, opacity, shadow. Hover con `translate-y-[-1px]` sutil en cards/botones primarios.
- Entradas: fade + slide 8px en modales/toasts/listas (respetando reduced motion).
- Mantener el bloque `@media (prefers-reduced-motion: reduce)` existente.

### 6.5 Tipografía (decisión final)

- **Sans única:** `Inter Variable` para UI y títulos (pesos 300–700).
- **Mono:** `JetBrains Mono Variable` para código, paths y metadatos técnicos.
- **Eliminar:** `Lora`, `DM Sans`, `DM Mono` (todo venía de un mismo import de Google Fonts).
- **Self-hosted:** archivos `.woff2` en `web/app/public/fonts/` + `@font-face` en `index.css`; **sin dependencia de Google Fonts**.
- **Licencias:** SIL OFL 1.1 (Inter y JetBrains Mono) — incluir `OFL.txt` junto a las fuentes.

### 6.6 Iconografía

- Reemplazar emojis por iconos SVG consistentes (p. ej. `lucide` o heroicons) sized 16/20px, `stroke-width: 1.5`.
- Color via `currentColor` para heredar tokens.
- Añadir dependencia `lucide-solid` (o inline SVG) — decisión de implementación.

### 6.7 Densidad y layout

- Sidebar: ancho 224px (actual 208), items con padding vertical 8px, gap 4px.
- Tablas: filas 40px, hover sutil.
- Formularios: labels uppercase tracking-wide (ya existente), inputs 36px de alto.

### 6.8 Transiciones de vistas y modales

- **Cambio de vista:** al montar una ruta, animar el contenido con `opacity` + desplazamiento vertical de 6–8px durante 180–220ms. Aplicarlo al contenedor principal para cubrir navegaciones internas sin interceptar enlaces ni modificar el contrato del router.
- **Modal al abrir:** backdrop con fade-in y panel con fade + escala `0.98 → 1` / desplazamiento `6px → 0` durante ~180ms.
- **Modal al cerrar:** conservarlo montado solo durante la salida visual; al terminar la transición, desmontarlo y restaurar foco/scroll. Mientras sale, hacerlo no interactivo y ocultarlo a tecnologías de asistencia.
- Usar `prefers-reduced-motion` para desactivar también estas animaciones. No animar propiedades costosas como `width`/`height`.
- **Native View Transitions API:** no será requisito del primer corte; requiere integrar cada navegación del router de forma fiable. La animación CSS de entrada da un fallback consistente en navegadores compatibles y no compatibles.

---

## 7. Estrategia de implementación

1. **Fuentes self-hosted:** descargar `inter-variable.woff2` y `jetbrains-mono-variable.woff2` + sus `OFL.txt` a `web/app/public/fonts/`; declarar `@font-face` en `index.css`; quitar el import de Google Fonts.
2. **Tokens:** actualizar `@theme` (light) y `[data-theme='dark']` con la paleta Obsidian; añadir tokens de sombra/glow/blur/radios/duración; mantener overrides `data-palette` para A–F.
3. **Preview en dev (reversible, si no complica):** selector de paleta en `Navbar` (behind flag o solo dev) para comparar en vivo; default Obsidian.
4. **Persistencia:** extender `Navbar` (issue 24) para guardar `owned.theme` y `owned.palette`; inicialización sin FOUC mediante script inline en `index.html` antes del bundle.
5. **Migración de clases (issue 25):** reemplazar `bg-[--color-*]`/`text-[--color-*]` por utilidades generadas (`bg-bg`, `text-ink-dark`, etc.).
6. **Motion global:** transiciones consistentes + entradas sutiles; respetar `prefers-reduced-motion`.
7. **Vistas y modales:** aplicar la entrada de vista y transiciones de apertura/cierre en `Modal`, incluyendo cierre accesible y fallback reduced-motion.
8. **Iconos:** migrar emojis → SVG (`lucide-solid`) en `Navbar`, `EmptyState`, vistas.
9. **Verificación:** contraste (axe/pa11y o Lighthouse), build (`pnpm build`), smoke manual en claro/oscuro para cada vista, navegación y ciclo de abrir/cerrar modal; checklist de issues 24/26.

### 7.1 Cambio mínimo de CSS (ejemplo de override)

```css
/* Ejemplo: paleta Obsidian activable con data-palette="obsidian" */
[data-palette="obsidian"] {
  --color-bg: #09090b;
  --color-bg-2: #111113;
  --color-surface: #18181b;
  /* ... resto de tokens dark ... */
}
```

Esto permite comparar opciones sin tocar `@theme` base.

---

## 8. Decisiones finales (acordadas)

| #   | Pregunta                                   | Decisión                                                                                                                                                                                                                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Dark por defecto vs `prefers-color-scheme` | Respetar `prefers-color-scheme` como fallback inicial; persistir la elección explícita del usuario (`owned.theme`).                                                                                                                              |
| 2   | Paleta principal                           | **A · Obsidian** como default (true black `#09090b` + acento cyan `#22d3ee`). **Todas las paletas (A–F) quedan disponibles** vía `data-palette` para comparación/cambio; no se eliminan.                                                         |
| 3   | Serif `Lora` / fuentes                     | **Eliminar `Lora`, `DM Sans` y `DM Mono`.** Usar **Inter Variable** (UI + títulos) + **JetBrains Mono Variable** (código/paths). **Self-hosted en `public/fonts/`**, sin dependencia de Google Fonts. Licencias SIL OFL 1.1 (incluir `OFL.txt`). |
| 4   | Radios                                     | **Escala moderna `4/6/10/14/20`** (xs/sm/md/lg/xl).                                                                                                                                                                                              |
| 5   | Iconos                                     | **SVG** (`lucide-solid`), estilo serio/moderno; reemplazar emojis.                                                                                                                                                                               |
| 6   | Preview `data-palette`                     | **Sí si no agrega complejidad excesiva**; si complica, aplicar directo con overrides CSS mínimos. El preview HTML ya existe (`theme-palettes-preview.html`).                                                                                     |
| 7   | Sombras/blur (glass)                       | **Sí, moderado**: sombras sm/md + glow en focus; glass solo navbar/modales/toasts.                                                                                                                                                               |

---

## 9. Recomendación final (decisiones acordadas)

- **Paleta:** **A “Obsidian”** como default (`#09090b` + acento cyan `#22d3ee`); **todas las paletas A–F permanecen disponibles** vía `data-palette` (selector opcional en Navbar/settings).
- **Tipografía:** **Inter Variable (única sans)** para UI y títulos + **JetBrains Mono Variable** para código/paths. **Self-hosted**, sin Google Fonts. Se eliminan `Lora`, `DM Sans` y `DM Mono`.
- **Forma:** radios `4/6/10/14/20`, sombras sm/md + glow en focus.
- **Motion:** `cubic-bezier(0.4,0,0.2,1)` + 100/200/300ms; entradas sutiles; respetar `prefers-reduced-motion`.
- **Transiciones:** fade/slide al cambiar de vista; fade + scale al abrir/cerrar modales; Native View Transitions queda opcional para una iteración posterior.
- **Iconos:** SVG (`lucide-solid`), reemplazo de emojis.
- **Glass:** navbar, modales y toasts con `backdrop-blur` moderado.
- **Implementación:** overrides `data-palette` en CSS (bajo costo) + migración de clases arbitrarias (issue 25) + tema persistente sin FOUC (issue 24).

La implementación se puede comparar con `theme-palettes-preview.html`; verificar visualmente las seis paletas y el flujo de animación en el cliente antes de cerrar el trabajo.

---

## 10. Archivos de implementación

### 10.1 Fuentes (self-hosted, sin Google Fonts)

- Añadir: `web/app/public/fonts/inter-variable.woff2`
- Añadir: `web/app/public/fonts/jetbrains-mono-variable.woff2`
- Añadir: `web/app/public/fonts/OFL.txt` (Inter)
- Añadir: `web/app/public/fonts/OFL-JetBrainsMono.txt`
- Editar: `web/app/src/index.css` — quitar `@import url('https://fonts.googleapis.com/...')`; añadir `@font-face`; actualizar `--font-sans` / `--font-mono`; eliminar `--font-serif`.
- Editar (opcional): `web/app/index.html` — preload de Inter + script anti-FOUC.

### 10.2 Tokens y tema

- Editar: `web/app/src/index.css` — `@theme` (light) + `[data-theme='dark']` con paleta Obsidian; overrides `data-palette` para A–F; nuevos tokens (`--shadow-*`, `--blur-*`, `--duration-*`, `--ease-base`, radios).

### 10.3 Persistencia de tema/paleta (issue 24)

- Editar: `web/app/src/shared/ui/Navbar.jsx` — persistencia `owned.theme`/`owned.palette`, toggle, selector de paleta (behind flag), iconos SVG.

### 10.4 Migración de clases arbitrarias (issue 25)

- Editar: `web/app/src/shared/ui/Atoms.jsx`, `Button.jsx`, `Card.jsx`, `Input.jsx`, `Form.jsx`, `Modal.jsx`, `Table.jsx`, `Layout.jsx`, `Navigation.jsx`.
- Editar: `web/app/src/features/**/ui/*.jsx` (NodeList, UploadDropzone, CommentsList, GroupForm, etc.).

### 10.5 Tipografía (quitar serif)

- Editar: `web/app/src/shared/ui/Layout.jsx` (brand + `PageHeader`), `web/app/src/shared/ui/Atoms.jsx` (`EmptyState`) y vistas que usen `font-[--font-serif]`.

### 10.6 Motion e iconos

- Editar: `web/app/src/index.jsx` para aplicar la clase de entrada al contenido protegido de cada ruta.
- Editar: `web/app/src/shared/ui/Modal.jsx` para transiciones de entrada/salida, salida no interactiva y restauración de foco/scroll.
- Editar: `web/app/src/index.css` para keyframes/transitions y reduced motion.
- Editar: `web/app/src/shared/ui/Navbar.jsx` y vistas para iconos SVG consistentes.
- Editar: `web/app/package.json` — añadir `lucide-solid` (si se decide SVG con dependencia; alternativa: SVG inline sin dependencia).

### 10.7 Verificación

- `pnpm build`, smoke manual claro/oscuro, contraste (axe/pa11y), navegación entre vistas y cierre animado de modales, checklist issues 24/26.
