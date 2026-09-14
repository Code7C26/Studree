import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCareerMap } from '../hooks/useCareerMap.js'
import { useEntityById } from '../hooks/useEntityById.js'
import { careersService } from '../services/careers.service.js'
import { CareerMap } from '../components/features/careerMap/CareerMap'
import { PrerequisiteEditor } from '../components/features/careerMap/PrerequisiteEditor'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { EmptyState } from '../components/ui/EmptyState'
import { ROUTES, subjectMapPath } from '../constants/routes'
import { computeCareerProgress } from '../lib/graph/subjectStatus.js'

/**
 * Canvas de materias + correlativas de una carrera. Ver docs/features/career-map.md.
 */
export function CareerMapPage() {
  const { careerId } = useParams()
  const navigate = useNavigate()
  const { entity: career, error: careerError } = useEntityById(
    careersService,
    careerId,
    'No se encontró la carrera.',
  )
  const {
    subjects,
    prerequisites,
    loading,
    error,
    createSubject,
    deleteSubject,
    setSubjectStatus,
    addPrerequisite,
    removePrerequisite,
  } = useCareerMap(careerId)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)

  /** @param {React.FormEvent} event */
  async function handleCreate(event) {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const failure = await createSubject({ name })
    if (!failure) setName('')
    setCreating(false)
  }

  if (careerError) {
    return (
      <div>
        <EmptyState title="Carrera no encontrada" message={careerError} />
        <Link to={ROUTES.careers} className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Volver a mis carreras
        </Link>
      </div>
    )
  }

  const progress = computeCareerProgress(subjects)

  return (
    <div>
      <Link to={ROUTES.careers} className="text-sm text-text-muted hover:text-text">
        ← Mis carreras
      </Link>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{career?.name ?? 'Cargando…'}</h1>
          <p className="text-sm text-text-muted">
            {progress.total > 0
              ? `${progress.approved}/${progress.total} materias aprobadas (${progress.percent}%)`
              : 'Materias de esta carrera.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          id="subject-name"
          label="Nueva materia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Análisis II"
          className="flex-1"
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creando…' : 'Agregar'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="mt-8 text-center text-text-muted">Cargando…</p>}

      {!loading && subjects.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Todavía no hay materias"
            message="Agregá tu primera materia para empezar a organizar sus unidades y temas."
          />
        </div>
      )}

      {subjects.length > 0 && (
        <div className="mt-8">
          <CareerMap
            subjects={subjects}
            prerequisites={prerequisites}
            onNavigateSubject={(id) => navigate(subjectMapPath(id))}
            onChangeStatus={setSubjectStatus}
            onEditPrerequisites={setEditingSubject}
            onDeleteSubject={deleteSubject}
          />
          {prerequisites.length === 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Las correlativas son opcionales: si no cargás ninguna, esta carrera funciona
              como un organizador simple de materias (sirve igual para cursos o
              capacitaciones sin requisitos entre sí).
            </p>
          )}
        </div>
      )}

      <PrerequisiteEditor
        open={editingSubject != null}
        onClose={() => setEditingSubject(null)}
        subject={editingSubject}
        subjects={subjects}
        prerequisites={prerequisites}
        onAdd={addPrerequisite}
        onRemove={removePrerequisite}
      />
    </div>
  )
}
