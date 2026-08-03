import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'

/**
 * Modal para agregar un tema al mapa, eligiendo opcionalmente su tema padre.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('../../../types/models.js').TreeNode[]} props.nodes - Posibles padres.
 * @param {string|null} props.defaultParentId
 * @param {(data: {label: string, parentId: string|null}) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export function TopicFormModal({ open, nodes, defaultParentId, onSubmit, onClose }) {
  const [label, setLabel] = useState('')
  const [parentId, setParentId] = useState('')

  useEffect(() => {
    if (open) {
      setLabel('')
      setParentId(defaultParentId ?? '')
    }
  }, [open, defaultParentId])

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) return
    onSubmit({ label: trimmed, parentId: parentId || null })
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar tema">
      <form onSubmit={handleSubmit}>
        <TextField
          id="topic-label"
          label="Nombre del tema"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ej: Estructuras de Datos"
          autoFocus
        />
        <div className="mt-4">
          <label htmlFor="topic-parent" className="mb-1 block text-sm text-text-muted">
            Tema padre (opcional)
          </label>
          <select
            id="topic-parent"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          >
            <option value="">— Sin padre (raíz) —</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Agregar</Button>
        </div>
      </form>
    </Modal>
  )
}
