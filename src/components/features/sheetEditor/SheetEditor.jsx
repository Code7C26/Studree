/**
 * Instancia de TipTap de UNA hoja. Ver docs/features/sheet-editor.md y ADR-011.
 *
 * Se edita en rico (HTML en memoria vía ProseMirror), se persiste en
 * Markdown: `onChange` entrega SIEMPRE Markdown ya serializado, nunca HTML.
 * En la carpeta (ADR-017) hay un editor de estos por hoja; además pinta los
 * `[[links]]` a temas y las coincidencias del buscador (highlightExtension).
 */

import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { markdownToEditorContent } from '../../../lib/markdown/parse.js'
import { editorToMarkdown } from '../../../lib/markdown/serialize.js'
import { HighlightExtension, setSearch, getSearchHits } from '../../../lib/editor/highlightExtension.js'

/**
 * @param {Object} props
 * @param {string} props.content - Markdown inicial. Solo se lee al montar.
 * @param {(markdown: string) => void} props.onChange
 * @param {(editor: import('@tiptap/react').Editor|null) => void} [props.onReady]
 * @param {(editor: import('@tiptap/react').Editor) => void} [props.onFocusEditor] - Para la toolbar compartida.
 * @param {(title: string) => void} [props.onWikiLink] - Click en un `[[Tema]]`.
 * @param {string} [props.searchTerm] - Texto a resaltar ('' = nada).
 * @param {number|null} [props.currentHit] - Coincidencia actual DENTRO de esta hoja.
 * @param {(count: number) => void} [props.onHitsChange] - Cuántas coincidencias hay en esta hoja.
 */
export function SheetEditor({
  content,
  onChange,
  onReady,
  onFocusEditor,
  onWikiLink,
  searchTerm = '',
  currentHit = null,
  onHitsChange,
}) {
  // Las opciones de las extensiones se fijan al crear el editor: los callbacks
  // van por ref para que siempre se llame a la versión más nueva.
  const callbacks = useRef({ onWikiLink, onHitsChange })
  callbacks.current = { onWikiLink, onHitsChange }

  const editor = useEditor({
    extensions: [
      // `link` viene incluido en starter-kit desde TipTap v3; se configura acá,
      // no se importa aparte (importarlo de nuevo duplicaría la extensión).
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ html: false, transformPastedText: true }),
      HighlightExtension.configure({ onWikiLink: (title) => callbacks.current.onWikiLink?.(title) }),
    ],
    content: markdownToEditorContent(content),
    onUpdate: ({ editor: instance }) => {
      onChange(editorToMarkdown(instance))
      callbacks.current.onHitsChange?.(getSearchHits(instance).length)
    },
    onFocus: ({ editor: instance }) => onFocusEditor?.(instance),
    editorProps: {
      attributes: { class: 'sheet-editor min-h-[8rem]' },
    },
  })

  useEffect(() => {
    onReady?.(editor)
    return () => onReady?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Búsqueda de la carpeta: re-pinta y avisa cuántas coincidencias hay acá.
  useEffect(() => {
    if (!editor) return
    setSearch(editor, searchTerm, currentHit)
    callbacks.current.onHitsChange?.(getSearchHits(editor).length)
  }, [editor, searchTerm, currentHit])

  return <EditorContent editor={editor} className="sheet-editor" />
}
