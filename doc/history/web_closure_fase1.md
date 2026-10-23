# Cierre parcial Fase 1 — Cliente web (2026-10-22)

- **Estado:** implementado; 5 issues `hecho`, 6 `revisión` con verificación manual pendiente (issues 31–37).
- **Referencias:** `../proposal/plan-cierre-cliente-web.md`, issues originales ISSUE-1.1…1.11 (eliminados tras este resumen).

## Alcance implementado

Transporte API unificado (01), sesión determinística con rol en contexto (02), helper compartido de autorización (03), contrato de comentarios alineado (04), update de grupo vía PATCH (05), DTO y validación de creación de usuario (06), retiro de affordances sin contrato (07), config local CORS/cookies (08), identidad DocID/NodeID en descarga/borrado (09), consolidación del contrato de hijos (10), verificación del DELETE de nodos (11).

## Decisiones técnicas y justificación

- **D1 (resuelta):** `limited_usr_role` no comenta en frontend; el helper `shared/authz` ya lo aplica aunque el backend todavía lo permita (fix backend posterior, fuera de alcance).
- **D2 (resuelta):** `GET /nodes/{id}` embebe metadata por hijo (`doc` best-effort, `display_path`, `access_level`); raíces llegan como `NodeDisplay` sin `doc`.
- Transporte único: `fetch` residual cero fuera de `client.js`; añadidos `reqForm`/`reqBlob` y errores `413/415/422` con `detail`.
- Sesión: estados terminales `checked/checking/error`; `401` → anónimo, resto → error con reintento.
- Identidad de documentos: la storage key es `nodeID`; download/delete/create usan `nodeID` (fix de huérfanos en storage).
- DELETE de nodos: subquery corregido a `fs.nodes` (prefijo de esquema).
- Config local: `.env.example` con `MODE=local` y explicación de modos; README actualizado.

## Pendiente (verificación manual)

Issues 31–37 cubren los smokes E2E/listados en el handoff de Fase 1. Ninguno bloquea el arranque de Fase 2.
EOF
echo done