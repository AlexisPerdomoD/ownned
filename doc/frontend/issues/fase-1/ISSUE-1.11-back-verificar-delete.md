# [ISSUE-1.11] (backend) Verificar DELETE de nodos: esquema y cascada

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura (repo backend)
- **Estado:** revisión *(fix aplicado y absorbido en el commit `d7fb02a` del dev; `make test-local` con ciclo fresco completo: migración OK y tests PASS tras healthcheck de la infra)*  
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

- [ ] Hallazgo verificado (si es falso positivo y/o ya corregido, documentar por qué en el reporte de la issue).
- [ ] Si es error: fix + test que cubra borrado recursivo real contra PostgreSQL de test (`make test-local`).

## Prompt para agente ejecutor

> "Backend: revisa `internal/adapter/outbound/postgres/node_repository.go` alrededor de la línea 53: la consulta `DELETE FROM nodes` parece carecer del prefijo de esquema que usan otras consultas. Primero lee el archivo actual (el dev puede haberlo corregido en paralelo). Replica el flujo de borrado recursivo en entorno de test local (`make test-local`). Si el hallazgo es cierto y sigue vivo, corrige y añade test. Si es falso positivo o ya está corregido, cierra la issue sin cambios de código."
