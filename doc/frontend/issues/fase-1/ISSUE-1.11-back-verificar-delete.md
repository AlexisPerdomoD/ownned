# [ISSUE-1.11] (backend) Verificar DELETE de nodos: esquema y cascada

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura (repo backend)
- **Estado:** revisión *(hallazgo vivo → fix aplicado, absorbido por commits del dev `d7fb02a`/`94bf94a`; suite `make test-local` verde tras healthchecks de infra; falta test dedicado del borrado recursivo — ver Cierre)*  
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno
- **Commit sugerido:** `fix(nodes): verify and fix recursive node delete schema` (solo si confirma el hallazgo)
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

**Reporte + fix si confirma.** El hallazgo de análisis indica que `internal/adapter/outbound/postgres/node_repository.go:53` usa `DELETE FROM nodes` sin prefijo de esquema. Verificar en entorno real si es error o si el esquema por defecto hace innecesario el prefijo; si es error, corregir y añadir test del borrado recursivo.

**No tocar:** lógica de negocio fuera de la capa repositorio. Ojo: el dev puede haber ya corregido este archivo en paralelo — si al leerlo el prefijo ya existe, solo verifica y cierra la issue como falso positivo resuelto.

## Archivos afectados

- `internal/adapter/outbound/postgres/node_repository.go`
- tests backend si aplica

## Criterios de aceptación

- [x] Hallazgo verificado (no falso positivo: el `DELETE` externo ya tenía `fs.` pero el subquery `(SELECT path FROM nodes …)` seguía sin prefijo; corregido a `fs.nodes`; trazado en el Registro de ejecución del tablero).
- [ ] Fix + test que cubra borrado recursivo real contra PostgreSQL de test (`make test-local`): **fix hecho; falta el test dedicado**.

## Cierre de la issue (sesión 2026-10-22)

- Fix aplicado (subquery con prefijo `fs.nodes`); tu commit lo absorbió (`git show d7fb02a -- internal/adapter/outbound/postgres/node_repository.go`).
- Verificado: `make test-local` con ciclo fresco completo → `Healthy` real, migración OK, todos los tests PASS (el bloqueador original era la race de arranque, corregida con healthchecks en `702197c`; no era el SQL).
- Pendiente para la próxima sesión (criterio 2): test de integración dedicado al borrado recursivo — sembrar un subárbol, borrar la carpeta padre y verificar que los descendientes desaparecen de `fs.nodes`. Sugerencia para ti: usar la infraestructura de tests DB que prefieras; el SQL a cubrir es `deleteNodeQuery` (`node_repository.go:53`).

## Prompt para agente ejecutor

> "Backend: revisa `internal/adapter/outbound/postgres/node_repository.go` alrededor de la línea 53: la consulta `DELETE FROM nodes` parece carecer del prefijo de esquema que usan otras consultas. Primero lee el archivo actual (el dev puede haberlo corregido en paralelo). Replica el flujo de borrado recursivo en entorno de test local (`make test-local`). Si el hallazgo es cierto y sigue vivo, corrige y añade test. Si es falso positivo o ya está corregido, cierra la issue sin cambios de código."
