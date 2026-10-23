# [ISSUE-1.9] (backend) Resolver identidad DocID/NodeID en descarga y borrado de documento

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura (repo backend)
- **Estado:** revisión *(implementado: usecase descarga por docID→nodeID; delete/create ahora usan nodeID como key de storage; build+vet+test pasan; smoke E2E pendiente)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (backend; desbloquea el cierre E2E de 2.5)
- **Commit sugerido:** `fix(nodes): resolve document identity for download and delete`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Hacer que `GET /nodes/{nodeID}/doc/{docID}/download` y el borrado individual usen una identidad coherente: el cliente recibe `docID` pero el backend necesita el `NodeID` + storage key. Elegir y aplicar estrategia (resolver doc→node o devolver nodeID en la vista).

**No tocar:** rutas públicas ni semántica de permisos.

## Archivos afectados

- `internal/app/node/usecase/download_node_file.go`
- `internal/app/node/usecase/delete_node_file.go`
- `internal/app/node/usecase/create_node_file.go` (storage key devuelta)
- `internal/adapter/inbound/httpapi/node_handler.go`
- `internal/adapter/inbound/httpapi/view.go` (si la solución expone `nodeID` en la vista)

## Criterios de aceptación

- [ ] Descarga con `docID` devuelto por la API funciona para archivos reales.
- [ ] Borrado individual no deja archivo huérfano en storage ni rompe versión vigente.
- [ ] Tests backend (`go test ./...`) pasan.

## Prompt para agente ejecutor

> "Backend: audita y corrige la cadena de identidad entre `docs`, `nodes` y storage keys para que descarga y borrado individual de documentos sean confiables usando los IDs que el cliente recibe. Sin cambiar el contrato público ni los permisos. Añade ajustes mínimos a tests backend si aplica (`go test ./...`)."
