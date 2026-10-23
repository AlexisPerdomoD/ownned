# [ISSUE-2.3] Cerrar administración de usuarios

- **Fase:** 2 — Flujos críticos rotos
- **Tipo:** Módulo específico (flujo)
- **Estado:** pendiente
- **Depende de:** 1.2, 1.6, 1.7
- **Conflicto de archivos:** `shared/ui/Navbar.jsx` (comparte superficie con 4.1; fase 4 va después, sin conflicto real)
- **Commit sugerido:** `fix(users): gate and align user administration`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Gating de acceso/enlace por rol de super, filtro de rol en UI, validación final del formulario con la validación de 1.6, manejo correcto de `401/403` backend.

## Archivos afectados

- `web/app/src/pages/UsrsView/index.jsx`
- `web/app/src/shared/ui/Navbar.jsx` (visibilidad del enlace)
- `web/app/src/entities/usrs/api/index.js` (paginación con filtros si falta)

## Criterios de aceptación

- [ ] Solo super ve y usa administración de usuarios.
- [ ] Búsqueda/paginación/filtro de rol contra el contrato.
- [ ] Creación válida e inválida con feedback coherente.

## Prompt para agente ejecutor

> "En `web/app`, habilita la admin de usuarios solo para super usando el rol del AuthProvider; ajusta paginación y filtro de rol a la ruta real; valida el formulario con el DTO de 1.6. No agregues borrado de usuario (no existe)."
