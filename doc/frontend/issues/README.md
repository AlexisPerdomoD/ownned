# Tablero de orquestación — Cierre del cliente web

> **Este directorio es el tracker de issues del cierre del cliente web.** Las issues y sus
> planes de implementación viven aquí como archivos del repositorio y se orquestan localmente.
> **No se gestiona en GitHub.**

## Estructura

- [`plan-cierre-cliente-web.md`](plan-cierre-cliente-web.md) — **plan maestro y fuente estratégica:** diagnóstico, decisiones (D1–D7), justificación de fases, dependencias, checklist de cierre y secuencia de commits. Es la única fuente para cambios de alcance o estrategia.
- `fase-1/` … `fase-5/` — **unidades de ejecución:** una issue por archivo (`ISSUE-N.M-*.md`), autocontenida (objetivo, alcance, archivos, criterios, prompt para agente ejecutor). Son los artefactos que se asignan a un agente.

## Reglas de scope (ver `AGENTS.md` del repo)

1. Cada agente ejecuta **solo la issue asignada**; su alcance es el "Objetivo / alcance" + "Archivos afectados" de su archivo de issue. Si algo no queda claro o la acción cae fuera del alcance, **solicitar aclaración antes de hacer cualquier cosa**.
2. Cambios en curso de otros agentes o del dev en el árbol de trabajo **no se tocan ni se reportan**, salvo que tengan impacto en la issue asignada.
3. Hallazgo fuera de alcance durante la ejecución → reportar ubicación e impacto y **detenerse**; no se corrige "por amor al arte".

## Estados

`pendiente` → `en-progreso` → `revisión` → `hecho`

## Protocolo de ejecución (agente ejecutor)

1. Lee el archivo de tu issue (ramo `fase-N/ISSUE-N.M-*.md`). Es tu contrato completo.
2. Verifica que sus dependencias estén en estado `hecho`. Si no, no inicia; repórtalo.
3. Ejecuta estrictamente dentro del alcance. Los criterios de aceptación son tu definición de "hecho".
4. Al terminar: marca los criterios `[x]`, cambia `Estado:` a `revisión` (o `hecho` si ya verificó) y reporta la verificación realizada (build, `go test ./...`, pruebas manuales según aplique).
5. Un issue = un commit (mensajes sugeridos en §C del plan maestro; Conventional Commits).

## Tablero

### Fase 1 — Ajustes globales de contrato e infraestructura (100% paralela)

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 1.1 | [Unificar transporte API, credenciales y errores](fase-1/ISSUE-1.1-unificar-transporte.md) | revisión *(smoke E2E pendiente)* | nada |
| 1.2 | [Sesión determinística y rol en contexto](fase-1/ISSUE-1.2-sesion-determinista.md) | revisión *(smoke 401/500 pendiente)* | nada |
| 1.3 | [Helper compartido de autorización](fase-1/ISSUE-1.3-authz-helpers.md) | hecho | nada |
| 1.4 | [Contrato de comentarios alineado](fase-1/ISSUE-1.4-comentarios-contrato.md) | revisión *(smoke comentarios pendiente)* | nada |
| 1.5 | [Update de grupo vía PATCH](fase-1/ISSUE-1.5-grupo-patch.md) | hecho | nada |
| 1.6 | [DTO y validación de creación de usuario](fase-1/ISSUE-1.6-dto-crear-usuario.md) | hecho | nada |
| 1.7 | [Retirar affordances sin contrato](fase-1/ISSUE-1.7-retirar-affordances.md) | hecho | nada |
| 1.8 | [Config local CORS/cookies](fase-1/ISSUE-1.8-config-local.md) | revisión *(smoke login Vite pendiente)* | nada |
| 1.9 | [backend) Identidad DocID/NodeID en download/delete](fase-1/ISSUE-1.9-back-identidad-docs.md) | revisión *(E2E descarga/borrado pendiente)* | nada |
| 1.10 | [(docs/verif.) Contrato de hijos tras ajuste backend](fase-1/ISSUE-1.10-contrato-hijos.md) | hecho | nada |
| 1.11 | [backend) Verificar DELETE de nodos (esquema/cascada)](fase-1/ISSUE-1.11-back-verificar-delete.md) | revisión *(falta test dedicado del borrado recursivo)* | nada |

### Fase 2 — Flujos críticos rotos

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 2.1 | [Gating de nodos con authz + display_path](fase-2/ISSUE-2.1-gating-nodos.md) | pendiente | 1.2, 1.3 |
| 2.2 | [Flujo de comentarios completo](fase-2/ISSUE-2.2-comentarios-completo.md) | pendiente | 1.4, 1.2; después de 2.1 |
| 2.3 | [Admin de usuarios cerrada](fase-2/ISSUE-2.3-admin-usuarios.md) | pendiente | 1.2, 1.6, 1.7 |
| 2.4 | [Gestión básica de grupos cerrada](fase-2/ISSUE-2.4-grupos.md) | pendiente | 1.5, 1.3 |
| 2.5 | [Subida/borrado de documentos endurecidos](fase-2/ISSUE-2.5-docs-transfer.md) | pendiente | 1.1, 1.3; E2E requiere 1.9 |
| 2.6 | [Operaciones de carpeta normalizadas](fase-2/ISSUE-2.6-carpeta-ops.md) | pendiente | 1.3, 2.1 |

### Fase 3 — Explorador, paginación y compartición usable

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 3.1 | [Hijos con metadata real y gating por hijo](fase-3/ISSUE-3.1-hijos-metadata.md) | pendiente | 1.10, 2.1 |
| 3.2 | [Paginación de nodos y documentos](fase-3/ISSUE-3.2-paginacion.md) | pendiente | 1.1, 3.1; D3 por defecto |
| 3.3 | [Ordenación y dotfiles](fase-3/ISSUE-3.3-orden-dotfiles.md) | pendiente | 3.1; D3/D6 por defecto |
| 3.4 | [Selector visual de nodos (grupos)](fase-3/ISSUE-3.4-selector-nodos.md) | pendiente | 2.4 |
| 3.5 | [Consolidar vista de explorador](fase-3/ISSUE-3.5-explorador-refactor.md) | pendiente | 2.1, 2.2, 3.1 |
| 3.6 | [Consolidar confirmaciones/modales](fase-3/ISSUE-3.6-dialogos.md) | pendiente | fases 2–3 estables |

### Fase 4 — Consistencia global

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 4.1 | [Tema persistente y movimiento reducido](fase-4/ISSUE-4.1-tema.md) | pendiente | D6 por defecto; coordinar con 3.5 |
| 4.2 | [Tokens semánticos (limpieza de clases)](fase-4/ISSUE-4.2-tokens.md) | pendiente | fase 3 |
| 4.3 | [Auditoría de accesibilidad](fase-4/ISSUE-4.3-accesibilidad.md) | pendiente | 3.5, 4.1 |

### Fase 5 — Capacidades avanzadas, verificación y cierre

| ID | Título | Estado | Depende de |
| --- | --- | --- | --- |
| 5.1 | [Subida de carpetas (Propuesta A — cliente)](fase-5/ISSUE-5.1-upload-carpetas.md) | pendiente | D4 resuelta; fases 1–2 |
| 5.2 | [Descarga de carpeta (bloqueada por 501)](fase-5/ISSUE-5.2-download-carpeta.md) | pendiente | backend (501) |
| 5.3 | [Verificación automatizada (Vitest + checklist)](fase-5/ISSUE-5.3-verificacion.md) | pendiente | D7 resuelta; fases 1–4 |
| 5.4 | [Reporte final y actualización documental](fase-5/ISSUE-5.4-cierre-docs.md) | pendiente | todas las funcionales |

## Registro de ejecución Fase 1 (2026-10-22)

1. **1.1** — `fetch` residual cero fuera de `client.js`; añadidos `reqForm`/`reqBlob` y errores `413/415/422` con `detail`; migrados logout/download/delete/upload. `pnpm build` + `eslint src` limpios. Pendiente: smoke manual con Vite + API local.
2. **1.2** — estados `checked/checking/error` terminales (401→anónimo vía `apiGetMe` ya convertido a null; resto → error con reintento en `ProtectedRoute` usando `ErrView`); `role()` expuesta en el contexto. Pendiente: simulación manual 401/500.
3. **1.3** — `shared/authz/index.js` puro: techo por rol (limited = solo read), D1 aplicada en `canCommentOnNode`, reglas espejo del dominio backend (`CanAssignGroupUsr`, `IsValidAccessToRole`, ranks 1–4). Sin consumo en vistas (fase 2).
4. **1.4** — rutas de contrato `/nodes/{nodeID}/comments` (GET/POST) y `/nodes/comments/{nodeCommentID}` (PATCH/DELETE), límite 255 en DTOs, `apiUpdateComment`/`useUpdateComment` expuestos para fase 2. Vista intacta.
5. **1.5** — `apiUpdateGroup` ahora `PATCH /api/v1/groups/{groupID}`.
6. **1.6** — `createUsr.js` real: DTO único sin `access`, contraseña 8–255 con letra+dígito+símbolo replicando el decoder backend; duplicado eliminado de `paginateUsr.js`; hook `useCreateUsr` sin parámetro `access`.
7. **1.7** — retirados `useRegister.js`, `RegisterForm.jsx`, `deleteUsr.js`, `apiDeleteUsr`, `useDeleteUsr`, botón Delete de `UsrsView` y su import (todos sin referencias; tres eran archivos vacíos). D5 ya estaba registrada en el plan.
8. **1.8** — `.env.example` actualizado con `MODE=local` y explicación de modos. README pendiente por cambios en curso del dev (coordinar).
9. **1.9** — hallazgo confirmado: la storage key del archivo es **nodeID** (`create_node_file_usecase.go` usa `Key: nodeID`), no docID. Fixes: `download_node_file.go` ahora recibe `node.DownloadNodeFileInput{DocID,Offset,Limit}`, resuelve doc→`doc.NodeID`, checa acceso y descarga con esa key; `delete_node_file_usecase.go` borra del storage con `doc.NodeID` (antes `doc.ID` — huérfano); `create_node_file_usecase.go` limpia storage con `node.ID` si la BD falla (antes `doc.ID`). Handler ajustado al nuevo input. `go build ./...`, `go vet` y `go test ./...` pasan. Pendiente: smoke E2E de descarga/borrado con DB.
10. **1.10** — `contract-coverage.md` actualizado: hijos de primer nivel con `doc` (best-effort, vacío ante fallo), `access_level` y `display_path` propios; `children` solo primer nivel; raíces `NodeDisplay` sin `doc`.
11. **1.11** — el hallazgo seguía vivo: el `DELETE FROM fs.nodes` externo ya tenía prefijo (arreglado por el dev) pero el **subquery** `(SELECT path FROM nodes WHERE id = $1)` no; corregido a `fs.nodes`. absorbed luego por el commit del dev `d7fb02a`. `make test-local` verde tras el fix de infra de abajo.

## Resolución de problemas de la Fase 1 (2026-10-22, autorizada por el dev)

1. **`make test-local` RESUELTO — era race condition de arranque:** el compose de test monta la data en `tmpfs` (initdb completo en cada contenedor fresco) y **no definía healthcheck**, así que `up -d --wait` no esperaba la disponibilidad real de Postgres y `sleep 1` corría migrate durante la ventana de init — el proxy aceptaba TCP y el socket daba `connection reset by peer`. Evidencia: contenedor fresco → migrate falla; reintento con contenedor warm → migración OK. Fix: `healthcheck` con `pg_isready` por TCP (2s/30 reintentos/`start_period` 10s) en `db-docker-compose.test.yaml` y el mismo healthcheck en `db-docker-compose.yaml` (mismo riesgo latente en primer arranque/`db-local-reset`). Verificado con ciclo completo desde cero: Healthy → migración OK → tests PASS. No afectaba al código del dev en `postgres.go`.
2. **Lint preexistente RESUELTO:** `GroupUsersList.jsx` corregido — refs mediante callbacks (`ref={el => (ref = el)}`), props sin destructuring según `web/app/AGENTS.md`, clases arbitrarias sustituidas por tokens (`text-ink-dark`, `bg-bg`, `border-border`, `text-muted`, `focus:border-ink`), `replaceAll` en el label de access. `eslint src` queda en **0 errores** (20 warnings preexistentes en otros archivos). Nota: el selector de acceso mantiene 3 niveles porque **el decoder backend (`group_handler.go:237`) aún no acepta `write_delete_access`** aunque el dominio lo tiene — inconsistencia backend reportada, no corregida en este alcance.
3. **README RESUELTO:** sección de modos de ejecución (`MODE=local` / `MODE=dev`) integrada y frase desactualizada del `.env.example` sustituida; fila de `make test-local` en la tabla de comandos.

## Hallazgos backend fuera del alcance (solo reporte)

1. ~~`internal/adapter/inbound/httpapi/group_handler.go:237` — decoder sin `write_delete_access`~~ **RESUELTO por el dev** (commit `94bf94a`): el decoder ahora acepta los 4 niveles (`read_only_access|write_access|write_delete_access|owner_access`). El selector de `GroupUsersList.jsx` sigue mostrando 3 niveles hasta que `ISSUE-2.4-grupos` actualice el DTO del cliente y la UI.

## Handoff a la próxima sesión (Fase 2) — 2026-10-22

Fase 1 **cerrada salvo 6 criterios de smoke/E2E manual** — ninguno bloquea el arranque de Fase 2:

| Pendiente | Issue | Cómo verificar |
| --- | --- | --- |
| Login → logout → upload → download con cookies | 1.1 (criterio 3; cubre parte de 1.6/1.8) | Sesión manual Vite + API local (`MODE=local`, `make db-local-up`) |
| 401 → login; API caída → vista de error con reintento | 1.2 (criterios 1-2) | Expirar la cookie de sesión / apagar el API server y refrescar |
| Listar/crear/borrar comentarios desde `NodeView` | 1.4 (criterio 3) | Sesión manual contra API local |
| Crear usuario con contraseña débil/fuerte | 1.6 (nota de Cierre) | Mismo ciclo manual del smoke anterior |
| Login/logout desde Vite sin tocar código | 1.8 (criterio 2) | `localhost:5173` contra API local |
| Descarga por `docID` real + borrado sin huérfanos de storage | 1.9 (criterios 1-2) | `make db-local-up` + servidor; subir archivo, descargar por `docID`, borrar y revisar el directorio de storage |
| Test de integración del borrado recursivo | 1.11 (criterio 2; SQL del fix ya absorbido por el dev) | Para el dev: cubrir `deleteNodeQuery` (`node_repository.go:53`) con subárbol sembrado |

**Estado del entorno:** `make test-local` verde (healthchecks en `702197c`); `.env.example` con `MODE=local`; `eslint src` 0 errores.

**Coordenadas para Fase 2** (respeta la secuencia 2.1 → 2.2; 2.5/2.6 coordinan con 3.5):

1. **2.1 (gating):** consume `shared/authz` (listo); `access_level` y `display_path` existen en raíces, nodo e hijos.
2. **2.2 (comentarios):** `apiUpdateComment`/`useUpdateComment` ya expuestos — solo falta la edición inline en la vista.
3. **2.4 (grupos):** el decoder backend ya acepta los 4 niveles — actualizar `UpsertGroupUsrDTO` (`entities/groups/api/index.js:120`, enum de 3) y los selectores para ofrecer `write_delete_access`.
4. **2.5 (docs transfer):** desbloqueado por 1.9 (fix aplicado; su E2E corresponde al smoke de la tabla anterior).
5. **2.6 (ops de carpeta):** `PUT /nodes/{nodeID}` sigue `501` — presentar edición como no disponible, no fakearla.
6. **Reglas vigentes:** `AGENTS.md` — comentarios `// NOTE:`/`// TODO:`, capas limpias (app sin transporte), scope por conversación; front: `web/app/AGENTS.md` (no destructuring de props, tokens de `index.css`).

## Conflictos intra-fase conocidos (secuencia, no paralelo)

1. **Fase 2:** 2.1 → 2.2 (comparten `pages/NodeView/index.jsx`). 2.5 y 2.6 también tocan `NodeView` (secciones distintas: subida vs. acciones de carpeta) — coordinar o secuenciar 2.1 → 2.5 → 2.6.
2. **Fase 3:** 3.1 → 3.2 → 3.3 → 3.5 comparten `NodeView`; 3.4 y 3.6 pueden correr al final en paralelo.
3. **Fase 4:** 4.1 y 3.5 comparten `Navbar`/vistas globales — coordinar.

## Decisiones vigentes

- **Resueltas:** D1 (limited no comenta en frontend), D2 (hijos con metadata embebida; raíces `NodeDisplay`), D4 (dir upload por cliente → `doc/proposal/dir_upload.md`), D7 (Vitest puro + checklist manual).
- **Abiertas:** D3 (paginación local vs API), D5 (borrado de usuario), D6 (preferencias en localStorage). Últimas dos afectan issues 5.3/3.3/4.1 con valores por defecto; el plan maestro las detalla.
