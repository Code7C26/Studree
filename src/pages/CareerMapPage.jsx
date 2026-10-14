import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCareerMap } from '../hooks/useCareerMap.js'
import { CareerMap } from '../components/features/careerMap/CareerMap'
import { PrerequisiteEditor } from '../components/features/careerMap/PrerequisiteEditor'
import { PrerequisiteKindDialog } from '../components/features/careerMap/PrerequisiteKindDialog'
import { ExportDialog } from '../components/features/export/ExportDialog'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PromptDialog } from '../components/ui/PromptDialog'
import { ROUTES, subjectMapPath } from '../constants/routes'
import { computeCareerProgress } from '../lib/graph/subjectStatus.js'
import { PREREQUISITE_KIND_META } from '../constants/prerequisiteKinds.js'

/**
 * Canvas de materias (+ correlativas, si la carrera las usa) de una carrera.
 * Ver docs/features/career-map.md.
 */
export function CareerMapPage() {
  const { careerId } = useParams()
  const navigate = useNavigate()
  const {
    career,
    careerError,
    usesPrerequisites,
    subjects,
    prerequisites,
    loading,
    error,
    clearError,
    updateCareer,
    createSubject,
    deleteSubject,
    setSubjectStatus,
    addPrerequisite,
    removePrerequisite,
    moveSubjects,
    resetLayout,
  } = useCareerMap(careerId)

  const [editingSubject, setEditingSubject] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  /** @type {[{position: {x: number, y: number}|null, requires: Object|null}|null, Function]} */
  const [createRequest, setCreateRequest] = useState(null)
  const [pendingConnection, setPendingConnection] = useState(null)
  /** Lo que se está por borrar: `{type: 'subject'|'prerequisite', item}`. */
  const [pendingDelete, setPendingDelete] = useState(null)

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

  const handleNavigateSubject = useCallback((id) => navigate(subjectMapPath(id)), [navigate])
  const handleDeleteSubject = useCallback((subject) => setPendingDelete({ type: 'subject', item: subject }), [])
  const handleRemovePrerequisite = useCallback(
    (prerequisite) => setPendingDelete({ type: 'prerequisite', item: prerequisite }),
    [],
  )
  const handleMoveSubjects = useCallback((moves) => moveSubjects(moves), [moveSubjects])

  function handleConnect({ requiresId, subjectId }) {
    const requires = subjectsById.get(requiresId)
    const subject = subjectsById.get(subjectId)
    if (requires && subject) setPendingConnection({ requires, subject })
  }

  async function handleConfirmDelete() {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    if (target.type === 'subject') await deleteSubject(target.item.id)
    else await removePrerequisite(target.item.id)
  }

  function describePendingDelete() {
    if (!pendingDelete) return ''
    if (pendingDelete.type === 'subject') {
      return `Se va a eliminar "${pendingDelete.item.name}" con todas sus unidades, temas y hojas, y sus correlativas. No se puede deshacer.`
    }
    const p = pendingDelete.item
    const subjectName = subjectsById.get(p.subject_id)?.name ?? '¿?'
    const requiresName = subjectsById.get(p.requires_id)?.name ?? '¿?'
    return `"${subjectName}" deja de requerir "${requiresName}" (${PREREQUISITE_KIND_META[p.kind].label.toLowerCase()}).`
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
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link to={ROUTES.careers} className="text-sm text-text-muted hover:text-text">
            ← Mis carreras
          </Link>
          <div className="mt-1 flex items-center gap-3">
            {career && <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: career.color }} aria-hidden="true" />}
            <h1 className="truncate text-2xl font-bold">{career?.name ?? 'Cargando…'}</h1>
          </div>
          <p className="mt-0.5 text-sm text-text-muted">
            {progress.total > 0
              ? `${progress.approved}/${progress.total} materias aprobadas (${progress.percent}%)`
              : 'Todavía no hay materias.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {career && (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              title="Activalo si las materias tienen requisitos entre sí (carrera). Desactivalo para un curso u organizador."
            >
              <input
                type="checkbox"
                className="accent-accent"
                checked={usesPrerequisites}
                onChange={(event) => updateCareer({ uses_prerequisites: event.target.checked })}
              />
              Usa correlativas
            </label>
          )}
          <Button variant="ghost" onClick={() => setExportOpen(true)}>
            Exportar
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Cerrar aviso" className="shrink-0">
            ✕
          </button>
        </p>
      )}

      <div className="mt-4 min-h-0 flex-1">
        {loading && subjects.length === 0 ? (
          <p className="mt-8 text-center text-text-muted">Cargando…</p>
        ) : (
          <CareerMap
            subjects={subjects}
            prerequisites={prerequisites}
            usesPrerequisites={usesPrerequisites}
            onNavigateSubject={handleNavigateSubject}
            onChangeStatus={setSubjectStatus}
            onEditPrerequisites={setEditingSubject}
            onDeleteSubject={handleDeleteSubject}
            onRequestCreate={setCreateRequest}
            onConnect={handleConnect}
            onRemovePrerequisite={handleRemovePrerequisite}
            onMoveSubjects={handleMoveSubjects}
            onResetLayout={resetLayout}
          />
        )}
      </div>

      <PromptDialog
        open={createRequest != null}
        title={createRequest?.requires ? `Nueva materia después de ${createRequest.requires.name}` : 'Nueva materia'}
        label="Nombre"
        placeholder="Ej. Análisis II"
        onClose={() => setCreateRequest(null)}
        onSubmit={(name) =>
          createSubject({ name, position: createRequest?.position ?? null, requiresId: createRequest?.requires?.id ?? null })
        }
      >
        {createRequest?.requires && (
          <p className="text-xs text-text-muted">
            Va a quedar con <span className="text-text">{createRequest.requires.name}</span> como correlativa para cursar.
            Podés cambiarla después con 🔗.
          </p>
        )}
      </PromptDialog>

      <PrerequisiteKindDialog
        connection={pendingConnection}
        onClose={() => setPendingConnection(null)}
        onConfirm={(kind) =>
          addPrerequisite({ subject_id: pendingConnection.subject.id, requires_id: pendingConnection.requires.id, kind })
        }
      />

      <PrerequisiteEditor
        open={editingSubject != null}
        onClose={() => setEditingSubject(null)}
        subject={editingSubject}
        subjects={subjects}
        prerequisites={prerequisites}
        onAdd={addPrerequisite}
        onRemove={removePrerequisite}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        title={pendingDelete?.type === 'prerequisite' ? 'Quitar correlativa' : 'Eliminar materia'}
        message={describePendingDelete()}
        confirmLabel={pendingDelete?.type === 'prerequisite' ? 'Quitar' : 'Eliminar'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} careerId={careerId} />
    </div>
  )
}
