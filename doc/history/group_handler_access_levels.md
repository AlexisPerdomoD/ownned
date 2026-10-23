# Decoder de grupo: aceptación de los 4 niveles de access (2026-10-22)

- **Estado:** resuelto (commit `94bf94a`).
- **Referencias:** `internal/adapter/inbound/httpapi/group_handler.go:237`, issue original ISSUE-1.5 (eliminado; resumido aquí).

## Decisión técnica

El decoder de grupo ahora acepta los 4 niveles (`read_only_access|write_access|write_delete_access|owner_access`). Antes solo aceptaba 3, aunque el dominio soportaba 4.

## Justificación

Cerrar la inconsistencia backend que dejaba al selector frontend mostrando 3 niveles. El cliente aún muestra 3 hasta que ISSUE-2.4 (`grupos`) actualice el DTO y la UI para ofrecer `write_delete_access`.
EOF
echo done