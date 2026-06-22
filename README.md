# Ownned

[![Go Version](https://img.shields.io/badge/Go-1.25.2-00ADD8?logo=go)](https://go.dev)
[![SolidJS](https://img.shields.io/badge/SolidJS-1.9.12-2c4f7c?logo=solid)](https://solidjs.com)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

> _"Tus datos, tu servidor, tu control."_

Ownned es una plataforma de almacenamiento en la nube de autocuidado (_self-hosted_) diseñada para uso personal y colaboración en grupos pequeños. Construida con enfoque en privacidad, simplicidad de despliegue y funcionalidades autocontenidas.

## Propósito

El almacenamiento en la nube comercial implica ceder control sobre tus datos. Ownned existe como alternativa:

- **Autocontenido.** Todo lo que necesitas en un solo部署: base de datos, API, y cliente web.
- **Privacidad por diseño.** Tus archivos nunca salen de tu infraestructura.
- **Despliegue simple.** Docker Compose para desarrollo, binario único para producción.
- **Colaboración sin fricciones.** Sistema de grupos con permisos granulares para compartir con amigos y familia.

## Features

### Gestión de Archivos

- Estructura jerárquica de carpetas con anidamiento ilimitado
- Upload y download de archivos con metadatos
- Sistema de comentarios en nodos para colaboración

### Colaboración por Grupos

- Creación y administración de grupos
- Tres niveles de acceso: `read_only`, `write`, `owner`
- Asociación de carpetas/archivos a grupos para compartición

### Autenticación y Autorización

- JWT con tokens seguros
- Hash de contraseñas con Argon2
- Tres roles: **Super User**, **Normal User**, **Limited User**

### API REST Completa

- CRUD completo para nodos, grupos, usuarios y documentos
- Endpoints documentados para integración

## Tech Stack

| Layer    | Technology                              |
| -------- | -------------------------------------- |
| Backend  | Go 1.25, go-chi/chi, sqlx, golang-migrate |
| Frontend | SolidJS, TailwindCSS 4, Vite, Zod     |
| Database | PostgreSQL 16 (ltree, pgvector)         |
| Runtime  | Docker, Docker Compose                  |

## Arquitectura

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
│  │  (chi v5)   │  │  (JWT Auth) │  │  (Groups, Nodes,    │  │
│  │             │  │             │  │   Users, Docs)      │  │
│  └──────┬──────┘  └─────────────┘  └──────────┬──────────┘  │
│         │                                       │              │
│  ┌──────▼──────────────────────────────────────▼──────────┐  │
│  │                     Use Cases                            │  │
│  │   (Business Logic — Create, Read, Update, Delete)     │  │
│  └──────┬──────────────────────────────────────▲──────────┘  │
│         │                                       │              │
│  ┌──────▼──────────────────────────────────────▼──────────┐  │
│  │                   Repositories                            │  │
│  │        (PostgreSQL via sqlx — ltree for hierarchy)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │   PostgreSQL 16       │
              │   (port 5501)         │
              │   ltree + pgvector    │
              └───────────────────────┘
```

### Layer responsibilities

| Layer        | Package                              | Responsibility                              |
| ------------ | ------------------------------------ | ------------------------------------------ |
| Transport    | `internal/infrastructure/transport/` | HTTP handlers, middleware, encoders/decoders |
| Application  | `internal/application/`               | Use cases, DTOs, storage interfaces        |
| Domain       | `internal/domain/`                    | Entities: Doc, Group, Node, Usr            |
| Infrastructure | `internal/infrastructure/`           | PostgreSQL repos, JWT, Argon2, file storage |
| Shared       | `pkg/`                               | Public packages: apperror, col, pagination |

## API Endpoints

### Autenticación (`/api/v1/usrss`)

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------|
| POST   | `/usrss/login`      | Iniciar sesión           |
| POST   | `/usrss/register`   | Registrar usuario        |
| GET    | `/usrss/me`         | Usuario autenticado       |
| DELETE | `/usrss/logout`     | Cerrar sesión            |

### Nodos (`/api/v1/nodes`)

| Method | Endpoint           | Description                |
| ------ | ------------------ | --------------------------|
| GET    | `/nodes`           | Listar nodos raíz         |
| POST   | `/nodes`           | Crear carpeta             |
| GET    | `/nodes/:id`       | Obtener nodo por ID       |
| PUT    | `/nodes/:id`       | Actualizar nodo           |
| DELETE | `/nodes/:id`       | Eliminar nodo             |

### Grupos (`/api/v1/groups`)

| Method | Endpoint                        | Description            |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/groups/paginate`              | Listar grupos          |
| POST   | `/groups`                       | Crear grupo            |
| GET    | `/groups/:id`                   | Detalle de grupo       |
| PUT    | `/groups/:id`                   | Actualizar grupo       |
| DELETE | `/groups/:id`                   | Eliminar grupo         |
| POST   | `/groups/:id/users`            | Asignar usuario        |
| DELETE | `/groups/:id/users/:userId`    | Remover usuario        |
| POST   | `/groups/:id/nodes`            | Asociar nodo          |
| DELETE | `/groups/:id/nodes/:nodeId`    | Desasociar nodo       |

### Documentos (`/api/v1/docs`)

| Method | Endpoint                   | Description        |
| ------ | -------------------------- | ------------------ |
| POST   | `/docs`                    | Subir documento     |
| GET    | `/docs/:id/download`      | Descargar documento |
| DELETE | `/docs/:id`               | Eliminar documento  |

### Comentarios (`/api/v1/comments`)

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------|
| GET    | `/comments?node_id=x`   | Listar por nodo         |
| POST   | `/comments`             | Crear comentario        |
| PATCH  | `/comments/:id`         | Editar comentario        |
| DELETE | `/comments/:id`          | Eliminar comentario     |

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 20+
- PostgreSQL 16 (o Docker para desarrollo local)
- Docker y Docker Compose

### Instalación

```bash
# 1. Clonar
git clone https://github.com/<user>/owned.git
cd owned

# 2. Configurar entorno
cp .env.example .env

# 3. Iniciar base de datos
make db-local-up

# 4. Ejecutar migraciones
make migrate-up

# 5. Construir y ejecutar
make build-web
make start-http
```

El servidor estará disponible en `http://localhost:3000`.

### Primeros Pasos

```bash
# Crear super usuario
make superusr ARGS="-usrname admin@example.com -pwd password123"

# Inicializar carpetas raíz
make approot ARGS="-usrname admin@example.com"
```

### Development Commands

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `make db-local-up`   | Iniciar PostgreSQL local (5501)    |
| `make db-local-down` | Detener PostgreSQL local            |
| `make migrate-up`    | Ejecutar migraciones                |
| `make test-local`    | Ejecutar pruebas con DB de test     |
| `make build-web`     | Construir aplicación web            |
| `make start-http`    | Construir y ejecutar servidor       |

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
│       ├── db/             # PostgreSQL repos + migrations
│       ├── serv/           # Service implementations
│       └── transport/       # HTTP handlers, middleware
│
├── pkg/                     # Public packages
│   ├── apperror/           # Application errors
│   ├── col/                # Collection utilities
│   ├── concurrent/          # Concurrency utilities
│   └── pagination/          # Pagination helpers
│
└── web/app/                # SolidJS frontend
    └── src/
        ├── entities/       # API entities and types
        ├── features/       # Feature modules
        ├── pages/          # Page components
        └── shared/         # Design system components
```

## Roadmap

### Inmediato — Cliente Web Funcional

- [x] CRUD completo de archivos y carpetas
- [x] Upload y download de documentos
- [x] Sistema de comentarios
- [x] Gestión de grupos con permisos
- [x] Autenticación JWT con logout
- [ ] **Swagger/OpenAPI** — Documentación mantenible de la API
- [ ] **Streaming downloads** — Descarga por chunks/ranges para archivos grandes
- [ ] **UI refinada** — Mejoras visuales en comentarios, metadata de archivos

### Corto Plazo — Visores y Reproducción

- [ ] **Reproductor de video** — Soporte para formatos estándar (MP4, WebM)
- [ ] **Visor de documentos** — PDF, imágenes, documentos de office
- [ ] **Preview de archivos** — Thumbnails y previsualización inline

### Mediano Plazo — Almacenamiento Flexible

- [ ] **SQLite driver** — Opción para despliegues acotados (Raspberry Pi, VPS pequeño)
- [ ] **Storage abstraction** — Interface para S3, Google Cloud Storage, Backblaze B2

### Largo Plazo — Clientes Multiplataforma

- [ ] **Cliente Mobile** — App nativa o PWA para iOS/Android
- [ ] **Smart TV Client** — App para TV conectadas (Samsung, LG, Apple TV)
- [ ] **CLI Client** — Herramienta de línea de comandos para scripting

## Contributing

Contribuciones son bienvenidas. Por favor abre un issue o pull request en [GitHub](https://github.com/AlexisPerdomoD/owned).

## License

GPL-3.0 — See [LICENSE](LICENSE) for full text.
