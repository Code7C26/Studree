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
import { UndoToast } from '../components/ui/UndoToast'
import { PromptDialog } from '../components/ui/PromptDialog'
import { ROUTES, subjectFolderPath } from '../constants/routes'
import { computeCareerProgress } from '../lib/graph/subjectStatus.js'
import { PREREQUISITE_KIND_META, PREREQUISITE_KINDS } from '../constants/prerequisiteKinds.js'
import { useI18n } from '../hooks/useI18n.js'

/**
 * Canvas de materias (+ correlativas, si la carrera las usa) de una carrera.
 * Ver docs/features/career-map.md.
 */
export function CareerMapPage() {
  const { careerId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
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
    restoreSubject,
    setSubjectStatus,
    addPrerequisite,
    removePrerequisite,
    moveSubjects,
    resetLayout,
    setSubjectYear,
  } = useCareerMap(careerId)

  const [editingSubject, setEditingSubject] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  /** @type {[{position: {x: number, y: number}|null, requires: Object|null}|null, Function]} */
  const [createRequest, setCreateRequest] = useState(null)
  const [pendingConnection, setPendingConnection] = useState(null)
  /** Lo que se está por borrar: `{type: 'subject'|'prerequisite', item}`. */
  const [pendingDelete, setPendingDelete] = useState(null)
  /** Aviso "Deshacer" tras mandar una materia a la papelera: `{message, subjectId}`. */
  const [undo, setUndo] = useState(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

  const handleNavigateSubject = useCallback((id) => navigate(subjectFolderPath(id)), [navigate])
  const handleDeleteSubject = useCallback((subject) => setPendingDelete({ type: 'subject', item: subject }), [])
  const handleRemovePrerequisite = useCallback(
    (prerequisite) => setPendingDelete({ type: 'prerequisite', item: prerequisite }),
    [],
  )
  const handleMoveSubjects = useCallback((moves) => moveSubjects(moves), [moveSubjects])

  function handleConnect({ requiresId, subjectId }) {
    const requires = subjectsById.get(requiresId)
    const subject = subjectsById.get(subjectId)
    if (!requires || !subject) return
    // Sin correlativas, unir dos materias es una relación: se crea directo, sin preguntar.
    if (!usesPrerequisites) {
      addPrerequisite({ subject_id: subject.id, requires_id: requires.id, kind: PREREQUISITE_KINDS.relacion })
      return
    }
    setPendingConnection({ requires, subject })
  }

  async function handleConfirmDelete() {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    if (target.type === 'subject') {
      const failure = await deleteSubject(target.item.id)
      if (!failure) setUndo({ message: t('trash.movedItem', { name: target.item.name }), subjectId: target.item.id })
    }
    else await removePrerequisite(target.item.id)
  }

  function describePendingDelete() {
    if (!pendingDelete) return ''
    if (pendingDelete.type === 'subject') {
      return t('careerMap.page.trashMessage', { name: pendingDelete.item.name })
    }
    const p = pendingDelete.item
    const subjectName = subjectsById.get(p.subject_id)?.name ?? t('careerMap.page.unknown')
    const requiresName = subjectsById.get(p.requires_id)?.name ?? t('careerMap.page.unknown')
    if (p.kind === PREREQUISITE_KINDS.relacion) {
      return t('careerMap.page.unrelateMessage', { subject: subjectName, requires: requiresName })
    }
    return t('careerMap.page.unlinkMessage', {
      subject: subjectName,
      requires: requiresName,
      kind: t(PREREQUISITE_KIND_META[p.kind].labelKey).toLowerCase(),
    })
  }

  if (careerError) {
    return (
      <div>
        <EmptyState title={t('careerMap.page.notFound')} message={careerError} />
        <Link to={ROUTES.careers} className="mt-4 inline-block text-sm text-accent hover:underline">
          {t('careerMap.page.backToCareers')}
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
            {t('careerMap.page.back')}
          </Link>
          <div className="mt-1 flex items-center gap-3">
            {career && <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: career.color }} aria-hidden="true" />}
            <h1 className="truncate text-2xl font-bold">{career?.name ?? t('common.loading')}</h1>
          </div>
          <p className="mt-0.5 text-sm text-text-muted">
            {progress.total > 0
              ? t('careerMap.page.progress', { approved: progress.approved, total: progress.total, percent: progress.percent })
              : t('careerMap.page.noSubjects')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {career && (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              title={t('careerMap.page.usesPrereqHint')}
            >
              <input
                type="checkbox"
                className="accent-accent"
                checked={usesPrerequisites}
                onChange={(event) => updateCareer({ uses_prerequisites: event.target.checked })}
              />
              {t('careerMap.page.usesPrereq')}
            </label>
          )}
          <Button variant="ghost" onClick={() => setExportOpen(true)}>
            {t('careerMap.page.export')}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start justify-between gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label={t('careerMap.page.dismiss')} className="shrink-0">
            ✕
          </button>
        </p>
      )}

      <div className="mt-4 min-h-0 flex-1">
        {loading && subjects.length === 0 ? (
          <p className="mt-8 text-center text-text-muted">{t('common.loading')}</p>
        ) : (
          <CareerMap
            subjects={subjects}
            prerequisites={prerequisites}
            usesPrerequisites={usesPrerequisites}
            careerName={career?.name ?? ''}
            onChangeYear={setSubjectYear}
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
        title={createRequest?.requires ? t('careerMap.page.newSubjectAfter', { name: createRequest.requires.name }) : t('careerMap.page.newSubject')}
        label={t('careerMap.page.nameLabel')}
        placeholder={t('careerMap.page.namePlaceholder')}
        onClose={() => setCreateRequest(null)}
        onSubmit={(name) =>
          createSubject({ name, position: createRequest?.position ?? null, requiresId: createRequest?.requires?.id ?? null })
        }
      >
        {createRequest?.requires && (
          <p className="text-xs text-text-muted">
            {t('careerMap.page.linkedBefore')} <span className="text-text">{createRequest.requires.name}</span>{' '}
            {t('careerMap.page.linkedAfter')}
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
        title={pendingDelete?.type === 'prerequisite' ? t('careerMap.page.unlinkTitle') : t('careerMap.page.trashTitle')}
        message={describePendingDelete()}
        confirmLabel={pendingDelete?.type === 'prerequisite' ? t('careerMap.page.unlinkConfirm') : t('careerMap.page.trashConfirm')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} careerId={careerId} />

      <UndoToast
        message={undo?.message ?? null}
        onUndo={() => {
          const subjectId = undo?.subjectId
          setUndo(null)
          if (subjectId) restoreSubject(subjectId)
        }}
        onClose={closeUndo}
      />
    </div>
  )
}
