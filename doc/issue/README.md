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

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 18 | [Hijos con metadata real y gating por hijo](18.web_closure_fase3.web.app.hijos_metadata.md) | pendiente | 1.10, 2.1 |
| 19 | [Paginación de nodos y documentos](19.web_closure_fase3.web.app.paginacion.md) | pendiente | 1.1, 3.1; D3 por defecto |
| 20 | [Ordenación y dotfiles](20.web_closure_fase3.web.app.orden_dotfiles.md) | pendiente | 3.1; D3/D6 por defecto |
| 21 | [Selector visual de nodos (grupos)](21.web_closure_fase3.web.app.selector_nodos.md) | pendiente | 2.4 |
| 22 | [Consolidar vista de explorador](22.web_closure_fase3.web.app.explorador_refactor.md) | pendiente | 2.1, 2.2, 3.1 |
| 23 | [Consolidar confirmaciones/modales](23.web_closure_fase3.web.app.dialogos.md) | pendiente | fases 2–3 estables |
| 38 | [Vista de carpeta estilo Google Drive](38.web_closure_fase3.web.app.vista_drive.md) | pendiente | 3.1, 3.5 |

### Fase 4 — Consistencia global

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 24 | [Tema persistente y movimiento reducido](24.web_closure_fase4.web.app.tema.md) | pendiente | D6 por defecto; coordinar con 3.5 |
| 25 | [Tokens semánticos (limpieza de clases)](25.web_closure_fase4.web.app.tokens.md) | pendiente | fase 3 |
| 26 | [Auditoría de accesibilidad](26.web_closure_fase4.web.app.accesibilidad.md) | pendiente | 3.5, 4.1 |

### Fase 5 — Capacidades avanzadas, verificación y cierre

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 27 | [Subida de carpetas (Propuesta A — cliente)](27.web_closure_fase5.web.app.upload_carpetas.md) | pendiente | D4 resuelta; fases 1–2 |
| 28 | [Descarga de carpeta (bloqueada por 501)](28.web_closure_fase5.web.app.download_carpeta.md) | pendiente | backend (501) |
| 29 | [Verificación automatizada (Vitest + checklist)](29.web_closure_fase5.web.app.verificacion.md) | pendiente | D7 resuelta; fases 1–4 |
| 30 | [Reporte final y actualización documental](30.web_closure_fase5.web.app.cierre_docs.md) | pendiente | todas las funcionales |

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