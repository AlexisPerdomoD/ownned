# Cierre 5.1 — Subida recursiva de carpetas

- **Estado:** issue 27 cerrada (`hecho`).
- **Decisión D4:** orquestación cliente con `POST /nodes` y `POST /nodes/docs`; no se añade endpoint batch.

`useUploadFolder` reconstruye carpetas desde rutas relativas, deduplica elementos y crea directorios por niveles antes de subir archivos. Mantiene un pool rolling de hasta **20 requests concurrentes**. El panel informa progreso por elementos (carpetas + archivos), bloquea nuevas subidas mientras hay una cola activa, cancela requests en curso y muestra errores con ruta relativa para reintentar únicamente lo pendiente/fallido. Los IDs creados o reutilizados se conservan durante la sesión; las colisiones de archivos se resuelven con la lógica de `useCreateDoc`.

Por decisión del usuario, el cliente no impone límites de cantidad, profundidad ni bytes totales. Las cuotas per-user futuras del backend quedan fuera del contrato frontend y cualquier rechazo se informa por elemento. El flujo es parcial, no atómico; el picker `webkitdirectory` no expone carpetas vacías que no estén representadas por archivos.

Verificación: pruebas de estructura recursiva, deduplicación, límite de concurrencia, cancelación y retry parcial; `pnpm exec vitest run` (**57 tests**), `pnpm run build` y ESLint de los archivos afectados pasan sin errores ni warnings.
