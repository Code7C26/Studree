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
import { TextSelection } from '@tiptap/pm/state'
import { Markdown } from 'tiptap-markdown'
import { markdownToEditorContent } from '../../../lib/markdown/parse.js'
import { editorToMarkdown } from '../../../lib/markdown/serialize.js'
import { HighlightExtension, setSearch, getSearchHits } from '../../../lib/editor/highlightExtension.js'
import { BroteAnchorExtension } from '../../../lib/editor/broteAnchor.js'
import { AttachmentImage, AttachmentLinkClick } from '../../../lib/editor/attachmentNodes.js'
import { ATTACHMENT_PROTOCOL } from '../../../lib/attachments/refs.js'

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
 * @param {{resolve: (id: string) => Promise<string|null>, isUploading: (id: string) => boolean, open: (id: string) => void}} [props.attachments]
 * @param {(files: FileList) => void} [props.onFiles] - Archivos soltados o pegados sobre la hoja.
 * @param {() => void} [props.onBroteRemoved] - Se borró el bloque de arriba de la tarjeta del Brote (`broteAnchor.js`).
 * @param {boolean} [props.editable=true] - `false` para la vista pública (solo lectura, Fase 15).
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
  attachments,
  onFiles,
  onBroteRemoved,
  editable = true,
}) {
  // Las opciones de las extensiones se fijan al crear el editor: los callbacks
  // van por ref para que siempre se llame a la versión más nueva.
  const callbacks = useRef({ onWikiLink, onHitsChange, attachments, onFiles, onBroteRemoved })
  callbacks.current = { onWikiLink, onHitsChange, attachments, onFiles, onBroteRemoved }

  const editor = useEditor({
    extensions: [
      // `link` viene incluido en starter-kit desde TipTap v3; se configura acá,
      // no se importa aparte (importarlo de nuevo duplicaría la extensión).
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: [ATTACHMENT_PROTOCOL] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      AttachmentImage.configure({
        inline: true,
        allowBase64: false,
        resolveAttachment: (id) => callbacks.current.attachments?.resolve(id) ?? Promise.resolve(null),
        isUploading: (id) => callbacks.current.attachments?.isUploading(id) ?? false,
      }),
      AttachmentLinkClick.configure({ onOpen: (id) => callbacks.current.attachments?.open(id) }),
      Markdown.configure({ html: false, transformPastedText: true }),
      HighlightExtension.configure({ onWikiLink: (title) => callbacks.current.onWikiLink?.(title) }),
      // Ancla de la tarjeta de un atajo del Brote (widget: no entra en el Markdown).
      BroteAnchorExtension.configure({ onRemoved: () => callbacks.current.onBroteRemoved?.() }),
    ],
    content: markdownToEditorContent(content),
    editable,
    onUpdate: ({ editor: instance }) => {
      onChange(editorToMarkdown(instance))
      callbacks.current.onHitsChange?.(getSearchHits(instance).length)
    },
    onFocus: ({ editor: instance }) => onFocusEditor?.(instance),
    editorProps: {
      // Archivos soltados o pegados → adjuntos (FolderSheet decide qué hacer).
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files
        if (!files?.length || !callbacks.current.onFiles) return false
        event.preventDefault()
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY })
        if (at) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos))))
        callbacks.current.onFiles(files)
        return true
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files
        if (!files?.length || !callbacks.current.onFiles) return false
        // Word, Excel o una página web ponen una imagen JUNTO con texto/HTML: eso es un
        // pegado normal. Solo una captura (únicamente el archivo) se sube como adjunto.
        const types = Array.from(event.clipboardData.types ?? [])
        if (types.includes('text/plain') || types.includes('text/html')) return false
        callbacks.current.onFiles(files)
        return true
      },
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
