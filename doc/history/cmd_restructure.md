# cmd_restructure — Resumen técnico

Reestructuración de `cmd/` para consolidar las operaciones en un único CLI (`owned-cli`)
con subcomandos, manteniendo el servidor HTTP como binario aparte (`server`).

## Decisiones

- Dos binarios: `cmd/server` y `cmd/cli`. Cobra como framework CLI.
- Sin bootstrap compartido: cada comando inicializa su propia infraestructura (DB, migraciones,
  hasher) duplicando el código existente, para evitar sobreingeniería.
- Migraciones disponibles también desde el CLI (`migrate up/down/status`) reutilizando las
  migraciones embebidas y nuevos helpers en `postgres` (`MigrateDown`, `MigrateVersion`).
- Grupos `seed` y `admin` como esqueletos de extensión.
- Makefile actualizado con `build-cli` y `build-all`; `superusr`/`approot` delegan al CLI.

## Archivos principales

- `cmd/cli/main.go`, `superusr.go`, `approot.go`, `migrate.go`, `seed.go`, `admin.go`
- `internal/adapter/outbound/postgres/postgres.go` (helpers de migración)
- `Makefile`, `README.md`

## Verificación

- `go build ./...` y `go test ./...` pasan.
- `make build-all` genera `bin/server` y `bin/owned-cli`.