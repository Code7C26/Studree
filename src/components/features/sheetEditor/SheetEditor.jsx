/**
 * Instancia de TipTap. Ver docs/features/sheet-editor.md y ADR-011.
 *
 * Se edita en rico (HTML en memoria vía ProseMirror), se persiste en
 * Markdown: `onChange` entrega SIEMPRE Markdown ya serializado, nunca HTML.
 * Quien usa este componente (SheetPage) no sabe ni le importa que por dentro
 * hay TipTap — solo entra y sale Markdown.
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Markdown } from 'tiptap-markdown'
import { markdownToEditorContent } from '../../../lib/markdown/parse.js'
import { editorToMarkdown } from '../../../lib/markdown/serialize.js'

/**
 * @param {Object} props
 * @param {string} props.content - Markdown inicial. Solo se lee al montar (ver `key` en SheetPage).
 * @param {(markdown: string) => void} props.onChange
 * @param {(editor: import('@tiptap/react').Editor|null) => void} [props.onReady]
 */
export function SheetEditor({ content, onChange, onReady }) {
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
    ],
    content: markdownToEditorContent(content),
    onUpdate: ({ editor: instance }) => onChange(editorToMarkdown(instance)),
    editorProps: {
      attributes: { class: 'sheet-editor min-h-[300px]' },
    },
  })

  useEffect(() => {
    onReady?.(editor)
    return () => onReady?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return <EditorContent editor={editor} className="sheet-editor" />
}
