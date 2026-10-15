import { useState } from 'react'
import { useHome } from '../hooks/useHome.js'
import { WeekSummary } from '../components/features/home/WeekSummary'
import { ContinueCard } from '../components/features/home/ContinueCard'
import { NextDateCard } from '../components/features/home/NextDateCard'
import { CalendarPanel } from '../components/features/home/CalendarPanel'
import { DateFormModal } from '../components/features/home/DateFormModal'
import { TaskList } from '../components/features/home/TaskList'
import { QuickNotes } from '../components/features/home/QuickNotes'

/**
 * Inicio (`/`, dentro del workspace): seguí donde dejaste, resumen de la
 * semana, próxima fecha, calendario, tareas y notas. Ver docs/features/home.md.
 *
 * El orden del DOM es el del celular (una columna). En desktop la grilla de 2
 * columnas ubica cada bloque con `md:col-start`/`md:row-start`.
 */
export function HomePage() {
  const home = useHome()
  /** Fecha abierta en el modal (alta si no tiene id), o null. */
  const [dateForm, setDateForm] = useState(/** @type {{id?: string, title: string, date: string}|null} */ (null))

  const openNewDate = (key) => setDateForm({ title: '', date: key })

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-3xl font-bold">Inicio</h1>

      <WeekSummary
        summary={home.summary}
        loading={home.dates.loading || home.tasks.loading}
        failed={Boolean(home.dates.error || home.tasks.error)}
      />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <ContinueCard
          sheet={home.lastSheet.data}
          loading={home.lastSheet.loading}
          error={home.lastSheet.error}
          className="md:col-start-1 md:row-start-1"
        />
        <NextDateCard
          date={home.dates.next}
          todayKey={home.todayKey}
          loading={home.dates.loading}
          error={home.dates.error}
          onAdd={() => openNewDate(home.todayKey)}
          className="md:col-start-2 md:row-start-1"
        />
        <TaskList
          pending={home.tasks.pending}
          done={home.tasks.done}
          todayKey={home.todayKey}
          loading={home.tasks.loading}
          error={home.tasks.error}
          onCreate={home.createTask}
          onToggle={home.toggleTask}
          onRename={home.renameTask}
          onDelete={home.deleteTask}
          className="md:col-start-2 md:row-start-2"
        />
        <CalendarPanel
          todayKey={home.todayKey}
          upcoming={home.dates.upcoming}
          markers={home.markers}
          loading={home.dates.loading}
          error={home.dates.error}
          onAddDate={openNewDate}
          onEditDate={(item) => setDateForm({ id: item.id, title: item.title, date: item.date })}
          className="md:col-start-1 md:row-span-2 md:row-start-2"
        />
        <QuickNotes
          notes={home.notes.items}
          pendingRemoval={home.notes.pendingRemoval}
          loading={home.notes.loading}
          error={home.notes.error}
          onCreate={home.createNote}
          onUpdate={home.updateNote}
          onRemove={home.removeNote}
          onUndoRemove={home.undoRemoveNote}
          className="md:col-start-2 md:row-start-3"
        />
      </div>

      {dateForm && (
        <DateFormModal
          initial={dateForm}
          onClose={() => setDateForm(null)}
          onSave={(values) => (dateForm.id ? home.updateDate(dateForm.id, values) : home.createDate(values))}
          onDelete={home.deleteDate}
        />
      )}
    </div>
  )
}
