# Cierre 5.4 — Reporte final y actualización documental

- **Estado:** issue 30 cerrada (`hecho`); epílogo de `web_closure_fase5`.

## Documentación actualizada al estado real

- `doc/frontend/contract-coverage.md`: filas actualizadas (/">auth/usuarios, comentarios, nodos, descarga/borrado de documento) y brechas transversales reescritas; énfasis en transportes unificados y pendientes backend.
- `doc/frontend/canonical-flows.md`: tabla de estado y estados por recorrido refls; decisiones abiertas 1–7 marcadas resueltas con su alcance real.
- `doc/frontend/product-plan.md`: tabla de prioridades P0–P3 actualizada a estado final y decisiones marcadas.
- `README.md`: mención de la evaluación de folder-upload actualizada a la decisión implementada (orquestación cliente; `501` de descarga notificado).

## Reporte final de cierre del cliente web

**Cubierto (verificado con código + suite):** sesión/restauración con estados de error terminales; explorador con metadata `doc`/`access_level` por hijo, orden local, dotfiles persistentes, render/edición paginada y búsqueda vía API; comentarios alineados (rutas anidadas, 255, edición/eliminación); grupos con `PATCH`, 403 accionable y `GroupNodePicker`; usuarios con validación backend replicada y gating super; subida recursiva de carpetas (pool 20, progreso, cancelación, retry, sin límites frontend); tema persistente, tokens semánticos y contraste AA con tests; matriz authz completa (incluida D1) y 73 tests.

**Fuera de alcance frontend (pendiente backend):** `PUT /nodes/{nodeID}` sigue `501` (la edición avisá que no está disponible); descarga de carpeta `501` (botón visible que notifica); resolución `DocID → NodeID`/storage key en descarga/borrado de documento; filtro `usr_id` en paginación de grupos; permiso D1 de comentarios para `limited_usr_role`; directorios vacíos en el picker (`webkitdirectory` no los expone).

**Riesgos restantes:** el checklist manual E2E de los 9 flujos canónicos **no se ejecutó** y queda documentado en la historia de la issue 29; ninguna afirmación de flujo debe considerarse E2E verificada hasta completar ese registro.
