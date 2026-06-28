# Ownned

Go + SolidJS file management platform with hierarchical structure and group-based access control.

## Stack

| Layer    | Tech                                                   |
| -------- | ------------------------------------------------------ |
| Backend  | Go 1.25, go-chi/chi, sqlx, golang-migrate, JWT, Argon2 |
| Frontend | SolidJS, TailwindCSS 4, Vite, Zod                      |
| DB       | PostgreSQL 16 (ltree, pgvector)                        |

## Dev Commands

```bash
# Database
make db-local-up          # Start PostgreSQL (port 5501)
make db-local-down        # Stop PostgreSQL
make db-local-reset       # Reset database (including volumes)
make migrate-up           # Run migrations (requires migrate CLI)
make test-migrate-up      # Run test migrations

# Backend
make start-http           # Build + run HTTP server
make build-http           # Build binary only (Linux, CGO_ENABLED=0)
make build-http-lite      # Build binary (local)
make superusr ARGS="-usrname admin@example.com -pwd password123"
make approot ARGS="-usrname admin@example.com"

# Frontend (in web/app/)
pnpm install
pnpm dev                  # Dev server on :5173
pnpm build                # Production build to web/app/dist

# Tests
make test-local           # Spins up test DB (port 5502), runs all tests, tears down
```

## Database

- **Dev**: PostgreSQL on port 5501, DB `local_db`
- **Test**: PostgreSQL on port 5502, DB `test_db`
- Migrations: `./internal/infrastructure/db/migrations/postgres/`
- Requires `migrate` CLI installed with the postgres driver (install via `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`)

## Frontend

- Located in `web/app/`
- Uses **TailwindCSS 4** (configured via `@import 'tailwindcss'` in CSS, no tailwind.config.js)
- Path aliases: `@/*` → `src/`, `@entities/*`, `@features/*`, `@pages/*`, `@shared/*`
- No separate prettier config — eslint config handles style with Prettier plugin
- **Build output**: `web/app/dist` → copied to `web/dist` by `make build-web`

## API Routes (chi router)

All under `/api/v1/`:

- `groups` — CRUD, user assignment, node association
- `usrs` — login, register, user management
- `nodes` — folder tree management
- `comments` — node comments
- `docs` — file upload/download

Static assets: `/assets/*` → `web/dist/assets/`
SPA fallback: `/*` → `web/dist/index.html`

## Entry Points

- `cmd/server/main.go` — HTTP server (binds all routes, runs migrations on startup)
- `cmd/superusr/main.go` — Super user creation CLI
- `cmd/approot/main.go` — Root folder initialization CLI

## Architecture

```
cmd/          # Entry points
internal/
  application/  # Use cases, DTOs, storage interfaces
  domain/      # Entities (Doc, Group, Node, Usr)
  infrastructure/
    config/    # Env config
    db/        # PostgreSQL repos + migrations
    serv/      # JWT, password hashing, storage
    transport/ # HTTP handlers, middleware, encoders/decoders
pkg/          # Public packages: apperror, col, concurrent, helper, pagination
web/app/      # SolidJS frontend
```

## Environment

- `.env` is gitignored, use `.env.example` as template
- `.env` is included by Makefile (do not add to .gitignore)
- Config loaded via `internal/infrastructure/config/env_config.go`

## Commit Convention

Use conventional commits: `type(scope): description`

Types: `feat`, `refactor`, `fix`, `docs`, `test`, `chore`, `videcode`

Commits must be atomic — each commit compiles independently and represents a single logical change.

## Go Module

- Module name: `ownned` (not `owned`)
- Go 1.25.2
