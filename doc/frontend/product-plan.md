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
- Lista y detalle de grupos: CRUD, membresía/roles de acceso y asociación de nodos mediante selector navegable/buscable.
- Listado/paginación y creación de usuarios.
- Componentes compartidos de UI, formularios, tabla, navegación, modal, toast y estados de carga/error.

### Estado/gaps observados que bloquean declarar cobertura completa

- Rutas de comentarios en cliente no corresponden con backend; edición no tiene integración y límites de contenido discrepan.
- Actualización de grupo envía verbo incorrecto. Actualización de nodo está en UI, pero el backend responde `501`.
- La administración de usuarios está limitada a superusuarios y ya consume búsqueda/paginación/filtro de rol; no se ofrece borrado ni registro público sin contrato.
- Los hijos de `GET /nodes/{id}` incluyen `doc` best-effort y `access_level`; `NodeView` degrada cuando falta `doc` y gobierna acciones con el acceso propio del hijo. `Node.name` conserva el filename completo.
- `NodeView` muestra `display_path` y combina rol/asignación para sus acciones. `HomeView` aún debe alinear la presentación y affordances de raíces.
- `NodeView` consume paginación para búsqueda de nodos/documentos, ordena localmente hijos y oculta dotfiles por defecto con preferencia persistida; el tema tiene toggle persistido. La subida de carpetas es todavía parcial y no recursiva.
- Helpers de upload/download/delete/logout con `fetch` relativo no apuntan a API al correr Vite en un origen separado. La configuración `.env.example`/`MODE` también necesita alineación para CORS/cookies local.
- El sistema visual centraliza tokens semánticos y ahora ofrece seis paletas claro/oscuro, tipografías locales sin Google Fonts, iconografía SVG y transiciones de entrada para vistas/modales. Requiere revisión visual manual en los seis esquemas antes de darlo por cerrado.

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
- D6 resuelta: el tema explícito persiste en `localStorage` y tiene precedencia; `prefers-color-scheme` es el fallback inicial. El bootstrap del HTML aplica el tema antes de montar la app. `prefers-reduced-motion` reduce animación/transiciones globalmente.
- Los pares semánticos de texto/estado de ambos temas se verifican automáticamente con el umbral WCAG AA (4.5:1); auditar visualmente hover/focus/disabled sigue siendo parte de issue 26.
- Animación discreta, corta y consistente; desactivar o reducir movimiento no esencial con `prefers-reduced-motion`.

### D. Subida de una carpeta completa: evaluación de opciones

El backend publica `POST /nodes` para crear una carpeta bajo `parent_id` y `POST /nodes/docs` para subir **un archivo** por request con multipart. D4 quedó resuelta a favor de la Propuesta A: el cliente orquesta el árbol; no existe ni se presupone un endpoint batch/zip.

| Alternativa                  | Flujo                                                                                                                                         | Ventajas                                                                                           | Riesgos/costos a resolver                                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Orquestación en el navegador | Leer rutas relativas; crear carpetas padre-primero; guardar mapa ruta→ID; subir cada archivo a su carpeta con requests actuales.              | Reutiliza contrato actual, permite progreso por elemento y no exige batch backend para un MVP.    | No es atómico: fallos dejan parte del árbol. Compatibilidad del picker; concurrencia máxima 20; cancelación, retry, duplicados, rutas/nombres inválidos y limpieza/continuación tras cierre. |
| Endpoint batch backend       | Una operación de servidor recibe estructura y contenido (p. ej., protocolo multipart/archivo comprimido por definir) y coordina persistencia. | Puede controlar transacción/validación/autorización centralizada y reducir solicitudes de control. | Contrato nuevo, límites/streaming, recursos, formatos, seguridad contra path traversal, rollback y fallos parciales; requiere cambios backend y pruebas de carga.                                                                                            |

**Decisión de implementación:** el picker usa `webkitdirectory` cuando está disponible y explica el fallback si el navegador no lo soporta. La cola tiene hasta 20 requests concurrentes, progreso por elementos, cancelación efectiva y retry selectivo; puede dejar un árbol parcial visible. Por decisión del usuario, el cliente no limita cantidad, profundidad ni bytes totales; las cuotas futuras del backend se reportarán por elemento. No afirmar atomicidad global ni batch backend.

## Roadmap y seguimiento

Actualizar estado/criterios al cerrar cada bloque. Estados: **Pendiente**, **En curso**, **Bloqueado backend**, **Decisión pendiente**, **Hecho**. No marcar un flujo hecho hasta comprobar su criterio en código y verificación.

| Prioridad | Bloque                           | Alcance / salida verificable                                                                                                                                                                                          | Estado final (2026-10-26)                 |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| P0        | Contrato y transporte            | Comentarios alineados (rutas anidadas, 255), `PATCH` de grupos, DTO de creación de usuario válido y transporte unificado en el client común.                                                                           | Hecho                                       |
| P0        | Respuesta de contenido           | Metadata `doc` y `access_level` por hijo consumidos por la UI; render sin campos indefinidos.                                                                                                                          | Hecho                                       |
| P0        | Identidad de archivos en storage | **Bloqueado backend:** DocID/NodeID/storage key sigue inconsistente en descarga/borrado de documento; pendiente de uso backend.                                                                                       | Bloqueado backend                           |
| P0        | Identidad/permisos               | `access_level` combinado con techo de rol y reglas (D1 incluida) vía `shared/authz` con tests; `display_path` consumido; borrado de usuario retirado del flujo.                                                        | Hecho                                       |
| P1        | Comentarios                      | GET/POST/PATCH/DELETE integrados con límite 255, edición de dueño y estados de error/éxito.                                                                                                                            | Hecho                                       |
| P1        | Contrato completo                | Paginación de nodos/docs integrada con filtros; `PUT node` y descarga de carpeta siguen `501` backend (descarga con botón visible que notifica el error).                                                              | Hecho cliente / bloqueado backend           |
| P1        | Grupos                           | Update con `PATCH`, `403` con mensaje accionable y `GroupNodePicker` en lugar de UUID manual; filtro `usr_id` del API no expuesto.                                                                                      | Hecho (con brecha `usr_id`)                 |
| P2        | Explorador de archivos           | Navegación por carpeta, orden local, dotfiles con persistencia y render paginado local.                                                                                                                                 | Hecho                                       |
| P2        | Design system                    | Tokens semánticos, fuentes self-hosted, tema persistente sin flash y contraste AA verificado con tests de tema.                                                                                                        | Hecho                                       |
| P3        | Subida de carpetas               | Árbol recursivo cliente, concurrencia máxima 20, progreso por elemento, cancelación y reintento selectivo; sin límites frontend de conteo/profundidad/bytes.                                                   | Hecho                                        |
| P3        | Verificación                     | Vitest (73 tests) para authz, DTOs, errores y lógica pura; **checklist manual E2E de los 9 flujos pendiente explícito**.                                                                                               | Hecho parcial / checklist pendiente         |

## Decisiones abiertas para refinar al iniciar implementación

1. **Subida de carpetas (resuelto):** selector `webkitdirectory`, con fallback explicativo; el contenido recibido define el árbol no vacío.
2. **Carga parcial (resuelto):** pool de hasta 20, detener cola/abortar activos, mostrar fallidos con ruta y reintentar solo lo pendiente/fallido.
3. **Límites (resuelto):** no hay topes frontend de cantidad, profundidad o tamaño total; cuotas per-user futuras son backend y errores por elemento.
4. **Sorting (resuelto):** orden local sobre el conjunto completo de hijos con dirección reversible; el endpoint paginado no expone sort.
5. **Persistencia de preferencias (resuelto, D6):** tema y «mostrar ocultos» viven en `localStorage` por dispositivo; backend no publica preferencias de cuenta.
6. **(D5) Borrado de usuario (resuelto):** sin contrato backend; el cliente no ofrece borrado de usuario y lo mantiene fuera del flujo hasta decidir método/permisos/consecuencias.
7. **Metadata por hijo (resuelto):** `access_level` y `doc` llegan por hijo y la UI los consume sin heredar permisos del padre.
8. Si se concreta el futuro rol `OneTimeRole`, precisar que bloquea crear/cambiar asignaciones manuales tras la provisión inicial y definir por separado la política de revocación de accesos.
9. **Comentarios de `limited_usr_role` (resuelto en UI, D1):** el UI bloquea su creación en todos los niveles; alinear el permiso en backend queda como trabajo backend pendiente.
10. **Verificación flujos (resuelto, D7):** Vitest para lógica pura + checklist manual por flujo; el checklist E2E está pendiente de ejecución documentada.

## Referencias reemplazadas

La referencia adjunta `build_indications.md` contiene rutas antiguas (`/usrs/login`, `/comments`, `/docs`), registro, borrado de usuario y estados de implementación que no corresponden al backend actual. No existe como archivo en este repo; este plan y `contract-coverage.md` pasan a ser las referencias de trabajo, verificadas contra código.
