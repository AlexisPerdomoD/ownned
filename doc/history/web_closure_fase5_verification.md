# Cierre 5.3 — Verificación automatizada de flujos críticos

- **Estado:** issue 29 cerrada (`hecho`) con **pendiente explícito** documentado abajo.
- **D7:** Vitest solo para lógica pura; sin Playwright/Cypress ni harness de navegador en este ciclo.

## Cobertura automatizada lograda

- `src/shared/authz/index.test.js`: matriz exhaustiva **rol × nivel × acción** (3 roles × 4 niveles + ausente, para `canReadNode`, `canCommentOnNode`, `canCreateFolder`, `canUploadDoc`, `canEditNode`, `canDeleteNode`), con regla **D1** (`limited_usr_role` nunca comenta, cualquier nivel), Ausencia de rol sin permisos, equivalencia `super`/`normal` en acciones de recurso y helpers de rol (`canAssignGroupUsr`, `canManageGroupUsrs`, `canManageGroupNodes`, `canManageUsrs`, `isValidAccessForRole`, `hasKnownAccess`).
- `src/entities/usrs/api/createUsr.test.js`: reglas backend de `POST /api/v1/usrs` replicadas — contraseña 8–255 con letra/dígito/símbolo (sin exigir mayúscula), username como email, nombres 2–50, roles backend, mapeo de issues por campo. `buildCreateUsrDTO` colapsa múltiples issues del mismo campo al último mensaje (comportamiento documentado, no bug).
- Verificación: `pnpm exec vitest run` (**73 tests** en 15 archivos), `pnpm run build`, `pnpm exec eslint src` y `git diff --check` limpios.

## Pendiente explícito — checklist manual E2E (NO ejecutado)

Los 9 flujos de `doc/frontend/canonical-flows.md` **no se ejecutaron manualmente** en navegador durante este cierre; queda pendiente su comprobación y registro por flujo:

1. Inicio, sesión y acceso protegido.
2. Explorar el espacio de archivos.
3. Crear, editar y eliminar carpetas.
4. Subir, descargar y borrar documentos.
5. Leer y gestionar comentarios.
6. Administrar grupos y compartir contenido.
7. Administrar usuarios.
8. Estados y comportamiento comunes.
9. Apariencia, tema y preferencias.

Cualquier cierre posterior debe ejecutar este checklist en sesión real (`make db-local-up`, server con `.env` local, Vite `:5173`) y registrar el resultado por flujo — esta lista no debe marcarse cumplida por inferencia.
