import { useRef, useState } from 'react'
import { HomePanel } from './HomePanel'
import { Button } from '../../ui/Button'
import { isOverdue } from '../../../lib/home/summary.js'
import { formatDayMonth } from '../../../lib/home/dates.js'
import { HOME_LIMITS } from '../../../constants/homeLimits.js'
import { Icon } from '../../ui/Icon'

const ICON_BUTTON =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text'

/**
 * Una tarea: checkbox, texto editable en el lugar (doble click o el lápiz) y fecha.
 * @param {Object} props
 * @param {import('../../../types/models.js').Task} props.task
 * @param {string} props.todayKey
 * @param {(id: string, done: boolean) => void} props.onToggle
 * @param {(id: string, text: string) => void} props.onRename
 * @param {(id: string) => void} props.onDelete
 */
function TaskItem({ task, todayKey, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.text)
  // Esc cancela: el `blur` que sigue no tiene que guardar.
  const cancelledRef = useRef(false)
  const done = Boolean(task.done_at)
  const overdue = isOverdue(task, todayKey)

  function startEditing() {
    setDraft(task.text)
    setEditing(true)
  }

  function finishEditing() {
    setEditing(false)
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    if (draft.trim() && draft.trim() !== task.text) onRename(task.id, draft)
  }

  return (
    <li
      className={`flex items-center gap-1 rounded-lg border pr-1 ${overdue ? 'border-red-800' : 'border-transparent'}`}
    >
      {/* El label da 40×40 px de área táctil al checkbox de 20 px. */}
      <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(task.id, !done)}
          aria-label={done ? `Marcar «${task.text}» como pendiente` : `Marcar «${task.text}» como hecha`}
          className="h-5 w-5 cursor-pointer accent-accent"
        />
      </label>
      {editing ? (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancelledRef.current = true
              setDraft(task.text)
              event.currentTarget.blur()
            }
          }}
          maxLength={HOME_LIMITS.taskText}
          autoFocus
          aria-label="Editar tarea"
          className="min-w-0 flex-1 rounded-md border border-accent bg-bg px-2 py-1 text-sm text-text"
        />
      ) : (
        <span
          onDoubleClick={done ? undefined : startEditing}
          className={`min-w-0 flex-1 break-words py-2 text-sm ${done ? 'text-text-muted line-through' : 'text-text'}`}
        >
          {task.text}
        </span>
      )}
      {task.due_date && !done && (
        <span className={`shrink-0 text-xs ${overdue ? 'font-medium text-red-300' : 'text-text-muted'}`}>
          {overdue ? 'vencida' : 'vence'} {formatDayMonth(task.due_date)}
        </span>
      )}
      {!done && !editing && (
        <button type="button" onClick={startEditing} className={ICON_BUTTON} aria-label={`Editar «${task.text}»`}>
          <Icon name="edit" size={14} />
        </button>
      )}
      {done && (
        <button type="button" onClick={() => onDelete(task.id)} className={ICON_BUTTON} aria-label={`Borrar «${task.text}»`}>
          <Icon name="close" size={14} />
        </button>
      )}
    </li>
  )
}

/**
 * Tareas pendientes + "Hechas" colapsado. Ver docs/features/home.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').Task[]} props.pending
 * @param {import('../../../types/models.js').Task[]} props.done
 * @param {string} props.todayKey
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {(values: {text: string, due_date: string|null}) => Promise<string|null>} props.onCreate
 * @param {(id: string, done: boolean) => Promise<string|null>} props.onToggle
 * @param {(id: string, text: string) => Promise<string|null>} props.onRename
 * @param {(id: string) => Promise<string|null>} props.onDelete
 * @param {string} [props.className]
 */
export function TaskList({ pending, done, todayKey, loading, error, onCreate, onToggle, onRename, onDelete, className = '' }) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  /** @param {React.FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const createError = await onCreate({ text, due_date: dueDate || null })
    setSaving(false)
    if (!createError) {
      setText('')
      setDueDate('')
    }
  }

  const itemProps = { todayKey, onToggle, onRename, onDelete }

  return (
    <HomePanel title="Tareas" error={error} className={className}>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nueva tarea…"
          maxLength={HOME_LIMITS.taskText}
          aria-label="Nueva tarea"
          className="min-h-10 min-w-0 flex-1 basis-48 rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text transition-colors focus-visible:border-accent"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="Fecha límite (opcional)"
          className="min-h-10 rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text transition-colors focus-visible:border-accent"
        />
        <Button type="submit" disabled={saving || !text.trim()}>
          Agregar
        </Button>
      </form>

      {loading && pending.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Cargando…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No tenés tareas pendientes.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {pending.map((task) => (
            <TaskItem key={task.id} task={task} {...itemProps} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="flex min-h-10 cursor-pointer items-center text-sm text-text-muted hover:text-text">
            Hechas ({done.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {done.map((task) => (
              <TaskItem key={task.id} task={task} {...itemProps} />
            ))}
          </ul>
        </details>
      )}
    </HomePanel>
  )
}
