# Revisión crítica y plan de acción: SQLite como backend alternativo

## 1. Veredicto general

El plan `implementation_plan.md` es **muy sólido**. La idea de mantener el dominio intacto y añadir un segundo backend tras la misma interfaz es correcta.

Con el estado actual del repo, **sí es viable** conseguir un binario único con SQLite. La fricción real no está en "traducir `ltree`", sino en:

- Mapeo `uuid.UUID` <-> `TEXT` con `modernc.org/sqlite`
- `PRAGMA foreign_keys=ON` (desactivado por defecto)
- Cálculo de `parent_path`
- Traducción de `id = ANY($1)`
- Convivencia con PostgreSQL sin romper nada

**Recomendación:** No reemplazar PostgreSQL. Añadir `DB_DRIVER=sqlite|postgres` manteniendo ambos backends funcionales.

## 2. Estado actual del repo relevante a BD

### 2.1 Migraciones PostgreSQL

En `internal/infrastructure/db/migrations/postgres/000001_add_scheme.up.sql`:

- `CREATE EXTENSION IF NOT EXISTS ltree;`
- Tipo `ltree` en `nodes.path`
- Uso de `subpath(...)`, `nlevel(...)`
- `timestamptz`, `uuid` nativos de PG
- Schema `fs.`

### 2.2 Repositorios con SQL específico de PG

| Archivo                                                     | Lo específico                                               | Adaptación a SQLite                                             |
| ----------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | --- | ----------------------------------- |
| `node_repository_pg.go`                                     | `path <@ $1`, `nlevel(n.path)=...`, `parent.path @> n.path` | `path = ? OR path LIKE ?                                        |     | '.%'`, `parent_path = ?` para hijos |
| `doc_repository_pg.go`                                      | `path <@ $1::ltree`                                         | `path = ? OR path LIKE ?                                        |     | '.%'`                               |
| `group_usr_repository_pg.go`                                | `n_grant.path @> $2` (HasAccess)                            | `$2 = n_grant.path OR $2 LIKE n_grant.path                      |     | '.%'`                               |
| `usr_repository_pg.go`                                      | `ILIKE`, `LIMIT $x OFFSET $y`                               | `LIKE` (+ `COLLATE NOCASE` o `LOWER`), `LIMIT/OFFSET` idénticos |
| `group_repository_pg.go`                                    | `id=ANY($1)`                                                | `IN (?, ?, ...)` expandido                                      |
| `group_node_repository_pg.go`                               | `ON CONFLICT ... DO NOTHING`                                | Soportado (SQLite >= 3.24)                                      |
| `group_usr_repository_pg.go`                                | `ON CONFLICT ... DO UPDATE SET ...`                         | Soportado (UPSERT)                                              |
| `usr_pwd_repository_pg.go`, `node_comment_repository_pg.go` | Sin lo anterior                                             | Sin cambios relevantes                                          |

### 2.3 Wiring actual

- `cmd/server/main.go` instancia `pg.NewDB`, `pg.New*Repository`, `pg.NewUnitOfWorkFactory` directamente.
- `internal/infrastructure/config/env_config.go` solo lee variables `PG_*`.
- `internal/domain/node_path.go` es **agnóstico**: `string` puro, sin referencias a `ltree`. Esto es perfecto.
- `unitofwork_pg.go` usa `sqlx.Tx` con `sqlx.ExtContext`. Patrón replicable 1:1.

## 3. Ajustes al plan propuesto

### 3.1 `parent_path`: generado vs calculado en Go

El plan propone `GENERATED ALWAYS AS (...) STORED` con `reverse()` + `instr()`.

**Contra:**

- `reverse()` requiere SQLite >= 3.44.0. Aunque `modernc.org/sqlite` suele usar versiones recientes, mejor no asumirlo.
- Generado complica un poco la legibilidad/debug al inspeccionar con `INSERT` manuales.
- El dominio ya conoce el `parent.Path` en los flujos de creación/movimiento.

**Mi recomendación: empezar con `parent_path` calculado en Go dentro del repositorio SQLite.**

Si tras tener todo verde vemos valor en reforzarlo a nivel DB, migramos a `GENERATED ALWAYS AS (STORED)`. **Priorizar simplicidad y seguridad ahora.**

### 3.2 `uuid.UUID` <-> `TEXT`

Con `lib/pq`, `uuid` PG se mapea directo a `[16]byte`. Con `modernc.org/sqlite` escanear `TEXT` hacia `uuid.UUID` **no es automático** con `sqlx.StructScan`.

**Solución práctica:**

Crear helpers en `internal/infrastructure/db/sqlite/helpers_sqlite.go`:

```go
// Valuer
func uuidToVal(u uuid.UUID) driver.Value { return u.String(), nil }

// Scanner vía conversión en rows ad-hoc o usar sqlx.GetContext con parse explícito
// Alternativa: tener row structs con string y mapear a dominio
```

**Mi voto:** almacenar como `TEXT` canonical (36 chars). Es legible con `sqlite3` CLI, fácil de debuggear y menos propenso a confusiones.

### 3.3 `timestamptz` -> `time.Time`

`modernc.org/sqlite` mapea `TEXT` RFC3339 a `time.Time` correctamente. La clave: **normalizar siempre a UTC**.

Guardar `time.Now().UTC()` y leer normalizando a `UTC()` si hiciera falta. Mantener esa convención tal como (presumiblemente) ya se hace con PG.

### 3.4 `id=ANY($1)` -> `IN (?,...,?)`

Correcto expandir. Usar `strings.Repeat` + append de args. Evita `json_each` innecesario y mantiene queries claras y predecibles con `EXPLAIN QUERY PLAN`.

### 3.5 `STRICT` tables

Añadir `CREATE TABLE ... (...) STRICT;` en migración SQLite. Obliga a respetar afinidades y detecta mapeos incorrectos desde el inicio.

### 3.6 PRAGMAs obligatorios

Configurar en DSN y, de forma defensiva, tras abrir conexión:

```text
file:owned.db?_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)
```

Notas:

- `foreign_keys=1`: **CRÍTICO**. Sin esto `ON DELETE CASCADE/RESTRICT` no se ejecutan.
- `journal_mode=WAL`: permite múltiples lectores + 1 escritor concurrentes. Perfecto para chi.
- `busy_timeout`: evita `database is locked` bajo concurrencia ligera.
- `SetMaxOpenConns(1)`: recomendable con SQLite + WAL para evitar contención innecesaria en `database/sql`.

## 4. PG -> SQLite: mapa mental práctico

### 4.1 Tipos

| PG             | SQLite                    | Notas                                            |
| -------------- | ------------------------- | ------------------------------------------------ |
| `uuid`         | `TEXT` (36)               | Usar helpers scan/val o mapear explícito         |
| `timestamptz`  | `TEXT` (RFC3339Z)         | `modernc` mapea bien a `time.Time`               |
| `bool`         | `INTEGER` (0/1)           | Funciona con `bool` en Go                        |
| `jsonb`        | `TEXT` + `json1`          | SQLite trae `json1`. `json_valid` útil con CHECK |
| `text/varchar` | `TEXT`                    | Sin límite por tipo                              |
| `int/bigint`   | `INTEGER` (signed 64-bit) | Suficiente                                       |
| `ARRAY`        | N/A                       | `IN (...)`                                       |
| `ltree`        | N/A                       | Materialized path                                |

### 4.2 Jerarquía

| Operación                      | PostgreSQL                                       | SQLite                                               |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------------- | --- | ----- |
| Subárbol (self+desc)           | `path <@ 'a.b'`                                  | `path = 'a.b' OR path LIKE 'a.b.%'`                  |
| Hijos directos                 | `nlevel(path)=nlevel('a.b')+1 AND path <@ 'a.b'` | `parent_path = 'a.b'`                                |
| Comprobar ancestro (HasAccess) | `grant.path @> node.path`                        | `node.path = grant.path OR node.path LIKE grant.path |     | '.%'` |
| Raíces                         | `nlevel(path)=1`                                 | `parent_path = ''`                                   |
| Borrar subárbol                | `path <@ (SELECT path...)`                       | `path = ? OR path LIKE ?                             |     | '.%'` |

### 4.3 Otras diferencias útiles

| PG                                  | SQLite                                              | Comentario                                               |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| `ILIKE`                             | `LIKE` + `COLLATE NOCASE`                           | `COLLATE NOCASE` en columna `name/email` evita `LOWER()` |
| `ON CONFLICT ... DO NOTHING/UPDATE` | UPSERT                                              | Idéntico                                                 |
| `RETURNING`                         | `RETURNING` (>=3.35)                                | Soportado por `modernc`. Evita `SELECT` extra            |
| `GENERATED ALWAYS`                  | `GENERATED ALWAYS AS (...) STORED/VIRTUAL` (>=3.31) | Podemos usarlo más adelante, no ahora                    |
| `CTE RECURSIVE`                     | `CTE RECURSIVE`                                     | Existe, pero `parent_path`+`LIKE` resuelve lo actual     |
| `EXPLAIN`                           | `EXPLAIN QUERY PLAN`                                | Mucho más claro para ver uso de índices                  |

## 5. Qué pierdo y qué gano

### Pierdo (vs PostgreSQL)

| Aspecto                            | Impacto                 | Mitigación                                                                           |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| **Single-writer**                  | Medio-bajo              | `WAL` + `busy_timeout` + `SetMaxOpenConns(1)`. OK para uso local/multiusuario ligero |
| **Tipado más permisivo**           | Bajo                    | `STRICT` tables + validación en capa aplicación                                      |
| `sqlite-vec` pre-v1                | Medio (si lo usamos ya) | Aislar repo de embeddings tras interfaz. Podemos posponer Fase vec                   |
| Menor variedad de operadores árbol | Muy bajo                | `LIKE` + `parent_path` cubre **exactamente** lo usado hoy                            |
| Sin `EXCLUDE`/`DEFERRABLE`         | Ninguno                 | No se usan en el código actual                                                       |

### Gano (vs PostgreSQL)

| Aspecto                                             | Impacto                           |
| --------------------------------------------------- | --------------------------------- |
| **Binario único** (`CGO_ENABLED=0`)                 | Alto (objetivo principal)         |
| **Sin servidor externo**                            | Alto (despliegue trivial)         |
| **Cross-compile limpio** (`GOOS/GOARCH`)            | Alto                              |
| **Debugging brutal**: archivo `.db` + `sqlite3` CLI | Muy práctico                      |
| **FTS5 disponible sin extensión extra**             | Plus para futura búsqueda híbrida |
| **JSON1 builtin**                                   | Útil                              |
| **Despliegue 1 archivo**                            | Muy cómodo                        |
| `parent_path = ?` simplifica `GetChildren`          | Limpieza real                     |

## 6. Plan de acción por fases

### Fase 0: Spike (validación) – ~1–2 horas

- [ ] `go get modernc.org/sqlite@latest`
- [ ] `go get modernc.org/sqlite/vec@latest` (saber que compila, aunque no usemos aún)
- [ ] Abrir `:memory:` con `sqlx.Open("sqlite", ":memory:")`
- [ ] Probar `StructScan` con `uuid.UUID` (TEXT) + `time.Time` (RFC3339Z)
- [ ] Probar PRAGMAs: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`
- [ ] Probar `CREATE TABLE ... STRICT`
- [ ] Probar `LIKE 'prefix.%'` con índice `TEXT`
- [ ] Probar `ON CONFLICT DO UPDATE SET ... RETURNING`
- [ ] Probar `_ "modernc.org/sqlite/vec"` + `SELECT vec_version()`
- [ ] Verificar `CGO_ENABLED=0 go build ./...`

**Gate:** Todo compila y funciona sin CGO.

### Fase 1: Abstraer wiring – ~0.5–1 día

- [ ] **Config** (`internal/infrastructure/config/env_config.go`)
  - Añadir `DBDriver string` (`postgres|sqlite`). Default `postgres` para **no romper** `.env` actual
  - Añadir `SQLitePath string` (ej. `owned.db`)
  - Generar `SQLiteDSN` con PRAGMAs completos
- [ ] **Factory** (`internal/infrastructure/db/factory.go`)
  - `RepoSet` con los 8 repos + `UnitOfWorkFactory`
  - `Build(driver, dsn string) (*RepoSet, error)` que devuelva misma interfaz conceptual
- [ ] **Common helpers** (`internal/infrastructure/db/common/`)
  - `CloseQuietly`, helpers compartidos entre pg/sqlite
- [ ] **Refactor `cmd/server/main.go`** para usar factory. Mantener ruta PG intacta si `DB_DRIVER=postgres`

**Gate:** Arranca con `DB_DRIVER=postgres` exactamente igual que antes.

### Fase 2: Migraciones SQLite – ~0.5 día

Crear `internal/infrastructure/db/migrations/sqlite/000001_add_scheme.up.sql`

Recomendado **sin `GENERATED ALWAYS`** por ahora:

```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  usr_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL,
  parent_path TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder','file')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_nodes_path ON nodes(path);
CREATE INDEX idx_nodes_parent_path ON nodes(parent_path);
CREATE UNIQUE INDEX ux_nodes_parent_name ON nodes(parent_path, name);

-- Resto de tablas: usrs, usr_pwds, groups, group_usrs, group_nodes, node_comments, docs
-- Mantener misma semántica. Añadir STRICT donde aplique.
-- Mantener triggers updated_at si existen equivalentes
```

Crear `000001_add_scheme.down.sql` con drops en orden inverso.

**Gate:** Migración aplica limpia con `golang-migrate` driver `sqlite`.

### Fase 3: Paquete `sqlite` (incremental) – 2–3 días

Crear `internal/infrastructure/db/sqlite/` con misma estructura que `pg/`.

Orden **óptimo**:

1. [ ] `sqlite.go` – `NewDB(dsn)`, `MigrateUp`, PRAGMAs post-open, `SetMaxOpenConns(1)`
2. [ ] `helpers_sqlite.go` – `uuidVal/uuidScan` u helpers para mapear
3. [ ] `node_repository_sqlite.go` **(más crítico)** – traducir `path <@`, `nlevel`, `parent.path @>` a `LIKE` + `parent_path`
4. [ ] `doc_repository_sqlite.go` – `GetAllFromPath`
5. [ ] `group_usr_repository_sqlite.go` – `HasAccess` con prefijos
6. [ ] `group_repository_sqlite.go` – `GetByIDs` -> `IN`
7. [ ] `usr_repository_sqlite.go` – `ILIKE` -> `LIKE` (+COLLATE NOCASE)
8. [ ] `group_node_repository_sqlite.go`, `group_usr_repository_sqlite.go` (upsert) – validar ON CONFLICT
9. [ ] `usr_pwd_repository_sqlite.go`, `node_comment_repository_sqlite.go` – mínimos cambios
10. [ ] `unitofwork_sqlite.go` – clonado de pg, mismo contrato

**Tips al traducir:**

- Copiar `*_pg.go` y editar query por query. Más seguro que reescribir desde cero.
- Para `Create` en `node_repository`: calcular `parentPath = ""` si sin padre, else `parent.Path.String()`
- `HasAccess`: `WHERE $2 = n_grant.path OR $2 LIKE n_grant.path || '.%'`
- `Delete subtree`: obtener `path` y `DELETE ... WHERE path=? OR path LIKE ?||'.%'`
- En `GetChildren`: usar `parent_path = ?` (más limpio que `nlevel`)

### Fase 4: Wiring + Makefile – ~0.25 día

- [ ] Conectar factory en `cmd/server/main.go` según `DB_DRIVER`
- [ ] Añadir a `.env.example`: `DB_DRIVER=postgres`, `SQLITE_PATH=owned.db`
- [ ] Añadir targets a `Makefile`:
  - `start-http-sqlite`: `DB_DRIVER=sqlite go run ./cmd/server`
  - `test-local-sqlite`: correr tests con SQLite

### Fase 5: Validación con tests – ~0.5–1 día

Ejecutar suite existente con ambos backends.

Con PostgreSQL (no romper):

```bash
make test-local  # o go test ./... con PG up
```

Con SQLite:

```bash
DB_DRIVER=sqlite SQLITE_PATH=/tmp/owned-test-$(date +%s).db go test ./...
# o :memory: pero cuidado con múltiples conexiones; archivo temporal más fiel
```

**Objetivo:** **Mismos tests verdes** con ambos drivers. Si algún test asume detalles PG (poco probable), ajustar solo capa sqlite sin tocar dominio/aplicación.

### Fase 6: sqlite-vec (futuro, opcional) – 1–2 días

Solo cuando Fases 0–5 estén estables.

- [ ] Mantener `_ "modernc.org/sqlite/vec"` import
- [ ] Migración `000002_add_embeddings.up.sql`: `CREATE VIRTUAL TABLE doc_embeddings USING vec0(embedding float[N], doc_id TEXT, node_id TEXT)`
- [ ] `embedding_repository_sqlite.go` con `WHERE embedding MATCH ? AND k = ? ORDER BY distance`
- [ ] Interfaz agnóstica en `application/` para no acoplar dominio a `vec0`

## 7. Checklist "empezar ya"

Antes de tocar repos:

- [ ] **Fase 0 OK**: uuid+time scan, PRAGMAs, LIKE, vec import, `CGO_ENABLED=0`
- [ ] **Factory aprobada**: ruta PG inalterada
- [ ] **Decisión `parent_path`**: **Go-calculado** (recomendado ahora)
- [ ] **Decisión tipos**: `TEXT` para uuid, `STRICT` tables
- [ ] **Tests base verdes** con PG actual

## 8. Recomendación final

**Procede por incremental.** Mi orden concreto:

1. **Spike (Fase 0)** – 1–2h. Despeja dudas sobre `modernc` + uuid
2. **Factory + config (Fase 1)** – abstrae sin riesgo
3. **Migración SQLite + `node_repository_sqlite` (Fases 2–3 inicio)** – validar núcleo árbol lo antes posible
4. **Correr tests con SQLite** – ver si todo cuadra
5. **Completar resto de repos + UoW**

**Mi impresión:** El mayor acierto del plan es mantener dominio puro. Traducir `ltree` a `materialized path + LIKE` es correcto. De hecho, `GetChildren` con `parent_path` queda **más claro** que con `nlevel`.
