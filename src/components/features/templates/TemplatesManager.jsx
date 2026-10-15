import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { TEMPLATE_CONTENT_MAX, TEMPLATE_NAME_MAX } from '../../../constants/sheetTemplates.js'

/**
 * Administrar las plantillas propias: renombrar, editar el texto y borrar.
 * Ver docs/features/sheet-templates.md.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('../../../types/models.js').SheetTemplate[]} props.templates - Solo las propias.
 * @param {(id: string, name: string) => Promise<string|null>} props.onRename
 * @param {(id: string, content: string) => Promise<string|null>} props.onUpdateContent
 * @param {(id: string) => Promise<string|null>} props.onDelete
 */
export function TemplatesManager({ open, onClose, templates, onRename, onUpdateContent, onDelete }) {
  const [selectedId, setSelectedId] = useState(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selected = templates.find((template) => template.id === selectedId) ?? null

  useEffect(() => {
    if (!open) return
    setSelectedId((current) => (templates.some((t) => t.id === current) ? current : (templates[0]?.id ?? null)))
  }, [open, templates])

  useEffect(() => {
    setName(selected?.name ?? '')
    setContent(selected?.content_md ?? '')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    const failure =
      (name !== selected.name ? await onRename(selected.id, name) : null) ??
      (content !== selected.content_md ? await onUpdateContent(selected.id, content) : null)
    setSaving(false)
    setError(failure)
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Tus plantillas">
        {templates.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no guardaste ninguna. Usá «Guardar como plantilla» en una hoja.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs text-text-muted">
              Plantilla
              <select
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-text-muted">
              Nombre
              <input
                value={name}
                maxLength={TEMPLATE_NAME_MAX}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text"
              />
            </label>
            <label className="block text-xs text-text-muted">
              Contenido (Markdown)
              <textarea
                value={content}
                maxLength={TEMPLATE_CONTENT_MAX}
                rows={10}
                onChange={(event) => setContent(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-text"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={!selected || saving}>
                Borrar
              </Button>
              <Button onClick={handleSave} disabled={!selected || saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hermano del Modal (no hijo): comparten z-50 y así queda siempre encima. */}
      <ConfirmDialog
        open={open && confirmDelete}
        title="Borrar plantilla"
        message={selected ? `Se borra la plantilla «${selected.name}». Las hojas creadas con ella no cambian.` : ''}
        confirmLabel="Borrar"
        onConfirm={async () => {
          setConfirmDelete(false)
          if (selected) setError(await onDelete(selected.id))
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
