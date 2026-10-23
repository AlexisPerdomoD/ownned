# [ISSUE-1.7] Retirar affordances sin contrato

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** hecho *(implementado en `7f37d10`; D5 ahora etiquetada en `product-plan.md` — ver Cierre)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `refactor(web): remove unsupported user affordances`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

Eliminar registro público placeholder (`RegisterForm.jsx`/`useRegister.js`) y acción/API de borrado de usuario (`deleteUsr.js`) porque no existen en el contrato. Documentar decisión D5.

**No tocar:** vistas de flujos legítimos y la redirección de login.

## Archivos afectados

- `web/app/src/features/auth/ui/RegisterForm.jsx`
- `web/app/src/features/auth/usecase/useRegister.js`
- `web/app/src/features/auth/usecase/index.js`
- `web/app/src/entities/usrs/api/deleteUsr.js`
- `web/app/src/entities/usrs/api/index.js`
- `web/app/src/pages/UsrsView/index.jsx` (solo quitar botón/acción de borrado)

## Criterios de aceptación

- [x] No queda ningún acceso visible a operaciones sin endpoint (registro y borrado de usuario retirados).
- [x] No quedan imports/exports rotos; build y lint limpios (`pnpm build` OK; `eslint src` en 0 errores).
- [x] D5 queda registrada en `product-plan.md` (una línea — item 6 de decisiones abiertas etiquetado "(D5)").

## Cierre de la issue (sesión 2026-10-22)

- Implementado en commit `7f37d10`: `RegisterForm.jsx`, `useRegister.js` y `deleteUsr.js` (archivo vacío de 0 líneas) eliminados; `apiDeleteUsr`/`useDeleteUsr` y el botón Delete retirados de `UsrsView`; export limpio en `features/auth/usecase/index.js`.
- Pendiente: ninguno.

## Prompt para agente ejecutor

> "Elimina en `web/app` el flujo de registro placeholder y la acción/API de borrado de usuario (no existen en el backend). Deja `UsrsView` sin ese botón y sin imports muertos. Registra en `doc/frontend/product-plan.md` (lista de decisiones abiertas) que el borrado de usuario es D5."
