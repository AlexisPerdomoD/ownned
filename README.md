# Ownned

[![Go Version](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go)](https://go.dev)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9.12-2c4f7c?logo=solid)](https://solidjs.com)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

> _Your data, your server, your control._

Ownned is a self-hosted file management application for personal use and small-group collaboration. It consists of a Go HTTP API, a SolidJS web client, PostgreSQL, and local filesystem storage.

## Current capabilities

- Hierarchical folders and files, with metadata stored in PostgreSQL.
- File upload with contents stored on the server's filesystem. Download and individual deletion routes are registered, but their document/node storage-key mapping still needs correction for end-to-end reliability.
- Backend comment operations on nodes; frontend route/body parity is still incomplete.
- Groups with read-only, write, and owner access levels for sharing nodes.
- Session authentication using JWT cookies, Argon2 password hashing, and super, normal, and limited user roles.
- The HTTP server can serve the built web client from `web/dist` when `SERVE_WEB_APP` is enabled (the default).

Some API paths are registered as contract stubs and currently return `501 Not Implemented`; these are identified below.
Backend route registration is not a claim of end-to-end client coverage. See the [frontend contract matrix](doc/frontend/contract-coverage.md) for current parity and the [frontend plan](doc/frontend/product-plan.md) for gaps and progress.

## Tech stack

| Layer        | Technology                                                                        |
| ------------ | --------------------------------------------------------------------------------- |
| Backend      | Go 1.27, chi, sqlx, golang-migrate                                                |
| Frontend     | SolidJS 1.9.12, Tailwind CSS 4, Vite 8, Zod                                       |
| Database     | PostgreSQL; the local Compose files use PostgreSQL 17 and the schema uses `ltree` |
| File storage | Local filesystem                                                                  |

## Architecture

```text
web/app (SolidJS) ── HTTP ──> cmd/server (chi router)
                                      │
                                      ├── internal/app (use cases and ports)
                                      ├── internal/domain (entities and rules)
                                      ├── internal/adapter/inbound/httpapi
                                      └── internal/adapter/outbound
                                            ├── postgres
                                            ├── cripto
                                            └── storage
```

The server wires the adapters and use cases in `cmd/server`. Database migrations run when the server starts. The local Compose files provide PostgreSQL only; the Go server and web client are run or built separately.

## API

All endpoints are under `/api/v1`. Except for login and logout, the routes below require authentication. User creation additionally requires a super user. There is no public registration endpoint.

The handler registrations, request validation/use cases, and response views are the executable API sources of truth; this README is a summary.

### Authentication

| Method   | Path           | Description                       |
| -------- | -------------- | --------------------------------- |
| `POST`   | `/auth/login`  | Log in and set the session cookie |
| `DELETE` | `/auth/logout` | Clear the session cookie          |

### Users (`/usrs`)

| Method | Path             | Description                     |
| ------ | ---------------- | ------------------------------- |
| `GET`  | `/usrs/me`       | Get the current user            |
| `GET`  | `/usrs/{usrID}`  | Get a user                      |
| `GET`  | `/usrs/paginate` | Paginate users                  |
| `POST` | `/usrs`          | Create a user (super user only) |

### Groups (`/groups`)

| Method   | Path                               | Description                   |
| -------- | ---------------------------------- | ----------------------------- |
| `POST`   | `/groups`                          | Create a group                |
| `GET`    | `/groups/paginate`                 | Paginate groups               |
| `GET`    | `/groups/{groupID}`                | Get a group                   |
| `PATCH`  | `/groups/{groupID}`                | Update a group                |
| `DELETE` | `/groups/{groupID}`                | Delete a group                |
| `POST`   | `/groups/{groupID}/nodes`          | Associate a node with a group |
| `DELETE` | `/groups/{groupID}/nodes/{nodeID}` | Remove a node from a group    |
| `POST`   | `/groups/{groupID}/users`          | Add or update a group user    |
| `DELETE` | `/groups/{groupID}/users/{usrID}`  | Remove a user from a group    |

### Nodes, documents, and comments (`/nodes`)

| Method   | Path                              | Description                        |
| -------- | --------------------------------- | ---------------------------------- |
| `GET`    | `/nodes`                          | List the current user's root nodes |
| `POST`   | `/nodes`                          | Create a folder                    |
| `GET`    | `/nodes/{nodeID}`                 | Get a node and its contents        |
| `DELETE` | `/nodes/{nodeID}`                 | Delete a node                      |
| `GET`    | `/nodes/{nodeID}/comments`        | List comments on a node            |
| `POST`   | `/nodes/{nodeID}/comments`        | Add a comment to a node            |
| `PATCH`  | `/nodes/comments/{nodeCommentID}` | Update a comment                   |
| `DELETE` | `/nodes/comments/{nodeCommentID}` | Delete a comment                   |
| `GET`    | `/nodes/paginate`                 | Paginate nodes                     |
| `POST`   | `/nodes/docs`                     | Upload a document                  |
| `GET`    | `/nodes/docs/{docID}/download`    | Download a document                |
| `DELETE` | `/nodes/docs/{docID}`             | Delete a document                  |
| `GET`    | `/nodes/docs/paginate`            | Paginate documents                 |

The following paths are registered as public contracts but currently return `501 Not Implemented`:

| Method | Path                       | Intended operation |
| ------ | -------------------------- | ------------------ |
| `PUT`  | `/nodes/{nodeID}`          | Update a node      |
| `GET`  | `/nodes/{nodeID}/download` | Download a folder  |

Node and document pagination have HTTP handlers and are not stubs. Their filters are defined in the backend handlers; see `doc/frontend/contract-coverage.md` for the current client-to-contract matrix and uncovered client flows.

## Getting started

### Requirements

- Go 1.27 or newer
- Docker with the Compose plugin (for the local PostgreSQL instance)
- Node.js and pnpm (to build or run the web client)
- The `migrate` CLI only if running the manual `make migrate-up` or `make migrate-down` targets

### Run locally

```bash
cp .env.example .env
make db-local-up
make build-web
make start-http
```

The server listens on the port configured by `PORT` (3000 by default), applies database migrations at startup, and serves the built client from `web/dist` by default. `make start-http` builds a Linux/amd64 binary; use `make build-http-lite` to build for the current machine, then run `./bin/server`.

To create the initial super user and its root folder, with the database running:

```bash
make superusr ARGS="-usrname admin@example.com -pwd '<choose-a-password>'"
make approot ARGS="-usrname admin@example.com"
```

Set a unique `SESSION_SECRET` in `.env` before using the application outside local development. `LOCAL_STORAGE_DIR` can be set to choose where uploaded files are stored; by default, files are placed under `~/.owned/storage`.

### Development and maintenance commands

| Command                                   | Description                                          |
| ----------------------------------------- | ---------------------------------------------------- |
| `make db-local-up` / `make db-local-down` | Start or stop the local PostgreSQL container         |
| `make test-local`                         | Start the test PostgreSQL (tmpfs), apply migrations, run tests, and stop |
| `make migrate-up` / `make migrate-down`   | Apply or roll back migrations with the `migrate` CLI |
| `make migrate-up-cli` / `make migrate-down-cli` | Apply or roll back migrations with the built-in CLI (`owned-cli migrate ...`) |
| `make build-web`                          | Build the web client and copy it to `web/dist`       |
| `make build-http-lite`                    | Build the HTTP server for the current platform       |
| `make start-http`                         | Build and run the Linux/amd64 HTTP server            |
| `make superusr ARGS="..."`                | Create a super user                                  |
| `make approot ARGS="..."`                 | Initialize a user's root folder                      |
| `go test ./...`                           | Run Go tests                                         |

For the web client development server, run `pnpm install` and `pnpm dev` from `web/app/`. In local mode, the client targets the API at `http://localhost:3000`.

Run modes: set `MODE=local` in `.env` for local HTTP (including the separate Vite dev server) — the server enables Vite CORS and non-secure local cookie settings only in this mode; use `MODE=dev` for a built client behind the server. The bundled `.env.example` is preconfigured with `MODE=local` for the local flow.

## Frontend design and coverage

The frontend follows the backend's public HTTP contract. `doc/frontend/contract-coverage.md` records each endpoint, its backend state, current client integration, and gaps. `doc/frontend/product-plan.md` records the UX direction, folder-upload evaluation, acceptance criteria, and progress. Frontend coding instructions are in `web/app/AGENTS.md`.

## Project structure

```text
cmd/
  server/                         HTTP server and dependency wiring
  cli/                            Operational CLI (superusr, approot, migrate, seed, admin)
internal/
  app/                             Use cases, ports, and application errors
  domain/                          Domain entities and rules
  adapter/
    inbound/httpapi/               HTTP handlers, middleware, and views
    outbound/postgres/             PostgreSQL repositories and migrations
    outbound/cripto/               JWT and password-hashing adapters
    outbound/storage/              Filesystem storage adapter
  config/                          Environment configuration
web/app/                           SolidJS application
web/dist/                          Built web assets served by the Go server
```

## Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/AlexisPerdomoD/owned).

## License

GPL-3.0 — See [LICENSE](LICENSE) for the full text.
