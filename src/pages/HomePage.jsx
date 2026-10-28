import { useState } from 'react'
import { useHome } from '../hooks/useHome.js'
import { WeekSummary } from '../components/features/home/WeekSummary'
import { ContinueCard } from '../components/features/home/ContinueCard'
import { NextDateCard } from '../components/features/home/NextDateCard'
import { CalendarPanel } from '../components/features/home/CalendarPanel'
import { DateFormModal } from '../components/features/home/DateFormModal'
import { TaskList } from '../components/features/home/TaskList'
import { QuickNotes } from '../components/features/home/QuickNotes'
import { describeNextDate, formatLongDay, greetingFor } from '../lib/home/greeting.js'
import { daysUntil, parseDateKey } from '../lib/home/dates.js'
import { useI18n } from '../hooks/useI18n.js'

/**
 * Inicio (`/`, dentro del workspace, sin explorador ni tabs): saludo, seguí
 * donde dejaste, próxima fecha, la semana, tareas, calendario y notas, en una
 * grilla bento (ADR-018). Ver docs/features/home.md.
 *
 * El orden del DOM es el del celular (una columna); en `md` 2 columnas y en
 * `lg` 4, con "Seguí donde dejaste" como bloque protagonista de 2×2.
 */
export function HomePage() {
  const home = useHome()
  const { lang } = useI18n()
  /** Fecha abierta en el modal (alta si no tiene id), o null. */
  const [dateForm, setDateForm] = useState(/** @type {{id?: string, title: string, date: string}|null} */ (null))

  const openNewDate = (key) => setDateForm({ title: '', date: key })

  const next = home.dates.next
  const nextLine = next ? describeNextDate(next.title, daysUntil(next.date, home.todayKey), lang) : null

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{greetingFor(new Date(), lang)}</h1>
        <p className="mt-1 text-text-muted">
          {formatLongDay(parseDateKey(home.todayKey), lang)}
          {nextLine && <> — {nextLine}.</>}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <ContinueCard
          sheet={home.lastSheet.data}
          loading={home.lastSheet.loading}
          error={home.lastSheet.error}
          className="md:col-span-2 lg:row-span-2"
        />
        <NextDateCard
          date={home.dates.next}
          todayKey={home.todayKey}
          loading={home.dates.loading}
          error={home.dates.error}
          onAdd={() => openNewDate(home.todayKey)}
        />
        <WeekSummary
          summary={home.summary}
          loading={home.dates.loading || home.tasks.loading}
          failed={Boolean(home.dates.error || home.tasks.error)}
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
          className="md:col-span-2"
        />
        <CalendarPanel
          todayKey={home.todayKey}
          upcoming={home.dates.upcoming}
          markers={home.markers}
          loading={home.dates.loading}
          error={home.dates.error}
          onAddDate={openNewDate}
          onEditDate={(item) => setDateForm({ id: item.id, title: item.title, date: item.date })}
          className="md:col-span-2 lg:col-span-3"
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
          className="md:col-span-2 lg:col-span-1"
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
