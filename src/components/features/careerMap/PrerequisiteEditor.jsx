/**
 * Modal para editar las correlativas de una materia. Ver docs/features/career-map.md.
 */

import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { PREREQUISITE_KINDS, PREREQUISITE_KIND_META } from '../../../constants/prerequisiteKinds.js'

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('../../../types/models.js').Subject|null} props.subject - Materia que se está editando.
 * @param {import('../../../types/models.js').Subject[]} props.subjects - Todas las materias de la carrera.
 * @param {import('../../../types/models.js').Prerequisite[]} props.prerequisites - Todas las correlativas de la carrera.
 * @param {(values: {subject_id: string, requires_id: string, kind: string}) => Promise<string|null>} props.onAdd
 * @param {(id: string) => Promise<string|null>} props.onRemove
 */
export function PrerequisiteEditor({ open, onClose, subject, subjects, prerequisites, onAdd, onRemove }) {
  const [requiresId, setRequiresId] = useState('')
  const [kind, setKind] = useState(PREREQUISITE_KINDS.cursar)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!subject) return null

  const options = subjects.filter((candidate) => candidate.id !== subject.id)
  const namesById = new Map(subjects.map((candidate) => [candidate.id, candidate.name]))
  const current = prerequisites.filter((p) => p.subject_id === subject.id)

  /** @param {React.FormEvent} event */
  async function handleAdd(event) {
    event.preventDefault()
    if (!requiresId) return
    setSaving(true)
    const failure = await onAdd({ subject_id: subject.id, requires_id: requiresId, kind })
    setSaving(false)
    if (failure) {
      setError(failure)
    } else {
      setError(null)
      setRequiresId('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Correlativas de ${subject.name}`}>
      <form onSubmit={handleAdd} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-text-muted" htmlFor="prereq-subject">
            Requiere
          </label>
          <select
            id="prereq-subject"
            value={requiresId}
            onChange={(event) => setRequiresId(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none transition-colors focus:border-accent"
          >
            <option value="">Elegir materia…</option>
            {options.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          {Object.values(PREREQUISITE_KINDS).map((value) => (
            <label key={value} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
              {PREREQUISITE_KIND_META[value].label}
            </label>
          ))}
        </div>
        <p className="text-xs text-text-muted">{PREREQUISITE_KIND_META[kind].help}</p>

        {error && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!requiresId || saving} className="w-full">
          {saving ? 'Agregando…' : 'Agregar correlativa'}
        </Button>
      </form>

      {current.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Correlativas actuales</h3>
          <ul className="mt-2 space-y-1.5">
            {current.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {namesById.get(p.requires_id) ?? 'Materia eliminada'}
                  <span className="ml-1.5 text-xs text-text-muted">({PREREQUISITE_KIND_META[p.kind].label})</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label="Quitar correlativa"
                  className="shrink-0 p-1 text-text-muted transition-colors hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
