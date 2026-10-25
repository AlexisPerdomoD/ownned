# Cierre 4.3 — Accesibilidad y estados globales

- **Estado:** issue 26 cerrada (`hecho`).
- **Alcance:** revisión manual de los nueve recorridos canónicos y de sus affordances, estados y semántica de teclado; no sustituye la verificación E2E separada de issue 29.

## Auditoría por recorrido

1. **Sesión:** carga inicial, error recuperable con reintento, credenciales y salida de sesión comunican errores; controles de login tienen etiquetas.
2. **Exploración:** raíces y nodos muestran carga/error/reintento; carpetas vacías y búsquedas sin resultados tienen estado explícito; cards/filas permiten teclado y las acciones tienen nombres accesibles.
3. **Carpetas:** formulario modal etiqueta nombre/descripción y muestra errores; borrado confirma alcance recursivo; edición permanece oculta mientras `PUT` responda `501`.
4. **Documentos:** las subidas deshabilitan controles mientras la cola del lote corre y notifican fallos; descarga/borrado comunican error. La subida recursiva completa sigue pendiente en issue 27 y descarga de carpeta conserva su error explícito `501`.
5. **Comentarios:** carga, vacío y fallo de lectura se distinguen; lectura fallida permite reintento; crear conserva el borrador si falla y editar/borrar notifican el resultado.
6. **Grupos:** lista y detalle muestran fallos de carga/reintento; cambios de integrantes/nodos dan feedback; el selector de nodos traduce `403` y refresca la relación.
7. **Usuarios:** acceso restringido por rol, carga/error reintentable, filtro por rol y errores de creación visibles; las etiquetas están asociadas a sus campos.
8. **Estados comunes:** `Spinner`, `EmptyState`, `ErrView` y `Toaster` exponen estados para tecnologías de asistencia; acciones principales usan botones/enlaces y foco visible.
9. **Apariencia:** bootstrap de tema antes del montaje, preferencia reducida de movimiento y pruebas automáticas de contraste semantic-token WCAG AA.

## Revisión manual de interacción

- Modal compartido: foco inicial/`data-autofocus`, Tab y Shift+Tab contenidos, Escape cierra y el foco vuelve al elemento que abrió el modal.
- Tabs: flechas izquierda/derecha y Home/End mueven el tab; `tablist`/`tab`/`tabpanel` quedan relacionados por IDs.
- Cards/filas: navegación principal usa botones nativos; acciones secundarias permanecen como controles separados y alcanzables por teclado.
- Formularios/search: etiquetas asociadas o `aria-label`; botones icon-only tienen nombre; errores se anuncian con `role="alert"`, cargas con `role="status"`.
- No hay llamadas `window.alert`/`window.confirm` en `web/app/src`.

La revisión fue de código y comportamiento de componentes; no se ejecutó lector de pantalla ni E2E en navegador contra una API local. Esa verificación de recorridos permanece en issue 29. Se mantuvieron visibles los límites backend/producto indicados arriba, sin presentar un flujo bloqueado como éxito.

Verificación: `pnpm exec vitest run` (29 tests) y build pasan. ESLint no reporta errores; quedan warnings de variables no usadas en páginas de grupos/usuarios fuera de los controles auditados.
