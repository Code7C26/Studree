import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { TextField } from './TextField'

/**
 * Diálogo para pedir un nombre (crear un nodo desde el canvas, etc.).
 * Se resetea cada vez que se abre.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.label
 * @param {string} [props.placeholder]
 * @param {string} [props.submitLabel]
 * @param {(value: string) => Promise<string|null>} props.onSubmit - Devuelve un error o null.
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.children] - Campos extra debajo del input.
 */
export function PromptDialog({ open, title, label, placeholder, submitLabel = 'Crear', onSubmit, onClose, children }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue('')
      setError(null)
      setSaving(false)
    }
  }, [open])

  /** @param {React.FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    if (!value.trim()) return
    setSaving(true)
    const failure = await onSubmit(value.trim())
    setSaving(false)
    if (failure) setError(failure)
    else onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          id="prompt-dialog-input"
          label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          autoFocus
        />
        {children}
        {error && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !value.trim()}>
            {saving ? 'Guardando…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
