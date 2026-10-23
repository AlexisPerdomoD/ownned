# [ISSUE-5.1] Subida de carpetas completas

- **Fase:** 5 — Capacidades avanzadas, verificación y cierre
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** D4 resuelta (cliente orquesta, ver abajo); fases 1–2
- **Conflicto de archivos:** `UploadDropzone` (requiere 2.5 terminada)
- **Commit sugerido:** `feat(upload): add folder upload flow`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md) · **Propuesta completa:** [`../../../proposal/dir_upload.md`](../../../proposal/dir_upload.md)

## Objetivo / alcance

Implementar la estrategia acordada en [`../../proposal/dir_upload.md`](../../../proposal/dir_upload.md) — **Propuesta A: orquestación en cliente** con los endpoints existentes — con límites definidos (máx. archivos, profundidad, tamaño total), cola de subida con progreso por archivo, desduplicación por ruta relativa, cancelación y fallos parciales visibles.

**No desarrollar backend batch en esta fase** (queda documentado como Propuesta B con criterios de migración en el reporte).

## Archivos afectados

- `web/app/src/features/node/ui/UploadDropzone.jsx`
- `web/app/src/features/node/usecase/*`
- `web/app/src/entities/docs/api/*` (si el transporte de subida necesita un helper dedicado)

## Criterios de aceptación

- [ ] Subida de estructura de carpetas refleja el árbol.
- [ ] Fallo en un archivo no rompe el resto y el usuario sabe qué falló y puede reintentar la lista fallida.
- [ ] Límites y cancelación documentados en la propuesta y aplicados.

## Prompt para agente ejecutor

> "Implementa la subida de carpetas en `web/app` siguiendo la **Propuesta A** de `doc/proposal/dir_upload.md` (orquestación en el navegador con endpoints existentes): cola secuencial, desduplicación por ruta relativa, cancelación, reintento de la lista de archivos fallidos y los límites documentados. No inventes endpoints backend batch; eso es la Propuesta B del reporte y queda para decisión futura."
