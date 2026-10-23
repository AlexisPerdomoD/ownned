# Flags comunes de Go: `CGO_ENABLED`, `GOOS`, `GOARCH` y amigos

> Guía de bolsillo para entender qué significan las banderas de entorno y de `go build` que aparecen por todos lados (Dockerfiles, Makefiles, CI...), especialmente **`CGO_ENABLED=0`**, que es clave para lograr binarios estáticos y de un solo archivo.

---

## 1. De dónde salen esas flags

Go tiene dos familias de opciones que se confunden mucho:

1. **Variables de entorno** que modifican el _toolchain_ (se escriben antes del comando): `CGO_ENABLED`, `GOOS`, `GOARCH`, `GOARM`, `GOAMD64`, `GOPATH`, `GOCACHE`...
2. **Flags del comando `go build`** (van después): `-ldflags`, `-tags`, `-trimpath`, `-race`, `-o`, `-v`...

Suelen combinarse, por ejemplo:

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -o app ./cmd/server
```

Se lee así: _"compilá para Linux ARM64, sin cgo, con binario estático y paths limpios"_.

---

## 2. `CGO_ENABLED` — el protagonista

**Qué es:** controla si Go puede enlazar código C dentro de tu programa. `1` = activo, `0` = desactivado.

- **`CGO_ENABLED=1`** (default cuando hay un compilador C): podés usar paquetes que dependen de C (SQLite de mattn, drivers de BD, OpenSSL...). Pero el binario resultante **depende de libc** (glibc/musl) y de los `.so` del sistema.
- **`CGO_ENABLED=0`**: el compilador usa el runtime puro de Go, sin tocar C. El resultado es un **binario estático** (self-contained): lo copiás a otra máquina y corre igual, sin instalar nada.

```bash
CGO_ENABLED=0 go build -o app ./cmd/server
file app
# app: ELF 64-bit LSB executable, statically linked
```

### Por qué importa para tu proyecto

En `doc/proposal/sqlite_implementation_plan.md` la razón de elegir `modernc.org/sqlite` es precisamente esta: es SQLite **transpilado a Go**, así que funciona con `CGO_ENABLED=0`. Si usaras `mattn/go-sqlite3` (que envuelve el SQLite en C), necesitarías `CGO_ENABLED=1` y adiós binario estático.

### Lo que perdés con `0`

| Aspecto          | CGO_ENABLED=1                     | CGO_ENABLED=0                     |
| ---------------- | --------------------------------- | --------------------------------- |
| Binario          | dinámico (depende de libc)        | estático, self-contained          |
| Cross-compile    | requiere toolchain C por target   | trivial (`GOOS`/`GOARCH` directo) |
| Paquetes con C   | funcionan                         | no compilan                       |
| Rendimiento      | máx. (código nativo)              | suele ser suficiente              |
| Ejemplos típicos | mattn/sqlite3, driver de BD con C | modernc/sqlite, apps CLI puras    |

> Regla práctica: si no dependés de librerías con C, activá `CGO_ENABLED=0` y ganás portabilidad sin costo. El propio Makefile del repo ya usa `CGO_ENABLED=0` en `make build-http`.

---

## 3. `GOOS` / `GOARCH` — cross-compile

Go puede compilar para cualquier plataforma desde cualquier plataforma (sin toolchain extra, mientras no uses CGO).

- **`GOOS`**: sistema operativo destino — `linux`, `darwin` (macOS), `windows`, `freebsd`...
- **`GOARCH`**: arquitectura destino — `amd64`, `arm64`, `386`, `arm`...

```bash
GOOS=linux   GOARCH=amd64 go build -o app-linux-amd64
GOOS=darwin  GOARCH=arm64  go build -o app-macos-arm64   # Apple Silicon
GOOS=windows GOARCH=amd64  go build -o app.exe
```

### Variantes de arquitectura

| Flag                                 | Para           | Valor                                          |
| ------------------------------------ | -------------- | ---------------------------------------------- |
| `GOARM`                              | ARM de 32 bits | `5`, `6`, `7` (Raspberry Pi 1→3)               |
| `GOAMD64`                            | x86-64         | `v1` (default) a `v4` (instrucciones modernas) |
| `GOMIPS` / `GOMIPS64` / `GOPPC64`... | MIPS/PPC       | casos raros                                    |

Ejemplo:

```bash
GOOS=linux GOARCH=arm GOARM=7 go build -o app-pi3
```

> Con `CGO_ENABLED=0`, estas líneas compilan en cualquier máquina sin instalar gcc por target. Ese es el gran win del plan SQLite.

---

## 4. Otras variables de entorno comunes

| Variable      | Qué controla                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `GOPATH`      | Carpeta base de módulos/workspace (en proyectos modernos no se usa para el código, sino `go.mod`) |
| `GOMODCACHE`  | Dónde se cachean los módulos descargados                                                          |
| `GOCACHE`     | Caché de compilación (acelera rebuilds)                                                           |
| `GOFLAGS`     | Flags default que se aplican a todos los comandos `go`                                            |
| `GOPROXY`     | Proxy de módulos (default `proxy.golang.org`)                                                     |
| `GOTOOLCHAIN` | Versionado automático del toolchain (`auto` vs `local`)                                           |
| `GOENV`       | Archivo de configuración persistente (`go env -w`)                                                |
| `GOMAXPROCS`  | Núcleos máx. que usa el runtime (runtime, no build)                                               |
| `GO111MODULE` | Modo módulos (`on`/`off`; irrelevante desde Go 1.16)                                              |

Ver el estado completo en tu máquina:

```bash
go env CGO_ENABLED GOOS GOARCH GOPATH GOCACHE
```

---

## 5. Flags de `go build` que sí importan

### `-ldflags`

Inyecta información en la etapa de _linking_, típicamente variables de versión:

```bash
go build -ldflags="-X main.version=1.2.3 -s -w" ./cmd/server
```

- `-X importpath.Var=valor` → establece una variable `var` en tiempo de build.
- `-s -w` → **reduce el tamaño del binario** (omite tabla de símbolos y debug info). Muy usado en binarios estáticos.

### `-tags` (build tags)

Habilita o deshabilita código por etiquetas (ej. features o drivers):

```bash
go build -tags "sqlite_fts5" ./cmd/server
```

En el código:

```go
//go:build sqlite_fts5
// +build sqlite_fts5
```

Es el mecanismo que usa golang-migrate para incluir/excluir drivers.

### `-trimpath`

Elimina las rutas absolutas de la máquina de build de los binarios (reproducibilidad y privacidad). Los stack traces muestran rutas relativas al módulo.

```bash
go build -trimpath -o app ./cmd/server
```

### `-race`

Activa el detector de carreras de datos (data race) — **solo para tests y debug**, el binario corre mucho más lento:

```bash
go test -race ./...
go build -race -o app-debug ./cmd/server
```

### `-o`

Nombre/salida del binario (default: nombre del paquete).

### `-v` y `-x`

- `-v` → imprime los paquetes que se compilan.
- `-x` → imprime los comandos exactos que se ejecutan (útil para debuggear CGO/ldflags).

### `-a`

Fuerza recompilar todo (ignora la caché). Útil en CI cuando querés builds limpios.

### `-pkgdir`, `-gcflags`, `-buildmode`...

Para casos avanzados: `-gcflags="-m"` inspecciona optimizaciones/escape analysis, `-buildmode=pie` genera PIE, etc. Rara vez los vas a necesitar.

---

## 6. Flags de `go test` que confundís con las de build

| Flag       | Para qué                                                  |
| ---------- | --------------------------------------------------------- |
| `-run`     | Filtrar tests por regex: `go test -run TestGetNode ./...` |
| `-count=1` | Desactivar caché de resultados de tests                   |
| `-timeout` | Timeout global (default 10m)                              |
| `-v`       | Verbose (imprime cada test)                               |
| `-cover`   | Cobertura                                                 |
| `-bench`   | Correr benchmarks: `-bench=. -benchmem`                   |

---

## 7. Cheat sheet de comandos útiles

```bash
go env                       # todo el entorno
go env CGO_ENABLED GOOS      # consultar un valor
go env -w CGO_ENABLED=0      # fijarlo de forma persistente (¡ojo!)

# builds estáticos multi-plataforma (sin toolchain C)
CGO_ENABLED=0 GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o app-linux
CGO_ENABLED=0 GOOS=darwin  GOARCH=arm64 go build -trimpath -ldflags="-s -w" -o app-mac
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o app.exe

# tamaño real tras -ldflags="-s -w"
ls -lh app-linux

# verificar que el binario es estático
file app-linux                 # ... statically linked
ldd app-linux                  # "not a dynamic executable" => no hay deps
```

---

## 8. En la práctica para _owned_

El Makefile ya hace `CGO_ENABLED=0` para `make build-http`. Cuando aterrice el plan SQLite:

```makefile
build-http-sqlite:
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/owned ./cmd/server
```

- `CGO_ENABLED=0` → binario estático, gracias a `modernc.org/sqlite`.
- `-trimpath` → paths reproducibles.
- `-ldflags="-s -w"` → binario más chico.
- Sin `GOOS`/`GOARCH` → compila para la máquina local; añadilos en CI para generar las 3 plataformas desde un solo runner (exactamente lo que hace el caso de Godaddy citado en el plan SQLite).
