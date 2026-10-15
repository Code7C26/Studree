import { useRef, useState } from 'react'
import { HomePanel } from './HomePanel'
import { Button } from '../../ui/Button'
import { HOME_LIMITS } from '../../../constants/homeLimits.js'

const TEXTAREA =
  'w-full resize-y rounded-lg border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent'

/**
 * Una nota: click en el texto = editar en el lugar; se guarda al salir del campo.
 * @param {Object} props
 * @param {import('../../../types/models.js').QuickNote} props.note
 * @param {(id: string, body: string) => void} props.onUpdate
 * @param {(id: string) => void} props.onRemove
 */
function NoteCard({ note, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  // Esc cancela: si el navegador dispara `blur` al sacar el textarea del DOM,
  // `finishEditing` no tiene que guardar.
  const cancelledRef = useRef(false)

  function finishEditing() {
    setEditing(false)
    if (cancelledRef.current) {
      cancelledRef.current = false
      return
    }
    // Vacía no se guarda: vuelve el texto anterior.
    if (draft.trim() && draft.trim() !== note.body) onUpdate(note.id, draft)
    else setDraft(note.body)
  }

  return (
    <li className="flex gap-1 rounded-lg border border-border bg-bg p-2">
      {editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              cancelledRef.current = true
              setDraft(note.body)
              event.currentTarget.blur()
            }
          }}
          maxLength={HOME_LIMITS.noteBody}
          rows={3}
          autoFocus
          aria-label="Editar nota"
          className={`${TEXTAREA} border-accent`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(note.body)
            setEditing(true)
          }}
          className="min-w-0 flex-1 whitespace-pre-wrap break-words px-1 py-1 text-left text-sm text-text"
        >
          {note.body}
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(note.id)}
        aria-label="Borrar nota"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        ✕
      </button>
    </li>
  )
}

/**
 * Notas rápidas tipo post-it, la más nueva primero. Ver docs/features/home.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').QuickNote[]} props.notes
 * @param {boolean} props.pendingRemoval - Hay una nota recién borrada que se puede deshacer.
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {(body: string) => Promise<string|null>} props.onCreate
 * @param {(id: string, body: string) => Promise<string|null>} props.onUpdate
 * @param {(id: string) => void} props.onRemove
 * @param {() => void} props.onUndoRemove
 * @param {string} [props.className]
 */
export function QuickNotes({ notes, pendingRemoval, loading, error, onCreate, onUpdate, onRemove, onUndoRemove, className = '' }) {
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  // Ref (no estado): el atajo Ctrl+Enter repetido llega antes del re-render, y
  // con `saving` solo se crearían notas duplicadas.
  const savingRef = useRef(false)

  async function save() {
    if (savingRef.current || !body.trim()) return
    savingRef.current = true
    setSaving(true)
    const createError = await onCreate(body)
    savingRef.current = false
    setSaving(false)
    if (!createError) setBody('')
  }

  return (
    <HomePanel title="Notas rápidas" error={error} className={className}>
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              save()
            }
          }}
          placeholder="Anotá algo…"
          maxLength={HOME_LIMITS.noteBody}
          rows={2}
          aria-label="Nueva nota"
          className={`${TEXTAREA} border-border`}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="hidden text-xs text-text-muted sm:inline">Ctrl+Enter para guardar</span>
          <Button onClick={save} disabled={saving || !body.trim()} className="ml-auto">
            Guardar
          </Button>
        </div>
      </div>

      {pendingRemoval && (
        <div
          role="status"
          className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
        >
          Nota borrada
          <button type="button" onClick={onUndoRemove} className="min-h-8 font-medium text-accent hover:text-accent-soft">
            Deshacer
          </button>
        </div>
      )}

      {loading && notes.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Cargando…</p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Sin notas por ahora.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </HomePanel>
  )
}
