# Propuesta: subida de directorios (dir upload)

**Fecha:** 2026-10-22 · **Estado:** decisión D4 resuelta — Propuesta A (cliente) · **Plan asociado:** [`./plan-cierre-cliente-web.md`](./plan-cierre-cliente-web.md), issue 27

---

## 1. Contexto

El cliente web soporta subida de archivos individuales vía `POST /api/v1/nodes/docs` (multipart). El objetivo es subir una **estructura de carpetas completa** (árbol con varios niveles y archivos), manteniendo el inventario de nodos del backend consistente.

Contrato disponible sin tocar el backend:

- `POST /api/v1/nodes` — crea carpeta (padre + nombre).
- `POST /api/v1/nodes/docs` — sube un archivo al nodo padre (`parent_id`) por request multipart.

Es decir, el backend ya ofrece las dos operaciones primitivas necesarias; la discusión es **quién orquesta** el árbol: el cliente (Propuesta A) o un nuevo endpoint batch (Propuesta B).

## 2. Propuesta A — Orquestación en el cliente (recomendada para MVP)

### Descripción

El navegador reconstruye el árbol visible en `webkitRelativePath`, lo aplana a una cola deduplicada por ruta relativa y ejecuta un pool rolling con **máximo 20 requests concurrentes**. Las carpetas se crean por niveles, padres antes que hijos; los archivos empiezan después de crear sus carpetas. Los workers toman el siguiente elemento al liberar una petición. El input de directorio solo entrega archivos y sus rutas, por lo que no expone carpetas vacías.

1. `POST /nodes` por cada carpeta (recibiendo el `NodeID` real que devuelve el backend).
2. `POST /nodes/docs` por cada archivo, contra la carpeta creada en el paso anterior.

### Pros

1. **Cero cambios de backend:** se reutilizan endpoints ya registrados, validados y con permisos vigentes. El riesgo de contrato es cero.
2. **Estados por archivo de forma natural:** cada llamada es transaccional y observable — progreso, reintento por unidad y lista de fallidos con su ruta relativa son casi gratis.
3. **Cancelación efectiva:** detener la cola y abortar requests activos; pueden quedar carpetas/archivos ya creados, pero son nodos válidos y la UI muestra el estado parcial.
4. **Evolución gradual:** el UX (cola, progreso, reintentos) queda en una feature aislada (`features/node/usecase/*`), migrable a batch sin reescribir la UI.
5. **Puntos de validación en cada paso:** las reglas de permisos (`403`) aplican por carpeta objetivo, exactamente como interactúa el usuario hoy; no se necesita un "modo batch" con semántica distinta de permisos.

### Contras y mitigaciones

| Contra | Mitigación |
| --- | --- |
| Muchas peticiones dependientes de latencia (1 por carpeta + 1 por archivo) | Pool rolling limitado a **20 requests concurrentes**; sin límite frontend de conteo, profundidad o tamaño total por decisión del usuario. |
| Sin atomicidad global: fallo a mitad deja árbol parcial | Se reporta por archivo/carpeta con botón "reintentar fallidos"; desduplicación por ruta relativa evita recrear lo ya creado si se repite la misma subida |
| Falta de IDs estables ante retry necesitan trazabilidad | Guardar en memoria la ruta relativa → `NodeID` creado; al reintentar, reutilizar IDs/rutas creados durante la sesión. |
| Dependencia si usa `webkitdirectory` (no estándar pero ampliamente soportado en navegadores de facto) | Fallback explícito: sin directorio, se deshabilita el affordance y se explica |
| Las cuotas por usuario pueden variar o no estar disponibles en todos los despliegues | El cliente no fija cuotas; muestra el resultado por elemento y permite reintentar los fallidos. El flujo queda agnóstico a cuotas futuras del backend. |

### Veredicto para MVP

Recomendado. Toca solo `web/app`, no altera contrato y su peor caso de fallo es 100% legible para el usuario.

## 3. Propuesta B — Endpoint batch backend

### Descripción

Un único `POST /nodes/{nodeID}/tree` (o equivalente) recibe el manifiesto del árbol + archivos (multipart/zip/JSON+binarios) y el backend materializa la carpeta, marca permisos y procesa subidas con un worker.

### Pros

1. **Cohesión transaccional:** una única operación que el backend puede intentar de forma más compacta; menos lógica viva en el cliente para mantener el mapeo ruta→ID.
2. **Menos viajes de red** para árboles muy profundos (1 request vs. N).
3. **Reglas de límite server-side** naturales (users pueden abusar del cliente? Se centraliza).
4. Validación de permisos y deduplicación server-side es la fuente de verdad más robusta ante clientes raros.

### Contras

1. **Nuevo contrato + migración de permisos/diseño del worker**, con costes no triviales (recursión, tamaño máximo, deduplicación de archivos, reintentos internos, streaming).
2. **Atomicidad "global" es un espejismo práctico** en uploads parciales: fallar a mitad de un zip requiere compensar (rollback de carpetas + archivos), que no es trivial y probablemente termina también dejando estado parcial o una operación de "estado fallido" paralelo al modelo actual.
3. **Progreso por archivo es más difícil de propagar** hacia el cliente (requiere streaming de progreso o polling); con A es nativo.
4. **Errores por archivo deben seguir multiplicándose** — el batch necesita igualmente una respuesta por elemento, entonces la complejidad solo se muda del cliente al backend.
5. Retrasa el cierre del MVP del cliente; rompe el objetivo establecido de **pragmatismo** y de modularidad por fases.

### Veredicto

Vale la pena **solo si** se detecta a futuro: (a) árboles con miles de archivos en una sola transacción de usuario, o (b) problemas reales de latencia/perdición de estado con la Propuesta A que no se mitiguen con la cola local.

## 4. Comparativa resumida

| Criterio | A — Cliente | B — Batch backend |
| --- | --- | --- |
| Cambios de backend | Ninguno | Nuevo endpoint + worker + tests |
| Cambios de contrato | Ninguno | Sí (+ docs `contract-coverage.md`) |
| Complejidad inicial | Baja — feature aislada en `web/app` | Alta |
| Progreso por elemento | Nativo (carpetas + archivos, actual/total) | Requiere protocolo de progreso |
| Cancelación | Aborta peticiones activas y detiene tareas pendientes; deja estado parcial visible | Requiere acuerdo y manejo server-side |
| Atomicidad estricta del árbol | No (parcial visible/legible) | Teórica (frágil ante fallos reales) |
| Escalabilidad con árboles enormes | Limitada por viajes de red, sin límite frontend de conteo/profundidad/tamaño | Mejor |
| Tiempo hasta MVP | Corto | Largo |
| Riesgo de contrato | Cero | Alto |

## 5. Recomendación

1. **Adoptar Propuesta A** para la issue 27, con estas garantías no negociables:
   - Pool rolling de máximo 20 requests concurrentes y carpetas procesadas por niveles padres-antes-que-hijos.
   - Desduplicación por ruta relativa y reutilización de `NodeID` creado en la sesión.
   - Cancelación efectiva: detener tareas pendientes y abortar requests activos; mostrar el estado parcial.
   - Progreso de elementos actual/total (carpetas + archivos) y lista de fallidos con ruta relativa y reintento selectivo.
   - Sin límites frontend de cantidad, profundidad o bytes totales por decisión del usuario; las cuotas disponibles del backend se muestran como fallos por elemento.
2. **No descartar B** para un esfuerzo futuro; los criterios de migración son: árboles > 1000 elementos, o problemas de latencia/pérdida de estado que A no mitigue.
3. **El plan de issues queda actualizado con esta decisión:** issue 27 = Propuesta A; la Propuesta B queda en este reporte como referencia para producto/hoja de ruta (no es issue).

## 6. Referencias

- Contrato de carga: `internal/adapter/inbound/httpapi/node_handler.go` (`POST /nodes` y `POST /nodes/docs`).
- Transporte de subida: `web/app/src/shared/api/client.js` y `web/app/src/features/node/usecase/useCreateDoc.js`.
- Plan de cierre: `doc/proposal/plan-cierre-cliente-web.md` (issue 27).
