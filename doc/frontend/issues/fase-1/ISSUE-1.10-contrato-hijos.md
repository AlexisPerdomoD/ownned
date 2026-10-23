# [ISSUE-1.10] (docs/verificación) Consolidar el contrato de hijos tras el ajuste backend 2026-10-22

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Módulo específico (documentación + verificación backend)
- **Estado:** revisión *(matriz contract-coverage.md actualizada con la forma real: hijos con doc best-effort/access/display_path, raíces NodeDisplay sin doc; go build/test/vet OK)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (desbloquea 3.1)
- **Commit sugerido:** `doc(frontend): record children contract after node metadata fix`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

El ajuste ya aplicado en `internal/app/node/get_node_usecase.go` (doc por hijo best-effort; `display_path` por hijo; `get_root_nodes` como `NodeDisplay` sin metadata extra) ya cuenta con serialización vigente en `internal/adapter/inbound/httpapi/view.go` (`doc,omitempty`, `display_path`, `access_level` → `DocView`). Solo queda documentar la forma real y verificar que no haya regresión.

**No tocar** usecases ni domain salvo que la verificación exponga regresión (entonces reportar y detenerse).

## Archivos afectados

- `doc/frontend/contract-coverage.md` (filas de `GET /nodes` y `GET /nodes/{id}`)
- tests backend solo si la verificación pide ajustes

## Criterios de aceptación

- [ ] `contract-coverage.md` refleja la forma real de hijos: `doc` opcional y best-effort (vacío ante fallo de lectura), `display_path` y `access_level` por hijo, hijos anidados limitados a un nivel.
- [ ] Documentado explícitamente que raíces (`NodeDisplay`) no traen `doc`.
- [ ] `go test ./...` pasa.

## Prompt para agente ejecutor

> "Verifica el comportamiento actual de `GET /nodes/{id}` tras el ajuste de `get_node_usecase.go`: hijos con `doc` best-effort (puede venir vacío), `display_path` y `access_level` por hijo, children solo de primer nivel, y raíces consumibles como `NodeDisplay` sin doc. Ejecuta `go test ./...`. Actualiza las filas de nodos en `doc/frontend/contract-coverage.md` (incluida la semántica de `doc` vacío). Si ves regresión, repórtala y detente."
