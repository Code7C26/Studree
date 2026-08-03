import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { ColorPicker } from '../../ui/ColorPicker'
import { DEFAULT_COLOR } from '../../../constants/palette'

/**
 * Modal para crear o editar una materia.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('../../../types/models.js').Subject|null} [props.subject] - Si viene, es edición.
 * @param {(data: {name: string, color: string}) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export function SubjectFormModal({ open, subject, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (open) {
      setName(subject?.name ?? '')
      setColor(subject?.color ?? DEFAULT_COLOR)
    }
  }, [open, subject])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed, color })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? 'Editar materia' : 'Nueva materia'}
    >
      <form onSubmit={handleSubmit}>
        <TextField
          id="subject-name"
          label="Nombre de la materia"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Algoritmos y Programación"
          autoFocus
        />
        <div className="mt-4">
          <span className="mb-1 block text-sm text-text-muted">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{subject ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
