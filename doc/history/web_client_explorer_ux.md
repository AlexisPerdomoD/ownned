# Mejoras de exploración y navegación del cliente web

- **Estado:** implementación registrada; no cierra issues del tracker.
- **Alcance:** `web/app` — búsqueda compartida, vista de raíces, retorno de navegación y componentes de NodeView.

La búsqueda de carpetas y documentos se extrajo a `features/node` y se reutiliza desde Home y el detalle de carpeta. Sus resultados aparecen en un diálogo de ancho acotado con backdrop, cierre exterior/Escape, filtros y paginación. Home conserva su listado de raíces y añade búsqueda global.

La navegación interna lleva `returnTo` en el estado de ruta para que Back vuelva a la ubicación de origen; una URL abierta directamente usa `/nodes` como fallback. El panel de comentarios se separó en `features/comments` y anima su entrada/salida. `NodeView` delega el formulario local a su carpeta de página y comparte filas y formateo desde la feature de nodos. Se eliminaron estado redundante y el caso de edición de formulario que no tenía flujo asociado. Las funciones DTO de comentarios ahora se importan estáticamente, eliminando el warning de importación ineficaz.

**Fuera de alcance:** no se alteró backend ni se cerró/modificó ningún issue del tracker. La búsqueda no corrige la consulta backend que mezcla hijos entre carpetas; ese problema permanece fuera de este cambio.

**Verificación:** `pnpm test` (49 pruebas), `pnpm build` y `pnpm exec eslint src` pasan. No se hizo comprobación visual manual en navegador a 300 px.
