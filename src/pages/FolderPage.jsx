import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSubjects } from '../hooks/useSubjects'
import { getFolder } from '../services/folders.service'
import { getAllNodes } from '../services/nodes.service'
import { SubjectCard } from '../components/features/subjects/SubjectCard'
import { SubjectFormModal } from '../components/features/subjects/SubjectFormModal'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ROUTES } from '../constants/routes'

/** Materias de una carpeta, con alta, edición y borrado. */
export function FolderPage() {
  const { folderId } = useParams()
  const folder = getFolder(folderId)
  const { subjects, loading, createSubject, updateSubject, removeSubject } =
    useSubjects(folderId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // Progreso (% temas completados) por materia.
  const progressBySubject = useMemo(() => {
    const allNodes = getAllNodes()
    /** @type {Record<string, number>} */
    const map = {}
    for (const subject of subjects) {
      const subjectNodes = allNodes.filter((node) => node.subjectId === subject.id)
      const done = subjectNodes.filter((node) => node.completed).length
      map[subject.id] = subjectNodes.length
        ? Math.round((done / subjectNodes.length) * 100)
        : 0
    }
    return map
  }, [subjects])

  if (!folder) {
    return (
      <p className="text-text-muted">
        Carpeta no encontrada.{' '}
        <Link to={ROUTES.folders} className="text-accent hover:underline">
          Volver a mis carpetas
        </Link>
      </p>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (subject) => {
    setEditing(subject)
    setFormOpen(true)
  }

  const handleSubmit = (data) => {
    if (editing) updateSubject(editing.id, data)
    else createSubject(data)
    setFormOpen(false)
  }

  const confirmDelete = () => {
    removeSubject(deleting.id)
    setDeleting(null)
  }

  return (
    <section>
      <nav className="mb-2 text-sm text-text-muted">
        <Link to={ROUTES.folders} className="hover:text-text">
          Carpetas
        </Link>{' '}
        <span className="px-1">›</span>
        <span className="text-text">{folder.name}</span>
      </nav>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{folder.name}</h1>
        {subjects.length > 0 && <Button onClick={openCreate}>＋ Nueva materia</Button>}
      </div>

      {loading ? (
        <p className="text-text-muted">Cargando…</p>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="🌳"
          title="Esta carpeta no tiene materias"
          message="Agregá las materias de esta carrera o curso. Cada una tendrá su mapa conceptual."
          action={<Button onClick={openCreate}>＋ Crear primera materia</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              progress={progressBySubject[subject.id] ?? 0}
              onEdit={() => openEdit(subject)}
              onDelete={() => setDeleting(subject)}
            />
          ))}
        </div>
      )}

      <SubjectFormModal
        open={formOpen}
        subject={editing}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar materia"
        message={`¿Seguro que querés eliminar "${deleting?.name}"? Se borrará también su mapa conceptual.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  )
}
