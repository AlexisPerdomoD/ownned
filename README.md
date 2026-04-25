# Ownned

**Ownned** es una plataforma de gestión y colaboración de archivos basada en web, diseñada para organizar contenido en estructuras jerárquicas con control de acceso granular por grupos.

## Tech Stack

| Capa     | Tecnologías                                            |
| -------- | ------------------------------------------------------ |
| Backend  | Go 1.25, go-chi/chi, sqlx, golang-migrate, JWT, Argon2 |
| Frontend | SolidJS, @solidjs/router, TailwindCSS 4, Vite, Zod     |
| Database | PostgreSQL 16 (ltree, pgvector)                        |
| Runtime  | Docker, Docker Compose                                 |

## Características

### Gestión de Archivos

- Estructura jerárquica de carpetas con soporte para anidamiento ilimitado
- Carga y descarga de archivos con seguimiento de metadatos
- Sistema de comentarios en nodos para colaboración

### Autenticación y Autorización

- Autenticación basada en JWT con tokens seguros
- Hash de contraseñas con Argon2
- Tres roles de usuario: **Super User**, **Normal User**, **Limited User**
- Permisos granulares basados en roles (RBAC)

### Sistema de Grupos

- Creación de grupos para organizar colaboración
- Asignación de usuarios a grupos con niveles de acceso:
  - `read_only_access` — Solo lectura
  - `write_access` — Lectura y escritura
  - `owner_access` — Control total
- Asociación de nodos/carpetas a grupos para compartición

## Requisitos Previos

- Go 1.25+
- Node.js 20+
- PostgreSQL 16 (o Docker para desarrollo local)
- Docker y Docker Compose

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/<user>/owned.git
cd owned
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` según tu entorno. Las variables principales:

```env
SESSION_SECRET=<jwt-secret>
PORT=3000
PG_HOST=localhost
PG_PORT=5501
PG_USER=postgres
PG_PASSWORD=password
PG_DB=local_db
```

### 3. Iniciar la base de datos

```bash
make db-local-up
```

### 4. Ejecutar migraciones

```bash
make migrate-up
```

### 5. Construir y ejecutar

```bash
make build-web    # Construir frontend
make start-http   # Iniciar servidor
```

El servidor estará disponible en `http://localhost:3000`.

## Primeros Pasos

### Crear un Super Usuario

```bash
make superusr ARGS="-usrname admin@example.com -pwd password123"
```

### Inicializar Carpetas Raíz

```bash
make approot ARGS="-usrname admin@example.com"
```

## Comandos Disponibles

### Base de Dados

| Comando                | Descripción                  |
| ---------------------- | ---------------------------- |
| `make db-local-up`     | Iniciar PostgreSQL local     |
| `make db-local-down`   | Detener PostgreSQL local     |
| `make db-local-reset`  | Reiniciar base de datos      |
| `make migrate-up`      | Ejecutar migraciones         |
| `make test-migrate-up` | Ejecutar migraciones de test |

### Construcción

| Comando           | Descripción                     |
| ----------------- | ------------------------------- |
| `make build-web`  | Construir aplicación web        |
| `make build-http` | Construir servidor HTTP (Linux) |
| `make start-http` | Construir y ejecutar servidor   |

### Pruebas

```bash
make test-local    # Ejecutar pruebas con base de datos de test
```

## API REST

### Grupos (`/api/v1/groups`)

| Método | Ruta                               | Descripción               |
| ------ | ---------------------------------- | ------------------------- |
| GET    | `/api/v1/groups`                   | Listar grupos del usuario |
| POST   | `/api/v1/groups`                   | Crear grupo               |
| GET    | `/api/v1/groups/:id`               | Obtener grupo por ID      |
| PUT    | `/api/v1/groups/:id`               | Actualizar grupo          |
| DELETE | `/api/v1/groups/:id`               | Eliminar grupo            |
| POST   | `/api/v1/groups/:id/users`         | Asignar usuario a grupo   |
| DELETE | `/api/v1/groups/:id/users/:userId` | Remover usuario del grupo |
| POST   | `/api/v1/groups/:id/nodes`         | Asociar nodo al grupo     |
| DELETE | `/api/v1/groups/:id/nodes/:nodeId` | Desasociar nodo del grupo |

### Usuarios (`/api/v1/usrs`)

| Método | Ruta                    | Descripción                 |
| ------ | ----------------------- | --------------------------- |
| POST   | `/api/v1/usrs/login`    | Iniciar sesión              |
| POST   | `/api/v1/usrs/register` | Registrar usuario           |
| GET    | `/api/v1/usrs/me`       | Obtener usuario autenticado |
| GET    | `/api/v1/usrs`          | Listar usuarios             |

### Nodos (`/api/v1/nodes`)

| Método | Ruta                | Descripción                      |
| ------ | ------------------- | -------------------------------- |
| GET    | `/api/v1/nodes`     | Listar nodos (filtros por grupo) |
| POST   | `/api/v1/nodes`     | Crear carpeta                    |
| GET    | `/api/v1/nodes/:id` | Obtener nodo por ID              |
| PUT    | `/api/v1/nodes/:id` | Actualizar nodo                  |
| DELETE | `/api/v1/nodes/:id` | Eliminar nodo                    |

### Documentos (`/api/v1/docs`)

| Método | Ruta                        | Descripción         |
| ------ | --------------------------- | ------------------- |
| POST   | `/api/v1/docs`              | Subir documento     |
| GET    | `/api/v1/docs/:id/download` | Descargar documento |

### Comentarios (`/api/v1/comments`)

| Método | Ruta                   | Descripción                          |
| ------ | ---------------------- | ------------------------------------ |
| GET    | `/api/v1/comments`     | Listar comentarios (filtro por nodo) |
| POST   | `/api/v1/comments`     | Crear comentario                     |
| DELETE | `/api/v1/comments/:id` | Eliminar comentario                  |

## Estructura del Proyecto

```sh
owned/
├── cmd/                          # Puntos de entrada
│   ├── server/                   # Servidor HTTP
│   ├── superusr/                 # CLI para crear super usuarios
│   └── approot/                  # CLI para inicializar carpetas raíz
│
├── internal/                     # Código de aplicación
│   ├── application/              # Capa de aplicación
│   │   ├── dto/                  # Objetos de transferencia
│   │   ├── storage/              # Interfaces de almacenamiento
│   │   └── usecase/              # Casos de uso (lógica de negocio)
│   │
│   ├── domain/                   # Entidades y interfaces del dominio
│   │   ├── doc.go                # Documento
│   │   ├── group.go              # Grupo
│   │   ├── node.go               # Nodo (carpeta/archivo)
│   │   └── usr.go                 # Usuario
│   │
│   └── infrastructure/           # Capa de infraestructura
│       ├── config/               # Configuración
│       ├── db/                   # Conexión y migraciones
│       ├── serv/                 # Implementaciones de servicios
│       └── transport/             # Capa HTTP (handlers, middleware)
│
├── pkg/                          # Paquetes públicos
│   ├── apperror/                 # Errores de aplicación
│   ├── col/                      # Utilidades de colecciones
│   ├── concurrent/                # Utilidades de concurrencia
│   └── pagination/               # Paginación
│
├── web/app/                      # Aplicación frontend (SolidJS)
│   ├── src/
│   │   ├── entities/             # Entidades de la API
│   │   ├── features/             # Módulos de funcionalidades
│   │   ├── pages/                # Componentes de página
│   │   └── shared/               # Utilidades y componentes compartidos
│   └── package.json
│
├── db-docker-compose.yaml        # Docker Compose para desarrollo
├── db-docker-compose.test.yaml   # Docker Compose para pruebas
├── Makefile                      # Comandos de build y ejecución
└── .env.example                  # Template de variables de entorno
```

## Licencia

MIT
