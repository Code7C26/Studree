import { useCallback, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useSubjectMap } from '../hooks/useSubjectMap.js'
import { SubjectMap } from '../components/features/subjectMap/SubjectMap'
import { SheetList } from '../components/features/subjectMap/SheetList'
import { ExportDialog } from '../components/features/export/ExportDialog'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PromptDialog } from '../components/ui/PromptDialog'
import { careerPath, sheetPath } from '../constants/routes'

const VIEWS = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'list', label: 'Lista' },
]

/**
 * Canvas de materia (ADR-014): las HOJAS como nodos, conectadas por sus
 * `[[links]]` (ADR-015), con una vista Lista alternativa. Ver
 * docs/features/subject-map.md.
 */
export function SubjectMapPage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const { openTab } = useOutletContext()
  const {
    subject,
    subjectError,
    sheets,
    links,
    loading,
    error,
    clearError,
    createSheet,
    deleteSheet,
    connect,
    disconnect,
    moveNodes,
    resetLayout,
  } = useSubjectMap(subjectId)

  const [view, setView] = useState('canvas')
  const [exportOpen, setExportOpen] = useState(false)
  /** @type {[{position: {x: number, y: number}|null, linkFrom: Object|null}|null, Function]} */
  const [createRequest, setCreateRequest] = useState(null)
  /** Lo que se está por borrar: `{type: 'sheet'|'link', item}`. */
  const [pendingDelete, setPendingDelete] = useState(null)

  const sheetsById = new Map(sheets.map((sheet) => [sheet.id, sheet]))

  const openSheet = useCallback(
    (sheet) => {
      openTab(sheet.id, sheet.title)
      navigate(sheetPath(sheet.id))
    },
    [openTab, navigate],
  )
  const handleDeleteSheet = useCallback((sheet) => setPendingDelete({ type: 'sheet', item: sheet }), [])
  const handleRemoveLink = useCallback((link) => setPendingDelete({ type: 'link', item: link }), [])

  async function handleConfirmDelete() {
    const target = pendingDelete
    setPendingDelete(null)
    if (!target) return
    if (target.type === 'sheet') await deleteSheet(target.item.id)
    else await disconnect(target.item)
  }

  function describePendingDelete() {
    if (!pendingDelete) return ''
    if (pendingDelete.type === 'sheet') {
      return `Se va a eliminar "${pendingDelete.item.title}" y todo su contenido. Los [[enlaces]] que apuntaban a ella quedan como texto. No se puede deshacer.`
    }
    const source = sheetsById.get(pendingDelete.item.source_id)?.title ?? '¿?'
    const target = sheetsById.get(pendingDelete.item.target_id)?.title ?? '¿?'
    return `Se quita el enlace [[${target}]] del contenido de "${source}". El texto queda, sin link.`
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
          <p className="mt-0.5 text-sm text-text-muted">
            {sheets.length === 0
              ? 'Todavía no hay hojas.'
              : `${sheets.length} hoja${sheets.length === 1 ? '' : 's'} · ${links.length} enlace${links.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Vista" className="flex rounded-lg border border-border p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={view === option.id}
                onClick={() => setView(option.id)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  view === option.id ? 'bg-surface-2 text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {view === 'list' && (
            <Button onClick={() => setCreateRequest({ position: null, linkFrom: null })} disabled={!subject}>
              ＋ Hoja
            </Button>
          )}
          <Button variant="ghost" onClick={() => setExportOpen(true)} disabled={!subject}>
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
        {loading || !subject ? (
          <p className="mt-8 text-center text-text-muted">Cargando…</p>
        ) : view === 'canvas' ? (
          <SubjectMap
            sheets={sheets}
            links={links}
            onOpenSheet={openSheet}
            onDeleteSheet={handleDeleteSheet}
            onRequestCreate={setCreateRequest}
            onConnect={connect}
            onRemoveLink={handleRemoveLink}
            onMoveNodes={moveNodes}
            onResetLayout={resetLayout}
          />
        ) : (
          <SheetList sheets={sheets} onOpenSheet={openSheet} onDeleteSheet={handleDeleteSheet} />
        )}
      </div>

      <PromptDialog
        open={createRequest != null}
        title={createRequest?.linkFrom ? `Nueva hoja enlazada desde ${createRequest.linkFrom.title}` : 'Nueva hoja'}
        label="Título"
        placeholder="Ej. Resumen clase 1"
        onClose={() => setCreateRequest(null)}
        onSubmit={(title) =>
          createSheet({ title, position: createRequest?.position ?? null, linkFrom: createRequest?.linkFrom ?? null })
        }
      >
        {createRequest?.linkFrom && (
          <p className="text-xs text-text-muted">
            Se agrega <span className="text-text">[[título]]</span> al final de{' '}
            <span className="text-text">{createRequest.linkFrom.title}</span>.
          </p>
        )}
      </PromptDialog>

      <ConfirmDialog
        open={pendingDelete != null}
        title={pendingDelete?.type === 'link' ? 'Quitar enlace' : 'Eliminar hoja'}
        message={describePendingDelete()}
        confirmLabel={pendingDelete?.type === 'link' ? 'Quitar' : 'Eliminar'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

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
