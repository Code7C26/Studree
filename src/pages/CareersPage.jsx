import { useCallback, useState } from 'react'
import { useCareers } from '../hooks/useCareers'
import { CareerCard } from '../components/features/careers/CareerCard'
import { CareerFormModal } from '../components/features/careers/CareerFormModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { UndoToast } from '../components/ui/UndoToast'
import { Button } from '../components/ui/Button'
import { ExportDialog } from '../components/features/export/ExportDialog'

/**
 * Workspace: panel de inicio con las carreras / cursos del usuario como
 * tarjetas grandes (no es un canvas: los nodos empiezan en las materias).
 * Ver docs/features/careers.md.
 */
export function CareersPage() {
  const { careers, stats, totals, loading, error, createCareer, updateCareer, deleteCareer, restoreCareer } =
    useCareers()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  /** Aviso "Deshacer" tras mandar una carrera a la papelera: `{message, careerId}`. */
  const [undo, setUndo] = useState(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(career) {
    setEditing(career)
    setFormOpen(true)
  }

  async function handleSubmit(values) {
    return editing ? updateCareer(editing.id, values) : createCareer(values)
  }

  async function handleConfirmDelete() {
    const career = deleting
    setDeleting(null)
    if (!career) return
    const failure = await deleteCareer(career.id)
    if (!failure) setUndo({ message: `"${career.name}" se movió a la papelera`, careerId: career.id })
  }

  const metrics = [
    { label: 'Carreras y cursos', value: totals.careers, icon: '🎓' },
    { label: 'Materias', value: totals.subjects, icon: '📘' },
    { label: 'Aprobadas', value: totals.approved, icon: '✅' },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis carreras</h1>
          <p className="mt-1 text-sm text-text-muted">Elegí una carrera o curso para ver y organizar sus materias.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setExportOpen(true)} disabled={careers.length === 0}>
            Exportar todo
          </Button>
          <button type="button" onClick={openCreate} className="btn-accent gap-2">
            <span aria-hidden="true">＋</span> Nueva carrera
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs text-text-muted">
              <span aria-hidden="true">{metric.icon}</span> {metric.label}
            </dt>
            <dd className="mt-1 text-2xl font-bold">{metric.value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && careers.length === 0 ? (
        <p className="mt-10 text-center text-text-muted">Cargando…</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <CareerCard
              key={career.id}
              career={career}
              stats={stats.get(career.id) ?? { approved: 0, total: 0, percent: 0 }}
              onEdit={() => openEdit(career)}
              onDelete={() => setDeleting(career)}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={openCreate}
              className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <span className="text-3xl" aria-hidden="true">
                ＋
              </span>
              <span className="text-sm font-medium">
                {careers.length === 0 ? 'Creá tu primera carrera o curso' : 'Nueva carrera o curso'}
              </span>
            </button>
          </li>
        </ul>
      )}

      <CareerFormModal open={formOpen} onClose={() => setFormOpen(false)} career={editing} onSubmit={handleSubmit} />

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      <ConfirmDialog
        open={deleting != null}
        title="Mover a la papelera"
        confirmLabel="Mover a la papelera"
        message={
          deleting
            ? `"${deleting.name}" se mueve a la papelera con todas sus materias y hojas. Podés restaurarla durante 30 días.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <UndoToast
        message={undo?.message ?? null}
        onUndo={() => {
          const careerId = undo?.careerId
          setUndo(null)
          if (careerId) restoreCareer(careerId)
        }}
        onClose={closeUndo}
      />
    </div>
  )
}
