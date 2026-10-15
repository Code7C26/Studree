# Fase 12 — Inicio útil: diseño

> **Fecha:** 2026-10-14 · **Rama:** `fase-inicio` (worktree, creada desde `rama-nicolas`)
> **Origen:** brainstorming con el usuario.
> **Fase en paralelo:** "La Carpeta" (otro agente, `rama-nicolas`), contrato en
> `2026-10-14-carpeta-design.md` §5.
> **Siguiente paso:** plan en `docs/superpowers/plans/`.

---

## 1. Entendimiento acordado

Al abrir Studree con sesión, la app abre en el **Inicio**: una pantalla para retomar el
estudio y ver lo que se viene. Reemplaza la bienvenida pública de `/`.

### Decisiones del usuario

| # | Decisión |
|---|----------|
| I1 | El Inicio vive **dentro del workspace** (explorador + tabs + `Ctrl+K`). |
| I2 | `/` **es** el Inicio, protegido por sesión. Sin sesión → `/entrar`. Después del login se vuelve a `/`. La bienvenida pública se elimina. |
| I3 | **Seguí donde dejaste:** la hoja de mayor `sheets.updated_at`, con materia (y su color), fecha y hora, "hace X" y el **primer renglón** del texto. Click → `/materias/:subjectId?hoja=:sheetId`. Sin título de hoja. |
| I4 | **Fechas importantes:** solo **título + día** (sin tipo, hora ni materia). |
| I5 | **Calendario:** mes chico con puntos en los días + lista **"Próximas"** con cuenta regresiva. Click en un día = nueva fecha ese día. |
| I6 | **Tareas:** texto + fecha límite opcional. Al tildarla se tacha y pasa a **"Hechas"** (colapsado), desde donde se destilda o borra. |
| I7 | Las tareas con fecha límite **aparecen en el calendario** con otro estilo (punto gris). "Próximas" muestra solo fechas importantes. |
| I8 | **Notas rápidas:** tarjetas sueltas de texto plano, la más nueva primero, editables en el lugar. |
| I9 | Extras: **Resumen de la semana** y **Próxima fecha destacada**. Descartados: recientes y materias que cursás. |
| I10 | Vencidas en **rojo**, el mismo que ya usan los errores (`text-red-300`, `border-red-800`). |
| I11 | Autorizadas las carpetas nuevas `src/lib/home/` y `src/components/features/home/`. |

### Supuestos (los fijo yo)

- "Esta semana" = **los próximos 7 días** (de hoy a hoy+6), no la semana calendario.
- La semana del calendario empieza el **lunes**.
- Las fechas se manejan como `YYYY-MM-DD` en la **hora local** del navegador.
- "Próximas" muestra hasta **8** fechas, desde hoy.

---

## 2. Rutas y shell

| Ruta | Antes | Ahora |
|------|-------|-------|
| `/` | `HomePage` pública (bienvenida) | `HomePage` = **Inicio**, dentro de `RequireAuth` + `WorkspaceLayout` |
| `/entrar` | Vuelve a `from` o a `/carreras` | Vuelve a `from` o a **`/`** |

- `AppLayout`: `/` (coincidencia **exacta**) pasa a ser ruta del workspace.
- Con sesión anónima el usuario casi siempre tiene sesión, así que la bienvenida no se veía.
- El link "Inicio" del header no cambia.

**Archivos compartidos con La Carpeta** (`App.jsx`, `AppLayout.jsx`, `routes.js`): los
cambios son de pocas líneas, para que el merge sea trivial. No se toca
`tailwind.config.js` ni ningún archivo de la lista prohibida del prompt.

---

## 3. Modelo de datos — migración `0005_home.sql`

```sql
important_dates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null check (length(trim(title)) between 1 and 120),
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
tasks (
  id, user_id, created_at, updated_at   -- ídem
  text     text not null check (length(trim(text)) between 1 and 300),
  due_date date,          -- opcional
  done_at  timestamptz    -- NULL = pendiente
)
quick_notes (
  id, user_id, created_at, updated_at   -- ídem
  body text not null check (length(trim(body)) between 1 and 2000)
)
```

- **RLS** activado en las tres. Política `<tabla>_owner` `for all to authenticated`, con
  `using` y `with check` sobre `auth.uid() = user_id`.
- Trigger `set_updated_at()` (la función de la 0001) en las tres. **No hay funciones
  nuevas.**
- Índices:
  - `important_dates (user_id, date)`;
  - `tasks (user_id, done_at, due_date)`;
  - `quick_notes (user_id, created_at)`.
- Idempotente (`create table if not exists`, `drop policy if exists`, `drop trigger if
  exists`) y termina con `notify pgrst, 'reload schema'`.
- **No se aplica sin confirmación explícita del usuario.** La prueba con
  `begin … rollback` también necesita su OK, porque habla con el proyecto real.

**Cache:** `studree:cache:important_dates`, `studree:cache:tasks` y
`studree:cache:quick_notes` (claves de `crudService`). Como empiezan con `studree:`,
`clearAllCache()` las borra al cerrar sesión.

---

## 4. Arquitectura del cliente

### Archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `services/home.service.js` | `getLastEditedSheet()`: una consulta a `sheets` con `id, subject_id, updated_at, content_md, subjects(name, color)`, `order updated_at desc`, `limit 1`. No pide `title`: funciona antes y después de la 0004. |
| `services/importantDates.service.js` | `createCrudService({ table: 'important_dates', orderBy: 'date', notifies: false })` + `create({title, date})` con `trim`. |
| `services/tasks.service.js` | Ídem con `orderBy: 'created_at'`. Agrega `setDone(id, done)`. |
| `services/quickNotes.service.js` | Ídem con `orderBy: 'created_at'`. |
| `services/crudService.js` | Flag de config **`notifies`** (default `true`). Con `false`, `create`/`update`/`remove` no llaman a `notifyDataChanged()`: tildar una tarea no cambia el árbol del explorador. |
| `hooks/useHome.js` | Estado del Inicio por bloque (`lastSheet`, `dates`, `tasks`, `notes`, cada uno con `loading` y `error`) y las acciones. Usa `onCached` para pintar desde la cache. |
| `lib/home/preview.js` | `buildPreview(md, max = 120)`: primer renglón con texto, sin Markdown (`#`, `>`, listas, `**`, `` ` ``, `[[ ]]`, links), y salta los bloques de código. |
| `lib/home/dates.js` | `toDateKey(date)`, `parseDateKey(key)`, `daysUntil(key, today)`, `formatCountdown(days)` ("hoy", "mañana", "en N días", "hace N días"), `formatRelativeTime(iso, now)` ("hace 2 horas"), `formatDateTime(iso, now)` ("Martes 14/10 · 18:30", con año si no es el actual), `formatShortDate(key)` ("lun 20/10"). |
| `lib/home/calendar.js` | `buildMonthGrid(year, month)`: 6 semanas × 7 días, lunes primero, con `{key, day, inMonth}`. |
| `lib/home/summary.js` | `buildWeekSummary({dates, tasks, today})` → `{dates, tasks, overdue}`. `pickNextDate(dates, today)`. `sortPendingTasks(tasks)`. |
| `components/features/home/ContinueCard.jsx` | Seguí donde dejaste (o estado vacío con "Ir a mis carreras"). |
| `components/features/home/NextDateCard.jsx` | Próxima fecha con cuenta regresiva. |
| `components/features/home/WeekSummary.jsx` | La línea de resumen. |
| `components/features/home/CalendarPanel.jsx` | Mes (‹ ›) + "Próximas". |
| `components/features/home/DateFormModal.jsx` | Crear, editar y borrar una fecha (usa `Modal`, `TextField`, `ConfirmDialog`). |
| `components/features/home/TaskList.jsx` | Alta, tildar, editar en el lugar, "Hechas". |
| `components/features/home/QuickNotes.jsx` | Alta, edición en el lugar, borrar con "Deshacer". |
| `pages/HomePage.jsx` | Reescrita: arma la grilla con los bloques. |

`lib/home/dates.js` duplica a propósito el formato de `lib/format/sheetDate.js` de La
Carpeta, que no existe en esta rama. Se unifican después del merge.

### Disposición

```
┌ Resumen: "Esta semana: 2 fechas · 3 tareas · 1 vencida" ─────────────────┐
├ Seguí donde dejaste ─────────────────┬ Próxima fecha ──────────────────────┤
├ Calendario (mes + Próximas) ─────────┼ Tareas ─────────────────────────────┤
│                                      ├ Notas rápidas ──────────────────────┤
└──────────────────────────────────────┴─────────────────────────────────────┘
```

- **Desktop:** grilla de 2 columnas (`md:grid-cols-2`) dentro de `max-w-6xl`.
- **Celular:** 1 columna, en este orden: resumen, seguí, próxima fecha, tareas,
  calendario, notas. Botones y celdas del calendario de al menos 40 px. Nada depende del
  hover: la ✕ está siempre visible.
- **Colores** (solo tokens existentes):
  - `surface` y `border` en las tarjetas;
  - punto de fecha `accent`, punto de tarea `text-muted`, hoy con borde `accent`;
  - vencidas `text-red-300` y `border-red-800`.

### Comportamiento

- **Seguí donde dejaste:**
  - la tarjeta entera es un `Link` a `/materias/:subjectId?hoja=:sheetId`;
  - muestra un punto con el color de la materia, el nombre de la materia, la fecha y
    hora, "hace X" y el preview;
  - sin hojas: "Todavía no escribiste nada" + botón **Ir a mis carreras**.
- **Calendario:**
  - click en un día → `DateFormModal` en modo alta, con ese día cargado;
  - botón "+ Fecha" → alta con hoy;
  - click en un ítem de "Próximas" → edición, con "Borrar" (pide confirmación);
  - las fechas pasadas se ven en la grilla, no en "Próximas".
- **Próxima fecha:** la más cercana con `date >= hoy`. Si no hay ninguna, invita a agregar
  una (abre el modal).
- **Resumen:**
  - fechas con `hoy ≤ date ≤ hoy+6`;
  - tareas pendientes con `hoy ≤ due_date ≤ hoy+6`;
  - vencidas = tareas pendientes con `due_date < hoy`;
  - si todo da 0: "Semana tranquila: no tenés fechas ni tareas".
- **Tareas:**
  - input de texto + `<input type="date">` nativo opcional; Enter agrega;
  - las pendientes van primero las que tienen fecha (ascendente) y después las que no,
    por creación;
  - las vencidas se marcan en rojo con "vencida 10/10";
  - tildar → `done_at = now()`; destildar → `NULL`;
  - doble click o ✎ edita el texto en el lugar (Enter guarda, Esc cancela);
  - "Hechas (N)" colapsado, ordenado por `done_at` descendente, con ✕ para borrar (sin
    confirmación: la tarea ya estaba hecha).
- **Notas:**
  - textarea "Anotá algo…": Ctrl+Enter o el botón **Guardar**;
  - las tarjetas van de la más nueva a la más vieja;
  - click en el texto → textarea en el lugar, que se guarda al salir del campo si cambió.
    Si queda vacía, no se guarda y vuelve el texto anterior;
  - ✕ oculta la nota y muestra "Nota borrada · Deshacer" durante 5 s. Recién después se
    llama a `remove`. Si se sale del Inicio antes de los 5 s, el borrado se manda al
    desmontar.

---

## 5. Errores

- Todo es optimista con el flujo de `crudService`: si una escritura falla, la cache se
  revierte, el hook recarga ese bloque y se muestra el aviso arriba del bloque.
- Cada bloque carga y falla **por separado**. Si falta la 0005, fechas, tareas y notas
  muestran el mensaje de `translateError` ("Falta aplicar una migración…"), y "Seguí
  donde dejaste" sigue funcionando.
- Validaciones de UX (iguales a los checks de la base): no se envía un título, texto o
  nota vacíos ni más largos que el límite (`maxLength` en los inputs).

---

## 6. Documentación

- `docs/features/home.md`, nuevo, **antes de codear**.
- `DB_SCHEMA.md`: tablas, diagrama, cache e historial.
- `API_DOCS.md`: services nuevos y el flag `notifies`.
- `02-architecture.md`: rutas, estructura de carpetas y la ruta `/` dentro del shell.
- `01-project-overview.md`: estado de la fase.
- `CHANGELOG.md`: entrada nueva.
- `CLAUDE.md`: fila de lookup copiada a `.cursorrules`, `.windsurfrules`, `.clinerules` y
  `.github/copilot-instructions.md`.

## 7. Verificación

El proyecto no tiene suite de tests (sumar un runner sería una dependencia nueva).

1. **Funciones puras de `lib/home/`:** script `node` en el scratchpad, fuera del repo,
   con asserts:
   - preview: fences, headings, links, vacío;
   - grilla: meses que empiezan en domingo, febrero bisiesto;
   - cuenta regresiva, resumen y orden de tareas.
2. **Migración**, solo con OK del usuario:
   - `begin … rollback` con asserts de RLS, checks y defaults;
   - después, la aplicación real.
3. `npm run build` y `npm run lint` sin errores.
4. **Navegador**, si la extensión de Chrome está conectada:
   - entrar a `/`;
   - "Seguí donde dejaste" navega a la URL del contrato;
   - crear, editar y borrar una fecha, una tarea y una nota;
   - vista a 375 px de ancho.

   Si no hay extensión, prueba manual guiada.

## 8. Fuera de alcance

- Recientes, fijadas y materias que cursás.
- Notificaciones o recordatorios.
- Hora o materia en las fechas.
- Pasar una nota a hoja.
- El scroll a la hoja (lo hace La Carpeta).
- PWA y la fase de celular propiamente dicha (acá solo se deja el layout responsive).
