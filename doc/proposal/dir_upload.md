# Propuesta: subida de directorios (dir upload)

**Fecha:** 2026-10-22 · **Estado:** decisión D4 resuelta — iniciar por la **Propuesta A (cliente)** · **Plan asociado:** [`../frontend/issues/plan-cierre-cliente-web.md`](../frontend/issues/plan-cierre-cliente-web.md), issue 5.1

---

## 1. Contexto

El cliente web hoy soporta subida de archivos individuales vía `UploadDropzone` + `POST /nodes/{nodeID}/doc` (multipart). El objetivo es poder subir una **estructura de carpetas completa** (árbol con varios niveles y archivos), manteniendo el inventario de nodos del backend consistente.

Contrato disponible sin tocar el backend:

- `POST /api/v1/nodes` — crea carpeta (padre + nombre).
- `POST /api/v1/nodes/{nodeID}/doc` — sube el archivo de un nodo documento (multipart).

Es decir, el backend ya ofrece las dos operaciones primitivas necesarias; la discusión es **quién orquesta** el árbol: el cliente (Propuesta A) o un nuevo endpoint batch (Propuesta B).

## 2. Propuesta A — Orquestación en el cliente (recomendada para MVP)

### Descripción

El navegador reconstruye el árbol (APIs nativas: `webkitdirectory`/`DataTransferItem.webkitGetAsEntry`), lo aplana a una cola de elementos ordenada **padres-antes-que-hijos**, y ejecuta llamadas secuenciales:

1. `POST /nodes` por cada carpeta (recibiendo el `NodeID` real que devuelve el backend).
2. `POST /nodes/{nodeID}/doc` por cada archivo, contra la carpeta creada en el paso anterior.

### Pros

1. **Cero cambios de backend:** se reutilizan endpoints ya registrados, validados y con permisos vigentes. El riesgo de contrato es cero.
2. **Estados por archivo de forma natural:** cada llamada es transaccional y observable — progreso, reintento por unidad y lista de fallidos con su ruta relativa son casi gratis.
3. **Cancelación trivial:** detener la cola local no deja estado semitransaccionado en backend (pueden quedar carpetas creadas, pero son nodos válidos y bien formados — no un "zip a medias").
4. **Evolución gradual:** el UX (cola, progreso, reintentos) queda en una feature aislada (`features/node/usecase/*`), migrable a batch sin reescribir la UI.
5. **Puntos de validación en cada paso:** las reglas de permisos (`403`) aplican por carpeta objetivo, exactamente como interactúa el usuario hoy; no se necesita un "modo batch" con semántica distinta de permisos.

### Contras y mitigaciones

| Contra | Mitigación |
| --- | --- |
| Muchas peticiones dependientes de latencia (1 por carpeta + 1 por archivo) | Cola **secuencial** con límite de concurrencia (2–3 peticiones en paralelo para carpetas); presupuesto total documentado (p. ej. ≤ 500 elementos) |
| Sin atomicidad global: fallo a mitad deja árbol parcial | Se reporta por archivo/carpeta con botón "reintentar fallidos"; desduplicación por ruta relativa evita recrear lo ya creado si se repite la misma subida |
| Falta de IDs estables ante retry necesitan trazabilidad | Guardar en memoria la ruta relativa → `NodeID` creado; al reintentar, si el `POST /nodes` por ruta ya existe en la sesión, reutiliza el `NodeID` |
| Dependencia si usa `webkitdirectory` (no estándar pero ampliamente soportado en navegadores de facto) | Fallback explícito: sin directorio, se deshabilita el affordance y se explica |
| Sin límite server-side duro aún | Validación previa en cliente: número de elementos y tamaño agregado; comunicarlo antes de iniciar |

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
| Progreso por archivo | Nativo | Requiere protocolo de progreso |
| Cancelación | Trivial | Requiere acuerdo y manejo server-side |
| Atomicidad estricta del árbol | No (parcial visible/legible) | Teórica (frágil ante fallos reales) |
| Escalabilidad con árboles enormes | Limitada (límite en cliente) | Mejor |
| Tiempo hasta MVP | Corto | Largo |
| Riesgo de contrato | Cero | Alto |

## 5. Recomendación

1. **Adoptar Propuesta A** para la issue 5.1 del plan, con estas garantías no negociables:
   - Cola ordenada: padres antes que hijos, sin subida de archivo antes que su carpeta padre.
   - Desduplicación por ruta relativa → reutilizar `NodeID` creado en la misma sesión de subida.
   - Cancelación efectiva en cualquier momento, con resumen de estado resultante.
   - Lista de fallidos con ruta relativa + botón de reintento (sin re-crear lo que no falló).
   - Los límites (máx. elementos, profundidad, tamaño) se validan en cliente antes de iniciar, y se registran en la propia feature.
2. **No descartar B** para un esfuerzo futuro; los criterios de migración son: árboles > 1000 elementos, o problemas de latencia/pérdida de estado que A no mitigue.
3. **El plan de issues queda actualizado con esta decisión:** issue 5.1 = Propuesta A; la Propuesta B queda en este reporte como referencia para producto/hoja de ruta (no es issue).

## 6. Referencias

- Contrato carga de archivos: `internal/adapter/inbound/httpapi/node_handler.go` (rutas `POST /nodes` y `POST /nodes/{nodeID}/doc`).
- Transporte de subida actual del cliente: `web/app/src/features/node/usecase/useCreateDoc.js` (a unificar en la issue 1.1).
- Plan de cierre: `doc/proposal/plan-cierre-cliente-web.md` (issues 1.1 y 5.1).
