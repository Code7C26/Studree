# Feature: Editor de Hojas (TipTap, Markdown como fuente de verdad)

> **Estado:** ✅ Implementado (2026-09-09) · Borrador seguro + panel de enlaces (2026-10-14)
> **Archivos clave:** `src/pages/SheetPage.jsx`,
> `src/components/features/sheetEditor/`, `src/lib/markdown/`, `src/hooks/useSheet.js`
> **Dependencias nuevas:** `@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown`,
> `@tiptap/extension-task-list`, `@tiptap/extension-task-item` — `Link` **no** se instaló
> aparte: en TipTap v3 ya viene incluido en `starter-kit` (se configura, no se importa).
> **ADR relacionado:** ADR-011
>
> **Nota de versión:** TipTap se instaló en **v3** (`3.31.3`), no v2 como cuando se
> escribió este doc originalmente. `tiptap-markdown@0.9.0` declara soporte explícito
> para `@tiptap/core ^3.0.1`, así que no hubo que buscar una alternativa.

---

## Descripción

Editor de documento tipo Word/Notion para el contenido de una hoja: la unidad mínima de
apuntes de Studree.

## Decisión clave: se edita en rico, se guarda en Markdown

TipTap trabaja internamente con HTML, pero **lo que se persiste es Markdown**
(`sheets.content_md`). El HTML existe únicamente en memoria mientras el editor está
montado:

```
Markdown (BD) ──parse──► TipTap (HTML en memoria) ──serialize──► Markdown (BD)
```

**Por qué:** el objetivo de exportar a IA / segundo cerebro es un requisito central del
proyecto. Con Markdown guardado, el export es **copiar el campo** — sin conversión y sin
pérdida. Con HTML guardado, cada exportación sería una conversión con pérdida.

**Costo aceptado:** el editor queda limitado a lo que Markdown representa (sin colores de
texto, sin tablas complejas). Se acepta a cambio de la portabilidad.

## Guardado: optimista con debounce

Coherente con ADR-007 (Supabase fuente de verdad, `localStorage` cache):

1. El usuario escribe. Cada cambio se escribe **ya** en el borrador local
   `studree:cache:sheet:<id>` como `{ content, baseUpdatedAt }`.
2. A los **~800 ms sin teclear** se manda el `UPDATE` a Supabase.
3. La UI muestra el estado: **guardando… / guardado / error**.
4. Si el guardado sale bien y el borrador sigue siendo eso, **se borra**. Si el usuario
   siguió escribiendo, se le actualiza la base.
5. Si se sale de la hoja (cambiar de ruta, cerrar la pestaña: `pagehide`) con un guardado
   pendiente, **se manda enseguida** en vez de esperar el debounce.

### Cuándo gana el borrador local (fix 2026-10-14)

`baseUpdatedAt` es el `updated_at` de la versión del servidor sobre la que se escribió el
borrador. Al abrir la hoja:

| Caso | Resultado |
|------|-----------|
| Hay borrador, `baseUpdatedAt === updated_at` del servidor y el contenido difiere | **Gana el borrador** (trabajo que no llegó: cierre accidental, red caída) y se reenvía |
| Hay borrador pero el servidor cambió desde entonces (`updated_at` distinto) | **Se descarta**: alguien guardó otra cosa después (otro dispositivo); pisarlo perdería ese trabajo |
| Borrador con el formato viejo (string, sin base) | Se descarta (no se puede validar) |

Antes el borrador nunca se borraba y ganaba siempre que difería: editar en la PC, después
en el celular, y volver a la PC pisaba lo del celular.

> `updated_at` de las hojas solo cambia con el título o el contenido (trigger de la
> migración 0003): mover el nodo en el canvas no invalida el borrador.

## Enlaces entre hojas (`[[Título]]`, ADR-015)

Escribir `[[Título de otra hoja]]` enlaza a esa hoja de la **misma materia** (sin
distinguir mayúsculas). La base indexa los links al guardar (`sheet_links`, trigger). Debajo
del editor, el panel **Enlaces** muestra:

- **Enlaza a**: hojas a las que apunta esta (navegables);
- **Enlazada desde**: backlinks;
- **Todavía no existen**: `[[Títulos]]` escritos sin hoja; un click la crea en la materia y
  la abre (el link se resuelve solo).

`prosemirror-markdown` escapa los corchetes al serializar (`\[\[X\]\]`):
`editorToMarkdown` los desescapa con `unescapeWikiLinks` (`src/lib/markdown/wikiLinks.js`),
así el Markdown guardado y el export quedan con `[[X]]` limpio.

Renombrar una hoja reescribe los `[[título viejo]]` de las hojas que la enlazaban (lo hace
la base). Si el título nuevo ya existe en la materia, se muestra *"Ya existe una hoja con
ese título en esta materia."* y el título vuelve al anterior.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SheetPage.jsx` | Página del editor (volver a la materia + título + toolbar + contenido + enlaces) |
| `src/components/features/sheetEditor/SheetLinksPanel.jsx` | Panel "Enlaces" (presentacional) |
| `src/hooks/useSheetLinks.js` | Salientes, backlinks, no resueltos y crear la hoja de un link |
| `src/lib/markdown/wikiLinks.js` | Funciones puras de `[[links]]` (extraer, agregar, quitar, desescapar) |
| `src/components/features/sheetEditor/SheetEditor.jsx` | Instancia de TipTap |
| `src/components/features/sheetEditor/EditorToolbar.jsx` | Negrita, itálica, títulos, listas, código, cita, link |
| `src/lib/markdown/parse.js` | Markdown → documento de TipTap |
| `src/lib/markdown/serialize.js` | Documento de TipTap → Markdown |
| `src/hooks/useSheet.js` | Carga, autosave con debounce y estado de sincronización |
| `src/services/sheets.service.js` | Lectura/escritura de la hoja |

## Extensiones de TipTap habilitadas

Solo lo que Markdown puede representar sin pérdida:

`Bold` · `Italic` · `Strike` · `Code` · `CodeBlock` · `Heading` (h1–h4) · `BulletList` ·
`OrderedList` · `TaskList` (checkboxes `- [ ]`) · `Blockquote` · `HorizontalRule` · `Link`

**Excluidas** por no ser representables: colores de texto, resaltado, alineación, fuentes.

## Seguridad (XSS)

El contenido lo escribe el propio usuario, pero igual:

- **Nunca** renderizar el Markdown con `dangerouslySetInnerHTML` sin sanitizar.
- TipTap renderiza vía ProseMirror (no inyecta HTML crudo), que es el camino seguro.
- Ver `docs/03-security.md`.

## Restricciones

- **Markdown es la fuente de verdad.** Nunca guardar HTML en la base (ADR-011).
- La conversión vive aislada en `src/lib/markdown/` para poder cambiar de editor sin
  tocar los datos.
- No perder contenido del usuario ante error de red: el borrador local es la red de
  seguridad.

## Preparado para IA (sin implementar)

El contenido queda *chunkeable* por hoja, listo para embeddings más adelante. **En esta
etapa no se implementa vectorización ni búsqueda semántica.**

## Pendiente

- [ ] Imágenes (requiere Supabase Storage).
- [ ] Historial de versiones.
- [x] Enlaces entre hojas (`[[wikilink]]`) — 2026-10-14.
- [ ] Autocompletar `[[` con los títulos de la materia.
- [ ] Links clickeables dentro del texto del editor (hoy se navega desde el panel).
