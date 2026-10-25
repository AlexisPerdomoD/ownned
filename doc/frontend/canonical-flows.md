# Flujos canónicos del cliente web

**Baseline del cliente:** 2026-10-22. Este documento convierte la dirección de producto y el contrato HTTP en recorridos de usuario que `web/app` debe soportar. Describe el resultado esperado, el estado comprobable en el código y las brechas que deben convertirse en trabajo; no afirma que una ruta registrada o un control visible sea un flujo funcional.

## Cómo usar este documento

- [`contract-coverage.md`](contract-coverage.md) es la matriz por endpoint, método, payload y estado del backend.
- [`product-plan.md`](product-plan.md) contiene principios visuales, criterios de experiencia y decisiones abiertas.
- Este documento organiza esos datos por recorrido del usuario y sirve para derivar issues. Al preparar una issue, delimitar una salida verificable; no asumir que todo un flujo debe cerrarse en una sola issue.
- Las fuentes ejecutables son los handlers y vistas de `internal/adapter/inbound/httpapi/`, los DTOs/casos de uso y los adaptadores/vistas en `web/app/src/`.

### Significado del estado

- **Operativo con brechas:** existe un camino de usuario usable para parte del recorrido, pero no satisface todavía el resultado canónico completo.
- **Parcial/desalineado:** hay pantallas o adaptadores, pero alguna operación, payload, permiso o estado no coincide con el contrato.
- **Bloqueado por backend:** el recorrido depende de una operación registrada que aún no funciona o de corregir comportamiento backend que impide completarlo de extremo a extremo.
- **Sin flujo cliente:** hay contrato backend, pero el usuario no puede ejercerlo desde el cliente.
- **Decisión pendiente:** no se debe fijar comportamiento de producto/UX hasta resolver la decisión indicada.
- **Fuera del contrato actual:** no ofrecerlo como funcionalidad hasta acordar e implementar un contrato explícito.
- **Identificadores en UI:** mantener UUIDs como datos internos; mostrar `display_path` cuando aporte contexto de ubicación, nunca el identificador como contenido normal.

## Resumen del estado actual

| Recorrido                                | Estado hoy                      | Principal límite para considerarlo cubierto                                                                                                                     |
| ---------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Iniciar, recuperar y cerrar sesión       | Parcial/desalineado             | La restauración puede quedarse cargando ante errores distintos de `401`; logout no usa el origen API de Vite.                                                   |
| Explorar raíces, carpetas y archivos     | Bloqueado por backend + parcial | Raíces/nodo solicitado ya traen `display_path` y `access_level`, pero la UI no los usa; hijos no traen metadata `doc` ni acceso.                                |
| Crear, editar y eliminar carpetas        | Parcial                         | Crear y eliminar tienen integración; editar depende de `PUT /nodes/{nodeID}`, que responde `501`. Falta gating combinado por rol y nivel de asignación.          |
| Subir, descargar y borrar archivos       | Parcial/bloqueado por backend   | La UI sube un archivo por vez; falta gating por acceso/rol y la identidad DocID/NodeID/storage key no permite declarar descarga/borrado fiables.                |
| Comentar en un nodo                      | Desalineado                     | Las rutas GET/POST/DELETE del cliente no corresponden al contrato; falta edición y el límite de longitud discrepa.                                              |
| Administrar grupos y compartir nodos     | Parcial/desalineado             | La actualización usa `PUT` en lugar de `PATCH`; asociación de nodos requiere teclear UUID y falta gating coherente por permisos.                                |
| Administrar usuarios                     | Parcial/desalineado             | Crear serializa un campo no admitido y no está restringido visualmente a superusuarios; borrar no existe en el backend.                                         |
| Subir carpetas completas                 | Decisión pendiente              | No hay contrato batch; debe elegirse entre orquestar en navegador y diseñar una operación backend.                                                              |
| Presentación transversal y accesibilidad | Parcial                         | Hay componentes comunes y tokens, pero faltan tema persistente, política global de movimiento y cobertura responsive/accesible verificada.                      |

## Modelo de autorización para la UI

1. **Rol del usuario:** define el techo global de capacidades de la cuenta y las restricciones sobre qué asignaciones puede recibir. El rol no concede por sí solo acceso a todos los recursos; el rol del actor también debe permitir que administre asignaciones.
2. **Asignación:** concede un nivel concreto dentro de un ámbito concreto. En el modelo actual, la membresía de usuario a grupo lleva un nivel; la asociación de ese grupo a nodos determina dónde aplica. Un usuario `normal_usr_role` puede tener solo `read_only_access` en un nodo, aunque su rol admita capacidades superiores.
3. **Autorización efectiva:** para una acción sobre un recurso deben cumplirse el permiso del rol, una asignación aplicable con nivel suficiente y cualquier regla específica. Las acciones globales se autorizan por rol/política sin exigir una asignación a nodo. Regla conceptual para acciones de recurso: `rol permite la acción AND asignación suficiente para el recurso AND regla específica satisfecha`.

`GET /api/v1/nodes` y `GET /api/v1/nodes/{nodeID}` incluyen `access_level` (y `display_path`) para cada raíz o nodo solicitado cuando el backend puede resolverlo. El `access_level` reporta el nivel de asignación más alto aplicable al nodo; **no incluye el techo del rol ni es por sí solo la decisión final de autorización**. Sus valores son `read_only_access`, `write_access`, `write_delete_access` y `owner_access`.

Los niveles actuales (`read_only_access`, `write_access`, `write_delete_access`, `owner_access`) son ordenados y agrupan capacidades; no son toggles independientes por operación. Actualmente `limited_usr_role` solo admite asignaciones `read_only_access`, por lo que no puede ejercer operaciones de contenido que requieren escritura (crear carpeta, subir, modificar o borrar nodo/documento); el caso de asignación de membresía de grupo valida el rol del usuario objetivo. La creación de comentarios es una excepción del contrato actual: requiere lectura, no escritura. Debe decidirse si `limited_usr_role` conserva esa capacidad o si se añade una regla de rol específica para bloquearla. Un futuro `OneTimeRole` podría recibir grants durante la provisión inicial y prohibir crear o cambiar asignaciones manuales dirigidas a esa cuenta después. Eso es una política del rol sobre la asignabilidad de la cuenta, no un nivel de acceso al recurso. La revocación de grants debe considerarse por separado y quedar definida explícitamente.

| Affordance | Asignación requerida | Regla adicional |
| --- | --- | --- |
| Ver/listar, descargar, leer y crear comentarios | `read_only_access` o superior | El rol debe permitir la acción cuando corresponda; el servidor valida cada operación. |
| Crear carpeta, subir documento, borrar nodo/documento | Asignación `write_access` o superior | El rol también debe permitir la operación. |
| Editar comentario | No basta el nivel del nodo | Solo el autor puede actualizarlo. |
| Borrar comentario | No basta el nivel del nodo | Autor o superusuario, según el caso de uso backend. |
| Administrar integrantes de grupo o compartir nodo | No inferir desde el nivel del nodo | Depende del acceso al grupo y del rol del actor. |

Los hijos recibidos en `GET /nodes/{nodeID}` aún se serializan como nodos simples y no llevan ni `access_level` ni `doc`. No heredar en UI el nivel asignado al padre para habilitar acciones sobre hijos: primero debe completarse la respuesta de hijos o definirse una consulta por hijo. Mientras el nivel o el rol requerido no se conozca, las acciones mutables permanecen ocultas/deshabilitadas. Los UUIDs no se muestran; `display_path` es la representación legible de la ubicación.

## Recorridos canónicos

### 1. Inicio, sesión y acceso protegido

**Resultado esperado:** una persona inicia sesión, conserva la sesión al recargar, accede a las áreas privadas y puede cerrarla de forma explícita. Una sesión anónima llega a login; los errores recuperables ofrecen salida/reintento y no dejan la aplicación en carga perpetua.

```text
Abrir app -> GET /usrs/me -> ¿sesión válida?
                         ├─ Sí -> Área protegida -> Logout -> Login
                         └─ No -> Login -> POST /auth/login -> Área protegida
                                      └─ error -> Mensaje + reintento
```

**Recorrido:**

1. Al abrir la aplicación, consultar `GET /api/v1/usrs/me` para resolver la sesión.
2. Mientras se verifica, mostrar un estado de carga; si no hay sesión (`401`), dirigir a `/login`.
3. Enviar credenciales con `POST /api/v1/auth/login`; conservar la cookie `HttpOnly` que establece el servidor, nunca tratarla como token legible por JavaScript.
4. Tras el éxito, entrar a las rutas protegidas; ante credenciales incorrectas u otro error, informar sin perder el formulario.
5. Al cerrar sesión, llamar `DELETE /api/v1/auth/logout`, limpiar el estado local y volver a login.

**Estado actual:** existen login, restauración de sesión en `AuthProvider`, guard de rutas y acción de logout. El `401` de `me` se considera sesión anónima; un error distinto no completa `checked` y puede dejar el guard en el spinner. El helper de logout hace `fetch` relativo, por lo que con Vite puede llamar al origen del cliente en vez de la API. La integración general de transporte/CORS/cookies requiere validación local.

**Cierre verificable:** cada transición (carga inicial, sesión válida, anónima, error de red, login fallido/exitoso y logout) termina en un estado visible y recuperable; cookies y origen funcionan tanto en despliegue integrado como en desarrollo Vite.

### 2. Explorar el espacio de archivos

**Resultado esperado:** la persona puede abrir sus nodos raíz, navegar carpetas, reconocer carpetas frente a archivos y acceder a metadata/acciones autorizadas por su rol y las asignaciones aplicables. La exploración muestra `display_path` como contexto sin exponer UUIDs, sigue funcionando con listas grandes y respeta los controles acordados para búsqueda, filtros y orden.

```text
Raíces(display_path, access_level) -> Carpeta -> Contenido
                                      ├─ permiso + rol -> affordances
                                      └─ abrir -> hijos [acceso pendiente]
                                              └─ archivo -> metadata/acciones
                         [buscar · filtrar · ordenar · paginar]
```

**Recorrido:**

1. La vista `/nodes` presenta raíces del usuario (`GET /api/v1/nodes`) con `display_path` y `access_level`.
2. Al elegir una carpeta, `/nodes/{nodeID}` muestra su `display_path`, metadata y nivel de acceso, más carpetas hijas y archivos.
3. Al elegir un archivo, mostrar su metadata y las acciones disponibles.
4. Mostrar u ocultar acciones usando el acceso del nodo actual junto con el rol/reglas de la operación; nunca propagar el permiso del padre a un hijo.
5. En el conjunto explorado, permitir la navegación y presentación definidas para móvil, teclado, listas vacías, carga y errores.
6. Si la cantidad de contenido lo requiere, consumir `GET /api/v1/nodes/paginate` y/o `GET /api/v1/nodes/docs/paginate` con sus filtros; definir qué vista consume cada paginación.
7. Aplicar el criterio acordado: carpetas primero, nombre A–Z inicialmente; controles de orden por nombre/creación/modificación; ocultar nombres que empiezan por `.` inicialmente, con control para mostrarlos.

**Estado actual:** `NodeView` presenta el path del nodo, consume metadata/acceso propios de los hijos, usa `Node.name` como filename, limita el render local a 100 elementos por página y ofrece carga/error/reintento. La cuadrícula y la vista de lista comparten el mismo conjunto ordenado/paginado; las tarjetas y filas tienen controles nativos de teclado con foco visible. La búsqueda de carpetas y documentos usa los endpoints paginados; orden y dotfiles se aplican localmente sobre los hijos completos. Las raíces de `HomeView` y la subida recursiva de carpetas conservan brechas documentadas en sus issues.

**Decisiones relacionadas:** definir si metadata y acceso efectivo de cada hijo se incluyen en la respuesta o se consultan por hijo; definir si el orden se aplica localmente al conjunto completo o si el contrato paginado requiere orden (el API actual no lo expone). El nombre real del archivo debe estar disponible para filtrar dotfiles.

**Cierre verificable:** se pueden explorar carpetas con hijos folder/file correctamente identificados; `display_path` da contexto sin exponer UUID; acciones corresponden al grant del nodo objetivo, al techo del rol y a las reglas de la acción; navegación, paginación/filtros acordados, orden, ocultos, estados vacío/error y comportamiento responsive tienen criterios comprobados. No presentar metadata indefinida como archivo listo para abrir ni asumir acceso de un hijo.

### 3. Crear, editar y eliminar carpetas

**Resultado esperado:** dentro de una carpeta, crear subcarpetas, corregir nombre/descripción y eliminar una carpeta con consecuencias claras antes de confirmar.

```text
Carpeta -> Crear / Editar -> Validar -> Guardar -> Vista actualizada
   └────> Eliminar -> Confirmar alcance recursivo -> Eliminada
```

**Contrato implicado:** `POST /api/v1/nodes` crea; `PUT /api/v1/nodes/{nodeID}` actualiza; `DELETE /api/v1/nodes/{nodeID}` elimina.

**Estado actual:** el formulario y llamada de creación existen; la actualización ya está en UI pero el handler backend devuelve `501`; la eliminación está integrada. El backend elimina también los descendientes, por lo que la confirmación debe advertir ese alcance. El nodo solicitado ya trae `access_level`, pero la UI no lo consume ni combina nivel con rol para mostrar/ocultar edición, creación o borrado.

**Cierre verificable:** creación/edición validan los límites del contrato y actualizan la vista; se comunica `501` como no disponible mientras siga vigente; el borrado recursivo se explica y requiere confirmación explícita; affordances combinan `access_level` con rol; `403`, conflicto, no encontrado y fallo no se presentan como éxito.

### 4. Subir, descargar y borrar documentos

**Resultado esperado:** desde una carpeta, seleccionar uno o más archivos dentro de los límites acordados, ver progreso/resultado, descargar el archivo original y borrar el documento con confirmación.

```text
Carpeta -> Seleccionar archivo -> Subir -> Progreso -> Resultado
   ├────> Archivo -> Descargar -> Archivo local
   └────> Archivo -> Borrar -> Confirmar -> Eliminado
```

**Contrato implicado:** `POST /api/v1/nodes/docs` multipart acepta un archivo por request (`parent_id`, `size`, `file`, `description` opcional); descarga y borrado reciben `docID`.

**Estado actual:** `UploadDropzone` y `useCreateDoc` suben un archivo por vez, sin progreso porcentual ni selector de directorio. La carpeta actual ya trae `access_level`, pero la UI no lo consume para gobernar la subida ni combina permisos de nodo y rol. Hay acciones de descarga/eliminación, pero sus helpers usan URL relativa en desarrollo. Además, el backend usa `nodeID` como clave de almacenamiento al crear y trata el `docID` recibido para descarga/borrado como si fuera esa clave; el borrado también descarta errores de storage. Estas divergencias impiden prometer descarga y limpieza fiables. La API permite un rango HTTP; el cliente descarga como Blob completo.

**Cierre verificable:** transporte/cookies apuntan correctamente a API; DocID, NodeID y clave de storage se resuelven de forma consistente; subida informa progreso y fallo por archivo conforme al alcance acordado; descarga conserva filename y errores; borrado confirmado produce una eliminación comprobable sin ocultar fallos.

**Fuera de este flujo hasta decisión:** carga completa de una carpeta. Véase «Subir carpetas completas» en decisiones abiertas; no afirmar atomicidad ni batch existente.

### 5. Leer y gestionar comentarios

**Resultado esperado:** desde el nodo compatible, consultar comentarios, crear uno, editar el propio y eliminarlo, recibiendo feedback inmediato y límites idénticos al servidor.

```text
Nodo -> Ver comentarios -> Crear comentario -> Lista actualizada
                         └─ Comentario propio -> Editar / Eliminar
```

**Contrato implicado:** `GET/POST /api/v1/nodes/{nodeID}/comments`, `PATCH/DELETE /api/v1/nodes/comments/{nodeCommentID}`; contenido máximo 255 caracteres. Edición limitada al autor.

**Estado actual:** la UI lista, crea y elimina, pero el cliente llama `/api/v1/comments` (y manda `node_id` en el body) en vez de las rutas anidadas del contrato. El formulario admite hasta 10,000 caracteres frente al límite backend de 255. No hay integración de edición aunque el endpoint backend está implementado. La pantalla actual muestra comentarios para carpetas. Crear comentario requiere solo lectura; editar/borrar siguen reglas de autor/superusuario y no se deducen únicamente de `access_level`.

**Cierre verificable:** todas las operaciones usan la ruta/método/cuerpo exactos; límite y validación coinciden; solo se ofrece editar/borrar cuando corresponda y el servidor sigue siendo autoridad; se refresca el contenido sin perder el borrador ante errores.

### 6. Administrar grupos y compartir contenido

**Resultado esperado:** una persona autorizada crea y encuentra grupos, revisa su detalle, actualiza o elimina según su acceso, gestiona integrantes con niveles de acceso y asocia/quita nodos.

```text
Grupos -> Crear / Buscar -> Detalle
                           ├─ Editar / Eliminar (según acceso)
                           ├─ Gestionar integrantes + nivel de acceso
                           └─ Asociar / quitar nodos
```

**Contrato implicado:** paginación/búsqueda de grupos; `POST`, `GET`, `PATCH`, `DELETE /api/v1/groups`; operaciones `POST/DELETE` para integrantes y nodos. El backend publica permisos y restricciones por rol; no deben inferirse solo por el rol visible.

**Estado actual:** existen listado con búsqueda/paginación, creación, detalle, eliminación y acciones de integrantes/nodos. `GroupNodePicker` permite navegar raíces/carpetas y buscar nodos antes de asociarlos; un `403` comunica que el nodo no se puede compartir y la relación se refresca tras asociar/quitar. La actualización permanece desalineada: el cliente envía `PUT`, el backend registra `PATCH`. El listado no expone el filtro `usr_id` del API. La administración depende del acceso al grupo, no del `access_level` del nodo; el backend conserva la autorización final.

**Cierre verificable:** búsqueda/paginación y filtros definidos coinciden con API; update usa `PATCH`; selector de nodos ayuda a escoger un nodo accesible; miembros pueden asignarse/quitarse con niveles permitidos; acciones de propietario/lectura/escritura se presentan acorde al permiso y los errores no dejan estado optimista incorrecto.

### 7. Administrar usuarios

**Resultado esperado:** solo un superusuario administra el listado paginado, busca/filtra por rol y crea usuarios con validación de contraseña/rol coherente con backend. El cliente no ofrece registro público ni operaciones no soportadas.

```text
Superusuario -> Lista de usuarios -> Buscar / Filtrar / Paginar
                                  └─ Crear usuario -> Validar -> Guardar
Otros roles ─────────────────────────────────────────> Sin administración
```

**Contrato implicado:** `GET /api/v1/usrs/paginate` admite búsqueda y rol; `POST /api/v1/usrs` crea y requiere superusuario; `GET /api/v1/usrs/{usrID}` existe. No hay endpoint de borrado ni registro público.

**Estado actual:** existe tabla con búsqueda/paginación y formulario de creación. El DTO web agrega `access: []`, campo no permitido por el decoder estricto del backend. El formulario y la ruta de administración no aplican gating visual de superusuario; la validación visible de password solo expresa mínimo 8 y no replica todas las reglas backend. Aunque el hook intenta borrar usuarios, el backend no registra `DELETE /usrs/{usrID}`. El filtro de rol está disponible en el hook/API pero no como control de vista; el GET individual no tiene un flujo de UI identificado.

**Cierre verificable:** formulario crea payload aceptado y valida reglas completas; acceso a acciones está condicionado a superusuario y errores `403` se entienden; el filtro de rol queda disponible en UI o explícitamente fuera de alcance; eliminar usuario se retira/oculta o se acuerda e implementa como contrato nuevo. No agregar registro público sin contrato explícito.

### 8. Estados y comportamiento comunes

**Resultado esperado:** cada operación comunica carga, éxito, vacío y fallo; mantiene datos y contexto cuando ocurre un error; responde de forma legible a sesión expirada, falta de permiso, validación, conflicto, recurso ausente y error de servidor.

```text
Acción -> Cargando -> Éxito -> Actualizar vista
                   ├─ Vacío -> Estado vacío + siguiente acción
                   └─ Error -> Mensaje útil + conservar contexto/reintentar
```

**Estado actual:** existen spinner, vistas/tabla vacías, toast, boundary y un cliente JSON con varias clases de error. No todos los helpers comparten transporte y normalización; los helpers de archivo manejan errores por separado. La UI aún no consume `access_level`, y el `422` de validación backend no tiene un caso explícito en el mapper común.

**Cierre verificable:** se usa una política común sin ocultar errores de contrato; las acciones repetibles muestran estado de operación; el formulario preserva datos corregibles; ninguna pantalla queda bloqueada indefinidamente; focus/teclado, tamaños de viewport y `prefers-reduced-motion` forman parte de la validación visual.

### 9. Apariencia, tema y preferencias

**Resultado esperado:** interfaz neutra, consistente, responsive y accesible con tema claro/oscuro elegible que persiste entre sesiones, inicialización sin flash y movimiento reducido cuando el sistema lo solicita.

```text
Inicio -> Preferencia guardada? -> Sí: aplicar tema
                                └─ No: usar preferencia del sistema
Usuario cambia tema -> Guardar preferencia -> Próxima sesión
Sistema: reduced motion -> Reducir/desactivar movimiento no esencial
```

**Estado actual:** `src/index.css` centraliza tokens y tiene overrides para `[data-theme='dark']`, pero no se encontró toggle del usuario ni persistencia; las transiciones son puntuales y no hay política global de movimiento reducido. La adaptación responsive y contraste requieren verificación por flujo/dispositivo, no se infieren de que haya clases responsive.

**Cierre verificable:** selección/persistencia y precedencia de preferencia guardada frente al sistema están definidas; ambos temas mantienen contraste y foco legibles; `prefers-reduced-motion` desactiva movimiento no esencial.

## Decisiones abiertas antes de fijar algunas issues

1. **Contenido y acceso de hijos:** incluir `doc` y `access_level` en cada hijo o decidir consulta por hijo antes de renderizar affordances; no heredar el permiso del padre.
2. **Permiso de comentar para `limited_usr_role`:** el contrato actual acepta comentarios con solo lectura; decidir si este rol puede usarlos o si se requiere una restricción específica de rol.
3. **Paginación y orden del explorador (resuelto):** las búsquedas usan la paginación API y sus filtros; el orden del contenido de `GET /nodes/{id}` se aplica localmente al conjunto completo, porque el contrato paginado no define `sort_by`/`sort_order`. El render se limita a 100 elementos por página.
4. **Subida de carpetas:** decidir navegadores/plataformas soportados, límites, duplicados, cancelación/reintentos, tratamiento de fallos parciales y si basta orquestación cliente o hace falta batch backend.
5. **Borrado de usuario:** retirar la acción sin soporte o diseñar operación backend (método, autorización y consecuencias).
6. **Preferencias locales:** persistencia y precedencia del tema y de «mostrar ocultos»; backend no publica preferencias de usuario.
7. **Verificación automatizada:** acordar estrategia de pruebas de flujos API/navegador; el frontend no declara actualmente un framework/script de pruebas.

## Paquetes de trabajo que se desprenden de los flujos

Esta agrupación es una guía para convertir brechas en issues independientes, no una lista de issues ya creadas. Resolver dependencias antes de marcar un flujo como completo.

| Orden sugerido | Paquete de issues                                                         | Flujos relacionados / dependencia                                                                       |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0             | Unificar transporte, sesión, errores y configuración local                | Inicio/sesión, comentarios, grupos, usuarios y documentos; habilita requests correctos desde Vite.      |
| P0             | Alinear requests de comentarios y update de grupo con contrato            | Comentarios y grupos; actualizar ruta, verbo, payload y límites según corresponda.                      |
| P0             | Corregir payload, validación y autorización de administración de usuarios | Usuarios; decidir por separado si se elimina la acción de borrar.                                       |
| P0             | Completar la respuesta de hijos con metadata de documento                 | Exploración de archivos; dependencia backend para mostrar contenido de carpeta.                         |
| P0             | Consumir grants y `display_path`                                            | Gating por `access_level` + techo del rol; resolver el grant de cada hijo; ocultar UUIDs y usar paths legibles. |
| P0             | Resolver identidad DocID/NodeID/storage key y errores de storage          | Subida/descarga/borrado; dependencia backend antes de declarar E2E.                                     |
| P1             | Cerrar CRUD de carpetas y comentarios                                     | Carpetas requiere implementación del stub `PUT`; comentarios requiere edición en UI tras alinear rutas. |
| P1             | Consumo de paginación de nodos/documentos y filtros acordados             | Exploración; depende de definir relación con vista de hijos.                                            |
| P1/P2          | Gating de acciones y selector visual de nodos para compartir              | Grupos, carpetas y usuarios; preservar autorización backend.                                            |
| P2             | Orden, dotfiles, responsive y estados del explorador                      | Exploración; depende de la decisión de paginación/orden y del nombre real del archivo.                  |
| P2             | Tema persistente, contraste y reduced motion                              | Apariencia; requiere decisiones de persistencia/precedencia.                                            |
| P3             | Decidir e implementar carga de carpetas                                   | Decisión producto primero; endpoint batch sería trabajo backend separado si se elige.                   |
| P3             | Automatizar flujos críticos                                               | Definir stack y alcance antes de asignar cobertura de pruebas.                                          |

## Definición de «flujo cubierto»

Un flujo solo se considera cubierto cuando el camino canónico se puede completar en el cliente contra el contrato vigente, los permisos se reflejan correctamente sin sustituir la autorización del servidor, se validan estados de carga/vacío/éxito/error y se han comprobado las dependencias backend. Un stub `501`, una acción visual o un helper sin pantalla/consumidor no cuentan como cobertura. Al cambiar contrato o comportamiento, actualizar también [`contract-coverage.md`](contract-coverage.md) y los criterios relevantes de [`product-plan.md`](product-plan.md).
