# Diagnóstico de Studree + diseño de Fase 0 (estabilizar) y Fase 1 (3 niveles + canvas de hojas)

> **Fecha:** 2026-10-14 · **Rama:** `rama-nicolas`
> **Origen:** sesión de brainstorming con el usuario (análisis completo del repo).
> **Siguiente paso:** plan de implementación en `docs/superpowers/plans/`.

---

## 1. Entendimiento acordado

**Qué es Studree:** una app para organizar el estudio como árboles conceptuales, pensada
para secundarios, universitarios y gente que hace cursos. Visión: canvas con nodos estilo
n8n, navegación estilo VSCode, modo oscuro con acento verde, minimalista, y export a
Markdown para que lo lea una IA.

**Decisiones del usuario en esta sesión:**

| # | Decisión |
|---|----------|
| D1 | La jerarquía pasa de 5 niveles a **3: Carrera → Materia → Hoja**. Abrir Unidad → Tema → Hoja es tedioso; el producto tiene que ser práctico. |
| D2 | El canvas de una materia muestra **las hojas como nodos, conectadas por links `[[Título]]`** entre ellas (opción A). |
| D3 | Ir por partes. Ahora se hacen **Fase 0 y Fase 1**. El resto queda en la hoja de ruta. |
| D4 | El inicio (calendario, tareas, notas, "seguí donde dejaste") y la IA con Gemini vienen **después**. |

**Supuestos (no los dijo el usuario, los fijo yo):**

- Los datos existentes se migran sin perder nada (hoy hay 4 carreras, 8 materias,
  2 unidades, 1 tema y 1 hoja en Supabase). Las tablas `units` y `topics` **no se borran**
  en esta fase: quedan deprecadas y sin uso, y se eliminarán en una migración posterior.
- Dentro de una misma materia, el título de una hoja es **único** (sin distinguir
  mayúsculas). Si no, un `[[link]]` sería ambiguo.

---

## 2. Diagnóstico del estado actual

### 2.1 Cómo está armado

- **Stack real:** React 18 + Vite + JS/JSDoc + Tailwind + React Flow + dagre + TipTap +
  Supabase (Postgres + Auth + RLS). **La migración a Supabase ya está hecha.**
  `localStorage` es solo cache optimista (ADR-007).
- **Datos:** `services/crudService.js` es una fábrica CRUD con flujo optimista
  (cache → Supabase → reconciliar o revertir). Cada entidad tiene su service. Un evento
  global (`dataEvents.js`) refresca el explorador después de crear, renombrar o borrar.
- **Estado:** no hay store global. Cada pantalla tiene su hook con su propia copia de los
  datos (`useExplorerTree`, `useCareers`, `useCareerMap`, `useSubjectMap`, `useSheet`).
- **Navegación:** `WorkspaceLayout` (explorador + tabs + `Ctrl+K`). Rutas `/carreras`,
  `/carreras/:id`, `/materias/:id`, `/hojas/:id`.
- **Export:** `.md` único o `.zip`, por materia o por carrera.

### 2.2 Qué está alineado, a medias o en contra de la visión

| Visión | Estado |
|--------|--------|
| Canvas estilo n8n | ✅ En carrera (materias + correlativas). ⚠️ En materia el canvas muestra Unidad/Tema; **las hojas no están en el canvas**. |
| Navegación tipo VSCode | ✅ Explorador + tabs + palette. ⚠️ El header con "Inicio/Carreras/Perfil" se siente a sitio web, no a workspace. |
| Carpeta = carrera → nodos = materias → hojas | ❌ Contradice la visión: hoy hay 5 niveles. **Se resuelve en Fase 1.** |
| Modo oscuro, grises, acento verde | ✅ Tokens en `tailwind.config.js`. ❌ El logo es una carpeta beige sobre gris (parece un placeholder) y dice **"STUIDREE"** (errata). |
| Export a Markdown para IA | ✅ Existe. ⚠️ No hay "exportar todo". Los `#` dentro de las hojas chocan con los headings de la jerarquía. En el `.zip`, dos hojas con el mismo nombre se pisan. |
| "Apuntes, archivos, recursos" | ❌ No se puede subir ningún archivo (Fase 3). |

### 2.3 Problemas concretos

**Bugs que pierden o muestran datos equivocados**

1. **El borrador local pisa cambios entre dispositivos** (`useSheet.js`). El borrador
   nunca se borra después de guardar, y si difiere del servidor siempre gana. Ejemplo:
   editás en la PC, después en el celular, volvés a la PC y la próxima tecla pisa lo del
   celular.
2. **Autosave perdido al salir rápido:** el debounce de 800 ms se cancela al desmontar el
   editor, así que la última edición no llega a Supabase.
3. **Tabs huérfanas:** si borrás una hoja, su tab queda abierta (y muestra "Hoja no
   encontrada"). Los títulos de las tabs no se actualizan al renombrar.
4. **Fuga entre usuarios:** `studree:ui:tabs` y `studree:ui:explorer` no empiezan con el
   prefijo de cache, así que `clearAllCache()` no los borra al cerrar sesión. El próximo
   usuario del mismo navegador ve los títulos de las hojas del anterior.
5. **Truncado silencioso a 1000 filas:** PostgREST devuelve como máximo 1000 filas por
   consulta. Las consultas globales del explorador no paginan, así que con muchas hojas el
   árbol queda incompleto sin avisar.
6. **Export `.zip`:** dos hojas con el mismo título (o temas con el mismo nombre) se pisan
   en el mismo path.

**Rendimiento**

7. El explorador baja `content_md` de **todas** las hojas del usuario (solo para la
   búsqueda por contenido) y vuelve a bajar todo después de cada cambio.
8. El primer arrastre en un canvas "congela" el layout con **un `UPDATE` por nodo**. Cada
   uno además reescribe la lista entera en `localStorage`.
9. El chunk del editor (`SheetPage`) pesa 520 kB. Es aceptable porque es lazy; no se toca
   en esta fase.

**Código y estructura**

10. **Estado duplicado:** carrera y materias viven en 3–4 hooks a la vez. Renombrar en el
    explorador no actualiza el canvas abierto.
11. **Código muerto:** `hooks/useSubjects.js` y `hooks/useEntityById.js` no se usan.
12. **Reglas de IA desincronizadas:** `.cursorrules`, `.windsurfrules`, `.clinerules` y
    `.github/copilot-instructions.md` siguen describiendo el modelo viejo, que
    `CLAUDE.md` ya no usa.
13. **Trabajo sin commitear:** había 44 archivos pendientes. ✅ **Resuelto** en `facab6a`.

### 2.4 Qué le falta para sentirse producto

- Un **inicio útil**: hoy es un texto de bienvenida.
- **Archivos adjuntos**, **papelera** (hoy borrar es irreversible) e **importar**.
- Un **logo** de verdad y consistencia de marca.
- **Feedback** de guardado/errores consistente en todas las pantallas.
- **Onboarding**: una carrera de ejemplo o plantillas.
- **Deploy** (`04-deployment.md` sigue pendiente).

---

## 3. Hoja de ruta

| Fase | Contenido | Estado |
|------|-----------|--------|
| **0** | Estabilizar: los bugs 1–8 y 10–12, logo nuevo | **Este spec** |
| **1** | 3 niveles, canvas de hojas con `[[links]]`, explorador y export a 3 niveles, exportar todo, copiar para IA | **Este spec** |
| 2 | Inicio útil: seguí donde dejaste, recientes/fijadas, tareas, calendario de fechas, notas rápidas | Futuro |
| 3 | Adjuntos (Supabase Storage), papelera (`deleted_at`), importar `.md`/`.zip`, plantillas | Futuro |
| 4 | IA con Gemini vía Edge Function (la key nunca en el frontend): resúmenes, preguntas, pruebas, límites de uso, aviso de privacidad | Futuro |
| 5 | Compartir por link, PWA/offline, flashcards | Futuro |

---

## 4. Diseño — Fase 0 (estabilizar)

### 4.1 Borrador del editor (bugs 1 y 2)

- El borrador local pasa a guardarse como `{ content, baseUpdatedAt }`. `baseUpdatedAt`
  es el `updated_at` de la versión del servidor sobre la que se escribió el borrador.
- **Al abrir una hoja:** el borrador solo gana si `baseUpdatedAt === servidor.updated_at`
  (nadie cambió la hoja en el servidor desde entonces) **y** su contenido difiere. En ese
  caso se reenvía al servidor. En cualquier otro caso el borrador se descarta. Los
  borradores con el formato viejo (string) también se descartan.
- **Después de guardar bien:** si el borrador sigue siendo lo que se guardó, se borra. Si
  no (el usuario siguió escribiendo), se actualiza su `baseUpdatedAt`.
- **Flush:** al desmontar el editor y en `pagehide`, si hay un guardado pendiente se manda
  enseguida, sin esperar el debounce.
- Para que `updated_at` solo cambie cuando cambia el contenido, el trigger
  `set_updated_at` de `sheets` pasa a dispararse **solo si cambian `title` o
  `content_md`**. Mover un nodo no debe invalidar borradores ni "recientes" (migración 0003).

### 4.2 Explorador y búsqueda (bugs 5 y 7)

- `crudService.list` **pagina** con `.range()` de a 1000 hasta traer todo, y acepta
  `columns` para no traer lo que no hace falta (la clave de cache incluye las columnas).
- El explorador **no trae `content_md`**.
- La búsqueda por contenido del palette pasa al **servidor**:
  `sheetsService.searchContent(q)` (`ilike` con `%` y `_` escapados, `limit 20`), con
  debounce de 250 ms y desde 3 caracteres. El fragmento se arma en el cliente con
  `buildContentSnippet`.

### 4.3 Tabs y sesión (bugs 3 y 4)

- `WorkspaceLayout`: cada vez que el árbol del explorador termina de cargar, se quitan las
  tabs cuya hoja ya no existe y se actualizan los títulos.
- `clearAllCache()` borra **todas** las claves `studree:` (cache y UI) al cerrar sesión.

### 4.4 Posiciones en un solo request (bug 8)

- RPC nueva `save_node_positions(p_table, p_x_column, p_y_column, p_moves jsonb)`:
  - `security invoker`, así que **RLS sigue aplicando**;
  - whitelist estricta de tabla y columnas (`subjects.pos_*`, `sheets.pos_*`);
  - hace un único `UPDATE … FROM jsonb_to_recordset`.
- `crudService.savePositions(moves, columns)` la usa y actualiza la cache una sola vez.

### 4.5 Estado sincronizado entre vistas (bug 10)

`useCareerMap` y `useSubjectMap` se suscriben a `onDataChanged` y recargan en silencio
(sin mostrar "Cargando…"), con debounce de 300 ms. Así, un rename en el explorador se ve
en el canvas abierto. Unificar todo en un store global queda fuera de alcance (YAGNI): el
evento alcanza.

### 4.6 Limpieza (bugs 11 y 12) y logo

- Se borran `useSubjects.js` y `useEntityById.js`.
- Los 4 archivos de reglas de IA pasan a ser copias del `CLAUDE.md` actualizado, con un
  encabezado que avisa que la fuente es `CLAUDE.md`.
- **Logo:** `public/logo.svg` nuevo: un árbol de 3 nodos conectados, verde sobre gris
  oscuro, legible a 16 px. Se usa en el header y como favicon. Se elimina
  `public/logo.jpg`. `assets/Logo.jpg` (fuente con la errata) queda como histórico y se
  le avisa al usuario de la errata.

---

## 5. Diseño — Fase 1 (3 niveles + canvas de hojas)

### 5.1 Modelo de datos — migración `0003_three_levels_and_sheet_links.sql`

```
Career → Subject → Sheet          (Subject ←→ Prerequisite;  Sheet ←→ SheetLink)
```

- `sheets.subject_id uuid not null references subjects on delete cascade`, rellenado
  desde `topic → unit → subject`.
- `sheets.topic_id` pasa a ser nullable, con FK `on delete set null`. Es un campo legado:
  borrar un tema viejo no puede borrar hojas.
- `sheets.pos_x` y `sheets.pos_y` (nullable, ADR-012).
- Índice único `(subject_id, lower(trim(title)))`: títulos únicos por materia.
- Tabla `sheet_links (id, user_id, source_id, target_id, created_at)`:
  - `on delete cascade` en las dos FK, `check (source_id <> target_id)`,
    `unique (source_id, target_id)`;
  - RLS `_owner` como el resto.
- **Los links se derivan del Markdown en la base de datos**, con triggers (ADR-015):
  - `refresh_sheet_links(sheet_id)` parsea `[[Título]]` (también la forma escapada
    `\[\[…\]\]`) en el `content_md` de la hoja, resuelve los títulos dentro de la misma
    materia (sin distinguir mayúsculas) y reemplaza sus filas de `sheet_links`. Así no
    hay estado duplicado entre el texto y el índice.
  - Trigger `after insert or update of content_md` → refresca los links de esa hoja.
  - Trigger `after insert or update of title`:
    - (a) si es un rename, **reescribe** `[[título viejo]]` → `[[título nuevo]]` en las
      hojas de la materia que la enlazaban;
    - (b) refresca las hojas de la materia que mencionan el título nuevo, para que se
      resuelvan los links que estaban colgados.
- Las tablas `units` y `topics` quedan **deprecadas** (sin UI ni services). Se dropean en
  una migración futura.

### 5.2 Markdown (`lib/markdown/wikiLinks.js`, funciones puras)

| Función | Qué hace |
|---------|----------|
| `extractWikiLinks(md)` | Devuelve los títulos enlazados (acepta la forma escapada). |
| `appendWikiLink(md, title)` | Agrega `[[title]]` en una línea nueva al final si no estaba. |
| `removeWikiLink(md, title)` | Reemplaza `[[title]]` (sin distinguir mayúsculas) por `title` en texto plano. |
| `unescapeWikiLinks(md)` | `\[\[X\]\]` → `[[X]]`. Lo usa `editorToMarkdown`, porque `prosemirror-markdown` escapa los corchetes. |

### 5.3 Canvas de materia (`/materias/:id`)

- **Nodos = hojas** (`SheetNode`): título, fecha de edición, cantidad de links. Click o
  doble click abre la hoja en una tab. ✕ borra (con confirmación). ＋ crea una hoja nueva
  ya enlazada.
- **Aristas = `sheet_links`** (de origen a destino):
  - unir dos nodos agrega `[[destino]]` al final del origen;
  - click en una arista pide confirmación y quita `[[destino]]` del origen (queda el
    texto plano).
- **Crear:** botón ＋ Hoja, doble click o click derecho en el lienzo (la hoja nace ahí), y
  ＋ en un nodo.
- **Layout híbrido (ADR-012):**
  - dagre `LR` sobre las hojas conectadas;
  - las hojas sueltas van en grilla debajo;
  - las posiciones manuales (`sheets.pos_x/pos_y`) mandan;
  - "Reordenar" las vuelve a `NULL`.
- **Vista Lista** (toggle Canvas | Lista): hojas ordenadas por última edición, con abrir y
  borrar. Es el camino rápido cuando hay muchas hojas.
- Sin nodo raíz de materia: la materia es el título de la página. `map_x`/`map_y` quedan
  sin uso.
- Hook: `useSubjectMap(subjectId)` → materia, hojas (sin `content_md`), links,
  `createSheet`, `deleteSheet`, `connect`, `disconnect`, `moveNodes`, `resetLayout`.

### 5.4 Editor

- Panel **"Enlaces"** debajo del editor:
  - "Enlaza a" (links salientes) y "Enlazada desde" (backlinks), navegables;
  - un `[[Título]]` sin resolver se muestra como sugerencia de **crear esa hoja**.
- El título de la hoja ahora es único por materia: el error de duplicado se muestra claro.

### 5.5 Explorador y palette

- Árbol: **Carrera → Materia → Hoja**.
- Palette: busca materias y hojas por nombre, y contenido en el servidor (§4.2).

### 5.6 Export

- **Alcances:** materia, carrera y **todo** (botón "Exportar todo" en `/carreras`).
- **Formatos:**
  - `.md` único;
  - `.zip` (`Carrera/Materia/Título.md`, con nombres deduplicados `Título (2).md` y
    frontmatter `carrera`, `materia`, `fecha`);
  - **Copiar para IA**: el `.md` único al portapapeles, con un preámbulo que explica la
    estructura y la sintaxis `[[ ]]`.
- **Headings:** carrera `#`, materia `##`, hoja `###` (con "todo": raíz `#`, carrera
  `##`, …). Los headings **dentro** de cada hoja se corren de nivel para quedar debajo de
  la hoja (tope `######`), sin tocar los bloques de código. Solo afecta al export: el dato
  guardado no cambia.

### 5.7 Lo que se elimina

`units.service.js`, `topics.service.js`, `UnitNode.jsx`, `TopicNode.jsx`,
`SubjectRootNode.jsx`, `SheetListPanel.jsx`, `useSheets.js`, el typedef `Unit`/`Topic`
(queda marcado como legado) y las referencias a 5 niveles en la UI.

---

## 6. Manejo de errores

- Se mantiene el contrato `{ data, error }` con mensajes en castellano.
- Título duplicado en la misma materia → "Ya existe una hoja con ese título en esta
  materia."
- Conectar o desconectar en el canvas es optimista. Si falla, se recarga desde el servidor
  y se muestra el aviso.
- Si `save_node_positions` falla, se recarga el canvas y se muestra el aviso.

## 7. Verificación

El proyecto no tiene suite de tests (no hay runner instalado y sumar uno es una dependencia
nueva que no se pidió). La verificación es:

1. **Funciones puras** (`wikiLinks`, headings del export, layout, dedupe de nombres):
   scripts `node` de verificación en el scratchpad, fuera del repo.
2. **Migración:** aplicarla en Supabase y verificar con SQL las columnas, el backfill
   (0 hojas sin `subject_id`), RLS en `sheet_links`, y los triggers probados con un
   insert/update/rename dentro de una transacción con `rollback`.
3. `npm run build` y `npm run lint` sin errores.
4. **Prueba en el navegador:** crear hoja, enlazar, renombrar, borrar, export, tabs.

## 8. Fuera de alcance

Fases 2–5, store global, TypeScript, tests automatizados, mobile del canvas, links entre
hojas de materias distintas, y dropear `units`/`topics`.
