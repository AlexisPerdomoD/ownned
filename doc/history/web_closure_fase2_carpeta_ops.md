# Cierre Fase 2 (operaciones de carpeta) — 2026-10-23

- **Estado:** issue 17 cerrado (`hecho`).
- **Referencias:** `../proposal/plan-cierre-cliente-web.md`.

## Alcance implementado

- Creación de carpeta funcional con validación.
- Edición (`PUT /nodes/{id}` = 501) ya no se muestra como affordance disponible.
- Borrado recursivo usa `ConfirmDialog` compartido (sin `window.confirm`).
- Vista se refresca tras operaciones.