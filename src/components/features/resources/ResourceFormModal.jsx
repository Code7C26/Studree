import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { RESOURCE_TYPES, RESOURCE_TYPE_LIST } from '../../../constants/resourceTypes'

/**
 * Modal para crear o editar un recurso.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {import('../../../types/models.js').Resource|null} [props.resource] - Edición si viene.
 * @param {(data: {type: string, title: string, content: string}) => void} props.onSubmit
 * @param {() => void} props.onClose
 */
export function ResourceFormModal({ open, resource, onSubmit, onClose }) {
  const [type, setType] = useState('note')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (open) {
      setType(resource?.type ?? 'note')
      setTitle(resource?.title ?? '')
      setContent(resource?.content ?? '')
    }
  }, [open, resource])

  const meta = RESOURCE_TYPES[type] ?? RESOURCE_TYPES.note

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!trimmedTitle || !trimmedContent) return
    onSubmit({ type, title: trimmedTitle, content: trimmedContent })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource ? 'Editar recurso' : 'Agregar recurso'}
    >
      <form onSubmit={handleSubmit}>
        <div>
          <span className="mb-1 block text-sm text-text-muted">Tipo</span>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPE_LIST.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setType(item.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  type === item.value
                    ? 'border-accent bg-accent/15 text-text'
                    : 'border-border text-text-muted hover:text-text'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>

        <TextField
          id="resource-title"
          label="Título"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej: Apunte de la unidad 1"
          autoFocus
          className="mt-4"
        />

        <div className="mt-4">
          <label htmlFor="resource-content" className="mb-1 block text-sm text-text-muted">
            {meta.isUrl ? 'Enlace (URL)' : 'Contenido'}
          </label>
          {meta.isUrl ? (
            <input
              id="resource-content"
              type="url"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={meta.placeholder}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          ) : (
            <textarea
              id="resource-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={meta.placeholder}
              rows={5}
              className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">{resource ? 'Guardar' : 'Agregar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
