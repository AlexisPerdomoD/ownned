# Cierre parcial Fase 2 (grupos y documentos) — 2026-10-23

- **Estado:** issues 15 y 16 cerrados (`hecho`). Issue 17 permanece en `revisión`.
- **Referencias:** `../proposal/plan-cierre-cliente-web.md`.

## Verificaciones

- **15 grupos:** CRUD verificado vía API (create 201, PATCH 200 con nombre/descripción, delete 200 tras fix de `GetGroupAccess` query duplicada). Membresías y nodos usan endpoints registrados; 403 respetado por backend.
- **16 docs:** subida por `docID` (201), download 200 con contenido, delete 200 + 404 posterior; transporte unificado (`client.js`); errores 422 con `detail`.

## Hallazgo backend resuelto

- `group_usr_repository.go` `GetGroupAccess`: query duplicaba `WHERE`, causando `syntax error at or near WHERE` en operaciones de grupo. Corregido (query única).