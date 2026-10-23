# `embed`: incluir archivos dentro del binario (y las migraciones SQL)

> Guía de bolsillo sobre el paquete estándar `embed` (Go ≥ 1.16): qué hace, sus reglas, y cómo usarlo para empaquetar las migraciones de PostgreSQL en el binario y que `go build` produzca un artefacto realmente self-contained.

---

## 1. El problema que resuelve

Un binario de Go ya es un solo archivo si compilás con `CGO_ENABLED=0` (ver [go_build_flags.md](go_build_flags.md))... pero por default **no incluye datos externos**: templates, configs, certificados, y sí, los `.sql` de migración quedan afuera.

Acá mismo en el repo pasó eso: `MigrateUp` en `internal/adapter/outbound/postgres/postgres.go` busca los `.sql` con ruta relativa al **directorio de trabajo**:

```go
wd, _ := os.Getwd()
path := "file://" + filepath.Join(wd, "internal/adapter/outbound/postgres/migration")
```

Consecuencia: si corréis el binario desde otra carpeta (o en un contenedor sin el código fuente), la migración explota. `embed` arregla esto: los archivos viajan **dentro** del binario.

```go
import _ "embed"

//go:embed migration/*.sql
var migrationsFS embed.FS
```

Dos líneas y el binario ya lleva sus migraciones adentro. Sin CGO, sin dependencias, sin rutas externas.

---

## 2. Cómo funciona: la directiva `//go:embed`

La directiva es un **comentario mágico** que el compilador lee en tiempo de build. Va justo encima de una declaración de variable, y el contenido del/los archivo/s queda en esa variable:

```go
package ejemplo

import (
	"embed"
	_ "embed" // necesario para string/[]byte (no si ya usás embed.FS)
)

//go:embed saludo.txt
var saludo string // contenido como texto

//go:embed logo.png
var logo []byte // contenido como bytes crudos

//go:embed static/
var staticFS embed.FS
```

Variables válidas: `string`, `[]byte` o `embed.FS`. Los valores son **read-only** (no podés escribir en ellos).

### Qué podés embeber y qué no

| Regla                                                                 | Detalle                                                                                |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Rutas **relativas al archivo .go**                                    | `//go:embed ../otro/dir.txt` → **no compila** (no puede salir del paquete)             |
| Sin rutas absolutas ni `.`/`..`                                       | el compilador lo rechaza                                                               |
| Directorios → **recursivo** solo si termina en `/` o usa wildcard `*` | `//go:embed static` (sin slash) también funciona y arrastra todo el árbol              |
| Excluye ocultos                                                       | archivos/dirs que empiezan con `.` o `_` se ignoran al embeber un directorio           |
| `all:` fuerza incluir ocultos                                         | `//go:embed all:static` incluye `.` y `_` (útil para `_redirects`, `.well-known`)      |
| Excluye `go.mod`, `go.sum`, `.git`...                                 | archivos habituales del build se omiten                                                |
| La directiva debe estar **adjunta a la var**                          | corta y seca encima de la declaración; en cualquier otro lugar el compilador la ignora |

En este repo, las migraciones están en `internal/adapter/outbound/postgres/migration/*.sql`, así que desde un `.go` del paquete `postgres` la ruta relativa directa es simplemente `migration/*.sql`.

---

## 3. `embed.FS`: un filesystem de solo lectura

Cuando la variable es `embed.FS` obtenés un mini-FS in-memory compatible con `fs.FS` (la interfaz de filesystems de la stdlib). Operaciones útiles:

```go
//go:embed migration
var migFS embed.FS

data, _ := migFS.ReadFile("migration/000001_add_scheme.up.sql") // ruta relativa a la raíz del FS embebido
entries, _ := migFS.ReadDir("migration")                        // []fs.DirEntry
sub, _ := fs.Sub(migFS, "migration")                            // "cd" a un subdir; sub.ReadFile("000001_add_scheme.up.sql")
matches, _ := fs.Glob(migFS, "migration/*.up.sql")
```

Trampitas:

- Las rutas en `ReadFile`/`ReadDir`/`Glob` son **relativas a la raíz del FS declarado en la directiva**, NO al directorio de trabajo del proceso. Olvidarse de esto es el bug clásico.
- No hay `Open` para escritura ni nada side-effectivo: es un snapshot congelado en compile-time. Si cambiás un `.sql` y no recompilás, el binario sigue llevando el viejo.
- Para servir archivos con `http.FileServer`, `fs.Sub` + `http.FS(...)` es el combo estándar.

---

## 4. El caso concreto: migraciones con golang-migrate

El código actual de `internal/adapter/outbound/postgres/postgres.go` usa el driver de fuente `file`, vía URL `file://...` + `migrate.NewWithDatabaseInstance`. Para embeber, golang-migrate trae un driver de fuente específico para esto: **`source/iofs`**, que acepta cualquier `fs.FS` — incluido un `embed.FS`.

### Paso a paso

**1. Embeber desde cualquier paquete, o directamente desde `postgres.go`**:

```go
package postgres

import "embed"

//go:embed migration/*.sql
var migrationsFS embed.FS
```

> Colocación: la directiva cae bien en el mismo `.go` donde está `MigrateUp`, porque `migration/` es un subdir del paquete. Si preferís aislarlo, un `migrations.go` chico en el mismo paquete también sirve.

**2. Cambiar de driver de fuente a `iofs` y usar `NewWithInstance`**:

```go
import (
	"database/sql"
	"time"

	"github.com/golang-migrate/migrate/v4"
	migrationPg "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

func MigrateUp(db *sql.DB) error {
	driver, err := migrationPg.WithInstance(db, &migrationPg.Config{StatementTimeout: 1 * time.Second})
	if err != nil {
		return err
	}

	src, err := iofs.New(migrationsFS, "migration") // ruta dentro del embed.FS
	if err != nil {
		return err
	}

	m, err := migrate.NewWithInstance("iofs", src, "postgres", driver)
	if err != nil {
		return err
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}
	return nil
}
```

Notá que ya **no hace falta** `os.Getwd()`, `filepath.Join`, ni el blank-import de `source/file`: esas líneas sobran.

**3. Por qué cambia de `NewWithDatabaseInstance` a `NewWithInstance`**: el primero toma una **URL** (`file://...`, `s3://...`) y resuelve el driver por esquema; para una instancia `fs.FS` ya resuelta en memoria el camino es entregar ambos drivers resueltos con `NewWithInstance`. Del lado de la base de datos no cambia nada: sigue siendo el mismo `migrationPg.WithInstance`.

### Alternativa: coexistir con el CLI de `migrate`

Si necesitás **ambos mundos** (el binario embebido + el CLI de `migrate` leyendo del disco para desarrollo), coexisten sin problema: mantené el driver `file` para el CLI/scripts y `iofs` para el runtime embebido. Son caminos independientes que apuntan a los mismos archivos.

---

## 5. Efectos laterales a tener en cuenta

| Tema                   | Qué pasa                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Tamaño del binario** | crece exactamente el tamaño embebido (pocos KB de `.sql` en este caso: imperceptible)                     |
| **Development loop**   | cambiás un `.sql` → hay que **recompilar** para verlo (si corrés con `go run`, ya lo hace por vos)        |
| **Dirty state**        | sin cambios: `embed` no toca cómo golang-migrate trackea versiones; sigue usando `schema_migrations`      |
| **Tests**              | cualquier `go test ./...` que toque el paquete `postgres` también compila el embed; funciona transparente |
| **Migraciones down**   | el glob `*.sql` incluye los `.down.sql`; iofs los parsea igual que el driver file                         |
| **Archivos ocultos**   | no aplica acá (ninguna migración empieza con `_`/`.`), pero recordá `all:` si algún día lo necesitás      |

---

## 6. En la práctica para _owned_

Cambio sugerido en `internal/adapter/outbound/postgres/postgres.go`:

1. Agregar `//go:embed migration/*.sql` + `var migrationsFS embed.FS` en el paquete.
2. Reemplazar el bloque `os.Getwd()` + `file://` por `iofs.New(migrationsFS, "migration")` + `migrate.NewWithInstance`.
3. Quitar los imports que quedan sin uso: `os`, `path/filepath` (en este archivo) y el blank-import `_ ".../source/file"` (si nadie más lo usa en el build).

Win neto: el binario de `make build-http` ya estático con `CGO_ENABLED=0` ahora también es **auto-migrante**, sin depender de dónde ni cómo se ejecute. Es el paso que hace que la historia del binario único self-contained (de [go_build_flags.md](go_build_flags.md)) quede completa de punta a punta.
