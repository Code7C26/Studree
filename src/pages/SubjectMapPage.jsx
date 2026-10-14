import { useCallback, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useSubjectMap } from '../hooks/useSubjectMap.js'
import { SubjectMap } from '../components/features/subjectMap/SubjectMap'
import { SheetListPanel } from '../components/features/sheets/SheetListPanel'
import { ExportDialog } from '../components/features/export/ExportDialog'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PromptDialog } from '../components/ui/PromptDialog'
import { careerPath, sheetPath } from '../constants/routes'

/**
 * Canvas de materia: Materia → Unidades → Temas, con panel lateral de hojas
 * por tema. Ver docs/features/subject-map.md. El canvas corta en Tema a
 * propósito: las hojas viven en el panel, no como nodos (una materia real
 * puede tener cientos).
 */
export function SubjectMapPage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const { openTab } = useOutletContext()
  const {
    subject,
    subjectError,
    units,
    loading,
    error,
    clearError,
    createUnit,
    deleteUnit,
    createTopic,
    deleteTopic,
    moveNodes,
    resetLayout,
  } = useSubjectMap(subjectId)

  const [openTopic, setOpenTopic] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  /** @type {[{kind: 'unit'|'topic', unit?: Object, position: {x: number, y: number}|null}|null, Function]} */
  const [createRequest, setCreateRequest] = useState(null)
  /** Lo que se está por borrar: `{type: 'unit'|'topic', unit, topic?}`. */
  const [pendingDelete, setPendingDelete] = useState(null)

  const handleOpenTopic = useCallback((topic) => setOpenTopic(topic), [])
  const handleDeleteUnit = useCallback((unit) => setPendingDelete({ type: 'unit', unit }), [])
  const handleDeleteTopic = useCallback((unit, topic) => setPendingDelete({ type: 'topic', unit, topic }), [])
  const handleMoveNodes = useCallback(
    (moves) => moveNodes(moves.map(({ id, x, y }) => ({ nodeId: id, x, y }))),
    [moveNodes],
  )

  function openSheet(sheet) {
    openTab(sheet.id, sheet.title)
    navigate(sheetPath(sheet.id))
  }

  async function handleCreate(name) {
    if (!createRequest) return null
    if (createRequest.kind === 'unit') return createUnit({ name, position: createRequest.position })
    return createTopic(createRequest.unit.id, { name, position: createRequest.position })
  }

  async function handleConfirmDelete() {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    if (target.type === 'unit') {
      await deleteUnit(target.unit.id)
    } else {
      await deleteTopic(target.unit.id, target.topic.id)
      if (openTopic?.id === target.topic.id) setOpenTopic(null)
    }
  }

  if (subjectError) {
    return <EmptyState title="Materia no encontrada" message={subjectError} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {subject && (
            <Link to={careerPath(subject.career_id)} className="text-sm text-text-muted hover:text-text">
              ← Volver a la carrera
            </Link>
          )}
          <h1 className="mt-1 truncate text-2xl font-bold">{subject?.name ?? 'Cargando…'}</h1>
          <p className="mt-0.5 text-sm text-text-muted">Unidades y temas de esta materia.</p>
        </div>
        <Button variant="ghost" onClick={() => setExportOpen(true)} disabled={!subject}>
          Exportar
        </Button>
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
        {loading || !subject ? (
          <p className="mt-8 text-center text-text-muted">Cargando…</p>
        ) : (
          <SubjectMap
            subject={subject}
            units={units}
            onOpenTopic={handleOpenTopic}
            onDeleteUnit={handleDeleteUnit}
            onDeleteTopic={handleDeleteTopic}
            onRequestCreate={setCreateRequest}
            onMoveNodes={handleMoveNodes}
            onResetLayout={resetLayout}
          />
        )}
      </div>

      <PromptDialog
        open={createRequest != null}
        title={createRequest?.kind === 'topic' ? `Nuevo tema en ${createRequest.unit.name}` : 'Nueva unidad'}
        label="Nombre"
        placeholder={createRequest?.kind === 'topic' ? 'Ej. Derivadas' : 'Ej. Unidad 1'}
        onClose={() => setCreateRequest(null)}
        onSubmit={handleCreate}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        title={pendingDelete?.type === 'topic' ? 'Eliminar tema' : 'Eliminar unidad'}
        message={
          pendingDelete?.type === 'topic'
            ? `Se va a eliminar el tema "${pendingDelete.topic.name}" con todas sus hojas. No se puede deshacer.`
            : pendingDelete
              ? `Se va a eliminar la unidad "${pendingDelete.unit.name}" con todos sus temas y hojas. No se puede deshacer.`
              : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SheetListPanel topic={openTopic} onClose={() => setOpenTopic(null)} onOpenSheet={openSheet} />

      {subject && (
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          careerId={subject.career_id}
          subjectId={subjectId}
        />
      )}
    </div>
  )
}
