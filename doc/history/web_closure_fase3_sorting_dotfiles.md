# Cierre 3.3 — Ordenación y dotfiles

- **Estado:** issue 20 cerrada (`hecho`).
- **Decisión D3:** ordenar localmente el conjunto completo recibido por `GET /nodes/{id}`; la paginación de 100 elementos limita el render. Los endpoints paginados actuales no aceptan orden.

`NodeView` ordena carpetas y archivos por nombre real, fecha de creación o modificación, conserva carpetas primero y permite invertir la dirección. Los nombres que comienzan con `.` se ocultan inicialmente y la preferencia «Show hidden» persiste en `localStorage`.

La lógica de orden/filtro es pura y cuenta con pruebas para los tres criterios, dirección y visibilidad de dotfiles. Verificación: `pnpm exec vitest run` (23 tests) y `pnpm run build` pasan; ESLint no reporta errores.
