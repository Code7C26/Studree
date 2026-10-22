import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStudy } from '../hooks/useStudy.js'
import { StudyItemRow } from '../components/features/study/StudyItemRow'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { studyPath, studyQuizPath, studySummaryPath } from '../constants/routes'
import { filterBySubject, subjectOptions } from '../lib/assistant/studyItems.js'

const TABS = [
  { id: 'resumenes', label: 'Resúmenes' },
  { id: 'examenes', label: 'Exámenes' },
]

/**
 * `/estudio`: resúmenes y exámenes guardados, con pestañas y filtro por materia.
 * Ver docs/features/study.md.
 */
export function StudyPage() {
  const { summaries, attempts, loading, error, remove } = useStudy()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'examenes' ? 'examenes' : 'resumenes'
  const subjectId = params.get('materia')
  const [confirm, setConfirm] = useState(/** @type {{kind: 'summary'|'quiz', id: string}|null} */ (null))
  const [removeError, setRemoveError] = useState(/** @type {string|null} */ (null))

  const isSummaries = tab === 'resumenes'
  const rows = isSummaries ? summaries : attempts
  const options = useMemo(() => subjectOptions(rows), [rows])
  // Una materia sin ítems en esta pestaña no filtra (evita una lista vacía sin salida).
  const activeSubject = options.some((o) => o.id === subjectId) ? subjectId : null
  const visible = useMemo(() => filterBySubject(rows, activeSubject), [rows, activeSubject])

  const go = (/** @type {{tab?: string, subjectId?: string|null}} */ next) => {
    const href = studyPath({
      tab: next.tab ?? tab,
      subjectId: next.subjectId === undefined ? activeSubject : next.subjectId,
    })
    const query = href.includes('?') ? href.slice(href.indexOf('?')) : ''
    setParams(new URLSearchParams(query))
  }

  async function handleConfirm() {
    const pending = confirm
    setConfirm(null)
    if (!pending) return
    const { error: failure } = await remove(pending.kind, pending.id)
    setRemoveError(failure)
  }

  const kind = isSummaries ? 'summary' : 'quiz'
  const noun = isSummaries ? 'resumen' : 'examen'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Mi estudio</h1>
      <p className="mt-1 text-sm text-text-muted">Los resúmenes y exámenes que hiciste con el Brote.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Mi estudio" className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`study-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="study-panel"
              onClick={() => go({ tab: t.id })}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === t.id ? 'bg-surface-2 font-medium text-accent-soft' : 'text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Materia
          <select
            value={activeSubject ?? ''}
            onChange={(e) => go({ subjectId: e.target.value || null })}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
          >
            <option value="">Todas las materias</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(error || removeError) && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {removeError ?? error}
        </p>
      )}

      <div role="tabpanel" id="study-panel" aria-labelledby={`study-tab-${tab}`} className="mt-4">
        {loading ? (
          <p className="mt-10 text-center text-text-muted">Cargando…</p>
        ) : visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Icon name="file-text" size={32} className="text-text-muted" />}
              title={isSummaries ? 'Sin resúmenes' : 'Sin exámenes'}
              message={
                isSummaries
                  ? 'Todavía no tenés resúmenes. Pedile uno al Brote con «Resumir materia».'
                  : 'Todavía no tenés exámenes. Pedile uno al Brote con «Tomame examen».'
              }
            />
          </div>
        ) : (
          <ul>
            {visible.map((row) => (
              <StudyItemRow
                key={row.id}
                to={isSummaries ? studySummaryPath(row.id) : studyQuizPath(row.id)}
                title={row.title}
                subjectName={row.subject?.name}
                createdAt={row.created_at}
                detail={isSummaries ? undefined : `${row.correct} de ${row.total}`}
                deleteLabel={`Borrar ${noun}: ${row.title}`}
                onDelete={() => setConfirm({ kind, id: row.id })}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={`Borrar ${noun}`}
        message={`¿Borrar este ${noun}? No se puede deshacer.`}
        confirmLabel="Borrar"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
