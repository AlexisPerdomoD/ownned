# Verificación Fase 1 — Cliente web (2026-10-23)

- **Estado:** 7 de 7 criterios de verificación cerrados (`hecho`: 31, 32, 33, 34, 35, 36, 37).
- **Referencias:** `../proposal/plan-cierre-cliente-web.md`, `../issue/README.md`.

## Verificaciones cerradas

- **31 transporte:** cero `fetch()` HTTP fuera de `shared/api/client.js` (solo funciones locales de paginación); upload por `docID` → download 200 con contenido; delete → 404; logout limpia cookie; errores `422` con `detail`.
- **32 sesión:** `401` → anónimo (`apiGetMe` retorna `null`); otros errores → estado `error` con reintento (`ProtectedRoute`/`ErrView`); sin spinner perpetuo.
- **33 comentarios:** creación, listado (límite 255) y borrado verificados tras dos fixes backend:
  - `node_comment_repository.go` `Create` ahora persiste `id` (era null).
  - `deleteNodeCommentQuery` corregido a `fs.node_comments`.
- **34 password:** rechazo `400` con motivo claro (sin dígito/símbolo); contraseña válida crea usuario (201).
- **35 login Vite:** preflight CORS 200 y login 201 con `Access-Control-Allow-Origin: http://localhost:5173` y cookie `SameSite=Lax` en `MODE=local`; Vite dev server arranca en `:5173`.
- **36 documentos:** download por `docID` retorna contenido correcto; delete → 200; re-download → 404; sin huérfanos en storage.
- **37 borrado recursivo:** test de integración `TestNodeRepository_DeleteRecursive` (subárbol padre/hijo/nieto) en transacción con rollback; `make test-local` verde.

## Hallazgos backend (reportados y resueltos)

- `node_comment_repository.go:95-115` (`Create`): `insertNodeCommentQuery` omitía `id`. Resuelto por el dev.
- `node_comment_repository.go:39` (`deleteNodeCommentQuery`): faltaba prefijo de esquema `fs.`. Resuelto por el dev.

## Pendiente

- Ninguno. Fase 1 verificación completa.

## Lineamientos aplicados

- Tests de BD: un archivo por repositorio, helper central `newTestDB`/`newTestTx`, transacción con rollback, fixtures vía repositorio. Documentado en `AGENTS.md`.