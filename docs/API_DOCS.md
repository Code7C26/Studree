# Documentación de API — Studree

**Estado:** Sin API HTTP propia. Studree habla **directamente con Supabase** desde el
cliente (BaaS), usando `@supabase/supabase-js`. No hay servidor propio ni endpoints
`/api/*`.

**Última actualización:** 2026-10-14 (3 niveles, sheet_links, paginación)

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
| `sheets.service.js` | CRUD de hojas (por materia) + guardado del Markdown + búsqueda de contenido en el servidor |
| `sheetLinks.service.js` | Leer `sheet_links` (aristas del canvas, panel de enlaces) + conectar/desconectar editando el Markdown (ADR-015) |

> `units.service.js` y `topics.service.js` se eliminaron con la jerarquía de 3 niveles
> (ADR-014).

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
savePositions(moves, parentId?, cols?)      // → bool posiciones manuales en lote (RPC save_node_positions, ADR-016), silencioso
clearPositions(parentIds, cols?)            // → bool "Reordenar": pone las posiciones en NULL
```

**Paginación:** PostgREST corta cada consulta en 1000 filas. `list` y `listByParents`
piden páginas con `.range()` (ordenadas por `orderBy` + `id`) hasta recibir una página
incompleta. `columns` permite no traer `content_md` (`SHEET_SUMMARY_COLUMNS`); con columnas
parciales la cache usa otra clave.

### Hojas y links

```js
sheetsService.create({ subject_id, title, content_md?, position?, pos_x?, pos_y? })
sheetsService.saveContent(id, markdown)   // → Sheet (con updated_at, para el borrador de useSheet)
sheetsService.searchContent(query)        // → [{id, title, subject_id, content_md}] (ilike, máx. 20)

sheetLinksService.listForSheets(sheetIds) // → [{id, source_id, target_id}]
sheetLinksService.listForSheet(sheetId)   // → { outgoing: [{id,title}], incoming: [{id,title}] }
sheetLinksService.connect(source, target)    // agrega [[target.title]] al Markdown de source
sheetLinksService.disconnect(source, target) // quita [[target.title]] (queda texto plano)
```

- Título repetido en la misma materia → `"Ya existe una hoja con ese título en esta materia."`
- `searchContent` neutraliza `%` y `\` (PostgREST no respeta el escape con barra); el
  palette descarta los falsos positivos con `buildContentSnippet`.

`update(id, values, parentId, { silent })`: con `silent: true` no emite el aviso de
cambio de estructura (se usa para posiciones). `create`, `update` y `remove` exitosos
emiten `notifyDataChanged()` (`dataEvents.js`), que escucha `useExplorerTree` con
debounce de 300 ms. El autosave de hojas (`saveContent`) **no** lo emite.

`list()` **sin** `parentId` devuelve todas las filas del usuario (RLS filtra): el
explorador arma el árbol entero con 3 consultas (carreras, materias, hojas sin contenido).

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
