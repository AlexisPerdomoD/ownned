# Identidad DocID/NodeID en descarga y borrado de documento (2026-10-22)

- **Estado:** implementado (commit `f7487b9`/`94bf94a`); verificación E2E pendiente (issue 36).
- **Referencias:** issue original ISSUE-1.9 (eliminado; resumido aquí), `internal/app/node/usecase/download_node_file.go`, `create_node_file_usecase.go`, `delete_node_file_usecase.go`.

## Decisión técnica

La storage key del archivo es `nodeID` (no `docID`). El handler de descarga ahora recibe `node.DownloadNodeFileInput{DocID, Offset, Limit}`, resuelve doc→`doc.NodeID`, checa acceso y descarga con esa key. El borrado usa `doc.NodeID` (antes `doc.ID` — huérfano). La creación limpia storage con `node.ID` si la BD falla (antes `doc.ID`).

## Justificación

Evitar huérfanos en storage y descargas fallidas por mezcla de identidades. El hallazgo original confirmó que `create_node_file_usecase.go` usaba `Key: nodeID`.

## Pendiente

- Smoke E2E de descarga por `docID` real + borrado sin huérfanos (issue 36).
EOF
echo done