/**
 * Barra de herramientas del editor. Ver docs/features/sheet-editor.md.
 * Va dentro de la cápsula de vidrio de la carpeta (ADR-018).
 * Solo cubre lo que Markdown puede representar sin pérdida — ninguna acción
 * de acá produce algo que `editorToMarkdown` no pueda serializar de vuelta.
 */

import { Icon } from '../../ui/Icon'

/**
 * @param {Object} props
 * @param {boolean} props.active
 * @param {() => void} props.onClick
 * @param {React.ReactNode} props.label
 * @param {string} props.title
 */
function ToolbarButton({ active, onClick, label, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-accent/20 text-accent-soft' : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}

/** Títulos: los dos de uso diario con nombre, los otros con su nivel. */
const HEADINGS = [
  { level: 1, title: 'Título', label: 'Título' },
  { level: 2, title: 'Subtítulo', label: 'Subtítulo' },
  { level: 3, title: 'Título 3', label: 'H3' },
  { level: 4, title: 'Título 4', label: 'H4' },
]

/**
 * @param {Object} props
 * @param {import('@tiptap/react').Editor|null} props.editor
 * @param {() => void} [props.onAttach] - Abre el selector de archivos; sin ella no se muestra el botón.
 */
export function EditorToolbar({ editor, onAttach }) {
  if (!editor) return null

  function setLink() {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('URL del enlace', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton title="Negrita" label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton title="Itálica" label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton title="Tachado" label="S" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton
        title="Código en línea"
        label="</>"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      {HEADINGS.map(({ level, title, label }) => (
        <ToolbarButton
          key={level}
          title={title}
          label={label}
          active={editor.isActive('heading', { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        />
      ))}

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        title="Lista"
        label="•"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        title="Lista numerada"
        label="1."
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        title="Checklist"
        label="Tarea"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <ToolbarButton
        title="Cita"
        label="Cita"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        title="Bloque de código"
        label="{ }"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        title="Línea horizontal"
        label="―"
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <ToolbarButton title="Enlace" label={<Icon name="link" size={14} />} active={editor.isActive('link')} onClick={setLink} />
      {onAttach && (
        <ToolbarButton
          title="Adjuntar (también podés soltar o pegar archivos en la hoja)"
          label={<Icon name="paperclip" size={14} />}
          active={false}
          onClick={onAttach}
        />
      )}
    </div>
  )
}
