# Documentación de API — Studree

**Estado:** Sin API HTTP propia. Studree habla **directamente con Supabase** desde el
cliente (BaaS), usando `@supabase/supabase-js`. No hay servidor propio ni endpoints
`/api/*`.

**Última actualización:** 2026-10-15 (Fase 13: papelera, adjuntos, plantillas e importar)

> El rol de "capa de API" lo cumplen los **services** de `src/services/`. La seguridad no
> la da un backend intermedio sino **RLS en Postgres** — ver `docs/03-security.md`.

---

## Capa de acceso a datos (services)

Regla de oro: **ningún componente ni hook importa `supabase.client.js` ni toca
`localStorage` directamente.** Todo pasa por un service.

| Service | Responsabilidad |
|---------|-----------------|
| `supabase.client.js` | Instancia única del cliente (lee `VITE_SUPABASE_*`) |
| `cache.service.js` | Cache optimista en `localStorage` (leer/escribir/invalidar) |
| `crudService.js` | **Fábrica** con el CRUD + flujo optimista compartido por las entidades (paginado) |
| `dataEvents.js` | Aviso global `studree:data-changed` tras crear/renombrar/borrar (refresca el explorador) |
| `careers.service.js` | CRUD de carreras |
| `subjects.service.js` | CRUD de materias + cambio de estado |
| `prerequisites.service.js` | CRUD de correlativas **+ validación DAG** (ADR-009) |
| `sheets.service.js` | Hojas de una materia (sin título, orden por `created_at`) + guardado del Markdown + búsqueda de contenido en el servidor |
| `importantDates.service.js` | CRUD de fechas importantes del Inicio (título + día) |
| `tasks.service.js` | CRUD de tareas del Inicio + `rename` + `setDone` |
| `quickNotes.service.js` | CRUD de notas rápidas del Inicio |
| `home.service.js` | `getLastEditedSheet()`: "Seguí donde dejaste" (una consulta, sin `title`) |
| `trash.service.js` | Papelera (ADR-019): mandar a la papelera, restaurar, listar, borrar para siempre, purgar vencidos |
| `attachments.service.js` | Adjuntos (ADR-020): subir al bucket privado, listar, link firmado, borrar, descargar |
| `sheetTemplates.service.js` | CRUD de las plantillas propias (`sheet_templates`); las de fábrica están en `constants/sheetTemplates.js` |
| `import.service.js` | `executePlan(plan, { readFile, onProgress })`: crea carreras, materias, hojas y adjuntos de una importación |

> Eliminados: `units.service.js` y `topics.service.js` (ADR-014) y `sheetLinks.service.js`
> (ADR-017: los `[[links]]` apuntan a temas y se resuelven en el cliente).

### Contrato común

Cada service expone, para su entidad:

```js
list(parentId, onCached?, { columns }?) // → T[]  lee cache primero, refresca desde Supabase; pagina de a 1000
get(id)          // → T | null
create(data)     // → T        optimista: escribe cache y luego Supabase
update(id, data) // → T        optimista, con reversión si falla
remove(id)       // → boolean  la cascada la hace Postgres (ON DELETE CASCADE)

// Agregados el 2026-10-14:
listByParents(parentIds, columns?)          // → T[]  una consulta con IN (evita N+1), paginada
savePositions(moves, parentId?, cols?)      // → bool posiciones manuales en lote (RPC save_node_positions, ADR-016; solo subjects), silencioso
clearPositions(parentIds, cols?)            // → bool "Reordenar": pone las posiciones en NULL
```

**Config de la fábrica:** `createCrudService({ table, parentColumn?, orderBy = 'position',
notifies = true, softDelete = false })`. Con `softDelete: true` (carreras, materias y hojas,
migración 0006) `list`, `listByParents` y `get` solo traen filas con `deleted_at` NULL. Con `notifies: false` (tablas del Inicio), `create`, `update` y
`remove` no emiten `notifyDataChanged()`: tildar una tarea no recarga el explorador.

**Paginación:** PostgREST corta cada consulta en 1000 filas. `list` y `listByParents`
piden páginas con `.range()` (ordenadas por `orderBy` + `id`) hasta recibir una página
incompleta. `columns` permite no traer `content_md` (`SHEET_SUMMARY_COLUMNS`); con columnas
parciales la cache usa otra clave.

### Hojas (ADR-017)

```js
sheetsService.list(subjectId, undefined, { columns: FOLDER_SHEET_COLUMNS }) // orden: created_at
sheetsService.create({ subject_id, content_md, created_at? }, { cache? })  // sin título; la carpeta la crea recién con contenido; `created_at` y `cache: false` los usa el import
sheetsService.saveContent(id, markdown)   // → Sheet (con updated_at, para el borrador de useSheetAutosave)
sheetsService.searchContent(query)        // → [{id, subject_id, content_md, created_at}] (ilike, máx. 20)
sheetsService.get(id) / remove(id, subjectId)
```

- `FOLDER_SHEET_COLUMNS = 'id, subject_id, content_md, created_at, updated_at'`.
- `searchContent` neutraliza `%` y `\` (PostgREST no respeta el escape con barra); el
  palette descarta los falsos positivos con `buildContentSnippet`.

### Papelera, adjuntos, plantillas e importar (migración 0006, Fase 13)

Todos devuelven `{ data, error }` con el error traducido (`translateError`).

```js
trashService.trash(table, id)        // → marca deleted_at (RPC trash_item); table: 'careers'|'subjects'|'sheets'
trashService.restore(table, id)      // → bool (RPC restore_item, revive lo que tiene la misma marca)
trashService.list()                  // → TrashItem[] (RPC list_trash, solo el primer nivel borrado)
trashService.purgeForever(kind, id)  // → bool; solo si sigue en la papelera (si no, false sin tocar nada); archivos de Storage primero, filas después
trashService.trashedDescendantIds(kind, id) // → Set<string> de materias/hojas en la papelera debajo de una carrera/materia
trashService.purgeExpired(days = 30) // → número purgado (RPC list_expired_trash + attachment_paths_for)

attachmentsService.upload(sheetId, file, { id?, name? }) // → Attachment; NO es async: registra la subida pendiente en el mismo tick
attachmentsService.isUploading(id)                       // → bool
attachmentsService.listBySheets(sheetIds)                // → Attachment[] (IN de a 100 ids, `lib/chunk.js`: un IN enorme pasa el largo de la URL)
attachmentsService.signedUrl(id)                         // → link firmado de 1 h, cacheado en memoria (se renueva a los 55 min)
attachmentsService.remove(attachment)                    // → bool; Storage primero, fila después
attachmentsService.download(storagePath)                 // → Blob (lo usa el export .zip)

sheetTemplatesService.list() / create({ name, content_md }) / update(id, data) / remove(id)
importService.executePlan(plan, { readFile, onProgress }) // → ImportReport { careers, subjects, sheets, attachments, failures }
```

- **RPCs nuevas** (todas `security invoker`): `trash_item(p_table, p_id)`, `restore_item`,
  `list_trash()`, `list_expired_trash(p_days)` y `attachment_paths_for(p_kind, p_id)`. Detalle
  en `DB_SCHEMA.md` y en `docs/features/trash.md`.
- Bucket Storage `attachments` (privado): ver `docs/03-security.md`.
- Lecturas que además filtran `deleted_at` de la hoja **y de su materia** (`subjects!inner`):
  `sheetsService.searchContent`, `homeService.getLastEditedSheet`.
- `crudService.create(values, parentId, { cache })` y `remove(id, parentId, { cache })`:
  `cache: false` no toca localStorage. Lo usan el import (`sheetsService.create(values, { cache: false })`)
  y los adjuntos (su cache no la lee nadie).

### Inicio (migración 0005, ver `docs/features/home.md`)

```js
importantDatesService.list(undefined, onCached?)  // → ImportantDate[] (orden: date)
importantDatesService.create({ title, date })     // date: 'YYYY-MM-DD'
importantDatesService.update(id, { title, date })
importantDatesService.remove(id)

tasksService.list(undefined, onCached?)           // → Task[] (orden: created_at)
tasksService.create({ text, due_date? })          // due_date: 'YYYY-MM-DD' | null
tasksService.rename(id, text)
tasksService.setDone(id, done)                    // done_at = now() | null
tasksService.remove(id)

quickNotesService.list(undefined, onCached?)      // → QuickNote[] (orden: created_at)
quickNotesService.create(body)
quickNotesService.updateBody(id, body)
quickNotesService.remove(id)

homeService.getLastEditedSheet(onCached?)
// → LastSheet | null = { id, subject_id, updated_at, subject_name, subject_color, preview }
```

- Los tres services de tablas usan `notifies: false`.
- `getLastEditedSheet` consulta `sheets` (`order updated_at desc`, `limit 1`, con
  `subjects(name, color)` embebido) y **no pide `title`**, así funciona igual antes y
  después de La Carpeta (0004).
- Trae el `content_md` de esa única hoja para armar el preview (`lib/home/preview.js`),
  y la cache (`studree:cache:home:lastSheet`) guarda solo el preview.

`update(id, values, parentId, { silent })`: con `silent: true` no emite el aviso de
cambio de estructura (se usa para posiciones). `create`, `update` y `remove` exitosos
emiten `notifyDataChanged()` (`dataEvents.js`), que escucha `useExplorerTree` con
debounce de 300 ms. El autosave de hojas (`saveContent`) **no** lo emite.

`list()` **sin** `parentId` devuelve todas las filas del usuario (RLS filtra): el
explorador arma el árbol con 3 consultas (carreras, materias y, de las hojas, solo `id, subject_id` para contarlas).

### Asistente y plan (migración 0007, Fase 14, ver `docs/features/assistant.md`)

| Service | Función | Notas |
|---|---|---|
| `assistant.service.js` | `streamAssistant({request, signal?, onEvent}) → ServiceResult<true>` | POST a `/functions/v1/assistant` con `Authorization: Bearer <JWT>` y `apikey`. Lee el stream SSE (`lib/assistant/sse.js`) y reenvía cada evento a `onEvent`, sin asumir que `done` sea el último. Abortar con `signal` resuelve `{data: null, error: null}`. Los no-2xx se traducen en castellano. |
| `assistant.service.js` | `translateAssistantError(status, body) → string` | Reexporta la función pura de `lib/assistant/assistantError.js`: 401 sesión, 403/429 el `message` del servidor, 400 `not_found` "ya no existe", 404 "falta desplegar", resto genérico. Nunca muestra cuerpos crudos. |
| `userPlan.service.js` | `getPlan() → ServiceResult<'free'\|'premium'>` | Lee `user_plans`; sin fila = `'free'`; ante error devuelve `'free'` más el `error`. |

### Forma de las respuestas

Los services **no propagan el objeto crudo de Supabase**. Normalizan a:

```js
{ data: T | null, error: string | null }
```

Así los hooks no dependen de la forma de error de `supabase-js` y se puede cambiar de
proveedor sin tocar la UI.

### Flujo optimista (ADR-007)

1. `create/update` aplica el cambio en cache y devuelve **inmediato**.
2. En paralelo manda la escritura a Supabase.
3. Si falla → **revierte la cache** y devuelve `error`.
4. El hook expone el estado de sincronización (`idle | saving | saved | error`).

### Validación de correlativas

`prerequisites.service.js` es el único con lógica de validación propia: antes de insertar
llama a `validateDag()` y, si el alta cerrara un ciclo, **rechaza sin escribir** y
devuelve el ciclo concreto en `error`. La base refuerza el caso trivial con
`CHECK (subject_id <> requires_id)`.

---

## Autenticación

Supabase Auth. El `user_id` **nunca se manda desde el cliente**: lo resuelven las
políticas RLS con `auth.uid()`. Un cliente que intente escribir filas de otro usuario
recibe un error de la base, no una validación de JavaScript.

---

## Template (si algún día hay backend propio)

## Template para cuando exista backend

> Base URL prevista: `/api/v1` · Auth prevista: Bearer Token (JWT)

### Formato de respuestas

```json
// Éxito
{ "data": { }, "message": "Operación exitosa" }

// Error
{ "error": "Tipo de error", "message": "Descripción", "details": { } }
```

### Índice de Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| _(se completará al crear el backend)_ | | | |

### Códigos de Error Globales

| Código | Descripción |
|--------|-------------|
| 400 | Datos inválidos |
| 401 | Token inválido/expirado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 500 | Error del servidor |
