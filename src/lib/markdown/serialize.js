/**
 * Documento de TipTap → Markdown. Ver docs/features/sheet-editor.md.
 *
 * La serialización real la hace la extensión `Markdown` de `tiptap-markdown`
 * (`editor.storage.markdown`), que ya viene registrada en SheetEditor.jsx.
 * Esta función aísla ese detalle: nada fuera de `lib/markdown/` sabe CÓMO se
 * serializa, solo que hay una función que lo hace (ADR-011).
 *
 * @param {import('@tiptap/react').Editor} editor
 * @returns {string} Markdown.
 */
export function editorToMarkdown(editor) {
  return editor.storage.markdown.getMarkdown()
}
