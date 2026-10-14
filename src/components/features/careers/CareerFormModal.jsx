/**
 * Modal para crear o editar una carrera / curso. Ver docs/features/careers.md.
 */

import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { ColorPicker } from '../../ui/ColorPicker'
import { DEFAULT_COLOR } from '../../../constants/palette.js'

/** Las dos variantes de "carrera" (ADR-013). */
const KIND_OPTIONS = [
  {
    value: true,
    icon: '🔗',
    title: 'Carrera con correlativas',
    description: 'Materias con requisitos entre sí. Se ven bloqueos y el camino a seguir.',
  },
  {
    value: false,
    icon: '📚',
    title: 'Curso u organizador',
    description: 'Materias sueltas, sin requisitos. Ideal para cursos, capacitaciones o notas.',
  },
]

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('../../../types/models.js').Career|null} [props.career] - Si viene, edita; si no, crea.
 * @param {(values: {name: string, color: string, uses_prerequisites: boolean}) => Promise<string|null>} props.onSubmit
 */
export function CareerFormModal({ open, onClose, career = null, onSubmit }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [usesPrerequisites, setUsesPrerequisites] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(career?.name ?? '')
    setColor(career?.color ?? DEFAULT_COLOR)
    setUsesPrerequisites(career ? career.uses_prerequisites !== false : true)
    setError(null)
    setSaving(false)
  }, [open, career])

  /** @param {React.FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const failure = await onSubmit({ name: name.trim(), color, uses_prerequisites: usesPrerequisites })
    setSaving(false)
    if (failure) setError(failure)
    else onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={career ? 'Editar carrera' : 'Nueva carrera o curso'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="career-form-name"
          label="Nombre"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Licenciatura en Biología"
          autoFocus
        />

        <fieldset>
          <legend className="mb-2 text-sm text-text-muted">Tipo</legend>
          <div className="grid gap-2">
            {KIND_OPTIONS.map((option) => {
              const selected = usesPrerequisites === option.value
              return (
                <label
                  key={String(option.value)}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    selected ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="career-kind"
                    className="sr-only"
                    checked={selected}
                    onChange={() => setUsesPrerequisites(option.value)}
                  />
                  <span className="text-xl" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="block text-xs text-text-muted">{option.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
          {career && career.uses_prerequisites !== false && !usesPrerequisites && (
            <p className="mt-2 text-xs text-text-muted">
              Las correlativas que ya cargaste no se borran: solo se ocultan. Si volvés a activarlas, reaparecen.
            </p>
          )}
        </fieldset>

        <div>
          <span className="mb-2 block text-sm text-text-muted">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : career ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
