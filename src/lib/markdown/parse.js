/**
 * Markdown → contenido inicial de TipTap. Ver docs/features/sheet-editor.md.
 *
 * La conversión real la hace la extensión `Markdown` de `tiptap-markdown`
 * (ver SheetEditor.jsx): una vez registrada, el editor acepta Markdown
 * directamente como `content` y lo parsea al vuelo. Esta función existe para
 * que quien llama (SheetPage → SheetEditor) no dependa de ese detalle: si el
 * día de mañana se cambia de librería de edición, este es el único lugar que
 * hay que tocar (ADR-011).
 *
 * @param {string} markdown
 * @returns {string}
 */
export function markdownToEditorContent(markdown) {
  return markdown ?? ''
}
