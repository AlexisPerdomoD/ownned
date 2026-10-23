# SQLite como backend alternativo — Plan de implementación

> **Objetivo:** evaluar y planificar una capa de repositorios sobre **SQLite** para lograr un **binario único** (sin servidor de base de datos externo), manteniendo intacta la capa de dominio y cubriendo las capacidades que hoy brindan `ltree` y `pgvector`.

---

## 1. Veredicto rápido (TL;DR)

**Sí, es viable y la fricción es baja.** El dominio ya es agnóstico: `NodePath` es un materialized path puro (`string`, solo stdlib). SQLite tiene equivalentes directos:

| Capacidad de PostgreSQL         | Equivalente SQLite                                                      |
| ------------------------------- | ----------------------------------------------------------------------- |
| `ltree` (árboles jerárquicos)   | Materialized path como `TEXT` + `LIKE` / columna generada `parent_path` |
| `pgvector` (búsqueda semántica) | `sqlite-vec` (`vec0` virtual tables)                                    |
| FTS (búsqueda por texto)        | FTS5 (BM25) + fusión híbrida con RRF                                    |

Para el binario único en Go, la recomendación es **`modernc.org/sqlite`** (driver 100% Go, `CGO_ENABLED=0`, estático) + **`modernc.org/sqlite/vec`** (bundea sqlite-vec, sin CGO). Ambos funcionan con `database/sql`, `sqlx` y `golang-migrate`.

**El formato de path actual (`usrs.<uuid>.<uuid>` con guiones→guionbajo) ya es compatible con SQLite tal cual.** No se necesita cambiar `domain.NodePath` ni ninguna entidad.

---

## 2. ¿Qué está atado a PostgreSQL hoy?

Inventario de lo que hay que tocar (nada está en el dominio):

### 2.1 SQL específico de PG por repositorio

| Archivo                                                     | Uso de PG                                                                                                                                      | Adaptación SQLite                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --- | ----- |
| `node_repository_pg.go`                                     | `path <@ $1` (delete subtree), `nlevel(n.path)=...` (children/root), `parent.path @> n.path` (roots by group), índice único con `subpath(...)` | `LIKE` + `parent_path` generada (ver §3)                              |
| `doc_repository_pg.go`                                      | `path <@ $1::ltree` (GetAllFromPath)                                                                                                           | `path = $1 OR path LIKE $1                                            |     | '.%'` |
| `group_usr_repository_pg.go`                                | `n_grant.path @> $2` (HasAccess)                                                                                                               | `$2 = n_grant.path OR $2 LIKE n_grant.path                            |     | '.%'` |
| `usr_repository_pg.go`                                      | `ILIKE`, `LIMIT $x OFFSET $y`, `uuid`                                                                                                          | `LIKE` (case-insensitive en SQLite), mismo LIMIT/OFFSET, columna TEXT |
| `group_repository_pg.go`                                    | `ILIKE`, `id=ANY($1)` (GetByIDs)                                                                                                               | `IN (?,?,...)` expandido (ver §6.3)                                   |
| `group_node_repository_pg.go`                               | `ON CONFLICT ... DO NOTHING`                                                                                                                   | Compatible (SQLite ≥ 3.24)                                            |
| `group_usr_repository_pg.go`                                | `ON CONFLICT ... DO UPDATE SET` (NamedExec)                                                                                                    | Compatible (SQLite ≥ 3.24)                                            |
| `usr_pwd_repository_pg.go`, `node_comment_repository_pg.go` | Nada específico                                                                                                                                | Directa                                                               |

### 2.2 Migraciones

- `internal/infrastructure/db/migrations/postgres/000001_add_scheme.{up,down}.sql` usan `CREATE EXTENSION ltree`, tipo `ltree`, schema `fs.`, `uuid`, `timestamptz`.
- `pg.go` hace `MigrateUp` con el driver `postgres` de golang-migrate apuntando a esa carpeta.

### 2.3 Configuración

- `.env` / `env_config.go` solo expone credenciales `PG_*`. No hay selector de driver.

### 2.4 Wiring

- `cmd/server/main.go` importa directamente `internal/infrastructure/db/pg` para construir los 8 repos y la `UnitOfWorkFactory`.

---

## 3. Equivalente de `ltree` en SQLite

No existe una extensión `ltree` para SQLite, pero **no la necesitás**: `ltree` no es un requerimiento funcional, es una optimización de un materialized path. El dominio ya lo trata como string, y SQLite puede hacer lo mismo con `LIKE` sobre un índice `TEXT`.

### 3.1 Esquema propuesto

```sql
CREATE TABLE nodes (
    id           TEXT PRIMARY KEY,               -- uuid como TEXT
    usr_id       TEXT NOT NULL,                  -- uuid como TEXT
    name         TEXT NOT NULL,
    description  TEXT,
    path         TEXT NOT NULL,                  -- mismo formato que domain.NodePath
    parent_path  TEXT GENERATED ALWAYS AS (      -- columna generada (SQLite ≥ 3.31)
                     CASE
                         WHEN instr(path, '.') = 0 THEN ''
                         ELSE substr(path, 1, length(path) - instr(reverse(path), '.'))
                     END
                 ) STORED,
    type         TEXT NOT NULL CHECK (type IN ('folder','file')),
    created_at   TEXT NOT NULL,                  -- RFC3339 (ver §6.4)
    updated_at   TEXT NOT NULL
);

-- equivalente al índice GiST de ltree: prefix-LIKE usa el índice TEXT
CREATE INDEX idx_nodes_path ON nodes(path);

-- equivalente a ux_nodes_parent_name (un solo nombre por carpeta)
CREATE UNIQUE INDEX ux_nodes_parent_name ON nodes(parent_path, name);
```

> `reverse()` está disponible desde SQLite 3.44.0; `modernc.org/sqlite` bundlea versiones recientes. Alternativa sin `reverse()`: mantener `parent_path` como columna normal escrita por el repo en `Create()` (el dominio ya conoce el padre vía `parent.Path`).

### 3.2 Tabla de traducción ltree → SQLite

| Operación                       | PostgreSQL (ltree)                                       | SQLite                                                                                            |
| ------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --- | ----- |
| Subárbol (descendientes + self) | `path <@ 'a.b'`                                          | `path = 'a.b' OR path LIKE 'a.b.%'`                                                               |
| Ancestros (incl. self)          | `'a.b.c' @> path`                                        | `'a.b.c' = path OR 'a.b.c' LIKE path                                                              |     | '.%'` |
| Hijos directos                  | `path <@ 'a.b' AND nlevel(path) = nlevel('a.b')+1`       | `parent_path = 'a.b'`                                                                             |
| Raíces                          | `nlevel(path) = 1`                                       | `instr(path, '.') = 0`                                                                            |
| Delete de subárbol              | `DELETE ... WHERE path <@ (SELECT path ... WHERE id=$1)` | `DELETE ... WHERE path = (SELECT path ... WHERE id=$1) OR path LIKE (SELECT path ... WHERE id=$1) |     | '.%'` |
| Unicidad `(padre, nombre)`      | `UNIQUE (subpath(path,0,nlevel(path)-1), name)`          | `UNIQUE (parent_path, name)`                                                                      |
| Pattern `~ lquery`              | `path ~ 'a.*'`                                           | `LIKE 'a._%'` (no usado hoy)                                                                      |

**Por qué `LIKE 'x.%'` es exacto aquí:** los labels son UUIDs (`[a-f0-9_]`, sin puntos). `a.b.%` solo casa con `a.b.<algo>`, nunca con `a.bc...`, porque el separador `.` es literal e incluimos el `.` final. La única falsa ausencia es el propio nodo, de ahí el término `=` adicional en queries de subárbol.

### 3.3 Ventajas colaterales sobre el esquema actual

- `GetChildren` se vuelve `WHERE parent_path = $1` — **más simple que `nlevel(...)+1`**.
- El índice `(parent_path, name)` es un índice normal de SQLite (B-tree), sin GiST.
- No hay que mantener la fuga de formato `-`→`_`: el path que produce `domain.NewChildPath` se inserta sin transformación (lo mismo que hoy).

---

## 4. Equivalente de `pgvector` en SQLite

### 4.1 `sqlite-vec`

[`sqlite-vec`](https://github.com/asg017/sqlite-vec) es la extensión de facto (sucesor de `sqlite-vss`), escrita en C puro, corre en cualquier build de SQLite (incluido WASM/embebido).

| Aspecto            | pgvector                            | sqlite-vec                                              |
| ------------------ | ----------------------------------- | ------------------------------------------------------- |
| Tipo               | `vector(1536)` en columna           | Tabla virtual `vec0` (`float[1536]`, `int8[]`, `bit[]`) |
| Distancias         | L2, inner product, cosine           | L2, cosine, hamming (funciones `vec_distance_*`)        |
| KNN                | `ORDER BY embedding <=> $1 LIMIT k` | `WHERE embedding MATCH ? AND k = ? ORDER BY distance`   |
| Índice             | HNSW                                | Chunked flat (exacto) + ANN/DiskANN en desarrollo       |
| Metadata filtering | SQL normal                          | Columnas `metadata_*`/`partition` en la virtual table   |
| Estado             | estable (v0.x, maduro)              | **pre-v1, breaking changes posibles**                   |

```sql
-- schema
CREATE VIRTUAL TABLE doc_embeddings USING vec0(
    embedding float[1536],
    doc_id TEXT,          -- metadata column, devuelta en el KNN
    node_id TEXT partition -- opcional
);

-- insert (vector como JSON o BLOB compacto)
INSERT INTO doc_embeddings(rowid, embedding, doc_id) VALUES (?, ?, ?);

-- KNN
SELECT doc_id, distance
FROM doc_embeddings
WHERE embedding MATCH ?
  AND k = 20
ORDER BY distance;
```

> Como `pgvector`, `sqlite-vec` **no genera embeddings** — los producís en la aplicación (modelo local ONNX o servicio externo) y solo almacenás/consultás. Paridad total con el esquema actual.

### 4.2 Acceso desde Go sin CGO (clave para el binario único)

- **`modernc.org/sqlite/vec`** (recomendado): blank import que auto-registra sqlite-vec (v0.1.9) vía `sqlite3_auto_extension`. Funciona con `database/sql` + `sqlx`, `CGO_ENABLED=0`.

  ```go
  import (
      _ "modernc.org/sqlite"
      _ "modernc.org/sqlite/vec"
  )
  // SELECT vec_version(); CREATE VIRTUAL TABLE ... USING vec0(...)
  ```

- Alternativas (rechazadas por CGO/WASM):
  - `github.com/asg017/sqlite-vec-go-bindings/cgo` → requiere CGO (mattn), rompe el binario estático.
  - `github.com/asg017/sqlite-vec-go-bindings/ncruces` → WASM (ncruces), sin CGO pero más consumo de memoria y cambia de driver.

### 4.3 Bonus: FTS5 + híbrido

SQLite trae **FTS5 (BM25)** de serie, que PG no tiene nativo. El patrón estándar para búsqueda en documentos es híbrido: tabla `_fts` (keyword) + tabla `_vec` (semántica), fusionando con **Reciprocal Rank Fusion (RRF)** en un solo SQL. Referencia: blog de Alex Garcia y simonwillison.net/2024/Oct/4. Esto da **más** que pgvector solo.

---

## 5. Drivers Go para SQLite — decisión

| Driver                          | CGO       | Binario estático                  | Driver name | sqlx | migrate            | Perf relativa                             |
| ------------------------------- | --------- | --------------------------------- | ----------- | ---- | ------------------ | ----------------------------------------- |
| `github.com/mattn/go-sqlite3`   | Sí        | No (necesita gcc/musl por target) | `sqlite3`   | Sí   | `database/sqlite3` | 1x (más rápido writes)                    |
| **`modernc.org/sqlite`**        | **No**    | **Sí (`CGO_ENABLED=0`)**          | `sqlite`    | Sí   | `database/sqlite`  | ~1.3–2.5x más lento writes, ~10–50% reads |
| `github.com/ncruces/go-sqlite3` | No (WASM) | Sí                                | `sqlite3`   | Sí   | —                  | competitivo, pero WASM pesa en memoria    |

**Recomendación: `modernc.org/sqlite`.** El costo de rendimiento (escrituras ~2x más lentas) es irrelevante para una app de gestión de archivos de uso personal/pequeño, y el beneficio (un solo binario estático, cross-compile trivial `GOOS/GOARCH`, sin toolchain C) es exactamente el objetivo planteado. Nota: `golang-migrate` soporta `database/sqlite` (modernc) — confirmado en su README.

> Consideración de benchmarking: las medidas de los posts citados (2022) siguen siendo la referencia cualitativa. Antes de elegir, se puede correr `github.com/cvilsmeier/go-sqlite-bench` con el workload real. Si el hot path nunca es SQLite-bound (es HTTP/filesystem-bound), la diferencia es imperceptible.

---

## 6. Fricciones concretas y cómo resolverlas

### 6.1 Schema `fs.` → SQLite no tiene schemas

Eliminar el prefijo `fs.` en las queries SQLite. Nombrar tablas `nodes`, `usrs`, `usr_pwds`, `groups`, `group_usrs`, `group_nodes`, `node_comments`, `docs` (sin colisión). Las migraciones SQLite son un set separado del de postgres.

### 6.2 `uuid` → `TEXT`

PG tiene tipo `uuid`; SQLite no. Opciones:

- **`TEXT`** con el string canónico (32 hex + guiones). Simple, debuggable. `database/sql` escanea bien un `string` de 36 chars en `uuid.UUID` (que es `[16]byte`)? **No automáticamente** — hay que convertir.
- `BLOB` de 16 bytes (compacto, pero ilegible en consola).

Detalle de escaneo: `domain.UsrID` etc. son `= uuid.UUID` (`[16]byte`). El driver `lib/pq` convierte `uuid` → `[16]byte`; modernc devuelve `[]byte`/`string`. **Se requiere un `ConvertValue`/scan helper** o cambiar los structs `db:"..."` del repo SQLite para mapear. Alternativa pragmática: almacenar como `TEXT` y escanear con un `sql.Scanner`/`driver.Valuer` en los rows del paquete `sqlite`.

### 6.3 `id = ANY($1)` (arrays) → no existe

`group_repository.GetByIDs` usa `WHERE id=ANY($1)` con `pq.Array`. En SQLite:

- Opción A: expandir a `IN (?, ?, ...)` construyendo la query con `strings.Repeat`.
- Opción B: `json_each` — guardar el array como JSON y `WHERE id IN (SELECT value FROM json_each(?))`.

Recomendada: **Opción A** (más simple, el arreglo es pequeño).

### 6.4 `timestamptz` → formatos de fecha

SQLite guarda fechas como `TEXT` (RFC3339), `INTEGER` (unix) o `REAL` (Julian). Para que `sqlx.StructScan` a `time.Time` funcione sin helpers:

- Declarar columnas con **afinidad `TIMESTAMP`** (`created_at TIMESTAMP`) y usar `TEXT` RFC3339. `modernc.org/sqlite` mapea columnas con afinidad timestamp a `time.Time` en ambos sentidos (igual que mattn).
- Alternativa robusta: columna `INTEGER` unix + mapeo explícito en el row struct.

### 6.5 `$1::ltree` y casts → eliminar

Se reemplazan por las traducciones de §3.2. Sin tipo `ltree` en el esquema.

### 6.6 `ILIKE` → `LIKE`

`LIKE` en SQLite es case-insensitive para ASCII por defecto — cubre el caso de `usr_repository`/`group_repository`. Para case-sensitive explícito existe `GLOB`. Sin cambio funcional.

### 6.7 Concurrencia y WAL

SQLite es single-writer. Para una app web local:

- `PRAGMA journal_mode=WAL;` (lecturas concurrentes + una escritura).
- `PRAGMA busy_timeout=5000;` (evitar `SQLITE_BUSY`).
- En DSN modernc: `file:ownned.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)`.

> Importante: activar `foreign_keys(1)` — SQLite **no** valida FKs por defecto.

### 6.8 Triggers de `updated_at`

Se mantienen igual (los triggers en SQLite son SQL estándar), o se delegan al repo (como hoy). Sin fricción.

---

## 7. Plan de implementación por fases

### Fase 0 — Decisión y prototipo (½ día)

- [ ] Correr el spike de driver: `database/sql` + `modernc.org/sqlite` + `sqlx` (open `"sqlite"`, `:memory:`), verificar `StructScan` con `uuid`/`time.Time`.
- [ ] Verificar `go get modernc.org/sqlite` y `_ "modernc.org/sqlite/vec"` compilan con `CGO_ENABLED=0`.

### Fase 1 — Abstraer el wiring (1–2 días)

- [ ] Añadir selector en `env_config.go`: `DB_DRIVER` (`postgres` | `sqlite`) + `SQLITE_DSN`/`SQLITE_PATH`.
- [ ] Crear interfaz común de conexión (o factory de repos) para que `cmd/server/main.go` elija implementación sin tocar el resto del código. Hoy el `pg` package ya expone 8 `New*Repository(db sqlx.ExtContext)` + `NewUnitOfWorkFactory` — el contrato a replicar.
- [ ] Extraer `helpers_pg.go` (`safeClose`, `readSlice`, `rowRecord`) a un paquete compartido (ej. `internal/infrastructure/db/common`) para reutilizarlo en el paquete SQLite.

### Fase 2 — Migraciones SQLite (1 día)

- [ ] Crear `internal/infrastructure/db/migrations/sqlite/000001_add_scheme.{up,down}.sql` con el esquema de §3.1 (tablas sin `fs.`, `path`/`parent_path` TEXT, índices, triggers, virtual tables `vec0` en una migración posterior).
- [ ] `MigrateUp` parametrizado: driver `sqlite` (modernc) + ruta de migraciones según `DB_DRIVER`.
- [ ] Decidir estrategia: **migraciones separadas por driver** (recomendado, es lo que hace golang-migrate con directorios por driver) vs. migraciones compartidas.

### Fase 3 — Paquete `internal/infrastructure/db/sqlite` (3–5 días)

- [ ] `sqlite.go`: `NewDB(dsn string)` + `MigrateUp`.
- [ ] Replicar los 8 repos traduciendo queries según §3.2 y §6:
  - `node_repository` (children/root/roots-by-group/delete) — el grueso del trabajo.
  - `doc_repository` (`GetAllFromPath` con `LIKE`).
  - `group_usr_repository` (`HasAccess` con ancestros por `LIKE`).
  - `group_repository` (`GetByIDs` → `IN`).
  - resto: cambios menores (`ILIKE`, uuid, timestamps).
- [ ] `unitofwork` para sqlite (tx `sqlx.Tx`, igual que `unitofwork_pg.go`).

### Fase 4 — Wiring y Makefile (½ día)

- [ ] `cmd/server/main.go`: construir según `DB_DRIVER`.
- [ ] Makefile: `make start-http-sqlite` (o `DB_DRIVER=sqlite`) con `CGO_ENABLED=0 go build`.
- [ ] `.env.example`: documentar `DB_DRIVER` + `SQLITE_DSN`.

### Fase 5 — Búsqueda semántica con sqlite-vec (2–4 días, futura)

- [ ] Blank import `_ "modernc.org/sqlite/vec"`.
- [ ] Migración: `CREATE VIRTUAL TABLE doc_embeddings USING vec0(embedding float[N], doc_id TEXT)`.
- [ ] Nuevo repo/domain de embeddings (el dominio expone `[]float32`, nunca el tipo `vector`).
- [ ] Pipeline de embedding (aplicación) + query KNN.
- [ ] Opcional: FTS5 + RRF híbrido (§4.3).

### Fase 6 — Tests

- [ ] `test-local-sqlite`: correr la suite de tests sobre `:memory:` o archivo temporal. Verificar que los tests de dominio/repos existentes pasan sin cambios.

---

## 8. Riesgos y limitaciones

| Riesgo                                       | Impacto                           | Mitigación                                                          |
| -------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `modernc.org/sqlite` ~2x más lento en writes | Bajo (app HTTP/FS-bound)          | Benchmark con workload real antes de decidir                        |
| `sqlite-vec` pre-v1 (breaking changes)       | Medio (feature futura)            | Aislar detrás del repo de embeddings; actualizar con pin de versión |
| `uuid.UUID` ↔ TEXT requiere scan helper      | Bajo                              | Helper en rows del paquete sqlite                                   |
| SQLite single-writer                         | Medio-bajo (multi-usuario futuro) | WAL + busy_timeout; migrar a PG si crece la concurrencia            |
| Dos esquemas de migraciones que divergen     | Medio                             | Mantener ambas carpetas sincronizadas; CI con ambos                 |
| `ANY($1)` / arrays / `ILIKE`                 | Bajo                              | Listados en §6                                                      |
| Sin `fs.` schema ni grants                   | Ninguno                           | No aplica a single-binary local                                     |

---

## 9. Decisión recomendada

1. **Sí migrar la opción SQLite** como backend alternativo (`DB_DRIVER=sqlite`), manteniendo postgres como opción de producción/multi-usuario. No reemplazar postgres, **añadir** un segundo backend tras la misma interfaz de dominio.
2. **Driver: `modernc.org/sqlite`** (pure Go, binario estático, `CGO_ENABLED=0`) + **`modernc.org/sqlite/vec`** para vectores.
3. **Árboles: materialized path TEXT + `parent_path` generada** — es la traducción directa de lo que ya hace el dominio; de hecho simplifica `GetChildren`.
4. **Sin cambios en `internal/domain`**: `NodePath` ya es portable (§2 del análisis previo). El formato `.`/`_` queda como contrato compartido entre ambos backends.
5. **Embebidos para búsqueda semántica**: generar en la app, almacenar/consultar con `vec0`.

---

## 10. Referencias

- [sqlite-vec (GitHub)](https://github.com/asg017/sqlite-vec) — extensión vectorial para SQLite.
- [sqlite-vec: Using in Go](https://alexgarcia.xyz/sqlite-vec/go.html) — bindings CGO y WASM.
- [modernc.org/sqlite/vec](https://pkg.go.dev/modernc.org/sqlite/vec) — sqlite-vec embebido sin CGO (v0.1.9).
- [Gorse: modernc.org/sqlite now supports sqlite-vec](https://gorse.io/posts/sqlite-vec) — blank import `_ "modernc.org/sqlite/vec"`.
- [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) — driver Go puro.
- [golang-migrate drivers](https://github.com/golang-migrate/migrate) — `database/sqlite` (modernc) y `database/sqlite3` (mattn).
- [Hybrid full-text and vector search with SQLite (Alex Garcia)](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) — FTS5 + sqlite-vec + RRF.
- [Hybrid full-text search and vector search with SQLite (Simon Willison)](https://simonwillison.net/2024/Oct/4/hybrid-full-text-search-and-vector-search-with-sqlite/).
- [Materialized Paths (SQLite SQL Tutorial)](https://pchemguy.github.io/SQLite-SQL-Tutorial/mat-paths) — técnica de paths materializados.
- [Querying tree structures in SQLite (Charles Leifer)](https://charlesleifer.com/blog/querying-tree-structures-in-sqlite-using-python-and-the-transitive-closure-extension/) — closure table vs materialized path.
- [cvilsmeier/go-sqlite-bench](https://github.com/cvilsmeier/go-sqlite-bench) — benchmark de drivers Go.
