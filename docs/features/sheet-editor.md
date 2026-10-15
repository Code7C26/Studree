# Feature: Editor de Hojas (TipTap, Markdown como fuente de verdad)

> **Estado:** ✅ Implementado (2026-09-09) · Borrador seguro (2026-10-14) · Dentro de la
> carpeta, un editor por hoja (ADR-017, 2026-10-14)
> **Archivos clave:** `src/components/features/sheetEditor/`, `src/lib/markdown/`,
> `src/lib/editor/`, `src/hooks/useSheetAutosave.js`
> **Dependencias:** `@tiptap/react`, `@tiptap/pm` (peer, declarada), `@tiptap/starter-kit`,
> `tiptap-markdown`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
> **ADR relacionado:** ADR-011, ADR-017
>
> **Nota de versión:** TipTap **v3** (`3.31.3`). `tiptap-markdown@0.9.0` soporta
> `@tiptap/core ^3.0.1`.

---

## Descripción

Editor de documento tipo Word/Notion para el contenido de una hoja. Desde ADR-017 **no
hay pantalla propia de hoja**: cada hoja es un editor dentro de la carpeta de su materia
(`docs/features/folder.md`), sobre papel blanco. `/hojas/:id` redirige a la carpeta.

## Decisión clave: se edita en rico, se guarda en Markdown

TipTap trabaja internamente con HTML, pero **lo que se persiste es Markdown**
(`sheets.content_md`). El HTML existe únicamente en memoria mientras el editor está
montado:

```
Markdown (BD) ──parse──► TipTap (HTML en memoria) ──serialize──► Markdown (BD)
```

**Por qué:** exportar a IA es un requisito central; con Markdown guardado, el export es
copiar el campo. **Costo aceptado:** el editor queda limitado a lo que Markdown
representa (sin colores de texto, sin tablas complejas).

## Guardado: optimista con debounce (`useSheetAutosave` → `lib/editor/sheetSaver.js`, uno por hoja)

1. Cada cambio se escribe **ya** en el borrador local `studree:cache:sheet:<id>` como
   `{ content, baseUpdatedAt }`.
2. A los **~800 ms sin teclear** se manda a Supabase. Los guardados de una hoja van en
   fila: nunca dos a la vez.
3. La barra de la hoja muestra **Guardando… / Guardado / Error al guardar**.
4. Si el guardado sale bien y el borrador sigue siendo eso, **se borra**.
5. Al salir (desmontar, cerrar la pestaña: `pagehide`) lo pendiente **se manda enseguida**.
6. **Hoja nueva** (`local:…`): no existe en Supabase hasta tener contenido no vacío; el
   primer guardado la **crea**. Su borrador va en `studree:cache:sheet-local:<subjectId>`
   (sobrevive a cerrar la pestaña sin conexión). Si se borra antes, `cancel()` descarta lo
   pendiente; si el `create` ya estaba en vuelo, la fila creada se borra al volver.

### Cuándo gana el borrador local (`resolveDraft`, fix de la Fase 0)

| Caso | Resultado |
|------|-----------|
| Hay borrador, `baseUpdatedAt === updated_at` y el contenido difiere | **Gana el borrador** (trabajo que no llegó) y se reenvía |
| El servidor cambió desde entonces (`updated_at` distinto) | **Se descarta**: otro dispositivo guardó después |
| Borrador con el formato viejo (string) | Se descarta |

> `updated_at` de las hojas solo cambia con el contenido (trigger, migración 0003).

## `[[Temas]]` y búsqueda (ADR-017)

- `[[Mitosis]]` se ve como link verde: el click lleva al tema (heading) "Mitosis" de la
  misma materia. No hay tabla de links: se resuelve contra el índice de temas.
- `prosemirror-markdown` escapa los corchetes al serializar (`\[\[X\]\]`):
  `editorToMarkdown` los desescapa (`unescapeWikiLinks`), así el Markdown guardado y el
  export quedan con `[[X]]` limpio.
- El buscador de la carpeta resalta las coincidencias con decoraciones.
- Las dos cosas las hace `HighlightExtension` (`src/lib/editor/highlightExtension.js`), con
  el cálculo puro en `computeHighlights.js`. Son decoraciones de ProseMirror: **no**
  cambian el documento ni el Markdown.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/features/sheetEditor/SheetEditor.jsx` | Instancia de TipTap de una hoja; props `searchTerm`, `currentHit`, `onWikiLink`, `onHitsChange`, `onFocusEditor` |
| `src/components/features/sheetEditor/EditorToolbar.jsx` | Negrita, itálica, títulos, listas, código, cita, link (actúa sobre la hoja con foco) |
| `src/components/features/folder/FolderSheet.jsx` | Barra de fecha + editor (ver `folder.md`) |
| `src/hooks/useSheetAutosave.js` | Borrador, debounce, flush, creación de hojas nuevas |
| `src/lib/markdown/parse.js` / `serialize.js` | Markdown ↔ TipTap |
| `src/lib/markdown/wikiLinks.js` | `WIKI_LINK_PATTERN`, `extractWikiLinks`, `unescapeWikiLinks` |
| `src/lib/editor/*` | Resaltado (`highlightExtension`, `computeHighlights`, `matches`) y reglas de hojas (`folderSheets`) |
| `src/services/sheets.service.js` | `create`, `saveContent`, `searchContent` |

## Estilos

El editor va sobre **papel**: tinta `ink` sobre `paper` (tokens de `tailwind.config.js`).
Código con fondo `paper-border/40`, citas con borde `accent`, `[[links]]` en
`accent-hover`, coincidencias en `warn/30` y la actual en `warn` (`src/index.css`).

## Extensiones de TipTap habilitadas

`Bold` · `Italic` · `Strike` · `Code` · `CodeBlock` · `Heading` (h1–h4) · `BulletList` ·
`OrderedList` · `TaskList` · `Blockquote` · `HorizontalRule` · `Link` · `HighlightExtension`
(propia).

## Seguridad (XSS)

- **Nunca** renderizar el Markdown con `dangerouslySetInnerHTML` sin sanitizar.
- TipTap renderiza vía ProseMirror (no inyecta HTML crudo). `html: false` en Markdown.

## Pendiente

- [ ] Imágenes (requiere Supabase Storage).
- [ ] Historial de versiones.
- [ ] Autocompletar `[[` con los temas de la materia.
