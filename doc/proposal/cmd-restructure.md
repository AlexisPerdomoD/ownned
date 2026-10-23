# Propuesta: reestructuración de `cmd/` en `server` + `cli` unificado

## Contexto

Hoy existen tres binarios independientes:

- `cmd/server` — servidor HTTP (migra al arrancar, sirve la app web).
- `cmd/superusr` — crea el primer usuario privilegiado.
- `cmd/approot` — inicializa las carpetas raíz (`/usr`, `/shared`).

Cada comando operativo duplica el arranque de infraestructura (conexión a PostgreSQL,
migraciones, hasher Argon2) y añade un artefacto separado por desplegar en la VPS.
A medida que aparezcan seeds y herramientas de administración, el número de binarios
y de duplicación crecerá. Además, `cmd/approot` ignora su flag documentado
`-usrname` (ver "Hallazgos fuera de alcance").

## Objetivo

Consolidar las operaciones de administración en un único binario CLI (`cli`) con
subcomandos, manteniendo el servidor HTTP como binario aparte (`server`), de modo
que el despliegue en la VPS requiera solo dos artefactos (`server` y `cli`) y la
adición de futuras herramientas (seeds, admin) sea incremental y sin nuevos
binarios.

## Decisiones (acordadas)

- **D1 — Dos binarios, no uno.** `cmd/server` (HTTP) y `cmd/cli` (operaciones).
  El servidor no gana subcomandos; el CLI no sirve HTTP.
- **D2 — Framework CLI: Cobra.** Subcomandos, ayuda, flags globales y completion.
  Nueva dependencia: `github.com/spf13/cobra`.
- **D3 — Migraciones disponibles también desde el CLI**, reutilizando las
  migraciones embebidas (`postgres.MigrateUp` y helpers nuevos `MigrateDown`/
  `MigrateVersion`). El servidor sigue migrando al arrancar (comportamiento actual).
- **D4 — Seeds e init son manuales vía CLI**, nunca automáticos al arrancar el
  servidor.
- **D5 — Sin bootstrap compartido.** Cada comando inicializa su propia
  infraestructura (conexión a PostgreSQL, migraciones, hasher Argon2) duplicando
  el código existente. Se acepta la duplicación para evitar sobreingeniería; si
  en el futuro se justifica, mover a `config`/helper, no ahora.
- **D6 — Extensibilidad por registro.** `seed` y `admin` son grupos de
  subcomandos con puntos de extensión documentados; los comandos concretos se
  añaden en issues futuras sin tocar la estructura.
- **D7 — Compatibilidad de Make targets.** `make superusr` y `make approot`
  siguen funcionando delegando al nuevo CLI.

## Árbol de archivos propuesto

```
cmd/
  server/
    main.go                 # sin cambios funcionales
  cli/
    main.go                 # entrypoint Cobra (root command)
    superusr.go             # subcomando: crear super usuario
    approot.go              # subcomando: inicializar carpetas raíz
    migrate.go              # subcomandos: up / down / status
    seed.go                 # grupo: list / run (extensible)
    admin.go                # grupo: users / groups / ... (extensible)
internal/
  app/
    seed/                   # (futuro) interfaz Seeder + registry
      seed.go
```

Los directorios `cmd/superusr` y `cmd/approot` se eliminan una vez verificada la
paridad.

## Diseño del CLI (Cobra)

Comando raíz sugerido: `owned-cli` (binario `bin/owned-cli`).

```
owned-cli
├── superusr   --usrname <email> --pwd <password>
├── approot    (sin flags obligatorios hoy; ver hallazgo)
├── migrate
│   ├── up
│   ├── down   [--steps N]
│   └── status
├── seed
│   ├── list
│   └── run     [--name <seed> | --all]
└── admin
    └── (placeholder; subcomandos se añaden en issues futuras)
```

Convenciones:

- Flags globales: `--env-file` (opcional, default `.env` no se carga
  automáticamente por Go; se documenta que Make incluye `.env`), `--log-level`.
- Cada subcomando que toca DB inicializa su propia infraestructura (conexión,
  migraciones, hasher) duplicando el código existente, como hoy.
- Los subcomandos devuelven `error`; `main.go` imprime y sale con código 1.
- Validación de DTOs con `go-playground/validator` como hoy.

## Bootstrap compartido (no se crea)

Se descarta `internal/bootstrap` deliberadamente para evitar sobreingeniería. Cada
comando (`server`, `superusr`, `approot`, etc.) repite la inicialización de DB,
migraciones y hasher como hoy. La duplicación se acepta; si en el futuro se
justifica, se moverá a `config` o a un helper, no ahora.

## Migraciones desde el CLI

Hoy `postgres.MigrateUp(db *sql.DB)` solo aplica `Up`. Para soportar `down` y
`status` desde el CLI se requiere ampliar `internal/adapter/outbound/postgres` con:

- `MigrateDown(db *sql.DB, steps int) error`
- `MigrateVersion(db *sql.DB) (uint, bool, error)` (versión actual y dirty flag)

Estas funciones usan el mismo `embed.FS` de migraciones y el driver de
`golang-migrate`, por lo que no se duplica la fuente de migraciones. El servidor
sigue usando únicamente `MigrateUp`.

## Seeds (extensibilidad futura)

Propuesta de contrato (a implementar cuando exista el primer seed real):

```go
// internal/app/seed
type Deps struct {
    DB *sqlx.DB
    // repositorios/use cases necesarios
}

type Seeder interface {
    Name() string
    Description() string
    Run(ctx context.Context, deps Deps) error
}

type Registry struct { /* map[name]Seeder */ }
```

- El CLI `seed list` lista los registrados; `seed run --name X` o `--all`
  ejecuta.
- Idempotencia: tabla `schema_seeds (name, applied_at)` creada por una migración
  futura; `run` omite seeds ya aplicados salvo `--force`.
- Los seeds se registran en `cmd/cli/seed.go` (wiring), no en `internal/app`,
  para mantener el dominio libre de detalles de CLI.

Por ahora solo se deja el grupo `seed` con `list` imprimiendo "no seeds
registered" y `run` documentado como extensión. No se crea tabla ni seed real en
esta propuesta.

## Herramientas de administración futuras

El grupo `admin` queda como esqueleto con subcomandos a añadir por issues
posteriores (por ejemplo `admin users list`, `admin groups audit`). La estructura
Cobra permite añadirlos sin modificar el entrypoint. Se recomienda que cada
herramienta nueva viva en su propio archivo `cmd/cli/admin_<area>.go` y reutilice
la inicialización de infraestructura + los use cases de `internal/app`.

## Makefile y build

Targets propuestos (sustituyen/añaden; se mantienen los antiguos delegando):

```makefile
HTTP_SERVER_BINARY=bin/server
CLI_BINARY=bin/owned-cli

build-server: build-web
	@mkdir -p $(dir $(HTTP_SERVER_BINARY))
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
	go build -ldflags="-s -w" -o $(HTTP_SERVER_BINARY) ./cmd/server

build-cli:
	@mkdir -p $(dir $(CLI_BINARY))
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
	go build -ldflags="-s -w" -o $(CLI_BINARY) ./cmd/cli

build-all: build-server build-cli

superusr:
	GOTRACEBACK=all go run ./cmd/cli superusr $(ARGS)

approot:
	go run ./cmd/cli approot $(ARGS)

migrate-up-cli:
	go run ./cmd/cli migrate up

migrate-down-cli:
	go run ./cmd/cli migrate down
```

Despliegue en VPS: copiar `bin/server` y `bin/owned-cli`; ejecutar
`owned-cli migrate up` y luego `owned-cli superusr ...` / `owned-cli approot` una
vez; arrancar `server` (systemd/Docker). Migraciones posteriores pueden correrse
con `owned-cli migrate up` antes de reiniciar el servidor.

## Migración desde el estado actual (pasos)

1. Añadir dependencia Cobra y crear `cmd/cli` con root + `superusr`, `approot`.
2. Mover la lógica de `cmd/superusr/main.go` y `cmd/approot/main.go` a los
   nuevos subcomandos (ajustando solo imports/entrypoint). Cada uno conserva su
   propia inicialización de DB/migraciones/hasher.
3. Añadir `migrate` (up/down/status) en el CLI y helpers en `postgres`.
4. Añadir esqueletos `seed` y `admin`.
5. Actualizar Makefile y README.
6. Eliminar `cmd/superusr` y `cmd/approot`.
7. Verificar: `go build ./...`, `go test ./...`, `make superusr`, `make approot`,
   `make build-all`.

## Compatibilidad

- `make superusr ARGS=...` y `make approot` siguen funcionando.
- Las variables de entorno y `.env` no cambian.
- El servidor mantiene migración automática al arrancar; no se rompe el flujo
  `make start-http`.
- No cambia ningún endpoint ni contrato HTTP.

## Riesgos y mitigaciones

- **Duplicación transitoria:** durante la migración coexistirán `cmd/superusr` y
  `cmd/cli superusr`. Mitigación: eliminar los antiguos en el mismo PR/commit
  final y no mantener ambos a largo plazo.
- **Cobra añade dependencia:** aceptable; es estable y ampliamente usada.
  Alternativa descartada (flag manual) por mayor boilerplate en dispatch.
- **Config requiere variables TEST*PG*\*:** `LoadEnvConfig` exige variables de
  test incluso para comandos de producción. No se modifica aquí; si se desea
  aliviarlo, es un issue separado (no bloquea esta propuesta).
- **Migraciones down con datos:** `migrate down` puede destruir datos. Mitigación:
  confirmación interactiva en el CLI salvo `--yes`.

## Hallazgos fuera de alcance (reportar, no corregir ahora)

1. `cmd/approot/main.go` no lee `-usrname` aunque `README.md` documenta
   `make approot ARGS="-usrname admin@example.com"`. Además crea las raíces con
   `UsrID: nil` y no resuelve el usuario. Durante la migración debe decidirse:
   (a) eliminar el flag de la documentación, o (b) implementar la resolución del
   usuario y asociar las raíces. No se corrige en esta propuesta.
2. `cmd/approot` importa el paquete estándar `"uuid"` (Go 1.27) mientras el
   resto del código usa `github.com/google/uuid` en otros lugares; verificar
   consistencia al migrar.

## Criterios de aceptación

- [ ] Existe `cmd/cli` con root command y subcomandos `superusr`, `approot`,
      `migrate` (up/down/status), y grupos `seed`, `admin`.
- [ ] `go build ./...` y `go test ./...` pasan.
- [ ] `make superusr` y `make approot` funcionan delegando al CLI.
- [ ] `make build-all` genera `bin/server` y `bin/owned-cli`.
- [ ] `owned-cli migrate up/down/status` opera sobre las migraciones embebidas.
- [ ] `cmd/superusr` y `cmd/approot` eliminados.
- [ ] README actualizado con la nueva estructura y comandos.

## Plan de commits sugerido (Conventional Commits)

1. `chore(cmd): add cobra dependency and cli skeleton`
2. `refactor(cmd): migrate superusr and approot into cli subcommands`
3. `feat(cli): add migrate up/down/status subcommands`
4. `feat(cli): add seed and admin command groups (skeletons)`
5. `chore(makefile): build server and cli; update targets`
6. `docs(readme): update cmd structure and deployment notes`
7. `chore(cmd): remove legacy superusr and approot commands`
