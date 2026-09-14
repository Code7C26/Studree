# Documentación de API — Studree

**Estado:** Sin API HTTP propia. Studree habla **directamente con Supabase** desde el
cliente (BaaS), usando `@supabase/supabase-js`. No hay servidor propio ni endpoints
`/api/*`.

**Última actualización:** 2026-08-24

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
| `crudService.js` | **Fábrica** con el CRUD + flujo optimista compartido por las 6 entidades |
| `careers.service.js` | CRUD de carreras |
| `subjects.service.js` | CRUD de materias + cambio de estado |
| `prerequisites.service.js` | CRUD de correlativas **+ validación DAG** (ADR-009) |
| `units.service.js` | CRUD de unidades |
| `topics.service.js` | CRUD de temas |
| `sheets.service.js` | CRUD de hojas + guardado del Markdown |

### Contrato común

Cada service expone, para su entidad:

```js
list(parentId)   // → T[]      lee cache primero, refresca desde Supabase
get(id)          // → T | null
create(data)     // → T        optimista: escribe cache y luego Supabase
update(id, data) // → T        optimista, con reversión si falla
remove(id)       // → boolean  la cascada la hace Postgres (ON DELETE CASCADE)
```

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
