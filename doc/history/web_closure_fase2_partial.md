# Cierre parcial Fase 2 — Cliente web (2026-10-23)

- **Estado:** issues 12, 13 y 14 cerrados (`hecho`). Pendientes: 15, 16, 17.
- **Referencias:** `../proposal/plan-cierre-cliente-web.md`, `../issue/README.md`.

## Alcance implementado

- **12 gating nodos:** HomeView/NodeView consumen `display_path` y `access_level`; acciones (nueva carpeta, editar, borrar, subir) se gobiernan con `shared/authz` + rol de sesión. UUIDs no visibles. `access_level` ausente → sin acciones mutables.
- **13 comentarios:** edición inline con PATCH, gating de autoría (autor o super), regla D1 (limited no comenta), límite 255, preservación del borrador en error.
- **14 admin usuarios:** Navbar y UsrsView restringidos a super; paginación/búsqueda/filtro por rol; creación válida/inválida con feedback; manejo de 401/403.

## Decisiones

- D1 aplicada en UI (`canCommentOnNode` retorna false para limited).
- El backend sigue siendo autoridad final para 403.

## Pendiente

- Issues 15, 16, 17 (grupos, docs transfer, carpeta ops).