import { unescapeWikiLinks } from './wikiLinks.js'

/**
 * Documento de TipTap → Markdown. Ver docs/features/sheet-editor.md.
 *
 * La serialización real la hace la extensión `Markdown` de `tiptap-markdown`
 * (`editor.storage.markdown`), que ya viene registrada en SheetEditor.jsx.
 * Esta función aísla ese detalle: nada fuera de `lib/markdown/` sabe CÓMO se
 * serializa, solo que hay una función que lo hace (ADR-011).
 *
 * `prosemirror-markdown` escapa los corchetes (`\[\[Hoja\]\]`); los links entre
 * hojas se desescapan para que el Markdown guardado tenga `[[Hoja]]` limpio
 * (ADR-015) — es lo que lee la base para derivar `sheet_links` y lo que va al
 * export para IA.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @returns {string} Markdown.
 */
export function editorToMarkdown(editor) {
  return unescapeWikiLinks(editor.storage.markdown.getMarkdown())
}
