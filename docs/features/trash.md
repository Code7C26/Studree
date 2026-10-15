# Feature: Papelera

> **Fase 13** · Estado: 🟡 en curso (services y filtros hechos; falta UI y purga automática).
> Leer antes de tocar `services/trash.service.js`, `useTrash`, `useTrashPurge`,
> `pages/TrashPage.jsx`, `features/trash/**` o `lib/trash/**`.

## Archivos clave

- `supabase/migrations/0006_fase13.sql` — columnas `deleted_at` y funciones SQL.
- `src/services/trash.service.js` — mandar a la papelera, restaurar, listar, borrar para siempre, purgar vencidos.
- `src/services/crudService.js` — opción `softDelete` (las lecturas ignoran lo borrado).
- `src/lib/graph/livePrerequisites.js` — descarta correlativas hacia materias en la papelera.

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

- **Borrar → deshacer:** `trashService.trash(table, id)` devuelve la marca; el aviso ofrece `restore`.
- **Página `/papelera`:** restaurar, borrar para siempre o vaciar todo.
- **Purga al iniciar sesión:** `trashService.purgeExpired()` una vez por sesión; un error corta y se reintenta la próxima.

## Lecturas filtradas (`deleted_at IS NULL`)

- `careersService`, `subjectsService`, `sheetsService`: `list`, `listByParents` y `get` (vía `softDelete: true`).
- `sheetsService.searchContent` (Ctrl+K).
- `homeService.getLastEditedSheet` ("Seguí donde dejaste").
- `useCareerMap`: correlativas filtradas con `livePrerequisites`.

## Errores

Todos los métodos devuelven `{ data, error }` con el error ya traducido (`translateError`).

## Pendiente

- Hook `useTrash`, `useTrashPurge`, página `/papelera` y componentes.
- Reemplazar los borrados definitivos de la UI por `trashService.trash`.
