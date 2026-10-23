# Plan de cierre del cliente web — Issues por fases

**Fecha de análisis:** 2026-10-22 · **Estado:** plan ejecutable por agentes en paralelo
**Fuentes de verdad:** [`../frontend/canonical-flows.md`](../frontend/canonical-flows.md), [`../frontend/contract-coverage.md`](../frontend/contract-coverage.md), [`../frontend/product-plan.md`](../frontend/product-plan.md), [`../README.md`](../README.md), `web/app/AGENTS.md`

> Regla de uso: cada issue de este documento es autocontenida y puede copiarse tal cual a un
> agente ejecutor o a GitHub. Ningún flujo se declara cerrado por tener UI: se cierra cuando
> contrato, permisos, estados y errores funcionan de extremo a extremo.

---

## A. Diagnóstico General y Brechas

### Estado actual vs. estado objetivo

| Dimensión | Estado actual | Estado objetivo (cierre) |
| --- | --- | --- |
| Contrato API | 4 desalineaciones directas (comentarios, PATCH de grupo, DTO de usuario, borrado de usuario sin contrato) + transporte fragmentado | Cero divergencias de rutas/métodos/payloads/límites; un único transporte |
| Sesión | `GET /usrs/me` con error ≠ 401 puede dejar la app cargando indefinidamente | Estados clásicos: autenticado / anónimo / error recuperable |
| Autorización | Rol ya disponible en sesión; `access_level`/`display_path` llegan del backend pero no se consumen; no hay helpers compartidos | Helpers puros ROLE × ACCESS × ACCIÓN usados por todas las vistas; sin UUIDs visibles |
| Flujos canónicos | 9/9 con brechas (parciales, desalineados o bloqueados por backend) | 9/9 cubiertos o explícitamente fuera de alcance documentado |
| Explorador | Hijos sin metadata real; sin paginación, orden ni dotfiles | Lista con `doc` real, gating por hijo, orden/acordado, paginación si se decide |
| UI global | `confirm()` nativo, modales inline duplicados, clases arbitrarias, sin toggle de tema | Diálogos compartidos, tokens semánticos, tema persistente, `prefers-reduced-motion` |
| Backend bloqueante | Descarga/borrado de docs por identidad mixta `DocID`/`NodeID`; `PUT /nodes` = 501; comentario de `limited` aún permitido en backend (la UI sigue D1) | Bloqueadores resueltos o la dependencia marcada y el flujo oculto |

### Inventario de brechas (numeradas para referencia cruzada)

1. **Transporte:** `entities/usrs/api/logout.js`, `entities/docs/api/index.js` (upload/download/delete) y `features/node/usecase/useCreateDoc.js` usan `fetch` relativo con manejo de errores propio, fuera de `shared/api/client.js` (que ya maneja multipart/blob y 422).
2. **Sesión:** `features/auth/providers/AuthProvider.jsx` solo corta en `401`; errores de red/500 dejan spinner perpetuo; `ProtectedRoute` no tiene estado terminal.
3. **Autorización:** no existe módulo `shared/authz`; la decisión de mostrar/esconder acciones se reparte ad hoc entre vistas. Semántica acordada: rol (techo) + asignación (`access_level`) + regla de operación.
4. **Comentarios:** el cliente usa rutas fuera de contrato (`POST /comments`, etc.) y límite distinto de 255; falta edición inline con `PATCH` y gating de autoría.
5. **Grupos:** `apiUpdateGroup` envía `PUT`; el backend registró `PATCH /api/v1/groups/{groupID}`.
6. **Usuarios:** creación serializa `access: []` y duplica DTO entre `createUsr.js` y `paginateUsr.js`; validación de contraseña no replica el decoder backend (8–255, letra + dígito + símbolo); existe affordance/API de borrado de usuario sin endpoint registrado.
7. **Affordances sin contrato:** `RegisterForm.jsx`/`useRegister.js` son placeholders de registro público que no existe; botón/eliminación de usuario en `UsrsView` sin backend.
8. **Nodos:** `access_level` y `display_path` no se consumen en Home/NodeView; acciones gobernadas por estado local sin matriz de permisos.
9. **Hijos de carpeta (backend) — resuelto por ajuste del usuario, 2026-10-22:** `internal/app/node/get_node_usecase.go` ahora resuelve la metadata necesaria. Efectos que el cliente debe manejar: (a) `doc` de hijo es **best-effort** y puede llegar vacío ante fallo de lectura, (b) `access_level` del hijo se computa junto con el nodo solicitado, (c) raíces de `GET /nodes` llegan como `NodeDisplay` sin `doc`. Solo queda actualizar la matriz de `contract-coverage.md` y consumir esto en el cliente (issue 1.10 redefinida + 3.1).
10. **Documentos (backend):** descarga y borrado individual sufren mezcla de identidad `DocID`/`NodeID`/storage-key (`internal/app/node/usecase/download_node_file.go`, `create_node_file.go`, `delete_node_file.go`).
11. **Riesgo backend fuera del alcance frontend (reporte, no fix):** `internal/adapter/outbound/postgres/node_repository.go:53` ejecuta `DELETE FROM nodes` sin prefijo de esquema `fs.`; requiere verificación/fix backend antes de fiar borrados recursivos.
12. **Explorador:** sin paginación funcional, sin ordenación real, sin control de dotfiles, secciones duplicadas en `pages/NodeView/index.jsx`.
13. **Grupos-visual:** asociar nodos a grupos exige pegar UUIDs manualmente (`GroupNodesList.jsx` + `useUpsertGroupNode.js`).
14. **UI global:** `Modal`, `ConfirmDialog` y `Toast` existen en `shared/ui` pero conviven con `window.confirm()` y modales inline; sin toggle de tema; clases arbitrarias `text-[--color-*]`.

### Decisiones resueltas (2026-10-22, confirmadas por el usuario)

- **D1 (resuelta):** `limited_usr_role` **no puede crear comentarios**. El frontend asume esta regla en su gating desde ya; el que el backend todavía permita comentar con solo lectura (`create_node_comment_usecase.go` exige solo `read_only_access`) es un fix backend posterior **fuera del alcance frontend**.
- **D2 (resuelta):** `GET /nodes/{id}` ya embebe metadata por hijo. El ajuste en `internal/app/node/get_node_usecase.go` resuelve `doc` para archivos hijos (best-effort: si la lectura del doc falla, el hijo regresa sin doc útil) y `view.go` serializa por hijo `doc` (→ `DocView`), `display_path` y `access_level` (`nodeFileViewFromDomain`/`nodeFolderViewFromDomain`). `get_root_nodes` se mantiene como `NodeDisplay` sin metadata adicional: las tarjetas de raíces no deben depender de `doc` ni de el nombre real derivado de él.
- **D4 (resuelta):** la subida de carpetas inicia desde el cliente (orquestación en navegador con los endpoints existentes). El reporte pro/contras de ambas propuestas vive en [`./dir_upload.md`](./dir_upload.md).
- **D7 (resuelta):** Vitest para lógica pura (`shared/authz` y validación de DTOs) + checklist E2E manual de los 9 flujos. Criterio: mínima superficie de dependencias con garantías explícitas de integridad sobre las decisiones de acceso.

### Decisiones aún abiertas

- **D3** ¿Paginación de hijos local o API? (por defecto: API para carpetas grandes, orden local para pocas)
- **D5** ¿Borrado de usuario se retira o se diseña contrato?
- **D6** ¿Preferencias (tema, dotfiles) solo en `localStorage`? (por defecto: sí)

---

## B. Plan de Issues y Estrategia de Fases

### Justificación del número de fases

El proyecto necesita **5 fases** y no menos:

1. **Fase 1 — Contrato e infraestructura:** errores pequeños pero transversales (transporte, sesión, DTOs, rutas). Deben ir primero porque toda vista nueva heredaría el desorden, y todas son editoriales/independientes → paralelizables sin conflictos.
2. **Fase 2 — Flujos críticos rotos:** los 6 flujos que un usuario toca en su primer día. Requiere fundaciones estables (1.x) porque reescriben gating y estados.
3. **Fase 3 — Explorador y compartición usable:** momento donde la UX real crece (metadata de hijos, orden, selector de nodos). Depende de que 2.x haya dejado el gating estable para no retrabajar.
4. **Fase 4 — Consistencia global:** tema, tokens, accesibilidad. Va al final porque tocar estilos antes de estabilizar vistas duplica trabajo.
5. **Fase 5 — Capacidades avanzadas y cierre:** funcionalidades con decisión pendiente o dependencia dura, más verificación y cierre documental.

Regla de dependencias aplicada: dentro de una fase, cada issue declara su **superficie de conflicto** (`Archivos Afectados`); dos issues de la misma fase que compartan archivo deben secuenciarse o asignarse al mismo agente. Entre fases, la N+1 solo arranca cuando la N está fusionada y verificada.

### Mapa de dependencias

```text
Fase 1 (paralela, 11 issues)
  1.1 transporte ─┐
  1.2 sesión ─────┼─→ Fase 2 (flujos críticos)
  1.3 authz ──────┤
  1.4–1.8 DTOs ───┤
  1.9–1.11 backend┤
                  └─→ Fase 3 (explorador; necesita 1.10 + 2.1)
                          ↓
                      Fase 4 (consistencia global)
                          ↓
                      Fase 5 (avanzado + verificación + cierre)
```

---

### Fase 1 — Ajustes globales de contrato e infraestructura (ejecución 100% paralela)

#### `[ISSUE-1.1] Unificar transporte API, credenciales y normalización de errores`
- **Tipo:** Ajuste Global / Infraestructura.
- **Objetivo / alcance:** centralizar **todas** las llamadas HTTP en `shared/api/client.js`: JSON, multipart y blob comparten base URL (`shared/config/env.js`), credenciales, headers y mapeo de errores incluyendo `422` con `detail`. Migrar logout, subida, descarga y borrado de documentos. **No tocar:** UI, gating de permisos, ni el backend.
- **Archivos afectados:** `web/app/src/shared/api/client.js`, `web/app/src/entities/usrs/api/logout.js`, `web/app/src/entities/docs/api/index.js`, `web/app/src/features/node/usecase/useCreateDoc.js`, `web/app/src/features/node/usecase/useDeleteDoc.js`.
- **Criterios de aceptación:**
  - [ ] Cero `fetch()` directos fuera de `client.js` en el árbol `src/`.
  - [ ] Errores `400/401/403/404/409/422/429/500/501` normalizados sin perder `detail`.
  - [ ] Login → logout → upload → download funcionan con cookies en modo local (Vite + API local).
- **Prompt para agente ejecutor:** "En `web/app`, migra los `fetch` directos de `entities/usrs/api/logout.js`, `entities/docs/api/index.js` y `features/node/usecase/useCreateDoc.js` para usen los helpers de `shared/api/client.js` (mismo base URL, credenciales y mapping de errores que ya maneja 422). No cambies UI ni lógica de negocio; conserva firmas de hooks. Verifica con build y con una sesión local de Vite contra la API en modo local."

#### `[ISSUE-1.2] Restauración de sesión determinística y exposición de rol`
- **Tipo:** Ajuste Global / Infraestructura.
- **Objetivo / alcance:** en `AuthProvider`, distinguir `401` (anónimo) de cualquier otro fallo (estado `error` con reintentar); eliminar el spinner perpetuo; exponer usuario y rol de forma estable para el gating. **No tocar:** rutas, vistas de flujos, ni lógica de `login` correcto.
- **Archivos afectados:** `web/app/src/features/auth/providers/AuthProvider.jsx`, `web/app/src/features/auth/ui/ProtectedRoute.jsx`.
- **Criterios de aceptación:**
  - [ ] Con `401` → estado anónimo y redirección a login.
  - [ ] Con `500` / red caída → estado de error con acción de reintento, nunca carga infinita.
  - [ ] Rol disponible en contexto para `Navbar` y futuras vistas sin fetch ad hoc.
- **Prompt:** "En `web/app/src/features/auth`, ajusta `AuthProvider` para que `GET /usrs/me` falle de forma observable: `401` → estado anónimo; resto → estado de error con reintento (por ejemplo un botón en `ProtectedRoute`). No introduzcas polling. Exponga `role` del usuario en el contexto. Añade/ajusta estados de carga/error en `ProtectedRoute` sin tocar vistas." 

#### `[ISSUE-1.3] Helper compartido de autorización frontend`
- **Tipo:** Ajuste Global / Infraestructura.
- **Objetivo / alcance:** crear módulo puro `shared/authz/` con funciones `canRead/canCreate/canDelete/canComment/canManageUsrs(usr, accessLevel)` según la semántica acordada: **rol = techo**, **asignación (access_level) = attualmente permitido**, **acción = regla específica**. Documentar en JSDoc que no es autoridad final (el backend lo es). **No consumirlo** todavía en vistas (eso es fase 2). Sin motor de políticas genérico.
- **Archivos afectados:** `web/app/src/shared/authz/` (nuevo; `index.js` + funciones), `web/app/src/entities/nodes/index.js` (reexport si aplica).
- **Criterios de aceptación:**
  - [ ] Módulo puro, sin imports de UI ni API.
  - [ ] Maneja `access_level` absent/unknown → ninguna acción mutable habilitada.
  - [ ] Cubre matriz de `canonical-flows.md` (super/normal/limited × read/write/write_delete/owner + sin nivel).
  - [ ] D1 resuelta: `canComment` devuelve `false` siempre que el rol sea `limited_usr_role`, independiente del `access_level` (techo de rol sobre la capacidad de modificar). Regla explícita en el código, no difuminada.
- **Prompt:** "Crea `web/app/src/shared/authz/` con funciones puras de gating: rol como techo, `access_level` jerárquico (read_only_access < write_access < write_delete_access < owner_access), y reglas de acción (leer/comentar/crear/borrar/admin global). Sin UI ni fetch. INCLUYE YA LA REGLA D1 CONFIRMADA: `canComment(usr, accessLevel)` es `false` si el rol es limited aunque el access sea read_only. Sin framework de políticas; funciones simples y testeadas manualmente contra la matriz de `doc/frontend/canonical-flows.md`."

#### `[ISSUE-1.4] Alinear contrato de comentarios (rutas, límite, DTO)`
- **Tipo:** Módulo específico (entidad).
- **Objetivo / alcance:** mover GET/POST/DELETE del comentario a las rutas vigentes del contrato y ajustar límite de contenido a 255. Exponer la API lista para que la fase 2 añada edición inline. **No tocar:** `CommentsList.jsx` ni UX (solo si algún prop cambia de nombre, ajustar mínimo).
- **Archivos afectados:** `web/app/src/entities/comments/api/index.js`, `web/app/src/features/comments/usecase/index.js`.
- **Criterios de aceptación:**
  - [ ] Rutas/métodos exactos del backend en cada función.
  - [ ] Payload respeta límite 255 y campos del decoder.
  - [ ] Listar/crear/borrar funcionan con la vista actual; ningún cambio de UX visible.
- **Prompt:** "En `web/app/src/entities/comments/api/`, corrige rutas/métodos/limites de comentarios para coincidir 1:1 con el contrato backend (revisa `doc/frontend/contract-coverage.md`, filas de comentarios). Ajusta `features/comments/usecase/index.js` sin alterar la vista. Prioridad: contratos correctos, no rediseño." 

#### `[ISSUE-1.5] Actualización de grupo vía PATCH`
- **Tipo:** Módulo específico (entidad).
- **Objetivo / alcance:** cambiar `apiUpdateGroup` de `PUT` a `PATCH` y ajustar consumo en hooks/vistas sin cambio de UX.
- **Archivos afectados:** `web/app/src/entities/groups/api/index.js`, `web/app/src/features/group/usecase/useUpdateGroup.js`.
- **Criterios de aceptación:**
  - [ ] Petición = `PATCH /api/v1/groups/{groupID}` con payload anticipado por el contrato.
  - [ ] Errores `403`/validación propagados sin estado optimista incorrecto.
- **Prompt:** "Cambia `apiUpdateGroup` a `PATCH` y verifica en `features/group/usecase/useUpdateGroup.js` que la respuesta se consuma igual. Sin cambios de UI."

#### `[ISSUE-1.6] DTO y validación de creación de usuario`
- **Tipo:** Módulo específico (entidad).
- **Objetivo / alcance:** consolidar DTO de creación en `createUsr.js` (devolverlo a `entities/usrs/api/index.js`), eliminar `access: []` del payload, replicar validación backend de contraseña (8–255, al menos una letra, un dígito, un símbolo). **No tocar:** vista de usuarios ni gating de rol (fase 2).
- **Archivos afectados:** `web/app/src/entities/usrs/api/createUsr.js`, `web/app/src/entities/usrs/api/paginateUsr.js` (quitar duplicado), `web/app/src/entities/usrs/api/index.js`, `web/app/src/entities/usrs/index.js`.
- **Criterios de aceptación:**
  - [ ] Payload enviado contiene solo campos aceptados por el decoder backend.
  - [ ] Validación de contraseña exacta (mensajes de error claros) y reutilizable.
  - [ ] No quedan archivos duplicados o vacíos re-exportados.
- **Prompt:** "En `web/app/src/entities/usrs`, consolidación única del DTO de crear usuario, sin `access`, con validación de contraseña igual a la del backend (8–255, letra+dígito+símbolo). Reexport correcto en `index.js`; elimina duplicados de `paginateUsr.js`. No toques vistas."

#### `[ISSUE-1.7] Retirar affordances sin contrato`
- **Tipo:** Ajuste Global / Infraestructura.
- **Objetivo / alcance:** eliminar registro público placeholder (`RegisterForm.jsx`/`useRegister.js`) y acción/API de borrado de usuario (`deleteUsr.js`) porque no existen en el contrato. Documentar decisión D5. **No tocar:** vistas de flujos legítimos y la redirección de login.
- **Archivos afectados:** `web/app/src/features/auth/ui/RegisterForm.jsx`, `web/app/src/features/auth/usecase/useRegister.js`, `web/app/src/features/auth/usecase/index.js`, `web/app/src/entities/usrs/api/deleteUsr.js`, `web/app/src/entities/usrs/api/index.js`, `web/app/src/pages/UsrsView/index.jsx` (solo quitar botón/accion de borrado).
- **Criterios de aceptación:**
  - [ ] No queda ningún acceso visible a operaciones sin endpoint.
  - [ ] No quedan imports/exports rotos; build y lint limpios.
  - [ ] D5 queda registrada en `product-plan.md` (una línea).
- **Prompt:** "Elimina en `web/app` el flujo de registro placeholder y la acción/API de borrado de usuario (no existen en el backend). Deja `UsrsView` sin ese botón y sin imports muertos. Registra en `doc/frontend/product-plan.md` (lista de decisiones abiertas) que el borrado de usuario es D5."

#### `[ISSUE-1.8] Configuración local de CORS/cookies`
- **Tipo:** Ajuste Global / Infraestructura.
- **Objetivo / alcance:** dejar documentado y funcional el modo `MODE=local` para desarrollo Vite + API local, evitando sorpresas de cookies/CORS.
- **Archivos afectados:** `.env.example`, `README.md` (solo sección de desarrollo local; el README tiene modificaciones del usuario hoy, coordinar antes de tocarlo).
- **Criterios de aceptación:**
  - [ ] `.env.example` con `MODE=local` comentado como valor de desarrollo.
  - [ ] Login/logout desde Vite funciona sin tocar código.
- **Prompt:** "Documenta el modo de desarrollo local (CORS/cookies) en `.env.example` y README (coordinar: README tiene cambios en curso del usuario). Verifica con `make db-local-up` + API local + Vite que login/logout funcionan desde `localhost:5173`."

#### `[ISSUE-1.9] (backend) Resolver identidad DocID/NodeID en descarga y borrado de documento`
- **Tipo:** Ajuste Global / Infraestructura (repo backend).
- **Objetivo / alcance:** hacer que `GET /nodes/{nodeID}/doc/{docID}/download` y el borrado individual usen una identidad coherente: el cliente recibe `docID` pero el backend necesita el `NodeID` + storage key. Elegir y aplicar estrategia (resolver doc→node o devolver nodeID en la vista). **No tocar:** rutas públicas ni semántica de permisos.
- **Archivos afectados:** `internal/app/node/usecase/download_node_file.go`, `internal/app/node/usecase/delete_node_file.go`, `internal/app/node/usecase/create_node_file.go` (storage key devuelta), `internal/adapter/inbound/httpapi/node_handler.go`, `internal/adapter/inbound/httpapi/view.go` si la solución exponer `nodeID` en la vista.
- **Criterios de aceptación:**
  - [ ] Descarga con `docID` devuelto por la API funciona para archivos reales.
  - [ ] Borrado individual no deja archivo huérfano en storage ni rompe versión vigente.
  - [ ] Tests backend (`go test ./...`) pasan.
- **Prompt:** "Backend: audits y corrige la cadena de identidad entre `docs`, `nodes` y storage keys para que descarga y borrado individual de documentos sean confiables usando los IDs que el cliente recibe. Sin cambiar el contrato público ni los permisos. Añade cuacks/revisiones mínimas a tests backend si aplica (go test ./...)."

#### `[ISSUE-1.10] (docs/verificación) Consolidar el contrato de hijos tras el ajuste backend 2026-10-22`
- **Tipo:** Módulo específico (documentación + verificación backend).
- **Objetivo / alcance:** el ajuste ya aplicado en `internal/app/node/get_node_usecase.go` (doc por hijo best-effort; `display_path` por hijo; `get_root_nodes` como `NodeDisplay` sin metadata extra) ya cuenta con serialización vigente en `internal/adapter/inbound/httpapi/view.go` (`doc,omitempty`, `display_path`, `access_level` → `DocView`). Solo queda documentar la forma real y verificar que no haya regresión. **No tocar** usecases ni domain salvo que la verificación exponga regresión (entonces reportar y detenerse).
- **Archivos afectados:** `doc/frontend/contract-coverage.md` (filas de `GET /nodes` y `GET /nodes/{id}`), tests backend solo si la verificación pide ajustes.
- **Criterios de aceptación:**
  - [ ] `contract-coverage.md` refleja la forma real de hijos: `doc` opcional y best-effort (vacío ante fallo de lectura), `display_path` y `access_level` por hijo, niños anidados limitados a un nivel.
  - [ ] Documentado explícitamente que raíces (`NodeDisplay`) no traen `doc`.
  - [ ] `go test ./...` pasa.
- **Prompt:** "Verifica el comportamiento actual de `GET /nodes/{id}` tras el ajuste de `get_node_usecase.go`: hijos con `doc` best-effort (puede venir vacío), `display_path` y `access_level` por hijo, children solo de primer nivel, y raíces consumibles como `NodeDisplay` sin doc. Ejecuta `go test ./...`. Actualiza las filas de nodos en `doc/frontend/contract-coverage.md` (incluida la semántica de `doc` vacío). Si ves regresión, repórtala y detente."

#### `[ISSUE-1.11] (backend) Verificar DELETE de nodos: esquema y cascada`
- **Tipo:** Ajuste Global / Infraestructura (repo backend).
- **Objetivo / alcance:** **reporte + fix si confirma.** El hallazgo de análisis indica que `internal/adapter/outbound/postgres/node_repository.go:53` usa `DELETE FROM nodes` sin prefijo de esquema. Verificar en entorno real si es error o si el esquema por defecto hace innecesario el prefijo; si es error, corregir y añadir test del borrado recursivo. **No tocar:** lógica de negocio fuera de la capa repositorio.
- **Archivos afectados:** `internal/adapter/outbound/postgres/node_repository.go`, tests backend si aplica.
- **Criterios de aceptación:**
  - [ ] Hallazgo verificado (si es falso positivo, documentar por qué).
  - [ ] Si es error: fix + test que cubra borrado recursivo real contra PostgreSQL de test (`make test-local`).
- **Prompt:** "Backend: revisa `internal/adapter/outbound/postgres/node_repository.go` alrededor de la línea 53: la consulta `DELETE FROM nodes` parece carecer del prefijo de esquema que usan otras consultas. Replica el flujo de borrado recursivo en entorno de test local (`make test-local`). Si el hallazgo es cierto, corrige y añade test. Si es falso positivo, documenta con la verificación real en `doc/frontend/closure-plan-report.md`… NO: usa comentario en el PR para explicar; no crees archivos extra."

---

### Fase 2 — Flujos críticos rotos (dependen de fase 1)

#### `[ISSUE-2.1] Gobernar acciones de nodo con rol + access_level y consumir display_path`
- **Tipo:** Módulo específico (flujo de exploración actual).
- **Objetivo / alcance:** en Home y NodeView, mostrar `display_path` sin UUIDs y gobernar New Folder / upload / edit / delete del nodo actual con `shared/authz` (1.3) + rol de sesión (1.2). **No tocar:** comentarios (2.2), metadata de hijos (fase 3), ni lógica backend.
- **Archivos afectados:** `web/app/src/pages/HomeView/index.jsx`, `web/app/src/pages/NodeView/index.jsx`, `web/app/src/features/node/ui/NodeCard.jsx`, `web/app/src/features/node/ui/DocCard.jsx` (solo si comparte gating).
- **Criterios de aceptación:**
  - [ ] Cero UUIDs visibles en pantallas de nodo.
  - [ ] Con `limited` + `read_only_access` no se muestran acciones mutables.
  - [ ] `access_level` ausente → ninguna acción mutable habilitada.
  - [ ] Errores `403` backend siempre respetados (no hay bypass en UI).
- **Prompt:** "En `web/app/src/pages/HomeView` y `NodeView`, consume `display_path` y `access_level` de las respuestas de nodos y úsalos con el helper `shared/authz` y el rol del AuthProvider para mostrar/ocultar acciones. Sin UUIDs. No toques la parte de comentarios del NodeView (otro agente la trabajará)."
- **Conflicto con fase 2:** secuenciar antes de 2.2 (comparten `NodeView`).

#### `[ISSUE-2.2] Completar flujo de comentarios (edición, autoría, límites)`
- **Tipo:** Módulo específico (flujo).
- **Objetivo / alcance:** edición inline con `PATCH`, mostrar edit/borrar solo a autor o super según regla (usando `shared/authz`), mantener límite 255, preservar borrador en error. **No tocar:** rutas de comentarios ya corregidas en 1.4 (solo editar consumo), gating de nodos 2.1.
- **Archivos afectados:** `web/app/src/features/comments/ui/CommentsList.jsx`, `web/app/src/features/comments/usecase/index.js`, `web/app/src/pages/NodeView/index.jsx` (montaje de comentarios).
- **Criterios de aceptación:**
  - [ ] GET/POST/PATCH/DELETE usan rutas correctas.
  - [ ] Autor ve editar/borrar; otros usuarios no, salvo super.
  - [ ] Los usuarios `limited_usr_role` **no ven la affordance de comentar** (D1), aunque el backend acepte la petición; si el backend la rechaza también mostramos el error, pero la regla D1 ya evita enviarla.
  - [ ] Error no pierde el texto que el usuario estaba escribiendo.
- **Prompt:** "En `web/app/src/features/comments`, añade edición inline (PATCH) y gating de autoría con authz. Asegura límite 255 y preservación del borrador en fallos. APLICA D1: un usuario con rol limited no debe ver el botón/envío de comentario (regla confirmada de producto; el backend ahora mismo aún permite comentar con solo lectura — no impacta a este scope, se arregla después en backend). En `NodeView` solo ajusta el montaje de la lista de comentarios; no cambies el resto de la vista."
- **Dependencia:** 1.4, 1.2; después de 2.1 (mismo archivo).

#### `[ISSUE-2.3] Cerrar administración de usuarios`
- **Tipo:** Módulo específico (flujo).
- **Objetivo / alcance:** gating de acceso/enlace por rol de super, filtro de rol en UI, validación final del formulario con la validación de 1.6, manejo correcto de `401/403` backend.
- **Archivos afectados:** `web/app/src/pages/UsrsView/index.jsx`, `web/app/src/shared/ui/Navbar.jsx` (visibilidad del enlace), `web/app/src/entities/usrs/api/index.js` (paginación con filtros si falta).
- **Criterios de aceptación:**
  - [ ] Solo super ve y usa administración de usuarios.
  - [ ] Búsqueda/paginación/filtro de rol contra el contrato.
  - [ ] Creación válida e inválida con feedback coherente.
- **Prompt:** "En `web/app`, habilita la admin de usuarios solo para super usando el rol del AuthProvider; ajusta paginación y filtro de rol a la ruta real; valida el formulario con el DTO de 1.6. No agregues borrado de usuario (no existe)."

#### `[ISSUE-2.4] Cerrar gestión básica de grupos`
- **Tipo:** Módulo específico (flujo).
- **Objetivo / alcance:** verificar CRUD, usuarios, nodos, update `PATCH` y permisos `403`, sin selector visual (fase 3). Sin UUIDs visibles donde se pueda mostrar un nombre.
- **Archivos afectados:** `web/app/src/pages/GroupsView/index.jsx`, `web/app/src/pages/GroupView/index.jsx`, `web/app/src/features/group/ui/*`.
- **Criterios de aceptación:**
  - [ ] CRUD + membresías con rutas correctas (PATCH incluido).
  - [ ] `403` manejado sin estado optimista.
  - [ ] No obliga a pegar UUID de usuario entre los existentes si la API ya da el listado.
- **Prompt:** "En `web/app`, cierra el flujo de grupos: no inventes el selector visual todavía, corrige `403`, revisa los listados y asegura el PATCH. Deja marcadas las mejoras visuales para la fase 3 (selector de nodos)."

#### `[ISSUE-2.5] Endurecer subida y borrado de documentos en cliente`
- **Tipo:** Módulo específico (flujo).
- **Objetivo / alcance:** con transporte unificado y authz, gestionar subida con feedback claro (estado o progreso simple), gobernar acciones por permisos, manejar error. **Desbloqueo backend:** la descarga/borrado fiables dependen de 1.9; esta issue no declara completa la descarga si 1.9 no está fusionada.
- **Archivos afectados:** `web/app/src/features/node/usecase/useCreateDoc.js`, `useDeleteDoc.js`, `web/app/src/features/node/ui/UploadDropzone.jsx`, `web/app/src/pages/NodeView/index.jsx` (solo se subida).
- **Criterios de aceptación:**
  - [ ] Subida viaja por `client.js` con cookies correctas.
  - [ ] Novedades `413`, `415`, `403` con mensaje útil para el usuario.
  - [ ] Descarga/borrado marcados completos solo tras 1.9 fusionada.
- **Prompt:** "En `web/app`, aplica transporte unificado y authz a subida y borrado de documentos. Añade estados de progreso/éxito/error claros en `UploadDropzone`. Mantén visible la descarga/borrado solo si la identidad DocID/NodeID backend (issue 1.9) ya está resuelta."

#### `[ISSUE-2.6] Normalizar operaciones de carpeta (crear, editar 501, borrado recursivo con confirmación)`
- **Tipo:** Módulo específico (flujo).
- **Objetivo / alcance:** crear carpeta con validación; edición debe mostrar muy claramente que no está disponible mientras el backend sigue en `501` (no fingir que funciona); borrado recursivo con confirmación explícita en `ConfirmDialog` (no `window.confirm`).
- **Archivos afectados:** `web/app/src/features/node/usecase/useCreateFolder.js`, `useUpdateNode.js`, `useDeleteNode.js`, `web/app/src/pages/NodeView/index.jsx` (montaje de acciones).
- **Criterios de aceptación:**
  - [ ] Crear y borrar funcionan según permisos.
  - [ ] Editar no aparece como funcional mientras sea `501`, pero no se rompe el flujo.
  - [ ] Confirmación de borrado recursivo usa el `ConfirmDialog` compartido.
- **Prompt:** "En `web/app`, estabiliza creación/edición/borrado de carpetas: maneja `501` de edición como capacidad no disponible (por ejemplo deshabilitar el botón con tooltip) y usa `ConfirmDialog` para delete recursivo. Refresca la vista tras operaciones."

---

### Fase 3 — Explorador, paginación y compartición usable

#### `[ISSUE-3.1] Renderizar hijos de carpeta con metadata real y gating por hijo`
- **Tipo:** Módulo específico (flujo de exploración).
- **Depende de:** 1.10 (documentación del contrato, ya operativa tras el ajuste del usuario) + 2.1 (authz consumido).
- **Objetivo / alcance:** renderizar los hijos con metadata real: archivos con `doc` (id, nombre original, tipo → iconos y base para el futuro reproductor multimedia), carpetas con metadata de nodo. El `doc` de hijo es **best-effort**: si llega vacío/inválido, degradar con icono genérico y nombre de nodo sin tratarlo como error. Aplicar gating por hijo con su propio campo `access_level` (never infer del padre). **No consumir `doc` en tarjetas de raíz** (`GET /nodes` entrega `NodeDisplay` sin metadata).
- **Archivos afectados:** `web/app/src/pages/NodeView/index.jsx`, `web/app/src/features/node/ui/NodeList.jsx`, `NodeCard.jsx`, `DocCard.jsx`.
- **Criterios de aceptación:**
  - [ ] Los archivos hijos con `doc` válido muestran nombre original y tipo; los que llegan con `doc` vacío degradan a icono/nombre de nodo sin tratarlo como error.
  - [ ] Gating individual conforme al `access_level` propio de cada hijo (hoy el backend lo computa junto al nodo solicitado; no inferimos).
  - [ ] Rendimiento aceptable en carpeta con cientos de hijos (documentar el punto de corte).
- **Prompt:** "En `web/app`, consume la metadata por hijo de `GET /nodes/{id}` para renderizar carpetas/archivos con `doc` real (iconos por tipo y base para el futuro reproductor multimedia) y gating individual por `access_level` del hijo. Si `doc` llega vacío (best-effort del backend), degrada con icono genérico y nombre de nodo. No dependas de `doc` en `HomeView`/raíces (el endpoint de raíces entrega `NodeDisplay` sin metadata). Añade un límite razonable + mensaje de 'demasiados elementos' si aplica."

#### `[ISSUE-3.2] Paginación de nodos y documentos`
- **Tipo:** Módulo específico (flujo).
- **Depende de:** 1.1, 3.1; decisión D3 por defecto: paginación API para carpetas grandes, orden local para pocas.
- **Objetivo / alcance:** consumir `/nodes/paginate` y `/nodes/docs/paginate` con paginación, búsqueda y filtros coherentes con el contrato.
- **Archivos afectados:** `web/app/src/entities/nodes/api/*`, `web/app/src/features/node/usecase/usePaginateNode.js`, `web/app/src/pages/NodeView/index.jsx`.
- **Criterios de aceptación:**
  - [ ] Paginación funcional con estados vacío/error.
  - [ ] No rompe navegación actual ni flujos 2.x.
- **Prompt:** "En `web/app`, integra las rutas de paginación reales con hook + vista y filtros del contrato. Mantén la navegación por carpetas intacta."

#### `[ISSUE-3.3] Ordenación y dotfiles`
- **Tipo:** Módulo específico (flujo).
- **Depende de:** 3.1, decisión D3 y D6 (por defecto: localStorage).
- **Objetivo / alcance:** orden por nombre/creación/modificación (carpetas primero, dirección clara), dotfiles ocultos por defecto con control persistente.
- **Archivos afectados:** `web/app/src/pages/NodeView/index.jsx`, `web/app/src/features/node/ui/NodeList.jsx`.
- **Criterios de aceptación:**
  - [ ] Orden funciona en carpetas y archivos con nombre real.
  - [ ] Panorámica dotfiles recordada por dispositivo.
- **Prompt:** "En `web/app`, añade ordenación y control de dotfiles en NodeView; usa nombre real y persistencia local según la decisión D6."

#### `[ISSUE-3.4] Selector visual de nodos para compartir con grupos`
- **Tipo:** Módulo específico (flujo).
- **Depende de:** 2.4, 3.2 (opcional).
- **Objetivo / alcance:** reemplazar el input manual de UUID por selección navegable/buscable de nodos que el usuario puede compartir (respetando su propio techo de rol).
- **Archivos afectados:** `web/app/src/features/group/ui/GroupNodesList.jsx`, `web/app/src/features/group/usecase/useUpsertGroupNode.js`, `web/app/src/entities/nodes/api/*`.
- **Criterios de aceptación:**
  - [ ] Cero inputs de UUID manuales.
  - [ ] Permisos `403` interpretados como "no puedes compartir este nodo", no como error genérico.
  - [ ] Lista y relación actualizadas tras asociar/quitar.
- **Prompt:** "En `web/app`, sustituye el pegado manual de UUID en asignación nodo↔grupo por un selector navegable/buscable de nodos. Respeta el techo de rol y los `403` backend."

#### `[ISSUE-3.5] Consolidar vista de explorador (responsive, estados, densidad)`
- **Tipo:** Módulo específico (refactor).
- **Depende de:** 2.1, 2.2, 3.1.
- **Objetivo / alcance:** eliminar secciones duplicadas en `NodeView`, unificar responsive/keyboard/estados vacíos, **sin** introducir nueva vista no acordada.
- **Archivos afectados:** `web/app/src/pages/NodeView/index.jsx`, `web/app/src/features/node/ui/*`, `web/app/src/shared/ui/*` (solo si un átomo falta).
- **Criterios de aceptación:**
  - [ ] Una sola fuente de verdad para bloques duplicados.
  - [ ] Navegación por teclado y foco visibles en acciones principales.
- **Prompt:** "Refactoriza `NodeView` para quitar la duplicación de secciones y estados, mejorable en responsive/accesibilidad básica. No cambies el comportamiento de flujo ya cerrado; solo consolida."

#### `[ISSUE-3.6] Consolidar confirmaciones y modales compartidos`
- **Tipo:** Ajuste Global / Infraestructura.
- **Depende de:** fases 2–3 estables para no crear conflictos.
- **Objetivo / alcance:** eliminar todos los `window.confirm()` reemplazándolos por `ConfirmDialog`; unificar modales inline al `Modal` compartido.
- **Archivos afectados:** `web/app/src/pages/*`, `web/app/src/features/*/ui/*` (búsqueda y reemplazo).
- **Criterios de aceptación:**
  - [ ] Cero `window.confirm`/`window.alert` en `src/`.
  - [ ] Foco gestionado y Escape cierra el diálogo.
- **Prompt:** "Busca y reemplaza en `web/app/src` todos los `window.confirm`/modales inline por los componentes compartidos (`shared/ui/ConfirmDialog.jsx`, `shared/ui/Modal.jsx`). No cambies textos ni flujos."

---

### Fase 4 — Consistencia global (tema, tokens, accesibilidad)

#### `[ISSUE-4.1] Tema claro/oscuro persistente y movimiento reducido`
- **Tipo:** Ajuste Global / Infraestructura.
- **Depende de:** decisión D6; puede paralelizarse con fase 3 si no comparte archivos (coordina con 3.5).
- **Objetivo / alcance:** toggle en `Navbar`, persistencia en `localStorage`, sin flash de tema en la carga, respetar `prefers-color-scheme` como valor inicial y `prefers-reduced-motion` en animaciones globales.
- **Archivos afectados:** `web/app/src/shared/ui/Navbar.jsx`, `web/app/src/shared/ui/index.jsx` (proveedor de tema), CSS global de `web/app`.
- **Criterios de aceptación:**
  - [ ] Sin flash con tema prefierido al recargar.
  - [ ] Animaciones desactivadas si el usuario lo pide a nivel de OS.
- **Prompt:** "En `web/app`, añade un toggle de tema con persistencia local e inicialización desde `prefers-color-scheme` sin FOUC. Añade soporte `prefers-reduced-motion` a nivel de estilos."

#### `[ISSUE-4.2] Limpieza de tokens y clases arbitrarias`
- **Tipo:** Ajuste Global / Infraestructura.
- **Depende de:** fase 3 (evitar conflictos de estilo con vistas en refactor).
- **Objetivo / alcance:** migrar clases tipo `text-[--color-*]` a tokens semánticos donde existan (revisar `web/app/AGENTS.md` para las reglas de tokens) y revisar contraste.
- **Archivos afectados:** `web/app/src/**` (clases), `web/app/AGENTS.md` (si se consolida una regla nueva).
- **Criterios de aceptación:** [ ] Sin clases arbitrarias de variables CSS en las vistas principales. [ ] Contraste mínimo AA en textos y estados.
- **Prompt:** "En `web/app`, reemplaza clases arbitrarias de variables CSS por los tokens semánticos del tema, según las reglas de `web/app/AGENTS.md`. No cambies jerarquía visual percibida."

#### `[ISSUE-4.3] Auditoría de accesibilidad y estados globales`
- **Tipo:** Ajuste Global / Infraestructura.
- **Depende de:** 3.5 y 4.1.
- **Objetivo / alcance:** foco visible, teclado, nombres accesibles, contraste, carga/vacío/error coherentes en todos los flujos.
- **Archivos afectados:** `web/app/src/**` (según auditoría).
- **Criterios de aceptación:** [ ] Auditoría manual documentada en notas de la PR. [ ] Estados globales coherentes en los 9 flujos canónicos.
- **Prompt:** "Realiza auditoría de accesibilidad manual en `web/app`: foco, teclado, nombres y contraste. Documenta hallazgos y arranates mínimos en la descripción del PR."

---

### Fase 5 — Capacidades avanzadas, verificación y cierre

#### `[ISSUE-5.1] Subida de carpetas completas`
- **Tipo:** Módulo específico (flujo).
- **Depende de:** D4 resuelta (cliente orquesta); fases 1–2.
- **Objetivo / alcance:** implementar la estrategia acordada según [`./dir_upload.md`](./dir_upload.md) (recomendación: **Propuesta A — orquestación en cliente** con los endpoints existentes), con límites definidos (máx. archivos, profundidad, tamaño total), cola de subida con progreso por archivo, desduplicación por ruta relativa, cancelación y fallos parciales visibles. **No desarrollar backend batch en esta fase** (queda documentado como Propuesta B con criterios de migración).
- **Archivos afectados:** `web/app/src/features/node/ui/UploadDropzone.jsx`, `web/app/src/features/node/usecase/*`, `web/app/src/entities/docs/api/*` (si el transporte de subida necesita un helper dedicado).
- **Criterios de aceptación:** [ ] Subida de estructura de carpetas refleja el árbol. [ ] Fallo en un archivo no rompe el resto y el usuario sabe qué falló y puede reintentar la lista fallida. [ ] Límites y cancelación documentados en la propuesta y aplicados.
- **Prompt:** "Implementa la subida de carpetas en `web/app` siguiendo la **Propuesta A** de `doc/proposal/dir_upload.md` (orquestación en el navegador con endpoints existentes): cola secuencial, desduplicación por ruta relativa, cancelación, reintento de la lista de archivos fallidos y los límites documentados. No inventes endpoints backend batch; eso es la Propuesta B del reporte y queda para decisión futura."

#### `[ISSUE-5.2] Descarga de carpeta`
- **Tipo:** Módulo específico (flujo).
- **Depende de:** backend B4 (descarga de carpeta aún `501`).
- **Objetivo / alcance:** **no implementar** la UI de descarga de carpeta mientras el backend responda `501`. Si el backend llega a implementar, integrarla.
- **Archivos afectados:** `web/app/src/pages/NodeView/index.jsx` (ocultar affordance cuando aplique), `web/app/src/entities/docs/api/*`.
- **Criterios de aceptación:** [ ] Ningún affordance de descarga de carpeta visible hasta que backend tenga contrato real.
- **Prompt:** "Asegura en `web/app` que la descarga de carpeta no se muestre como disponible mientras el endpoint siga en `501`. Solo se activa cuando exista implementación backend y contrato."

#### `[ISSUE-5.3] Verificación automatizada de flujos críticos`
- **Tipo:** Módulo específico (tests).
- **Depende de:** D7 resuelta (2026-10-22: Vitest para lógica pura + checklist manual); cierre de fases 1–4.
- **Objetivo / alcance:** suite Vitest mínima **solo para lógica pura**: helpers `shared/authz` (prioridad máxima: aquí vive la integridad de las decisiones de acceso, incluida la regla D1) y validaciones de DTOs (1.6, contraseñas/payloads). Los flujos E2E se cierran con checklist manual documentado de los 9 flujos de `canonical-flows.md`. **No introducir** Playwright/Cypress ni harness de navegador en este ciclo: maximiza garantía donde el error más cuesta (permisos) con mínima dependencia.
- **Archivos afectados:** `web/app` (config Vitest + tests de `shared/authz/` y validaciones).
- **Criterios de aceptación:**
  - [ ] `shared/authz` con cobertura de la matriz completa (rol × nivel × acción), incluido el caso D1 (limited no comenta con ningún nivel).
  - [ ] Validación de usuario con las reglas backend replicadas.
  - [ ] Checklist E2E manual con resultado documentado por flujo.
- **Prompt:** "Configura Vitest en `web/app` y añade tests unitarios para `shared/authz` (matriz completa rol × nivel × acción, incluida la regla D1) y las validaciones de usuario. No añadas framework E2E; ejecuta el checklist manual de `doc/frontend/canonical-flows.md` y registra el resultado por flujo en la descripción del PR."

#### `[ISSUE-5.4] Reporte final de cierre y actualización documental`
- **Tipo:** Ajuste Global / Infraestructura (doc).
- **Depende de:** todos los flujos funcionales cerrados.
- **Objetivo / alcance:** actualizar `doc/frontend/contract-coverage.md`, `canonical-flows.md`, `product-plan.md` con el estado real final, y README si cambian capacidades. Entregar reporte final con: cubierto, fuera de alcance, riesgos restantes.
- **Archivos afectados:** `doc/frontend/*.md`, `README.md` (coordinar con usuario por cambios en curso).
- **Criterios de aceptación:** [ ] Las tres docs reflejan el estado real post-cierre. [ ] Ninguna issue declarada cerrada sin verificación.
- **Prompt:** "Actualiza `doc/frontend` y README (coordinar) para reflejar el estado final real tras ejecutar el plan. No declares cobertura falsa; marca explícitamente lo pendiente."

---

## C. Reporte de Cierre y Sugerencia de Commits

### Checklist final para certificar el cierre del cliente web

Contrato y transporte
- [ ] No queda ningún `fetch()` fuera de `shared/api/client.js`.
- [ ] Rutas, métodos y payloads de los 9 flujos coinciden 1:1 con `contract-coverage.md` vigente.
- [ ] No quedan affordances sin contrato (registro, borrado de usuario, edición `501`, descarga de carpeta `501`).

Sesión, permisos y errores
- [ ] Sesión con estados terminales (autenticado/anónimo/error recuperable); cero spinners perpetuos.
- [ ] Todas las decisiones de gating usan `shared/authz`; ninguna vista decidir permisos por su cuenta.
- [ ] Cero UUIDs visibles en ninguna pantalla.

Flujos
- [ ] 9 flujos canónicos verificados E2E (o marcados fuera de alcance con decisión registrada).
- [ ] Bloqueadores backend 1.9, 1.10, 1.11 cerrados y verificados con `go test ./...`/`make test-local`.
- [ ] Decisión D1–D7 registradas y aplicadas (o explícitamente pendientes como P3 documentado).

Calidad y consistencia
- [ ] Cero `window.confirm`/`alert`; diálogos con `ConfirmDialog`/`Modal` compartidos.
- [ ] Tema persistente sin FOUC; `prefers-reduced-motion` respetado.
- [ ] Tokens semánticos en lugar de clases arbitrarias de variables CSS.
- [ ] Accesibilidad básica: foco visible, teclado, contraste.

Documentación
- [ ] `canonical-flows.md` marca cada flujo con su estado real final.
- [ ] `contract-coverage.md` sin filas desalineadas o, si quedan, con la issue de seguimiento enlazada.
- [ ] `product-plan.md` con decisiones cerradas causísticas.

### Convención y secuencia sugerida de commits (Conventional Commits)

Orden de fusión recomendado; agrupa 1 issue = 1 commit salvo indicación:

1. `fix(web): unify api transport and error handling` — issue 1.1
2. `fix(auth): make session recovery deterministic` — 1.2
3. `feat(authz): add shared frontend access helpers` — 1.3
4. `fix(comments): align comment api contract` — 1.4
5. `fix(groups): update groups with patch` — 1.5
6. `fix(users): align create user contract and validation` — 1.6
7. `refactor(web): remove unsupported user affordances` — 1.7
8. `fix(config): align local development mode` — 1.8
9. `fix(nodes): resolve document identity for download and delete` — 1.9 (backend)
10. `doc(frontend): record children contract after node metadata fix` — 1.10 (docs + verificación; el ajuste de `get_node_usecase.go` ya lo trae el usuario)
11. `fix(nodes): verify and fix recursive node delete schema` — 1.11 (backend, si confirma el hallazgo)
12. `feat(nodes): gate node actions by effective access` — 2.1
13. `feat(comments): complete comment editing flow` — 2.2
14. `fix(users): gate and align user administration` — 2.3
15. `fix(groups): align group management flows` — 2.4
16. `fix(docs): harden document transfer flows` — 2.5
17. `fix(nodes): normalize folder operations` — 2.6
18. `feat(nodes): render folder children with contract metadata` — 3.1
19. `feat(nodes): consume node and document pagination` — 3.2
20. `feat(explorer): add sorting and dotfile controls` — 3.3
21. `feat(groups): add visual node sharing picker` — 3.4
22. `refactor(nodes): consolidate explorer view states` — 3.5
23. `refactor(ui): consolidate dialogs and modals` — 3.6
24. `feat(theme): add persisted theme and reduced motion` — 4.1
25. `refactor(ui): use semantic theme tokens` — 4.2
26. `fix(ui): improve accessibility and global states` — 4.3
27. `feat(upload): add folder upload flow` — 5.1 (solo si D4 se aprueba con orquestación cliente)
28. `chore(nodes): keep folder download out of scope` — 5.2 (si queda pendiente backend)
29. `test(web): cover critical client flows` — 5.3
30. `doc(frontend): record web client closure` — 5.4

> Nota: si un commit incluye backend y frontend (como 1.9/1.10 con ajustes de vista mínima), mantiene el scope del paquete principal del commit y describe el ajuste de vista en el cuerpo.
