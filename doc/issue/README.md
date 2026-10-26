# Tablero de orquestación — Cierre del cliente web

> **Este directorio es el tracker de issues del cierre del cliente web.** Las issues y sus
> planes de implementación viven aquí como archivos del repositorio y se orquestan localmente.
> **No se gestiona en GitHub.**

## Estructura

- [`../proposal/plan-cierre-cliente-web.md`](../proposal/plan-cierre-cliente-web.md) — **plan maestro y fuente estratégica:** diagnóstico, decisiones (D1–D7), justificación de fases, dependencias, checklist de cierre y secuencia de commits. Es la única fuente para cambios de alcance o estrategia.
- Archivos `NN.<epic>.<scope>.<desc>.md` — **unidades de ejecución:** una issue por archivo, autocontenida (objetivo, requerimientos, archivos, criterios, prompt para agente ejecutor). Son los artefactos que se asignan a un agente.

## Reglas de scope (ver `AGENTS.md` del repo)

1. Cada agente ejecuta **solo la issue asignada**; su alcance es el "Objetivo / alcance" + "Archivos afectados" de su archivo de issue. Si algo no queda claro o la acción cae fuera del alcance, **solicitar aclaración antes de hacer cualquier cosa**.
2. Cambios en curso de otros agentes o del dev en el árbol de trabajo **no se tocan ni se reportan**, salvo que tengan impacto en la issue asignada.
3. Hallazgo fuera de alcance durante la ejecución → reportar ubicación e impacto y **detenerse**; no se corrige "por amor al arte".
4. Las issues cerradas (o casi cerradas) se eliminan tras escribir su resumen en `doc/history/`. Si queda pendiente un test/revisión para cerrarla, se crea una issue dedicada (31–37).

## Estados

`pendiente` → `en-progreso` → `revisión` → `hecho`

## Protocolo de ejecución (agente ejecutor)

1. Lee el archivo de tu issue (`doc/issue/NN.*.md`). Es tu contrato completo.
2. Verifica que sus dependencias estén en estado `hecho`. Si no, no inicia; repórtalo.
3. Ejecuta estrictamente dentro del alcance. Los criterios de aceptación son tu definición de "hecho".
4. Al terminar: marca los criterios `[x]`, cambia `Estado:` a `revisión` (o `hecho` si ya verificó) y reporta la verificación realizada (build, `go test ./...`, pruebas manuales según aplique).
5. Un issue = un commit (mensajes sugeridos en §C del plan maestro; Conventional Commits).

## Tablero

### Fase 1 — Ajustes globales de contrato e infraestructura (cerrada; verificación pendiente en 31–37)

Fase 1 implementada y verificada (7 de 7 criterios `hecho`). Resumen en [`../history/web_closure_fase1.md`](../history/web_closure_fase1.md) y [`../history/web_closure_fase1_verification.md`](../history/web_closure_fase1_verification.md).

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |

### Fase 2 — Flujos críticos rotos (cerrada)

Todos los issues 12–17 en `hecho`. Resumen en `../history/web_closure_fase2_partial.md` y `../history/web_closure_fase2_groups_docs.md` / `web_closure_fase2_carpeta_ops.md`.

### Fase 3 — Explorador, paginación y compartición usable

Issues 18–23 y 38 cerradas; resúmenes técnicos en `../history/web_closure_fase3_children_metadata.md`, `web_closure_fase3_pagination.md`, `web_closure_fase3_sorting_dotfiles.md`, `web_closure_fase3_node_picker.md`, `web_closure_fase3_explorer_refactor.md`, `web_closure_fase3_dialogs.md` y `web_closure_fase3_drive_view.md`. D3 está resuelta para el orden local de hijos. Los issues restantes de fases 3–5 están en revisión activa.

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |

### Fase 4 — Consistencia global

Issues 24–26 cerradas; resúmenes técnicos en [`../history/web_closure_fase4_theme.md`](../history/web_closure_fase4_theme.md), [`../history/web_closure_fase4_tokens.md`](../history/web_closure_fase4_tokens.md) y [`../history/web_closure_fase4_accessibility.md`](../history/web_closure_fase4_accessibility.md). D6 queda resuelta para preferencias locales.

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |

### Fase 5 — Capacidades avanzadas, verificación y cierre

Issue 27 cerrada; resumen técnico en [`../history/web_closure_fase5_folder_upload.md`](../history/web_closure_fase5_folder_upload.md). La Propuesta A queda implementada; la carga es parcial y no atómica.
Issue 28 cerrada; resumen técnico en [`../history/web_closure_fase5_folder_download.md`](../history/web_closure_fase5_folder_download.md). Decisión: botón de descarga de carpeta visible que notifica el error `501`.

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 29 | [Verificación automatizada (Vitest + checklist)](29.web_closure_fase5.web.app.verificacion.md) | revisión | D7 resuelta; fases 1–4 |
| 30 | [Reporte final y actualización documental](30.web_closure_fase5.web.app.cierre_docs.md) | revisión | todas las funcionales |

## Épica: restructuración de `cmd/` (server + CLI unificado) — cerrada

Implementación completada. Resumen técnico en [`../history/cmd_restructure.md`](../history/cmd_restructure.md).
Propuesta: [`../proposal/cmd-restructure.md`](../proposal/cmd-restructure.md).

## Registro de ejecución Fase 1 (2026-10-22)

Ver [`../history/web_closure_fase1.md`](../history/web_closure_fase1.md). Resúmenes backend/infra en `../history/`:
- `node_file_identity_doc_to_node.md`
- `postgres_test_healthcheck.md`
- `group_handler_access_levels.md`

## Hallazgos backend fuera del alcance (solo reporte)

Ver plan maestro §A.11 y entradas de `doc/history/`. Issues backend dedicadas se crean cuando el dev autorice (ej. test de borrado recursivo = issue 37).

## Handoff a la próxima sesión (Fase 2)

Fase 1 **cerrada salvo 7 criterios de verificación** (issues 31–37) — ninguno bloquea el arranque de Fase 2. Coordenadas en `../proposal/plan-cierre-cliente-web.md` (handoff Fase 2).
