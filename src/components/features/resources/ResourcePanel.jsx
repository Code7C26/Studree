import { useState } from 'react'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { ResourceItem } from './ResourceItem'
import { ResourceFormModal } from './ResourceFormModal'
import { useResources } from '../../../hooks/useResources'

/**
 * Panel lateral con los recursos de un tema (nodo).
 * @param {Object} props
 * @param {import('../../../types/models.js').TreeNode|null} props.node
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onChanged] - Aviso al padre tras crear/editar/borrar.
 */
export function ResourcePanel({ node, open, onClose, onChanged }) {
  const { resources, addResource, editResource, removeResource } = useResources(node?.id)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (resource) => {
    setEditing(resource)
    setFormOpen(true)
  }

  const handleSubmit = (data) => {
    if (editing) editResource(editing.id, data)
    else addResource(data)
    setFormOpen(false)
    onChanged?.()
  }

  const confirmDelete = () => {
    removeResource(deleting.id)
    setDeleting(null)
    onChanged?.()
  }

  return (
    <Drawer open={open} onClose={onClose} title={node ? node.label : 'Recursos'}>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>＋ Agregar recurso</Button>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon="📎"
          title="Sin recursos todavía"
          message="Agregá apuntes, enlaces o videos para este tema."
        />
      ) : (
        <ul className="space-y-2">
          {resources.map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              onEdit={() => openEdit(resource)}
              onDelete={() => setDeleting(resource)}
            />
          ))}
        </ul>
      )}

      <ResourceFormModal
        open={formOpen}
        resource={editing}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar recurso"
        message={`¿Seguro que querés eliminar "${deleting?.title}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Drawer>
  )
}
