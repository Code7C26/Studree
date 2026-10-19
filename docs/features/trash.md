# Feature: Papelera

> **Fase 13** · Estado: ✅ Implementado (2026-10-15). Migración `0006_fase13.sql` aplicada el 2026-10-15.
> Leer antes de tocar `services/trash.service.js`, `useTrash`, `useTrashPurge`,
> `pages/TrashPage.jsx`, `features/trash/**` o `lib/trash/**`.

## Archivos clave

- `supabase/migrations/0006_fase13.sql` — columnas `deleted_at` y funciones SQL.
- `src/services/trash.service.js` — mandar a la papelera, restaurar, listar, borrar para siempre, purgar vencidos.
- `src/services/crudService.js` — opción `softDelete` (las lecturas ignoran lo borrado).
- `src/lib/graph/livePrerequisites.js` — descarta correlativas hacia materias en la papelera.
- `src/lib/trash/trashItems.js` — textos puros: `TRASH_DAYS`, `daysLeft`, `describeContents`, `trashItemTitle`.
- `src/hooks/useTrash.js` — estado de la página (listar, restaurar, borrar para siempre, vaciar).
- `src/hooks/useTrashPurge.js` — purga de lo vencido, una vez por sesión (la llama `WorkspaceLayout`).
- `src/components/ui/UndoToast.jsx` — aviso "Movido a la papelera · Deshacer" (6 s).
- `src/components/features/trash/TrashItemRow.jsx` y `src/pages/TrashPage.jsx` — la página `/papelera`.
- `Explorer` — entrada "Papelera" al pie. `useFolder.deleteSheet/restoreSheet`, `useCareers.restoreCareer` y `useCareerMap.restoreSubject` — borrar manda a la papelera y deshacer restaura.

## Descripción

Borrar una carrera, una materia o una hoja ya no es definitivo: se manda a la papelera
y queda **30 días**. En ese plazo se puede **deshacer** (aviso inmediato) o restaurar desde
`/papelera`. Pasado el plazo se borra para siempre, con sus adjuntos.

## Reglas

Las reglas de datos (marca única por borrado, restauración, primer nivel, 30 días,
whitelist) están en [`DB_SCHEMA.md`](../DB_SCHEMA.md#papelera-0006-adr-019); no se repiten acá.

Reglas del lado de la app:

- Borrar para siempre: **primero** los archivos de Storage, **después** las filas.
- Una materia en la papelera conserva sus correlativas en la base: el canvas las filtra con `livePrerequisites`.

## Flujos

- **Borrar → deshacer:** las tres páginas (carpeta, carreras, canvas) llaman `trashService.trash` desde su hook y muestran `UndoToast`; "Deshacer" llama `restore` y recarga. En la carpeta, antes de mandar la hoja a la papelera se cancela su autosave pendiente.
- **Página `/papelera`:** restaurar, borrar para siempre o vaciar todo.
- **Purga:** `useTrashPurge` llama `trashService.purgeExpired()` una vez por sesión (por usuario); un error solo se avisa por consola y se reintenta en la próxima sesión.
- **Nunca se borra algo vivo (revisión final):** `purgeForever` primero confirma con un
  `select … where deleted_at is not null` que la fila sigue en la papelera (si no, devuelve
  `false` sin tocar archivos) y el `DELETE` también filtra `deleted_at`. `useTrash` recarga la
  lista después de cada restaurar/borrar (restaurar una hoja revive su materia y su carrera) y
  "Vaciar papelera" vuelve a pedir `list_trash` antes de borrar.
- **Lo que arrastra un borrado:** antes de confirmar "Borrar para siempre" de una carrera o
  materia, `trashService.trashedDescendantIds` trae los ids de sus materias/hojas en la papelera
  y `nestedTrashItems` (`lib/trash/trashItems.js`) los cruza con lo listado: la confirmación
  dice "También se borran para siempre: …". Sin migración nueva.

## Lecturas filtradas (`deleted_at IS NULL`)

- `careersService`, `subjectsService`, `sheetsService`: `list`, `listByParents` y `get` (vía `softDelete: true`).
- `sheetsService.searchContent` (Ctrl+K) y `homeService.getLastEditedSheet` ("Seguí donde
  dejaste"): filtran la hoja **y su materia** (`subjects!inner(…)` + `.is('subjects.deleted_at', null)`),
  así una hoja viva dentro de una materia borrada (ej. autosave desde otra pestaña) no aparece.
- `useCareerMap`: correlativas filtradas con `livePrerequisites`.

## Detalles de implementación

- `trash_item` y `list_expired_trash` usan `clock_timestamp()` (no `now()`): dos borrados en
  una misma transacción reciben marcas distintas, así restaurar uno no revive al otro.
- La migración se probó antes de aplicarla con un `begin … rollback` con asserts, incluida la
  RLS cruzada entre usuarios (21 usuarios).

## Errores

Todos los métodos devuelven `{ data, error }` con el error ya traducido (`translateError`).

## Pendiente

- [ ] Verificar en el navegador (la extensión de Chrome no estaba conectada al implementar): borrar y "Deshacer" en las tres páginas, `/papelera` completa (restaurar, borrar para siempre, vaciar), que lo borrado no aparezca en el explorador, `Ctrl+K`, el Inicio ni el export, y el chequeo de huérfanos en Storage tras "borrar para siempre".
- [ ] Seguimiento menor: la purga solo corre cuando alguien entra a la app (no hay cron).
