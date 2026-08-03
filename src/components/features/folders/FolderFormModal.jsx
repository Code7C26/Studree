import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { ColorPicker } from '../../ui/ColorPicker'
import { DEFAULT_COLOR } from '../../../constants/palette'

/**
 * Modal para crear o editar una carpeta (carrera/curso).
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('../../../types/models.js').Folder|null} [props.folder] - Si viene, es edición.
 * @param {(data: {name: string, color: string}) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export function FolderFormModal({ open, folder, onSubmit, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (open) {
      setName(folder?.name ?? '')
      setColor(folder?.color ?? DEFAULT_COLOR)
    }
  }, [open, folder])

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
      title={folder ? 'Editar carpeta' : 'Nueva carpeta'}
    >
      <form onSubmit={handleSubmit}>
        <TextField
          id="folder-name"
          label="Nombre (carrera o curso)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Tecnicatura en Programación"
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
          <Button type="submit">{folder ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
