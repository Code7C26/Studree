/**
 * Cálculos del Inicio sobre fechas y tareas (ver docs/features/home.md).
 * Funciones puras: reciben las filas de Supabase y la clave de hoy.
 *
 * Las claves `YYYY-MM-DD` se comparan como strings: el orden alfabético es el
 * cronológico.
 */

import { addDays } from './dates.js'

/**
 * @typedef {{id: string, title: string, date: string, created_at?: string}} ImportantDate
 * @typedef {{id: string, text: string, due_date: string|null, done_at: string|null, created_at?: string}} Task
 */

/** @param {ImportantDate} a @param {ImportantDate} b */
const byDate = (a, b) => a.date.localeCompare(b.date) || (a.created_at ?? '').localeCompare(b.created_at ?? '')

/** @param {Task} task */
const isPending = (task) => !task.done_at

/**
 * @param {Task} task
 * @param {string} todayKey
 * @returns {boolean} Pendiente y con fecha límite anterior a hoy.
 */
export function isOverdue(task, todayKey) {
  return isPending(task) && Boolean(task.due_date) && task.due_date < todayKey
}

/**
 * Fechas de hoy en adelante, de la más cercana a la más lejana.
 * @param {ImportantDate[]} dates
 * @param {string} todayKey
 * @param {number} [limit=8]
 * @returns {ImportantDate[]}
 */
export function upcomingDates(dates, todayKey, limit = 8) {
  return dates.filter((item) => item.date >= todayKey).sort(byDate).slice(0, limit)
}

/**
 * @param {ImportantDate[]} dates
 * @param {string} todayKey
 * @returns {ImportantDate|null}
 */
export function pickNextDate(dates, todayKey) {
  return upcomingDates(dates, todayKey, 1)[0] ?? null
}

/**
 * "Esta semana" = los próximos 7 días (hoy a hoy+6).
 * @param {{dates: ImportantDate[], tasks: Task[], todayKey: string}} input
 * @returns {{dates: number, tasks: number, overdue: number}}
 */
export function buildWeekSummary({ dates, tasks, todayKey }) {
  const end = addDays(todayKey, 6)
  /** @param {string} key */
  const inWeek = (key) => key >= todayKey && key <= end
  return {
    dates: dates.filter((item) => inWeek(item.date)).length,
    tasks: tasks.filter((task) => isPending(task) && task.due_date && inWeek(task.due_date)).length,
    overdue: tasks.filter((task) => isOverdue(task, todayKey)).length,
  }
}

/** @param {number} count @param {string} one @param {string} many */
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

/**
 * Texto del resumen, en partes para que la UI pinte en rojo las vencidas.
 * @param {{dates: number, tasks: number, overdue: number}} summary
 * @returns {{calm: boolean, parts: Array<{text: string, danger: boolean}>}}
 */
export function describeWeekSummary({ dates, tasks, overdue }) {
  const parts = [
    { text: plural(dates, 'fecha', 'fechas'), danger: false },
    { text: plural(tasks, 'tarea', 'tareas'), danger: false },
  ]
  if (overdue > 0) parts.push({ text: plural(overdue, 'vencida', 'vencidas'), danger: true })
  return { calm: dates === 0 && tasks === 0 && overdue === 0, parts }
}

/**
 * Pendientes: primero las que tienen fecha límite (la más próxima arriba),
 * después las que no, por orden de creación.
 * @param {Task[]} tasks
 * @returns {Task[]}
 */
export function sortPendingTasks(tasks) {
  return tasks.filter(isPending).sort((a, b) => {
    if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1
    return (a.created_at ?? '').localeCompare(b.created_at ?? '')
  })
}

/**
 * Hechas: la última tildada arriba.
 * @param {Task[]} tasks
 * @returns {Task[]}
 */
export function sortDoneTasks(tasks) {
  return tasks.filter((task) => !isPending(task)).sort((a, b) => b.done_at.localeCompare(a.done_at))
}

/**
 * Qué marcar en cada día de la grilla: fechas importantes y tareas PENDIENTES
 * que vencen ese día.
 * @param {ImportantDate[]} dates
 * @param {Task[]} tasks
 * @returns {Map<string, {dates: boolean, tasks: boolean}>}
 */
export function buildDayMarkers(dates, tasks) {
  const markers = new Map()
  /** @param {string} key */
  const markerFor = (key) => {
    if (!markers.has(key)) markers.set(key, { dates: false, tasks: false })
    return markers.get(key)
  }
  for (const item of dates) markerFor(item.date).dates = true
  for (const task of tasks) if (isPending(task) && task.due_date) markerFor(task.due_date).tasks = true
  return markers
}
