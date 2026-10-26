# Cobertura del contrato público: cliente web

**Baseline auditada:** 2026-10-22. Este documento distingue el contrato HTTP público del estado actual del handler y de la integración web. Un endpoint registrado que hoy responda `501` sigue teniendo que aparecer en el plan de capacidades del cliente; no se considera funcional ni se oculta como si no existiera.

## Fuente de verdad

1. Rutas y métodos: [`auth_handler.go`](../../internal/adapter/inbound/httpapi/auth_handler.go), [`usr_handler.go`](../../internal/adapter/inbound/httpapi/usr_handler.go), [`group_handler.go`](../../internal/adapter/inbound/httpapi/group_handler.go), and [`node_handler.go`](../../internal/adapter/inbound/httpapi/node_handler.go).
2. Validación y comportamiento: DTOs de `internal/app/**`, handlers y casos de uso.
3. Forma de respuesta JSON: `internal/adapter/inbound/httpapi/view.go`.
4. Integración actual: `web/app/src/entities/**`, `web/app/src/features/**` y `web/app/src/pages/**`.
5. `README.md` resume el contrato; la antigua referencia adjunta `build_indications.md` contradice el código en rutas, funciones y estado. No está presente en el repositorio y no debe usarse como especificación.

## Estados

- **Alineado:** contrato backend implementado y cliente usa ruta/método/carga útiles para un flujo existente.
- **Parcial:** existe integración, pero faltan operaciones, filtros, estados o capacidades del contrato.
- **Desalineado:** el cliente envía una ruta, método o cuerpo incompatible.
- **Sin flujo cliente:** backend publica la operación, pero no hay integración de usuario verificable.
- **Backend stub:** ruta pública registrada que actualmente devuelve `501`; conservar como capacidad planificada y coordinar el handler antes de declarar el flujo completo.

## Semántica de acceso a nodos

La autorización separa tres conceptos que no deben confundirse:

| Concepto | Qué define | Ejemplo |
| --- | --- | --- |
| Rol del usuario | Techo global de capacidades y restricciones sobre asignaciones dirigidas a esa cuenta. No concede por sí solo acceso a todos los recursos. | `limited_usr_role` solo admite grants `read_only_access`, así que no puede ejercer operaciones de contenido que requieren escritura. La creación de comentarios es una excepción del contrato actual: requiere lectura, no permiso de escritura. |
| Asignación | Concesión de un nivel concreto en un ámbito concreto. La membresía usuario-grupo lleva un nivel `GroupUsrAccess`; la asociación grupo-nodo define sobre qué nodos aplica. | Un usuario `normal_usr_role` puede recibir `read_only_access` en un grupo/nodo aunque su rol permita más capacidades. |
| Autorización efectiva de una acción | Para acciones sobre recursos: debe pasar el techo del rol, tener una asignación aplicable con nivel suficiente y cumplir reglas particulares. Acciones globales se autorizan por rol/política sin exigir una asignación a nodo. | Para subir un archivo se requieren rol que permita crear/subir y acceso de escritura al nodo padre. |

`GET /api/v1/nodes` y `GET /api/v1/nodes/{nodeID}` incluyen ahora `access_level` y `display_path` en cada raíz o nodo solicitado. `access_level` informa el mayor nivel de asignación aplicable al nodo, derivado de las asignaciones de grupo que lo alcanzan; **no representa por sí solo la autorización final**, porque el cliente y el servidor también deben aplicar el rol y las reglas de acción. Los niveles actuales son ordenados y agrupan capacidades (`read_only_access`, `write_access`, `write_delete_access`, `owner_access`); no expresan permisos independientes por acción.

Diferencia importante entre ambos endpoints (ajuste backend 2026-10-22): las raíces de `GET /nodes` se serializan como `NodeDisplay` (id, metadatos de nodo, `display_path`, `access_level`) y **no incluyen `doc`**; la respuesta de `GET /nodes/{id}` sí incluye hijos de primer nivel con `display_path`, `access_level` y `doc` para los archivos (ver párrafo siguiente). La UI de raíces no debe depender de `doc` para iconos/nombres de archivo.

La asignación evalúa los dos lados: el rol del actor debe permitir administrar membresías y el rol del usuario objetivo limita qué grants puede recibir. Actualmente `limited_usr_role` solo admite `read_only_access`; un usuario `normal_usr_role` puede recibir un grant de solo lectura aunque pueda recibir grants superiores en otros ámbitos. El contrato actual permite crear comentarios con lectura, incluso sin grant de escritura; si `limited_usr_role` también debe bloquear comentarios, hace falta una regla explícita de rol para esa operación. Como política futura, `OneTimeRole` podría permitir grants durante la provisión inicial y prohibir crear o cambiar asignaciones manuales dirigidas a esa cuenta después. Esa es una política de asignabilidad del rol, no un nivel `GroupUsrAccess` ni un cambio a las asignaciones iniciales. La revocación debe tratarse por separado y no quedar implícitamente prohibida.

Como guía de affordances, no como reemplazo de autorización backend:

| Capacidad de interfaz | Nivel de nodo requerido | Condición adicional / límite |
| --- | --- | --- |
| Ver nodo, hijos, descargar, listar/crear comentarios | Asignación `read_only_access` o superior | El rol debe permitir la acción cuando corresponda; crear comentario requiere lectura. |
| Crear carpeta o subir documento | Asignación `write_access` o superior | El rol también debe permitir crear nodos/documentos. |
| Eliminar nodo o documento | Asignación `write_access` o superior | El rol también debe permitir borrar; el borrado de nodo es recursivo. |
| Editar/eliminar comentario | No se deriva solo de `access_level` | Actualizar requiere ser autor; eliminar permite autor o superusuario según el caso de uso. |
| Administrar integrantes/asignaciones de un grupo | No se deriva de `access_level` del nodo | Se requiere evaluar el acceso al grupo; no inferirlo del permiso sobre el nodo. |

Los archivos hijos de `GET /nodes/{nodeID}` llegan como `NodeView` con su propia `doc` opcional (`id`, nombre original, mimetype) — resuelta best-effort: si la lectura del doc falla, el hijo regresa con `doc` inválido o vacío y la UI debe degradar con icono/nombre de nodo sin tratarlo como error. Cada hijo lleva también su `access_level` y `display_path`, computados junto con el nodo solicitado; la UI no debe inferir el nivel del padre para los hijos, consume el campo propio. `children` se limita al primer nivel (los hijos de carpetas anidadas llegan vacíos; cada carpeta se navega por su instancia de `GET /nodes/{id}`). Mientras el `doc`/nivel no sea usable, las acciones mutables quedan ocultas/deshabilitadas.

Para archivos, `Node.name` conserva el filename completo, incluida la extensión; `Doc.title` puede omitirla y `Doc.filename` conserva el filename original. La UI usa `Node.name` para identidad/colisiones y `Doc.filename` para mostrar o descargar el archivo, sin reconstruir el nombre a partir de `Doc.title`.

Para la UI, mostrar `display_path` como contexto de ubicación y no exponer UUIDs en texto visible. Un `access_level` ausente/desconocido no habilita acciones mutables; aun con nivel conocido, manejar `403` y conservar la autorización backend como fuente de verdad.

## Matriz por recurso

### Autenticación y usuarios

| Contrato público | Estado backend | Cliente actual | Brecha/nota |
| --- | --- | --- | --- |
| `POST /api/v1/auth/login` | Implementado | `apiLogin` y `LoginForm` | Alineado. Cookie de sesión `HttpOnly`; no es bearer token que deba leer el cliente. |
| `DELETE /api/v1/auth/logout` | Implementado | `apiLogout` y botón Navbar | Ruta/método coinciden. El helper usa URL relativa; en Vite (`:5173`) eso no apunta a la API (`:3000`). |
| `GET /api/v1/usrs/me` | Implementado | `apiGetMe` y `AuthProvider` | `401` se convierte a sesión anónima. Otros errores rechazan la promesa inicial y no se marcan como sesión comprobada; revisar recuperación para no dejar el guard en carga indefinida. |
| `GET /api/v1/usrs/{usrID}` | Implementado | `apiGetUsr` | Adaptador existe, pero no se identificó una vista/flujo que lo consuma. |
| `GET /api/v1/usrs/paginate` | Implementado; `page`, `limit`, `search`, `role` | API y `UsrsView` | Paginación, búsqueda y filtro de rol consumen el contrato. Estados de error ofrecen reintento; el área está limitada a superusuarios. |
| `POST /api/v1/usrs` | Implementado; solo superusuario | API y formulario de `UsrsView` | **Desalineado:** el DTO web serializa `access: []`, pero el decoder Go rechaza campos JSON desconocidos. Además, el enlace/formulario se muestra sin gating de rol. El backend exige contraseña de 8–255 caracteres con letra, dígito y símbolo; reflejar esa validación antes de enviar. |
| `DELETE /api/v1/usrs/{usrID}` | No está registrado | `UsrsView` y `apiDeleteUsr` lo intentan | No existe operación backend en el contrato actual. Decidir si se retira/oculta del cliente o se añade un contrato backend explícito; no presentarlo como funcional. |
| Registro público | No existe endpoint | `useRegister.js` y `RegisterForm.jsx` están vacíos y no hay ruta | Eliminar referencias de registro de planes/UI salvo que se acuerde y diseñe un contrato nuevo. |

### Grupos

| Contrato público | Estado backend | Cliente actual | Brecha/nota |
| --- | --- | --- | --- |
| `POST /api/v1/groups` | Implementado | Formulario/lista de grupos | Alineado para roles permitidos (super y normal); el creador queda como owner. |
| `GET /api/v1/groups/paginate?page&limit&search&usr_id` | Implementado | Lista paginada y helper | El helper expone page/limit/search pero no `usr_id`; el backend limita grupos de usuarios no super a los propios. |
| `GET /api/v1/groups/{groupID}` | Implementado | `GroupView` | Alineado para miembros con acceso de lectura; devuelve grupo, usuarios y nodos asociados. |
| `PATCH /api/v1/groups/{groupID}` | Implementado | `apiUpdateGroup` | **Desalineado:** el cliente envía `PUT`; el handler registra `PATCH`. |
| `DELETE /api/v1/groups/{groupID}` | Implementado con autorización de rol y acceso owner | UI/API | Integrado; asegurar que el affordance de borrar refleje el permiso efectivo y trate `403`. |
| `POST /api/v1/groups/{groupID}/users` | Implementado | UI/API | Alineado en ruta y cuerpo (`usr_id`, `access`). Limited users solo pueden recibir acceso de lectura; superusers no se asignan manualmente. |
| `DELETE /api/v1/groups/{groupID}/users/{usrID}` | Implementado | UI/API | Alineado; los permisos dependen del rol y acceso al grupo. |
| `POST /api/v1/groups/{groupID}/nodes` | Implementado | `GroupNodePicker` + API | Ruta/cuerpo alineados; selector navega raíces/carpetas y busca nodos accesibles. Un `403` se muestra como “You cannot share this node.” El servidor sigue siendo autoridad. |
| `DELETE /api/v1/groups/{groupID}/nodes/{nodeID}` | Implementado | `GroupNodesList` + API | Integrado; tras quitar o asociar se refresca el grupo y la relación visible; fallos se muestran como notificación. |

### Nodos, documentos y comentarios

| Contrato público | Estado backend | Cliente actual | Brecha/nota |
| --- | --- | --- | --- |
| `GET /api/v1/nodes` | Implementado | `apiGetRoot` y Home | **Parcial:** cada raíz (`NodeDisplay`) incluye `display_path` y `access_level`; no incluye `doc`. La UI aún no muestra `display_path` ni usa el nivel para mostrar/ocultar capacidades. |
| `POST /api/v1/nodes` (`parent_id`, `name`, `description`) | Implementado | API y creación de carpeta | Alineado para carpetas individuales. |
| `GET /api/v1/nodes/{nodeID}` | Implementado | API y `NodeView` | El nodo solicitado muestra su `display_path`; los hijos de primer nivel consumen su propio `access_level` para descargar/eliminar y su `Node.name` como filename completo. `doc` sigue siendo best-effort: con metadata muestra `filename` y mimetype; sin ella, degrada al nombre e icono genéricos del nodo. `children` no anida más niveles. La UI limita el render a 100 elementos por página, comunica errores de carga y ofrece reintento, aunque el handler aún devuelve todos los hijos. |
| `PUT /api/v1/nodes/{nodeID}` | **Backend stub (`501`)** | `useUpdateNode` y formulario de edición | El cliente ya intenta la operación, pero no puede completarse hasta implementar el handler. El DTO web prevé `name`/`description`; validar el contrato final con backend. |
| `DELETE /api/v1/nodes/{nodeID}` | Implementado | API/UI | El backend elimina el nodo y descendientes; limpieza de almacenamiento va en segundo plano. Confirmar mensajes/confirmación para borrado recursivo. |
| `GET /api/v1/nodes/{nodeID}/download` | **Backend stub (`501`)** | Sin integración | Planificar como capacidad pública, definiendo formato de archivo, límites y errores antes del UI. |
| `GET /api/v1/nodes/paginate?page&limit&search&root_id&node_type` | Implementado | `apiPaginateNodes` y `usePaginateNodes`, consumidos por `NodeSearch` en `HomeView` y `NodeView` | Página, total, carga, vacío y error están representados en un diálogo acotado con búsqueda global o dentro de la carpeta; los resultados conservan navegación al nodo. El contenido principal aún procede de `GET /nodes/{id}` y se pagina localmente a 100 elementos renderizados. |
| `GET /api/v1/nodes/{nodeID}/comments` | Implementado | `apiGetComments` | **Desalineado:** web llama `/api/v1/comments?node_id=...`; contrato exige node ID en la ruta. |
| `POST /api/v1/nodes/{nodeID}/comments` (`content`, máximo 255) | Implementado | `apiCreateComment` | **Desalineado:** web llama `/api/v1/comments` y envía `node_id` en el cuerpo; además valida hasta 10,000 caracteres frente al límite backend 255. El permiso de lectura es suficiente para comentar. |
| `PATCH /api/v1/nodes/comments/{nodeCommentID}` (`content`, máximo 255) | Implementado; solo dueño del comentario | Sin API/hook de actualización | El flujo de edición indicado en la referencia antigua no está implementado. |
| `DELETE /api/v1/nodes/comments/{nodeCommentID}` | Implementado | `apiDeleteComment` | **Desalineado:** web llama `/api/v1/comments/{id}`; corregir ruta. |
| `POST /api/v1/nodes/docs` multipart (`parent_id`, `size`, `file`; `description` opcional) | Implementado, un archivo por request | `useCreateDoc` y `useUploadFolder` | Un request por archivo; la orquestación recursiva crea carpetas padres primero, limita concurrencia a 20 y muestra progreso por elementos, fallidos/reintento y cancelación. No se aplican topes frontend de cantidad/profundidad/bytes; cuotas del backend se presentan por elemento. `webkitdirectory` no expone directorios vacíos. |
| `GET /api/v1/nodes/docs/{docID}/download` | Handler implementado; soporta un solo rango HTTP | `apiDownloadDoc` | Ruta coincide y descarga completa vía Blob; usa URL relativa y no expone reanudación/`Range` en UI. **Backend ID mismatch:** `node_handler.go` pasa `docID` como `DownloadCmd.Key`; `download_node_file.go` lo usa como `nodeID`, pero `create_node_file_usecase.go` crea IDs distintos y guarda el objeto con `nodeID`. Verificar/corregir resolución DocID→NodeID antes de declarar descarga funcional. |
| `DELETE /api/v1/nodes/docs/{docID}` | Handler/use case implementados | `apiDeleteDoc`/`DocCard` | Ruta coincide; helper usa URL relativa en dev y su manejo de errores no comparte el mapper de `reqJSON`. **Backend storage mismatch:** `create_node_file_usecase.go` guarda con `nodeID`; `delete_node_file_usecase.go` usa `doc.ID` para borrar el objeto y descarta el error, de modo que puede quedar archivo huérfano. |
| `GET /api/v1/nodes/docs/paginate?page&limit&search&root_id&mimetype&min_size&max_size` | Implementado | `apiPaginateDocs` y `usePaginateDocs`, consumidos por `NodeSearch` en `HomeView` y `NodeView` | Página, `total_count`, filtros (mimetype/tamaño), carga, vacío y error están representados; el resultado permite abrir el nodo contenedor. |

## Brechas transversales confirmadas

- El README anterior clasificaba `nodes/paginate` y `nodes/docs/paginate` como stubs; los handlers actuales sí ejecutan sus casos de uso. Los únicos stubs de esta familia son `PUT /nodes/{nodeID}` y `GET /nodes/{nodeID}/download`.
- Las llamadas por `reqJSON` usan el origen API `http://localhost:3000` en modo local. Algunos helpers (logout, upload, download y delete de documento) usan `fetch` con URL relativa y en Vite terminan en el origen del frontend. Centralizar transporte, credenciales y errores evita divergencias.
- `.env.example` establece `MODE=dev`, mientras `cmd/server/main.go` habilita CORS de `localhost:5173` y cookies lax/no seguras solo con `MODE=local`. La configuración de desarrollo puede bloquear login desde Vite; alinear el sample de entorno y el procedimiento local antes de dar por validado el flujo.
- La subida usa el UUID de nodo como clave de storage, pero el contrato de descarga/borrado recibe el UUID de documento. La descarga entrega ese UUID al use case como si fuera `nodeID`; el borrado usa `doc.ID` y descarta el error. Resolver explícitamente `DocID → NodeID`/clave antes de afirmar que descarga y borrado individual cubren el flujo.
- `NodeView` implementa orden local y visibilidad persistente de dotfiles, búsqueda paginada de folders/documentos y un límite de 100 hijos renderizados por página local. La carga de carpetas disponible aún es parcial; la cobertura de tema, accesibilidad y paginación del listado principal se sigue verificando en sus issues.
- `NodeView` consume el `display_path` del nodo actual y el `access_level` propio de cada hijo; no hereda permisos desde el padre. `HomeView` aún debe alinear la presentación de raíces y sus affordances. Los UUIDs permanecen como identificadores internos.
- La API actual no define campo `hidden` ni ordenación en la consulta paginada. Para dotfiles, la lista de hijos expone el nombre de nodo completo; no inferirlo de `Doc.title`, que puede omitir la extensión.

## Qué cuenta como cobertura completa

Un flujo se marca **cubierto** cuando el cliente ejerce el contrato relevante (operación, filtros/cargas, permisos, respuesta y errores) y ofrece estados de carga, vacío, éxito y fallo adecuados. Una ruta puede consumirse desde una acción contextual y no requiere una pantalla separada. Todo endpoint público debe tener estado en esta matriz; `501` no equivale a capacidad entregada. Los recorridos de usuario están en [`canonical-flows.md`](canonical-flows.md); los criterios de producto y seguimiento están en [`product-plan.md`](product-plan.md).
