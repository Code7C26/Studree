# Feature: La Carpeta (materia como carpeta escolar)

> **Estado:** ✅ Implementado (2026-10-14) — reemplaza al canvas de hojas (`subject-map.md`)
> **ADRs:** ADR-017 (la carpeta), ADR-011 (Markdown fuente de verdad), ADR-014 (3 niveles)
> **Spec:** `docs/superpowers/specs/2026-10-14-carpeta-design.md`
> **Archivos clave:** `src/pages/SubjectFolderPage.jsx`, `src/components/features/folder/`,
> `src/hooks/useFolder.js`, `src/hooks/useSheetAutosave.js`, `src/lib/editor/`,
> `src/lib/markdown/headings.js`, `src/lib/format/sheetDate.js`

---

## Descripción

Cada materia se ve como **una carpeta escolar**. La carrera es la carpeta, las materias
son los **separadores de colores** y adentro van **todas las hojas seguidas**, estilo
Word, sobre **papel blanco**: se lee y se escribe en el mismo lugar y se va agregando más
abajo.

## Cómo se usa

| Acción | Resultado |
|--------|-----------|
| Abrir una materia (`/materias/:id`) | Todas sus hojas en orden cronológico; te lleva a la **última** |
| Abrir con `?hoja=:id` | Te lleva a esa hoja (lo usa el Inicio: "Seguí donde dejaste") |
| Escribir en cualquier hoja | Se guarda sola (autosave por hoja) |
| **＋ Nueva hoja** (al final) | Hoja con la fecha y hora del momento; se guarda recién cuando tiene contenido |
| ✕ en la barra de una hoja | La borra (con confirmación; una hoja nueva vacía se quita sin preguntar) |
| `# Título` en una hoja | Crea un **tema**, que aparece en el índice |
| Click en un tema del índice | Lleva al inicio de ese tema |
| `[[Tema]]` en el texto | Link verde; el click lleva a ese tema de la materia |
| Buscador / `Ctrl+F` | Resalta en todas las hojas, "n de m", ↑ ↓ / `Enter` / `Shift+Enter`, `Esc` limpia |
| **📖 Modo lectura** | Oculta header, explorador, tabs, índice y toolbar; queda el papel. `Esc` sale |

## Decisiones (del usuario)

- **Hojas sin título**: solo fecha y hora (`Miércoles 14/10 · 18:30`; con año si no es el
  actual). Los temas son los `#` de adentro.
- **Orden cronológico, sin reordenar**: si algo quedó en otro lugar, se corta y se pega.
- **No hay dibujo de hojas** (canvas): el índice de temas es la forma de orientarse. El
  mapa de la carrera (materias + correlativas) sigue.
- **Papel blanco solo en las hojas**: el resto de la app sigue oscuro con verde.
- Descartados: lista de hojas en el índice, tamaño de letra, plegar hojas, dos hojas lado
  a lado.

## Cómo funciona por dentro

- **Datos:** `useFolder` trae la materia y sus hojas **con contenido**
  (`FOLDER_SHEET_COLUMNS`), ordenadas por `created_at`.
  - Cada hoja lleva una `key` estable: una hoja local (`local:…`) que se guarda cambia de
    `id`, pero su editor no se remonta.
  - Se recarga en silencio con `studree:data-changed`.
- **Guardado:** cada `FolderSheet` usa `useSheetAutosave`:
  - borrador `{ content, baseUpdatedAt }` con la regla de la Fase 0 (`resolveDraft`);
  - debounce de 800 ms;
  - los guardados de una hoja van en fila;
  - flush al desmontar y en `pagehide`;
  - antes de borrar una hoja se llama a `cancel()`, para que el flush del desmontaje no la
    reviva.
- **Índice:** `extractHeadings` sobre el Markdown de cada hoja (ignora bloques de código y
  `#hashtag`). Cada tema se ubica en el DOM como el n-ésimo heading de primer nivel del
  editor de su hoja (`:scope > h1..h4`). El tema activo sale de un listener de scroll sobre
  `<main>`.
- **Búsqueda y `[[links]]`:** `HighlightExtension` (TipTap) pinta decoraciones calculadas
  por `computeHighlights` (puro). No cambian el documento ni el Markdown. Cada hoja reporta
  cuántas coincidencias tiene, y la página traduce el índice global ("3 de 12") a la hoja
  y la coincidencia local.
- **Modo lectura:** contexto `useReadingMode` (provider en `AppLayout`).
- **Links viejos:** `/hojas/:id` → `SheetRedirectPage` → `/materias/:subjectId?hoja=:id`.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectFolderPage.jsx` | Arma la carpeta: índice, búsqueda, toolbar, hojas, modo lectura, borrar, export |
| `src/pages/SheetRedirectPage.jsx` | Redirige `/hojas/:id` a la carpeta |
| `src/components/features/folder/FolderSheet.jsx` | Una hoja: barra de fecha + estado de guardado + ✕ + editor |
| `src/components/features/folder/TopicIndex.jsx` | Índice de temas (presentacional) |
| `src/components/features/folder/FolderSearchBar.jsx` | Buscador (presentacional) |
| `src/components/features/sheetEditor/SheetEditor.jsx` | Editor TipTap de una hoja (+ props de búsqueda y links) |
| `src/components/features/sheetEditor/EditorToolbar.jsx` | Toolbar única: actúa sobre la hoja con foco |
| `src/hooks/useFolder.js` | Materia + hojas + locales + borrar + contenido en vivo |
| `src/hooks/useSheetAutosave.js` | Autosave de una hoja |
| `src/hooks/useSheetLocation.js` | Materia de una hoja (para la redirección) |
| `src/hooks/useReadingMode.js` · `layout/ReadingModeProvider.jsx` | Modo lectura |
| `src/lib/editor/highlightExtension.js` · `computeHighlights.js` · `matches.js` | Resaltado de `[[links]]` y búsqueda |
| `src/lib/editor/folderSheets.js` | `resolveDraft`, `orderFolderSheets`, `isLocalSheet` |
| `src/lib/markdown/headings.js` | `extractHeadings` |
| `src/lib/format/sheetDate.js` | `formatSheetDate`, `formatSheetDateLong`, `sheetLocalIso`, `sheetFileName` |

## Rendimiento

Todas las hojas se montan como editores a la vez. **Criterio:** montar una materia de 150
hojas en menos de ~1 s. En desarrollo, la consola muestra
`[carpeta] N hojas montadas en X ms`.

> **Pendiente de medir** con una materia grande real: la extensión de Chrome no estaba
> conectada durante la implementación. Si supera el criterio, se implementa el **montaje
> perezoso** de la spec §4.7: placeholder con altura estimada y el editor monta al acercarse
> al viewport.

## Restricciones

- Markdown es la fuente de verdad (ADR-011): las decoraciones no se guardan.
- `[[Tema]]` se resuelve dentro de la misma materia, sin distinguir mayúsculas, al primer
  tema con ese texto.
- Un heading dentro de una lista o cita no es un tema (no está en el índice).

## Pendiente

- [ ] Medir rendimiento con una materia grande (ver arriba).
- [ ] Autocompletar `[[` con los temas de la materia.
- [ ] Celular: índice como drawer (fase "Celular", al final de la hoja de ruta).
