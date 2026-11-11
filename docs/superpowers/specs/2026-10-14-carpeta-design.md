# Fase 11 — La Carpeta: diseño

> **Fecha:** 2026-10-14 · **Rama:** `rama-nicolas`
> **Origen:** brainstorming con el usuario después de cerrar las Fases 0 y 1.
> **Reemplaza en parte a:** la Fase 1 (canvas de hojas, ADR-015) — ver §7.
> **Fase en paralelo:** "Inicio útil" (otro agente, rama `fase-inicio`), con un contrato en §5.

---

## 1. Entendimiento acordado

El usuario quiere que una materia se sienta como **una carpeta escolar**:
- la carrera es la carpeta;
- las materias son los **separadores de colores**;
- adentro van todas las hojas seguidas, **estilo Word**, en las que se escribe y se va
  agregando más abajo.

El canvas de hojas de la Fase 1 no le sirve. Para orientarse prefiere herramientas
alrededor del texto: un índice de temas y un buscador.

### Decisiones del usuario

| # | Decisión |
|---|----------|
| C1 | La materia se ve como **una carpeta continua** (todas las hojas en un scroll), pero los datos siguen divididos en hojas (opción B: no se pone lenta, no se pisan ediciones). |
| C2 | **Se elimina el dibujo de hojas** (canvas de materia). No hay pestaña "Mapa". El **mapa de la carrera** (materias + correlativas) se mantiene. |
| C3 | Orden **cronológico**: la hoja más vieja arriba, las nuevas al final. **Sin reordenamiento.** |
| C4 | **Papel blanco solo en la zona de las hojas.** El resto de la app sigue oscuro con verde. |
| C5 | Herramientas: **índice de temas** (los `#` de las hojas, un click va al inicio del tema), **buscar en la materia** y **modo lectura**. Descartadas: lista de hojas, tamaño de letra, plegar hojas, dos hojas lado a lado. |
| C6 | **Las hojas no tienen título**, solo fecha y hora. Los temas son los `#` que se escriben adentro. Los `[[links]]` apuntan a **temas**. |
| C7 | **Al abrir Studree se va al Inicio** (lo construye otro agente), con "Seguí donde dejaste". |
| C8 | Los estados de materia (Pendiente / Cursando / Aprobada / Bloqueada) se tienen que ver **distintos entre sí**. |
| C9 | Autorizado: borrar de Supabase lo que ya no se usa — `sheet_links`, sus triggers y funciones, y las tablas viejas `units` y `topics`. |

### Supuestos (los fijo yo)

- Un tema puede seguir en la hoja siguiente: el índice muestra los temas en el orden en
  que aparecen en toda la materia, sin importar en qué hoja están.
- Una hoja nueva que queda vacía no se guarda.
- `[[Tema]]` se resuelve dentro de la misma materia, sin distinguir mayúsculas, al primer
  tema con ese texto.

---

## 2. Cómo se ve

```
┌─ explorador ─┬─ índice de temas ─┬──────── carpeta (papel blanco) ─────────┐
│ 🎓 Biología  │ 🔍 buscar…        │  Lunes 13/10 · 10:15                  ✕ │
│  📚 Genética │ 📖 modo lectura   │  # Célula                               │
│  📚 Química  │                   │  texto…                                 │
│              │ Célula            │ ─────────────────────────────────────── │
│              │  Organelas        │  Martes 14/10 · 18:30                 ✕ │
│              │ Mitosis  ◀ estás  │  # Mitosis                              │
│              │ Meiosis           │  texto…                                 │
│              │                   │        ＋ Nueva hoja                    │
└──────────────┴───────────────────┴─────────────────────────────────────────┘
```

- **Barra de cada hoja:** fecha y hora de creación (`Martes 14/10 · 18:30`; con año si no
  es el actual) y una ✕ para borrarla (con confirmación).
- **Edición en el lugar:** cada hoja es un editor TipTap con su propio autosave.
- **＋ Nueva hoja:** agrega al final una hoja **local** con la fecha y hora del momento.
  Se guarda en Supabase con el primer contenido no vacío. Si queda vacía, desaparece al
  salir.
- **Índice de temas:**
  - headings `#`–`####` de todas las hojas, en orden, con sangría por nivel;
  - click → scroll al heading;
  - se resalta el tema visible (el último heading que pasó el borde superior).
- **Buscar en la materia** (también con `Ctrl+F` dentro de la carpeta):
  - resalta todas las coincidencias en todas las hojas;
  - muestra "3 de 12" con ↑ ↓ (o `Enter` / `Shift+Enter`);
  - `Esc` cierra.
- **Modo lectura:** oculta el header, el explorador, las tabs, el índice y la toolbar.
  Queda el papel centrado. Se sale con `Esc` o con el botón flotante "Salir".
- **Toolbar de formato:** una sola, fija arriba de la carpeta, que actúa sobre la hoja con
  foco.
- **`[[Tema]]`:**
  - dentro del editor se ve como link (subrayado verde) y el click lleva al tema;
  - si no existe ese tema en la materia, aviso "No hay un tema «X» en esta materia";
  - se sigue escribiendo como texto normal.

---

## 3. Modelo de datos — migración `0004_carpeta.sql`

Orden dentro de la migración:

1. **Los títulos pasan a ser temas:** `content_md = '# ' || title || E'\n\n' || content_md`
   en cada hoja con título. Así ningún título se pierde, y los `[[título]]` existentes
   siguen resolviendo, porque ahora apuntan a temas.
2. `sheets.title` → nullable, se pone en `NULL` y se quita el check de longitud. Se
   **dropea** el índice `sheets_subject_title_unique`.
3. **Se dropean:**
   - los triggers `sheets_refresh_links` y `sheets_title_links`;
   - las funciones `refresh_sheet_links`, `sheets_after_content_change` y
     `sheets_after_title_change`;
   - la tabla `sheet_links`.
4. **Se dropean:**
   - la columna `sheets.topic_id` (y su FK);
   - las tablas `topics` y `units`;
   - las columnas sin uso `sheets.pos_x`, `sheets.pos_y`, `subjects.map_x` y
     `subjects.map_y`.
5. `save_node_positions`: la whitelist queda **solo** en `subjects (pos_x, pos_y)`.
6. Índice `sheets (subject_id, created_at)` para el orden de la carpeta.
7. El trigger `sheets_set_updated_at` se mantiene: solo dispara con cambios de `title` o
   `content_md`.
8. `notify pgrst, 'reload schema'`.

**Verificación:** se corre primero dentro de `begin … rollback` con asserts:
- títulos movidos al contenido;
- `sheet_links`, `units` y `topics` inexistentes;
- columnas fuera;
- whitelist rechaza `sheets`;
- 3 hojas intactas.

Después se aplica de verdad y se revisa el resultado con SQL.

---

## 4. Arquitectura del cliente

### Rutas

| Ruta | Antes | Ahora |
|------|-------|-------|
| `/materias/:subjectId` | Canvas de hojas | **Carpeta** (`SubjectFolderPage`); acepta `?hoja=:sheetId` |
| `/hojas/:sheetId` | Editor de una hoja | **Redirección** a `/materias/:subjectId?hoja=:sheetId` |

### Archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `pages/SubjectFolderPage.jsx` (reemplaza `SubjectMapPage.jsx`) | Arma la carpeta: índice + barra de búsqueda + hojas + modo lectura |
| `pages/SheetRedirectPage.jsx` (reemplaza `SheetPage.jsx`) | Busca la materia de la hoja y redirige |
| `components/features/folder/FolderSheet.jsx` | Una hoja: barra de fecha + ✕ + editor |
| `components/features/folder/TopicIndex.jsx` | Índice de temas (presentacional) |
| `components/features/folder/FolderSearchBar.jsx` | Input + "n de m" + ↑ ↓ |
| `components/features/sheetEditor/SheetEditor.jsx` | Se reutiliza; suma las extensiones de §4.3 |
| `components/features/sheetEditor/EditorToolbar.jsx` | Se reutiliza (actúa sobre el editor con foco) |
| `hooks/useFolder.js` | Materia + hojas **con contenido** ordenadas por `created_at`; crear, borrar, hoja local nueva |
| `hooks/useSheetAutosave.js` | La lógica de borrador + debounce + flush de `useSheet`, por hoja |
| `hooks/useReadingMode.js` + provider en `AppLayout` | Estado del modo lectura, compartido entre header y workspace |
| `lib/markdown/headings.js` | `extractHeadings(md)` → `[{level, text, index}]`, ignora bloques de código |
| `lib/markdown/wikiLinks.js` | Se queda con `extractWikiLinks`, `unescapeWikiLinks` y `WIKI_LINK_PATTERN`; se borran `append`/`remove` |
| `lib/editor/highlightExtension.js` | Extensión TipTap con decoraciones: `[[links]]` clickeables + resaltado de búsqueda |
| `lib/format/sheetDate.js` | `formatSheetDate(iso, now?)` → `"Martes 14/10 · 18:30"` (con año si no es el actual) |
| `constants/subjectStatus.js` + `tailwind.config.js` | Estilos de estado (§4.5) y tokens `paper`/`ink`/`warn` |

### 4.1 Datos

- `useFolder` usa `sheetsService.list(subjectId)` con columnas
  `id, subject_id, content_md, created_at, updated_at`, ordenado por `created_at`
  (`crudService` acepta `orderBy`). Pagina.
- `sheetsService.create({ subject_id, content_md })`: sin título.
- `useSheetAutosave(sheet)` es la lógica actual de `useSheet` sin la carga: borrador
  `{content, baseUpdatedAt}`, debounce de 800 ms, flush al desmontar y en `pagehide`.
  Cada `FolderSheet` lo usa. La validación del borrador contra `updated_at` se hace al
  montar la carpeta.
- Una hoja local nueva tiene `id` temporal. El primer flush con contenido no vacío llama
  a `create` en vez de `saveContent`, y a partir de ahí usa el id real.

### 4.2 Índice, scroll y `?hoja=`

- **Índice:** `extractHeadings` sobre el `content_md` vivo de cada hoja. El contenido que
  se edita se refleja con debounce de 300 ms.
- **Ubicar cada tema:** cada heading se identifica por `(sheetId, índice del heading en
  esa hoja)`. Para hacer scroll se busca el n-ésimo nodo heading del editor de esa hoja y
  se usa `scrollIntoView` sobre su elemento DOM.
- **Tema activo:** `IntersectionObserver` sobre los elementos heading.
- **`?hoja=:id`:** scroll a la barra de esa hoja al cargar.
- **Sin `?hoja=`:** scroll a la **última** hoja, porque al entrar a la materia se sigue
  escribiendo al final.

### 4.3 Extensión del editor (`highlightExtension`)

- Es un plugin de ProseMirror con `DecorationSet`, recalculado en cada cambio del
  documento y del término de búsqueda.
- `[[X]]` → decoración inline con clase `wiki-link`. El click (`handleClick`) llama a
  `onWikiLink(title)`.
- **Búsqueda:**
  - decoraciones `search-hit` para todas las coincidencias (sin distinguir mayúsculas);
  - la actual con `search-hit-current`;
  - el plugin expone las posiciones de las coincidencias para que la carpeta las cuente
    y navegue entre hojas.
- Sin dependencias nuevas: `@tiptap/pm` ya viene con TipTap.

### 4.4 Shell

- **Tabs:** por **materia** (`{id: subjectId, title: nombreMateria}`). Se abre una al
  entrar a una carpeta, y se podan con el árbol del explorador.
- **Explorador:** Carrera → Materia. `useExplorerTree` deja de traer hojas.
- **Ctrl+K:**
  - materias por nombre;
  - contenido por `sheetsService.searchContent`, que devuelve `subject_id` y el
    fragmento;
  - un resultado de contenido abre `/materias/:id?hoja=:sheetId`;
  - el resultado se rotula con la materia y la fecha de la hoja.
- **Modo lectura:** `AppLayout` oculta `Header`; `WorkspaceLayout` oculta el explorador
  y las tabs; la carpeta oculta el índice y la toolbar. `Esc` sale.

### 4.5 Estilos

- **Tokens nuevos:**
  - `paper` `#ffffff`, `paper-border` `#d0d7de`;
  - `ink` `#1f2328`, `ink-muted` `#59636e`;
  - `warn` `#f59e0b`.
- `.sheet-editor` pasa a usar `ink` sobre `paper`: headings, código (`bg #f6f8fa`), citas
  con borde `accent`. Las clases `search-hit` (fondo amarillo suave), `search-hit-current`
  (fondo `warn`) y `wiki-link` (verde subrayado, cursor pointer) van en `index.css`.
- **Estados:**

  | Estado | Ícono | Estilo |
  |--------|-------|--------|
  | Pendiente | ○ | gris, borde `border` |
  | Cursando | ◐ | `warn`, borde `warn` |
  | Aprobada | ✓ | `accent`, fondo `accent/10` |
  | Bloqueada | 🔒 | gris apagado, borde punteado |

  `STATUS_STYLES` suma `icon` y `chip`. `SubjectNode` muestra el chip con el ícono al lado
  del selector.

### 4.6 Export

- La hoja sale con su fecha como heading, `## Martes 14/10/2026 · 18:30`, y el contenido
  corrido debajo.
- En el `.zip`, los archivos se llaman `2026-10-14 18-30.md` (con el dedupe existente).
- El frontmatter suma `creada: 2026-10-14T18:30`.
- `useExportTree` trae `created_at` y ordena por fecha.

### 4.7 Rendimiento

- **Primera versión:** todas las hojas montadas como editores.
- **Criterio:** se mide con 150 hojas de prueba (una materia sintética de un usuario de
  prueba que después se borra). Si el montaje inicial supera ~1 s en desarrollo, se pasa a
  montaje perezoso: placeholder con altura estimada y el editor monta con
  `IntersectionObserver` a 600 px del viewport. En ese caso, el índice y la búsqueda
  siguen funcionando sobre el Markdown, y saltar a un tema monta su hoja antes de hacer
  scroll.

---

## 5. Contrato con la fase "Inicio útil" (otro agente)

- El Inicio navega a `/materias/:subjectId?hoja=:sheetId`. Esta fase garantiza el scroll a
  esa hoja.
- La última hoja editada es la de mayor `sheets.updated_at`, que solo cambia con el
  contenido.
- Las hojas no tienen título: el Inicio muestra materia + fecha.
- Esta fase usa la migración **0004**. El Inicio usa la **0005**.
- Esta fase no toca `HomePage.jsx` ni la redirección post-login. La del Inicio no toca los
  archivos de la carpeta (lista en su prompt).

---

## 6. Lo que se elimina

- **Código:**
  - `pages/SubjectMapPage.jsx` y `pages/SheetPage.jsx` (reemplazadas);
  - `features/subjectMap/{SubjectMap,SheetNode,SheetList}.jsx`;
  - `features/sheets/SheetListItem.jsx`;
  - `features/sheetEditor/SheetLinksPanel.jsx`;
  - `hooks/{useSubjectMap,useSheet,useSheetLinks}.js`;
  - `services/sheetLinks.service.js`;
  - `computeSheetLayout` y las constantes `SHEET_NODE_*` de `dagreLayout.js`;
  - `appendWikiLink`/`removeWikiLink`/`includesTitle`;
  - los typedefs `SheetLink`, `Unit` y `Topic`.
- **Base de datos:** lo de §3, puntos 2 a 5.

## 7. ADRs

- **ADR-017 (nuevo) — La Carpeta:** la materia se ve como un documento continuo de hojas
  fechadas sin título. Reemplaza el canvas de hojas de ADR-014 (los 3 niveles siguen) y
  **deroga ADR-015**: los links apuntan a temas y se resuelven en el cliente.
- **ADR-016:** la whitelist se reduce a `subjects.pos_*`.
- **ADR-011:** sigue: Markdown es la fuente de verdad.

## 8. Errores

- Si falla el guardado de una hoja: estado "Error al guardar" **en la barra de esa hoja**.
  El borrador local queda.
- Si falla el borrado de una hoja: aviso arriba de la carpeta, y la hoja no se quita.
- Si falla la carga: aviso con botón "Reintentar".

## 9. Verificación

1. Scripts `node` (scratchpad) para:
   - `extractHeadings` (fences, niveles, `#hashtag`);
   - `formatSheetDate`;
   - las búsquedas puras del plugin;
   - el export.
2. Migración: `begin … rollback` con asserts, después la aplicación real y SQL de control.
3. E2E de datos como usuario autenticado: crear, editar y borrar hojas sin título; RLS; la
   whitelist rechaza `sheets`. Después se borran los usuarios de prueba.
4. Rendimiento con 150 hojas (§4.7).
5. `npm run build` y `npm run lint`.
6. Navegador si la extensión de Chrome está conectada. Si no, se le pide al usuario una
   prueba manual guiada.

## 10. Fuera de alcance

El Inicio (otra fase), celular/PWA, reordenar hojas, dos hojas lado a lado, tamaño de
letra, plegar hojas, links entre materias, adjuntos e IA.
