# [ISSUE-1.2] Restauración de sesión determinística y exposición de rol

- **Fase:** 1 — Ajustes globales de contrato e infraestructura
- **Tipo:** Ajuste Global / Infraestructura
- **Estado:** revisión *(implementado; verificación build/lint pasadas; sim manual de 401/500 pendiente)*
- **Depende de:** nada — ejecución 100% paralela con el resto de la Fase 1
- **Conflicto de archivos:** ninguno (todas las issues 1.x tocan superficies separadas)
- **Commit sugerido:** `fix(auth): make session recovery deterministic`
- **Plan maestro:** [`../plan-cierre-cliente-web.md`](../plan-cierre-cliente-web.md)

## Objetivo / alcance

En `AuthProvider`, distinguir `401` (anónimo) de cualquier otro fallo (estado `error` con reintentar); eliminar el spinner perpetuo; exponer usuario y rol de forma estable para el gating.

**No tocar:** rutas, vistas de flujos, ni lógica de `login` correcto.

## Archivos afectados

- `web/app/src/features/auth/providers/AuthProvider.jsx`
- `web/app/src/features/auth/ui/ProtectedRoute.jsx`

## Criterios de aceptación

- [ ] Con `401` → estado anónimo y redirección a login.
- [ ] Con `500` / red caída → estado de error con acción de reintento, nunca carga infinita.
- [ ] Rol disponible en contexto para `Navbar` y futuras vistas sin fetch ad hoc.

## Prompt para agente ejecutor

> "En `web/app/src/features/auth`, ajusta `AuthProvider` para que `GET /usrs/me` falle de forma observable: `401` → estado anónimo; resto → estado de error con reintento (por ejemplo un botón en `ProtectedRoute`). No introduzcas polling. Expón `role` del usuario en el contexto. Añade/ajusta estados de carga/error en `ProtectedRoute` sin tocar vistas."
