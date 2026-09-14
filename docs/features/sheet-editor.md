# Feature: Editor de Hojas (TipTap, Markdown como fuente de verdad)

> **Estado:** ✅ Implementado (2026-09-09)
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

1. El usuario escribe.
2. A los **~800 ms sin teclear**, se serializa a Markdown y se guarda en la cache local
   (`studree:cache:sheet:<id>`) → el borrador sobrevive a un cierre accidental.
3. En paralelo se manda el `UPDATE` a Supabase.
4. La UI muestra el estado: **guardando… / guardado / error**.
5. Si falla la red, el borrador local queda y se reintenta; **nunca** se descarta trabajo
   del usuario en silencio.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SheetPage.jsx` | Página del editor (título + toolbar + contenido) |
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
- [ ] Enlaces entre hojas (`[[wikilink]]`).
