# Plan de producto y progreso del frontend

Este es el plan vivo para alinear el cliente SolidJS con el contrato público del backend y mejorar la experiencia de gestión de archivos. No reemplaza las implementaciones ni es una especificación de endpoints: esa comparación está en [`contract-coverage.md`](contract-coverage.md). Los recorridos canónicos del cliente están descritos en [`canonical-flows.md`](canonical-flows.md).

## Dirección acordada

- Interfaz minimalista, moderna y pragmática: priorizar que navegar, encontrar, cargar, compartir y administrar archivos sea claro antes que añadir ornamentación.
- La experiencia de carpetas debe ser responsive y familiar para gestión de archivos (referencia de interacción tipo Google Drive, sin asumir una copia visual literal).
- Paleta neutra moderna; conservar tokens semánticos centralizados en `web/app/src/index.css` y el mecanismo claro/oscuro. Implementar cambio de tema persistente. Ningún componente debe duplicar la paleta.
- Usar transiciones suaves y consistentes en navegación, estados y overlays; respetar `prefers-reduced-motion`.
- Orden inicial: carpetas primero y alfabético ascendente. Ofrecer orden por nombre, fecha de creación y fecha de modificación. Mostrar dotfiles ocultos apagado inicialmente, con control explícito para verlos.
- Mantener UUIDs como identificadores internos: no mostrarlos como contenido normal de la interfaz. Usar `display_path` para dar contexto de ubicación y combinar el nivel de asignación `access_level` del backend con el rol de sesión para decidir affordances sobre un nodo.
- Los documentos del plan están en español; el README raíz conserva su idioma actual (inglés).
- No declarar cobertura completa basándose en componentes existentes: contrastar cada flujo con la matriz del contrato público y sus permisos.

## Baseline funcional observado

### Flujos/pantallas presentes

- Login y consulta del usuario de sesión; logout en la barra de navegación.
- Home con nodos raíz y vista de carpeta/nodo con controles para contenido, comentarios, creación de subcarpeta, edición/eliminación de nodo y operaciones de documento. Algunas acciones tienen brechas de contrato documentadas abajo, por lo que la presencia del control no significa que el flujo esté funcional.
- Lista y detalle de grupos: CRUD, membresía/roles de acceso y asociación de nodos.
- Listado/paginación y creación de usuarios.
- Componentes compartidos de UI, formularios, tabla, navegación, modal, toast y estados de carga/error.

### Estado/gaps observados que bloquean declarar cobertura completa

- Rutas de comentarios en cliente no corresponden con backend; edición no tiene integración y límites de contenido discrepan.
- Actualización de grupo envía verbo incorrecto. Actualización de nodo está en UI, pero el backend responde `501`.
- El formulario de creación de usuario serializa un campo no permitido y muestra acciones sin aplicar el requisito de superusuario; la UI de borrado apunta a una ruta que no existe. No hay registro público.
- Listar archivos hijos depende de `child.doc`, que el backend no incluye en los hijos de `GET /nodes/{id}`. El nuevo `access_level` tampoco se incluye actualmente en esos hijos.
- `GET /nodes` y `GET /nodes/{id}` ahora entregan `display_path` y `access_level` para las raíces y el nodo solicitado; `access_level` resume el nivel de asignación aplicable, no incluye el techo del rol. El frontend aún no consume esos campos ni combina rol y asignación para presentar/ocultar acciones.
- El frontend no consume paginación de nodos/documentos; no hay sorting, visibilidad de dotfiles, tema con toggle persistido ni carga de carpetas.
- Helpers de upload/download/delete/logout con `fetch` relativo no apuntan a API al correr Vite en un origen separado. La configuración `.env.example`/`MODE` también necesita alineación para CORS/cookies local.
- El estilo ya centraliza tokens y tiene overrides dark, pero actualmente usa una paleta tierra y hay clases arbitrarias de CSS variables en vistas. Las animaciones son puntuales (transiciones de color/spinner), no una política global.

## Reglas y criterios de aceptación

### A. Cobertura por endpoint/flujo

- Cada operación pública figura en `contract-coverage.md`, incluyendo stubs y capacidades sin pantalla propia.
- Para cada flujo aplicable: controles habilitados según rol/acceso; validación del cliente consistente con el backend; estados de carga, vacío, éxito, `401`, `403`, validación, conflicto, no encontrado y fallo de servidor tratados sin perder datos.
- Los filtros/paginación que expone el contrato se consumen cuando forman parte del caso de uso; no cambiar de método, ruta, nombres de campos o límites de manera implícita.
- Una acción se oculta o deshabilita cuando el usuario no puede ejercerla, pero la autorización backend sigue siendo la fuente de verdad.
- El rol define el techo global de capacidades del usuario y las restricciones sobre asignaciones dirigidas a esa cuenta; no concede por sí solo acceso a recursos. La asignación concede un nivel dentro de un ámbito concreto (membresía a grupo y, por asociación, nodos). Para asignar, el rol del actor también debe permitir administrar esa membresía.
- En operaciones sobre recursos, combinar el rol de sesión con el `access_level` (nivel de asignación aplicable) y con cualquier regla propia de la operación. Las operaciones globales se autorizan por rol/política sin requerir una asignación a nodo. Conceptualmente para una acción de recurso: `rol permite la acción AND asignación suficiente para el recurso AND regla específica satisfecha`. No tratar `access_level` como autorización completa.
- `limited_usr_role` solo admite asignaciones `read_only_access`, así que no puede ejercer operaciones de contenido que requieren escritura (crear carpeta, subir, modificar o borrar nodo/documento); un usuario `normal_usr_role` también puede recibir una asignación solo de lectura aunque su techo permita más. El contrato actual permite crear comentarios con lectura; decidir explícitamente si ese rol conserva esa capacidad o si también se bloquea por rol.
- `read_only_access`, `write_access`, `write_delete_access` y `owner_access` son niveles del contrato. Lectura/descarga/comentarios requieren lectura; crear/subir/borrar requiere además el techo del rol. La edición/borrado de comentarios y la administración de grupos tienen reglas propias, no inferibles únicamente del acceso al nodo.
- No inferir permisos de un hijo a partir de su padre; el nivel puede faltar en hijos hasta que el contrato se complete. Si el nivel asignado, el rol o las reglas necesarias no se conocen, no habilitar acciones mutables.
- Como ejemplo futuro, `OneTimeRole` podría aceptar grants durante la provisión inicial y prohibir crear o cambiar asignaciones manuales dirigidas a esa cuenta después. Esto sería una política de asignabilidad del rol, no un nuevo nivel de acceso; la revocación debe tratarse por separado y no quedar implícitamente bloqueada.
- Mantener el modelo explícito y pequeño: rol + asignación por ámbito + reglas concretas de operación. No introducir un evaluador genérico de políticas ni permisos independientes por acción mientras los niveles actuales agrupados cubran el producto.
- Presentar `display_path` como ubicación cuando aporte contexto; mantener UUIDs ocultos en la interfaz salvo necesidad operativa explícita y acordada.
- Cambiar contrato backend exige actualizar matriz, README y adaptadores/criterios afectados.

### B. Navegación y contenido de carpetas

- La vista se adapta a móvil/tablet/escritorio sin desbordar controles; las acciones primarias siguen encontrables y utilizables con teclado.
- Orden predeterminado: carpetas antes que archivos, luego nombre A–Z. Controles permiten nombre, creación y modificación; definir claramente la dirección ascendente/descendente del control.
- Dotfile significa nombre que empieza por `.`; se oculta inicialmente y hay un control visible para incluirlos. Debe aplicarse a carpetas y archivos usando su nombre real, no un título derivado sin extensión.
- D3 resuelta: ordenar localmente el conjunto completo de hijos que entrega `GET /nodes/{id}` por nombre/creación/modificación; ocultar dotfiles antes de paginar el render a 100 elementos. La API paginada sigue soportando búsqueda/filtros, no orden.
- No se asume todavía vista tabla/lista además de la cuadrícula existente; decidirlo al prototipar responsive y accesibilidad.

### C. Sistema visual, tema y movimiento

- Tokens semánticos viven en la raíz del CSS (`@theme` en `web/app/src/index.css`) y sustentan ambos temas. Usar utilidades Tailwind generadas (`text-bg`, `bg-surface`, `border-border`); evitar `text-[--color-bg]`/valores inline cuando hay token equivalente.
- Tema claro/oscuro con elección explícita y persistencia entre sesiones; definir inicialización que evite flash de tema. Respetar preferencia del sistema solo como fallback inicial, pendiente de decisión de precedencia si ya existe valor guardado.
- Verificar contraste legible en ambos temas y estados de hover/focus/disabled; no elegir valores cromáticos antes de comprobarlos.
- Animación discreta, corta y consistente; desactivar o reducir movimiento no esencial con `prefers-reduced-motion`.

### D. Subida de una carpeta completa: evaluación de opciones

El backend publica `POST /nodes` para crear una carpeta bajo `parent_id` y `POST /nodes/docs` para subir **un archivo** por request con multipart. No existe endpoint batch/zip. Por ello, ambas alternativas son evaluables, no una función backend existente:

| Alternativa                  | Flujo                                                                                                                                         | Ventajas                                                                                           | Riesgos/costos a resolver                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Orquestación en el navegador | Leer rutas relativas; crear carpetas padre-primero; guardar mapa ruta→ID; subir cada archivo a su carpeta con requests actuales.              | Reutiliza contrato actual, permite progreso por archivo y no exige batch backend para un MVP.      | No es atómico: fallos dejan parte del árbol. Compatibilidad de picker/drag-drop de directorios por navegador; memoria/concurrencia; cancelación, retry, duplicados, rutas/nombres inválidos, upload de archivos grandes y limpieza/continuación tras cierre. |
| Endpoint batch backend       | Una operación de servidor recibe estructura y contenido (p. ej., protocolo multipart/archivo comprimido por definir) y coordina persistencia. | Puede controlar transacción/validación/autorización centralizada y reducir solicitudes de control. | Contrato nuevo, límites/streaming, recursos, formatos, seguridad contra path traversal, rollback y fallos parciales; requiere cambios backend y pruebas de carga.                                                                                            |

**Evaluación recomendada antes de elegir:** documentar navegadores/plataformas soportados, límites de cantidad/tamaño, comportamiento ante duplicados, si se permite dejar partial uploads, necesidades de resume/retry y requisitos de atomicidad. No anunciar atomicidad con la solución cliente. En navegador, validar `webkitdirectory`/`webkitRelativePath` y la ruta de drag-drop en los navegadores objetivo antes de comprometer UX.

## Roadmap y seguimiento

Actualizar estado/criterios al cerrar cada bloque. Estados: **Pendiente**, **En curso**, **Bloqueado backend**, **Decisión pendiente**, **Hecho**. No marcar un flujo hecho hasta comprobar su criterio en código y verificación.

| Prioridad | Bloque                           | Alcance / salida verificable                                                                                                                                                                                          | Estado inicial                             |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| P0        | Contrato y transporte            | Corregir comentarios y `PATCH` de grupos; quitar campo `access` inválido en creación de usuario; unificar transporte/credentials/errores para que requests de Vite lleguen a API; alinear entorno local CORS/cookies. | Pendiente                                  |
| P0        | Respuesta de contenido           | Definir y entregar metadata de documento y `access_level` para archivos/carpetas hijos (o acordar consulta por hijo); comprobar que `NodeView` renderiza contenido y permisos sin campos indefinidos.                  | Bloqueado backend                          |
| P0        | Identidad de archivos en storage | Alinear DocID, NodeID y storage key en descarga/borrado individual; comprobar cleanup y respuesta de errores del backend.                                                                                             | Bloqueado backend                          |
| P0        | Identidad/permisos               | Consumir `access_level` como nivel asignado y combinarlo con techo del rol/reglas de acción; usar `display_path`. Decidir contrato de borrado de usuario o retirar affordance. Mantener ausencia de registro público. | Pendiente / decisión de contrato           |
| P1        | Comentarios                      | Tras corregir GET/POST/DELETE en P0, añadir edición inline del dueño con PATCH, estados de error/éxito y verificación del límite 255.                                                                                 | Pendiente                                  |
| P1        | Contrato completo                | Integrar paginación de nodos y documentos con filtros; planificar implementación backend de `PUT node` y descarga de carpeta sin marcar stubs como terminados.                                                        | Pendiente / Bloqueado backend              |
| P1        | Grupos                           | Cambiar update a PATCH, verificar filtros, estados 403 y selector visual de nodos en lugar de UUID manual.                                                                                                            | Pendiente                                  |
| P2        | Explorador de archivos           | Prototipo responsive, navegación por carpeta, orden local acordado y dotfiles ocultos por defecto con control ver/ocultar.                                                                                             | En revisión                                  |
| P2        | Design system                    | Paleta neutra accesible centralizada, toggle claro/oscuro persistido, reducción de clases variables arbitrarias y movimiento con soporte reduced-motion.                                                              | Pendiente                                  |
| P3        | Subida de carpetas               | Comparativa de navegador, límites, fallos parciales/atomicidad y recomendación documentada; después decidir MVP cliente o endpoint batch backend.                                                                     | Decisión pendiente                         |
| P3        | Verificación                     | Añadir/definir pruebas de contrato y flujos críticos. El frontend actualmente no declara script ni framework de pruebas en `package.json`; elegir estrategia antes de prometer cobertura automatizada.                | Decisión pendiente                         |

## Decisiones abiertas para refinar al iniciar implementación

1. Compatibilidad objetivo de navegadores y plataformas para selector/drag-drop de carpetas.
2. Política de carga parcial: continuar con otros archivos, retry selectivo, cancelar y/o limpiar todo lo creado.
3. Límites permitidos para total de archivos, tamaño individual y tamaño total; comportamiento de duplicados/nombres repetidos.
4. Sorting: completar ranking local sobre hijos actuales o agregar filtros de orden al endpoint paginado; dirección reversible de fechas.
5. Persistencia del estado «mostrar ocultos» y del tema (por dispositivo, sesión o preferencia de cuenta; backend hoy no publica preferencias).
6. (D5) Si borrar usuario forma parte del contrato deseado, definir método, permisos y consecuencias antes de agregarlo; mientras no se decida, el cliente no ofrece borrado de usuario.
7. Definir si `access_level` y `display_path` deben incluirse en cada hijo de `GET /nodes/{nodeID}` o si el cliente consultará cada nodo antes de mostrar acciones; no heredar permisos del padre.
8. Si se concreta el futuro rol `OneTimeRole`, precisar que bloquea crear/cambiar asignaciones manuales tras la provisión inicial y definir por separado la política de revocación de accesos.
9. Definir si `limited_usr_role` puede crear comentarios: el endpoint actual requiere acceso de lectura, por lo que la semántica de “no modificar contenido” no lo bloquea automáticamente.
10. Si la cobertura de cada filtro/rango debe automatizarse en pruebas de navegador/API o aceptarse con pruebas unitarias + checklist manual.

## Referencias reemplazadas

La referencia adjunta `build_indications.md` contiene rutas antiguas (`/usrs/login`, `/comments`, `/docs`), registro, borrado de usuario y estados de implementación que no corresponden al backend actual. No existe como archivo en este repo; este plan y `contract-coverage.md` pasan a ser las referencias de trabajo, verificadas contra código.
