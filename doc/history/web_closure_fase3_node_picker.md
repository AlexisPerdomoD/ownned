# Cierre 3.4 — Selector visual de nodos para grupos

- **Estado:** issue 21 cerrada (`hecho`).
- **Alcance ampliado con autorización:** integración en `GroupView` además de la lista y el use case previstos inicialmente.

`GroupNodePicker` reemplaza la selección plana por un flujo navegable desde las raíces a carpetas hijas, con búsqueda paginada dentro de la ubicación actual. El actor elige nombres/rutas legibles; los UUIDs permanecen como identificadores internos. La affordance de compartir se limita a roles super/normal. Un `403` de asociación comunica “You cannot share this node.” y la lista se refresca tras asociar o quitar.

Verificación: prueba unitaria de la traducción de `403`, `pnpm exec vitest run` (24 tests) y `pnpm run build` pasan. ESLint no reporta errores; quedan warnings previos de `GroupView` por valores de actualización/eliminación y `handleUpdate` sin uso.
