/**
 * Barra de herramientas del editor. Ver docs/features/sheet-editor.md.
 * Solo cubre lo que Markdown puede representar sin pérdida — ninguna acción
 * de acá produce algo que `editorToMarkdown` no pueda serializar de vuelta.
 */

/**
 * @param {Object} props
 * @param {boolean} props.active
 * @param {() => void} props.onClick
 * @param {string} props.label
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
        active ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}

/** @param {{editor: import('@tiptap/react').Editor|null}} props */
export function EditorToolbar({ editor }) {
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
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
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

      {[1, 2, 3, 4].map((level) => (
        <ToolbarButton
          key={level}
          title={`Título ${level}`}
          label={`H${level}`}
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
        label="☑"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <ToolbarButton
        title="Cita"
        label="❝"
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
      <ToolbarButton title="Enlace" label="🔗" active={editor.isActive('link')} onClick={setLink} />
    </div>
  )
}
