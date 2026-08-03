import { useState } from 'react'
import { useFolders } from '../hooks/useFolders'
import { getAllSubjects } from '../services/subjects.service'
import { FolderCard } from '../components/features/folders/FolderCard'
import { FolderFormModal } from '../components/features/folders/FolderFormModal'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

/** Lista de carpetas (carreras/cursos) con alta, edición y borrado. */
export function FoldersPage() {
  const { folders, loading, createFolder, updateFolder, removeFolder } = useFolders()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const allSubjects = getAllSubjects()
  const countFor = (folderId) =>
    allSubjects.filter((subject) => subject.folderId === folderId).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (folder) => {
    setEditing(folder)
    setFormOpen(true)
  }

  const handleSubmit = (data) => {
    if (editing) updateFolder(editing.id, data)
    else createFolder(data)
    setFormOpen(false)
  }

  const confirmDelete = () => {
    removeFolder(deleting.id)
    setDeleting(null)
  }

  if (loading) return <p className="text-text-muted">Cargando…</p>

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis carreras y cursos</h1>
          <p className="text-sm text-text-muted">Organizá tus materias por carpeta.</p>
        </div>
        {folders.length > 0 && <Button onClick={openCreate}>＋ Nueva carpeta</Button>}
      </div>

      {folders.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Todavía no tenés carpetas"
          message="Creá una carpeta por cada carrera o curso para empezar a organizar tus materias."
          action={<Button onClick={openCreate}>＋ Crear primera carpeta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              subjectCount={countFor(folder.id)}
              onEdit={() => openEdit(folder)}
              onDelete={() => setDeleting(folder)}
            />
          ))}
        </div>
      )}

      <FolderFormModal
        open={formOpen}
        folder={editing}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar carpeta"
        message={`¿Seguro que querés eliminar "${deleting?.name}"? Se borrarán también sus materias y sus mapas.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  )
}
