/**
 * Barra de herramientas del editor. Ver docs/features/sheet-editor.md.
 * Va dentro de la cápsula de vidrio de la carpeta (ADR-018).
 * Solo cubre lo que Markdown puede representar sin pérdida — ninguna acción
 * de acá produce algo que `editorToMarkdown` no pueda serializar de vuelta.
 */

import { Icon } from '../../ui/Icon'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @param {Object} props
 * @param {boolean} [props.active] - Botón de alternancia: sin este valor es una acción (no lleva `aria-pressed`).
 * @param {string} [props.ariaLabel] - Si falta, se usa `title`.
 * @param {boolean} [props.disabled]
 * @param {() => void} props.onClick
 * @param {React.ReactNode} props.label
 * @param {string} props.title
 */
function ToolbarButton({ active, onClick, label, title, ariaLabel, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      aria-pressed={active}
      disabled={disabled}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        active ? 'bg-accent/20 text-accent-soft' : 'text-text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}

/** Títulos: los dos de uso diario con nombre, los otros con su nivel. */
const HEADINGS = [
  { level: 1, titleKey: 'editor.toolbar.heading1', labelKey: 'editor.toolbar.heading1' },
  { level: 2, titleKey: 'editor.toolbar.heading2', labelKey: 'editor.toolbar.heading2' },
  { level: 3, titleKey: 'editor.toolbar.heading3', label: 'H3' },
  { level: 4, titleKey: 'editor.toolbar.heading4', label: 'H4' },
]

/**
 * @param {Object} props
 * @param {import('@tiptap/react').Editor|null} props.editor
 * @param {() => void} [props.onAttach] - Abre el selector de archivos; sin ella no se muestra el botón.
 * @param {boolean} [props.canAttach] - false si no hay hoja a la que adjuntar.
 */
export function EditorToolbar({ editor, onAttach, canAttach = true }) {
  const { t } = useI18n()
  // Adjuntar no depende del editor con foco: la página elige la hoja destino.
  const attachButton = onAttach && (
    <ToolbarButton
      title={t('editor.toolbar.attachTitle')}
      ariaLabel={t('editor.toolbar.attachLabel')}
      label={<Icon name="paperclip" size={14} />}
      disabled={!canAttach}
      onClick={onAttach}
    />
  )

  if (!editor) return attachButton ? <div className="flex items-center">{attachButton}</div> : null

  function setLink() {
    const previous = editor.getAttributes('link').href
    const url = window.prompt(t('editor.toolbar.linkPrompt'), previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton title={t('editor.toolbar.bold')} label="B" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton title={t('editor.toolbar.italic')} label="I" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton title={t('editor.toolbar.strike')} label="S" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton
        title={t('editor.toolbar.code')}
        label="</>"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      {HEADINGS.map(({ level, titleKey, labelKey, label }) => (
        <ToolbarButton
          key={level}
          title={t(titleKey)}
          label={labelKey ? t(labelKey) : label}
          active={editor.isActive('heading', { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        />
      ))}

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        title={t('editor.toolbar.list')}
        label="•"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        title={t('editor.toolbar.ordered')}
        label="1."
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        title={t('editor.toolbar.checklist')}
        label={t('editor.toolbar.checklistLabel')}
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />
      <ToolbarButton
        title={t('editor.toolbar.quote')}
        label={t('editor.toolbar.quoteLabel')}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        title={t('editor.toolbar.codeBlock')}
        label="{ }"
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />

      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <ToolbarButton
        title={t('editor.toolbar.rule')}
        label="―"
        active={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />
      <ToolbarButton title={t('editor.toolbar.link')} label={<Icon name="link" size={14} />} active={editor.isActive('link')} onClick={setLink} />
      {attachButton}
    </div>
  )
}
