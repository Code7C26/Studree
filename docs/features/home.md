# Feature: Inicio útil

> **Fase 12** · Spec: `docs/superpowers/specs/2026-10-14-inicio-design.md` ·
> Plan: `docs/superpowers/plans/2026-10-14-inicio.md`
> Leer antes de tocar `pages/HomePage.jsx`, `components/features/home/**`,
> `hooks/useHome.js`, `services/{home,importantDates,tasks,quickNotes}.service.js`,
> `lib/home/**` o `constants/homeLimits.js`.

## Propósito

Al abrir Studree con sesión, la app abre en el **Inicio**: una pantalla para retomar el
estudio y ver lo que se viene. Reemplaza la bienvenida pública que antes había en `/`.

## Decisiones (usuario, 2026-10-14)

| # | Decisión |
|---|----------|
| I1 | El Inicio vive **dentro del workspace** (explorador + tabs + `Ctrl+K`). |
| I2 | `/` **es** el Inicio y exige sesión. Sin sesión se va a `/entrar`, y después del login se vuelve a `/`. La bienvenida pública se eliminó. |
| I3 | **Seguí donde dejaste:** la hoja con mayor `sheets.updated_at`, con materia (y su color), fecha y hora, "hace X" y el **primer renglón** del texto. Sin título de hoja. |
| I4 | **Fechas importantes:** solo **título + día** (sin tipo, hora ni materia). |
| I5 | **Calendario:** mes chico con puntos + lista **"Próximas"** con cuenta regresiva. Click en un día = nueva fecha ese día. |
| I6 | **Tareas:** texto + fecha límite opcional. Tildada = tachada y en **"Hechas"** (colapsado). |
| I7 | Las tareas con fecha **se marcan en el calendario** (punto gris). "Próximas" muestra solo fechas importantes. |
| I8 | **Notas rápidas:** tarjetas de texto plano, la más nueva primero, editables en el lugar. |
| I9 | Extras: **Resumen de la semana** y **Próxima fecha destacada**. |
| I10 | Las vencidas van en **rojo**, el mismo de los errores (`text-red-300`, `border-red-800`). |
| I11 | Carpetas nuevas autorizadas: `src/lib/home/` y `src/components/features/home/`. |

## Ruta

| Ruta | Página | Guard / layout |
|------|--------|----------------|
| `/` | `HomePage` | `RequireAuth` + `WorkspaceLayout` (`AppLayout` trata `/` exacta como ruta del workspace) |

## Bloques y comportamiento

Disposición en desktop (2 columnas):

```
┌ Resumen de la semana ─────────────────────────────────────────────┐
├ Seguí donde dejaste ──────────────┬ Próxima fecha ─────────────────┤
├ Calendario (mes + Próximas) ──────┼ Tareas ────────────────────────┤
│                                   ├ Notas rápidas ─────────────────┤
└───────────────────────────────────┴────────────────────────────────┘
```

En el celular hay **una sola columna**, en este orden: resumen, seguí, próxima fecha,
tareas, calendario, notas. Ese es el orden del DOM, y en desktop cada bloque se ubica con
`md:col-start`/`md:row-start`. Los botones y las celdas miden al menos 40 px, y nada
depende del hover.

- **Seguí donde dejaste** (`ContinueCard`):
  - es un link a `/materias/:subjectId?hoja=:sheetId`;
  - sin hojas: "Todavía no escribiste nada" + **Ir a mis carreras**.
- **Resumen** (`WeekSummary`):
  - "Esta semana: N fechas · N tareas · N vencidas", con las vencidas en rojo y solo si
    hay alguna;
  - "esta semana" = de hoy a hoy+6;
  - si no hay nada: "Semana tranquila: no tenés fechas ni tareas."
- **Próxima fecha** (`NextDateCard`): la fecha más cercana con `date >= hoy`, con
  "hoy", "mañana" o "en N días". Si no hay ninguna, botón para agregar una.
- **Calendario** (`CalendarPanel` + `DateFormModal`):
  - grilla de 6×7, la semana empieza el lunes, ‹ › para cambiar de mes;
  - punto `accent` = fecha importante, punto `text-muted` = vence una tarea pendiente,
    borde `accent` = hoy;
  - click en un día → alta con ese día; "＋ Fecha" → alta con hoy;
  - "Próximas" muestra hasta 8 fechas desde hoy, y un click abre la edición, con
    "Borrar" (que pide confirmación dentro del mismo modal);
  - las fechas pasadas solo se ven en la grilla.
- **Tareas** (`TaskList`):
  - alta con Enter, con un `<input type="date">` nativo opcional;
  - las pendientes van primero con fecha (ascendente) y después sin fecha;
  - vencida = borde y texto rojos, "vencida 10/10";
  - doble click o ✎ edita el texto (Enter guarda, Esc cancela);
  - tildar pasa la tarea a "Hechas (N)" (`<details>`), ordenada de la más reciente a la
    más vieja, donde se destilda o se borra con ✕.
- **Notas** (`QuickNotes`):
  - textarea "Anotá algo…": Ctrl+Enter o **Guardar**;
  - click en una nota → edición en el lugar, que se guarda al salir del campo (vacía
    vuelve al texto anterior);
  - ✕ oculta la nota y muestra "Nota borrada · Deshacer" durante 5 s, y recién después
    se borra. Si se sale del Inicio antes, el borrado se manda igual. Hay un solo
    borrado pendiente a la vez.

## Datos

Tablas `important_dates`, `tasks` y `quick_notes` (migración `0005_home.sql`, RLS
`_owner`). Ver `docs/DB_SCHEMA.md`.

- Las fechas son `YYYY-MM-DD` en hora local (columna `date` sin zona).
- `tasks.done_at`: `NULL` = pendiente.
- Sus services usan `crudService` con `notifies: false`: no recargan el explorador.
- La última hoja sale de `home.service.js` → `getLastEditedSheet()`. Es una consulta con
  `limit 1` que no pide `title` (en La Carpeta las hojas no tienen título). Trae el
  `content_md` de esa única hoja para armar el preview, y la cache guarda solo el
  preview.

## Archivos

| Archivo | Rol |
|---------|-----|
| `pages/HomePage.jsx` | Arma la grilla y el modal de fechas |
| `hooks/useHome.js` | Estado por bloque, acciones optimistas y borrado con deshacer |
| `services/home.service.js` | `getLastEditedSheet()` |
| `services/importantDates.service.js` · `tasks.service.js` · `quickNotes.service.js` | CRUD (`crudService`, `notifies: false`) |
| `lib/home/dates.js` · `calendar.js` · `preview.js` · `summary.js` | Funciones puras |
| `constants/homeLimits.js` | Largos máximos (iguales a los `check` de la 0005) |
| `components/features/home/HomePanel.jsx` | Contenedor común (título, acción, error) |
| `components/features/home/{ContinueCard,NextDateCard,WeekSummary,CalendarPanel,DateFormModal,TaskList,QuickNotes}.jsx` | Bloques |

## Contrato con La Carpeta (fase en paralelo)

- El Inicio navega a `/materias/:subjectId?hoja=:sheetId` (`subjectSheetPath`). La
  Carpeta hace el scroll a esa hoja.
- La última hoja es la de mayor `updated_at`, que solo cambia con el título o el contenido.
- `lib/home/dates.js` → `formatDateTime` repite el formato de su `lib/format/sheetDate.js`
  ("Miércoles 14/10 · 18:30"). Se unifican después del merge.

## Errores

- Cada bloque carga y falla **por separado**.
- Si falta la 0005, fechas, tareas y notas muestran el aviso de migración de
  `translateError`, y "Seguí donde dejaste" sigue funcionando.
- Las escrituras son optimistas: si una falla, se recarga ese bloque y se muestra el
  aviso arriba del bloque.
- Los inputs tienen `maxLength` igual a los `check` de la base, y no se envían valores
  vacíos.

## Fuera de alcance

- Recientes, fijadas y materias que cursás.
- Notificaciones.
- Hora o materia en las fechas.
- Pasar una nota a hoja.
- El scroll a la hoja (lo hace La Carpeta).
- PWA y la fase de celular (acá solo se deja el layout responsive).
