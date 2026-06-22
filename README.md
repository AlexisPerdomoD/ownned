# Ownned

[![Go Version](https://img.shields.io/badge/Go-1.25.2-00ADD8?logo=go)](https://go.dev)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9.12-2c4f7c?logo=solid)](https://solidjs.com)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

> _"Your data, your server, your control."_

Ownned is a self-hosted cloud storage platform designed for personal use and small group collaboration. Built with a focus on privacy, deployment simplicity, and self-contained features.

## Purpose

Commercial cloud storage means surrendering control over your data. Ownned exists as an alternative:

- **Self-contained.** Everything you need in a single deployment: database, API, and web client.
- **Privacy by design.** Your files never leave your infrastructure.
- **Simple deployment.** Docker Compose for development, single binary for production.
- **Frictionless collaboration.** Group system with granular permissions for sharing with friends and family.

## Features

### File Management

- Hierarchical folder structure with unlimited nesting
- File upload and download with metadata tracking
- Comment system on nodes for collaboration

### Group Collaboration

- Group creation and management
- Three access levels: `read_only`, `write`, `owner`
- Folder/file association with groups for sharing

### Authentication & Authorization

- JWT with secure tokens
- Password hashing with Argon2
- Three roles: **Super User**, **Normal User**, **Limited User**

### Complete REST API

- Full CRUD for nodes, groups, users, and documents
- Documented endpoints for integration

## Tech Stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Backend  | Go 1.25, go-chi/chi, sqlx, golang-migrate |
| Frontend | SolidJS, TailwindCSS 4, Vite, Zod        |
| Database | PostgreSQL 16 (ltree, pgvector)          |
| Runtime  | Docker, Docker Compose                     |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│                   (SolidJS SPA, :5173 dev)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────┐
│                        Server (Go)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Router    │  │ Middlewares │  │      Handlers       │  │
│  │  (chi v5)   │  │  (JWT Auth) │  │  (Groups, Nodes,  │  │
│  │             │  │             │  │   Users, Docs)      │  │
│  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘  │
│         │                                       │              │
│  ┌──────▼──────────────────────────────────────▼──────────┐  │
│  │                     Use Cases                            │  │
│  │   (Business Logic — Create, Read, Update, Delete)      │  │
│  └──────┬──────────────────────────────────────▲──────────┘  │
│         │                                       │              │
│  ┌──────▼──────────────────────────────────────▼──────────┐  │
│  │                   Repositories                            │  │
│  │        (PostgreSQL via sqlx — ltree for hierarchy)      │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │   PostgreSQL 16        │
              │   (port 5501)          │
              │   ltree + pgvector     │
              └───────────────────────┘
```

### Layer Responsibilities

| Layer         | Package                              | Responsibility                            |
| ------------- | ------------------------------------ | ---------------------------------------- |
| Transport     | `internal/infrastructure/transport/`  | HTTP handlers, middleware, encoders/decoders |
| Application   | `internal/application/`              | Use cases, DTOs, storage interfaces      |
| Domain        | `internal/domain/`                   | Entities: Doc, Group, Node, Usr        |
| Infrastructure | `internal/infrastructure/`            | PostgreSQL repos, JWT, Argon2, file storage |
| Shared        | `pkg/`                              | Public packages: apperror, col, pagination |

## API Endpoints

### Authentication (`/api/v1/usrss`)

| Method | Endpoint          | Description         |
| ------ | ----------------- | ------------------- |
| POST   | `/usrss/login`    | Login               |
| POST   | `/usrss/register`  | Register user       |
| GET    | `/usrss/me`        | Current user        |
| DELETE | `/usrss/logout`   | Logout              |

### Nodes (`/api/v1/nodes`)

| Method | Endpoint       | Description          |
| ------ | -------------- | -------------------- |
| GET    | `/nodes`       | List root nodes      |
| POST   | `/nodes`       | Create folder        |
| GET    | `/nodes/:id`   | Get node by ID       |
| PUT    | `/nodes/:id`   | Update node          |
| DELETE | `/nodes/:id`   | Delete node          |

### Groups (`/api/v1/groups`)

| Method | Endpoint                      | Description       |
| ------ | ----------------------------- | ----------------- |
| GET    | `/groups/paginate`             | List groups       |
| POST   | `/groups`                     | Create group     |
| GET    | `/groups/:id`                 | Group details     |
| PUT    | `/groups/:id`                 | Update group     |
| DELETE | `/groups/:id`                 | Delete group     |
| POST   | `/groups/:id/users`           | Assign user      |
| DELETE | `/groups/:id/users/:userId`   | Remove user      |
| POST   | `/groups/:id/nodes`           | Associate node    |
| DELETE | `/groups/:id/nodes/:nodeId`   | Dissociate node  |

### Documents (`/api/v1/docs`)

| Method | Endpoint             | Description          |
| ------ | -------------------- | --------------------|
| POST   | `/docs`              | Upload document     |
| GET    | `/docs/:id/download` | Download document   |
| DELETE | `/docs/:id`          | Delete document     |

### Comments (`/api/v1/comments`)

| Method | Endpoint               | Description          |
| ------ | ----------------------| --------------------|
| GET    | `/comments?node_id=x` | List by node        |
| POST   | `/comments`           | Create comment      |
| PATCH  | `/comments/:id`      | Edit comment        |
| DELETE | `/comments/:id`      | Delete comment      |

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 20+
- PostgreSQL 16 (or Docker for local development)
- Docker and Docker Compose

### Installation

```bash
# 1. Clone
git clone https://github.com/<user>/owned.git
cd owned

# 2. Configure environment
cp .env.example .env

# 3. Start database
make db-local-up

# 4. Run migrations
make migrate-up

# 5. Build and run
make build-web
make start-http
```

Server available at `http://localhost:3000`.

### First Steps

```bash
# Create super user
make superusr ARGS="-usrname admin@example.com -pwd password123"

# Initialize root folders
make approot ARGS="-usrname admin@example.com"
```

### Development Commands

| Command            | Description                         |
| ------------------ | ----------------------------------- |
| `make db-local-up`   | Start local PostgreSQL (port 5501)  |
| `make db-local-down` | Stop local PostgreSQL               |
| `make migrate-up`    | Run migrations                      |
| `make test-local`    | Run tests with test database        |
| `make build-web`     | Build web application               |
| `make start-http`    | Build and run HTTP server           |

## Project Structure

```
.
├── cmd/
│   ├── server/              # HTTP server entrypoint
│   ├── superusr/            # CLI: create super user
│   └── approot/             # CLI: initialize root folders
│
├── internal/
│   ├── application/
│   │   ├── auth/            # JWT, password hashing
│   │   ├── dto/             # Data transfer objects
│   │   ├── storage/         # Storage interfaces
│   │   └── usecase/        # Business logic use cases
│   │
│   ├── domain/              # Entities: Doc, Group, Node, Usr
│   │
│   └── infrastructure/
│       ├── config/          # Environment configuration
│       ├── db/              # PostgreSQL repos + migrations
│       ├── serv/            # Service implementations
│       └── transport/        # HTTP handlers, middleware
│
├── pkg/                     # Public packages
│   ├── apperror/           # Application errors
│   ├── col/                # Collection utilities
│   ├── concurrent/          # Concurrency utilities
│   └── pagination/          # Pagination helpers
│
└── web/app/                # SolidJS frontend
    └── src/
        ├── entities/        # API entities and types
        ├── features/       # Feature modules
        ├── pages/          # Page components
        └── shared/         # Design system components
```

## Roadmap

### Immediate — Functional Web Client

- [x] Full CRUD for files and folders
- [x] Document upload and download
- [x] Comment system
- [x] Group management with permissions
- [x] JWT authentication with logout
- [ ] **Swagger/OpenAPI** — Maintainable API documentation
- [ ] **Streaming downloads** — Chunk/range downloads for large files
- [ ] **Refined UI** — Visual improvements for comments, file metadata

### Short Term — Viewers and Playback

- [ ] **Video player** — Support for standard formats (MP4, WebM)
- [ ] **Document viewer** — PDF, images, office documents
- [ ] **File preview** — Thumbnails and inline previews

### Medium Term — Flexible Storage

- [ ] **SQLite driver** — Option for small deployments (Raspberry Pi, small VPS)
- [ ] **Storage abstraction** — Interface for S3, Google Cloud Storage, Backblaze B2

### Long Term — Multiplatform Clients

- [ ] **Mobile client** — Native app or PWA for iOS/Android
- [ ] **Smart TV client** — App for connected TVs (Samsung, LG, Apple TV)
- [ ] **CLI client** — Command-line tool for scripting

## Contributing

Contributions are welcome. Please open an issue or pull request on [GitHub](https://github.com/AlexisPerdomoD/owned).

## License

GPL-3.0 — See [LICENSE](LICENSE) for full text.
