import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useSubjectMap } from '../hooks/useSubjectMap.js'
import { subjectsService } from '../services/subjects.service.js'
import { SubjectMap } from '../components/features/subjectMap/SubjectMap'
import { SheetListPanel } from '../components/features/sheets/SheetListPanel'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { EmptyState } from '../components/ui/EmptyState'
import { careerPath, sheetPath } from '../constants/routes'

/**
 * Canvas de materia: Unidades → Temas, con panel lateral de hojas por tema.
 * Ver docs/features/subject-map.md. El canvas corta en Tema a propósito: las
 * hojas viven en el panel, no como nodos (una materia real puede tener
 * cientos).
 */
export function SubjectMapPage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const { openTab } = useOutletContext()
  const [subject, setSubject] = useState(null)
  const [subjectError, setSubjectError] = useState(null)
  const { units, loading, error, createUnit, deleteUnit, createTopic, deleteTopic } = useSubjectMap(subjectId)
  const [unitName, setUnitName] = useState('')
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [topicUnitId, setTopicUnitId] = useState('')
  const [topicName, setTopicName] = useState('')
  const [creatingTopic, setCreatingTopic] = useState(false)
  const [openTopic, setOpenTopic] = useState(null)

  useEffect(() => {
    let cancelled = false
    subjectsService.get(subjectId).then(({ data, error: getError }) => {
      if (cancelled) return
      setSubject(data)
      setSubjectError(data ? null : (getError ?? 'No se encontró la materia.'))
    })
    return () => {
      cancelled = true
    }
  }, [subjectId])

  /** @param {React.FormEvent} event */
  async function handleCreateUnit(event) {
    event.preventDefault()
    if (!unitName.trim()) return
    setCreatingUnit(true)
    const failure = await createUnit({ name: unitName })
    if (!failure) setUnitName('')
    setCreatingUnit(false)
  }

  /** @param {React.FormEvent} event */
  async function handleCreateTopic(event) {
    event.preventDefault()
    if (!topicUnitId || !topicName.trim()) return
    setCreatingTopic(true)
    const failure = await createTopic(topicUnitId, { name: topicName })
    if (!failure) setTopicName('')
    setCreatingTopic(false)
  }

  function openSheet(sheet) {
    openTab(sheet.id, sheet.title)
    navigate(sheetPath(sheet.id))
  }

  if (subjectError) {
    return <EmptyState title="Materia no encontrada" message={subjectError} />
  }

  return (
    <div>
      {subject && (
        <Link to={careerPath(subject.career_id)} className="text-sm text-text-muted hover:text-text">
          ← Volver a la carrera
        </Link>
      )}

      <div className="mt-2">
        <h1 className="text-2xl font-bold">{subject?.name ?? 'Cargando…'}</h1>
        <p className="text-sm text-text-muted">Unidades y temas de esta materia.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleCreateUnit} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <TextField
            id="unit-name"
            label="Nueva unidad"
            value={unitName}
            onChange={(event) => setUnitName(event.target.value)}
            placeholder="Ej. Unidad 1"
            className="flex-1"
          />
          <Button type="submit" disabled={creatingUnit || !unitName.trim()}>
            {creatingUnit ? 'Creando…' : 'Agregar'}
          </Button>
        </form>

        {units.length > 0 && (
          <form onSubmit={handleCreateTopic} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="topic-unit" className="mb-1 block text-sm text-text-muted">
                Unidad
              </label>
              <select
                id="topic-unit"
                value={topicUnitId}
                onChange={(event) => setTopicUnitId(event.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none transition-colors focus:border-accent"
              >
                <option value="">Elegir unidad…</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              id="topic-name"
              label="Nuevo tema"
              value={topicName}
              onChange={(event) => setTopicName(event.target.value)}
              placeholder="Ej. Tema 1"
              className="flex-1"
            />
            <Button type="submit" variant="ghost" disabled={creatingTopic || !topicUnitId || !topicName.trim()}>
              {creatingTopic ? 'Creando…' : 'Agregar'}
            </Button>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="mt-8 text-center text-text-muted">Cargando…</p>}

      {!loading && units.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon="📁"
            title="Todavía no hay unidades"
            message="Agregá tu primera unidad para empezar a organizar los temas."
          />
        </div>
      )}

      {units.length > 0 && (
        <div className="mt-8">
          <SubjectMap
            units={units}
            onOpenTopic={(topic) => setOpenTopic(topic)}
            onDeleteUnit={deleteUnit}
            onDeleteTopic={deleteTopic}
          />
        </div>
      )}

      <SheetListPanel topic={openTopic} onClose={() => setOpenTopic(null)} onOpenSheet={openSheet} />
    </div>
  )
}
