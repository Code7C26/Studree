/**
 * Estado y acciones del Inicio (ver docs/features/home.md).
 *
 * Cada bloque (última hoja, fechas, tareas, notas) carga y falla POR SEPARADO:
 * si falta la migración 0005, "Seguí donde dejaste" sigue funcionando.
 * Las escrituras son optimistas en la UI: se aplica el cambio local, se manda al
 * service y, si falla, se recarga ese bloque desde el servidor y se muestra el
 * error.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { homeService } from '../services/home.service.js'
import { importantDatesService } from '../services/importantDates.service.js'
import { tasksService } from '../services/tasks.service.js'
import { quickNotesService } from '../services/quickNotes.service.js'
import { toDateKey } from '../lib/home/dates.js'
import {
  buildDayMarkers,
  buildWeekSummary,
  pickNextDate,
  sortDoneTasks,
  sortPendingTasks,
  upcomingDates,
} from '../lib/home/summary.js'

/** Cuánto se puede deshacer el borrado de una nota. */
const UNDO_MS = 5000

/**
 * Una colección del Inicio: carga (cache primero) + `mutate` optimista.
 * @param {{list: Function}} service - Constante de módulo (identidad estable).
 */
function useCollection(service) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    const { data, error: loadError } = await service.list(undefined, (cached) => {
      setItems(cached)
      setLoading(false)
    })
    setItems(data ?? [])
    setError(loadError)
    setLoading(false)
  }, [service])

  useEffect(() => {
    reload()
  }, [reload])

  /**
   * @param {((current: Object[]) => Object[])|null} applyLocal - Cambio optimista (o null).
   * @param {() => Promise<{data: any, error: string|null}>} write
   * @returns {Promise<{data: any, error: string|null}>}
   */
  const mutate = useCallback(
    async (applyLocal, write) => {
      if (applyLocal) setItems(applyLocal)
      const result = await write()
      if (result.error) {
        await reload()
        setError(result.error)
        return result
      }
      setError(null)
      return result
    },
    [reload],
  )

  return { items, setItems, loading, error, mutate }
}

/** @param {string} id @param {Object} data */
const replaceById = (id, data) => (current) => current.map((item) => (item.id === id ? data : item))

/**
 * @typedef {import('../types/models.js').ImportantDate} ImportantDate
 * @typedef {import('../types/models.js').Task} Task
 * @typedef {import('../types/models.js').QuickNote} QuickNote
 * @typedef {import('../types/models.js').LastSheet} LastSheet
 */

/**
 * Todas las acciones devuelven `null` si salió bien o el mensaje de error.
 * @returns {{
 *   todayKey: string,
 *   lastSheet: {data: LastSheet|null, loading: boolean, error: string|null},
 *   dates: {items: ImportantDate[], upcoming: ImportantDate[], next: ImportantDate|null, loading: boolean, error: string|null},
 *   tasks: {pending: Task[], done: Task[], loading: boolean, error: string|null},
 *   notes: {items: QuickNote[], pendingRemoval: boolean, loading: boolean, error: string|null},
 *   summary: {dates: number, tasks: number, overdue: number},
 *   markers: Map<string, {dates: boolean, tasks: boolean}>,
 *   createDate: (values: {title: string, date: string}) => Promise<string|null>,
 *   updateDate: (id: string, values: {title: string, date: string}) => Promise<string|null>,
 *   deleteDate: (id: string) => Promise<string|null>,
 *   createTask: (values: {text: string, due_date: string|null}) => Promise<string|null>,
 *   toggleTask: (id: string, done: boolean) => Promise<string|null>,
 *   renameTask: (id: string, text: string) => Promise<string|null>,
 *   deleteTask: (id: string) => Promise<string|null>,
 *   createNote: (body: string) => Promise<string|null>,
 *   updateNote: (id: string, body: string) => Promise<string|null>,
 *   removeNote: (id: string) => void,
 *   undoRemoveNote: () => void,
 * }}
 */
export function useHome() {
  const todayKey = toDateKey(new Date())

  // --- Seguí donde dejaste -------------------------------------------------
  const [lastSheet, setLastSheet] = useState({ data: null, loading: true, error: null })
  useEffect(() => {
    let active = true
    homeService
      .getLastEditedSheet((cached) => {
        if (active) setLastSheet({ data: cached, loading: false, error: null })
      })
      .then(({ data, error }) => {
        if (active) setLastSheet({ data, loading: false, error })
      })
    return () => {
      active = false
    }
  }, [])

  const dates = useCollection(importantDatesService)
  const tasks = useCollection(tasksService)
  const notes = useCollection(quickNotesService)
  const { mutate: mutateDates, setItems: setDates } = dates
  const { mutate: mutateTasks, setItems: setTasks } = tasks
  const { mutate: mutateNotes, setItems: setNotes } = notes

  // --- Fechas ---------------------------------------------------------------
  const createDate = useCallback(
    async (values) => {
      const { data, error } = await mutateDates(null, () => importantDatesService.create(values))
      if (data) setDates((current) => [...current, data])
      return error
    },
    [mutateDates, setDates],
  )

  const updateDate = useCallback(
    async (id, values) => {
      const { data, error } = await mutateDates(
        (current) => current.map((item) => (item.id === id ? { ...item, ...values } : item)),
        () => importantDatesService.update(id, values),
      )
      if (data) setDates(replaceById(id, data))
      return error
    },
    [mutateDates, setDates],
  )

  const deleteDate = useCallback(
    async (id) =>
      (await mutateDates((current) => current.filter((item) => item.id !== id), () => importantDatesService.remove(id)))
        .error,
    [mutateDates],
  )

  // --- Tareas ---------------------------------------------------------------
  const createTask = useCallback(
    async (values) => {
      const { data, error } = await mutateTasks(null, () => tasksService.create(values))
      if (data) setTasks((current) => [...current, data])
      return error
    },
    [mutateTasks, setTasks],
  )

  const toggleTask = useCallback(
    async (id, done) => {
      const optimisticDoneAt = done ? new Date().toISOString() : null
      const { data, error } = await mutateTasks(
        (current) => current.map((task) => (task.id === id ? { ...task, done_at: optimisticDoneAt } : task)),
        () => tasksService.setDone(id, done),
      )
      if (data) setTasks(replaceById(id, data))
      return error
    },
    [mutateTasks, setTasks],
  )

  const renameTask = useCallback(
    async (id, text) => {
      const { data, error } = await mutateTasks(
        (current) => current.map((task) => (task.id === id ? { ...task, text: text.trim() } : task)),
        () => tasksService.rename(id, text),
      )
      if (data) setTasks(replaceById(id, data))
      return error
    },
    [mutateTasks, setTasks],
  )

  const deleteTask = useCallback(
    async (id) =>
      (await mutateTasks((current) => current.filter((task) => task.id !== id), () => tasksService.remove(id))).error,
    [mutateTasks],
  )

  // --- Notas ----------------------------------------------------------------
  const createNote = useCallback(
    async (body) => {
      const { data, error } = await mutateNotes(null, () => quickNotesService.create(body))
      if (data) setNotes((current) => [...current, data])
      return error
    },
    [mutateNotes, setNotes],
  )

  const updateNote = useCallback(
    async (id, body) => {
      const { data, error } = await mutateNotes(
        (current) => current.map((note) => (note.id === id ? { ...note, body: body.trim() } : note)),
        () => quickNotesService.updateBody(id, body),
      )
      if (data) setNotes(replaceById(id, data))
      return error
    },
    [mutateNotes, setNotes],
  )

  // Borrado con "Deshacer": la nota se oculta ya y se borra de verdad a los 5 s.
  // Solo hay UN borrado pendiente a la vez: borrar otra nota confirma la anterior.
  const pendingNoteRef = useRef(/** @type {{id: string, timer: ReturnType<typeof setTimeout>}|null} */ (null))
  const [pendingNoteId, setPendingNoteId] = useState(null)

  const commitNoteRemoval = useCallback(() => {
    const pending = pendingNoteRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingNoteRef.current = null
    setPendingNoteId(null)
    mutateNotes((current) => current.filter((note) => note.id !== pending.id), () => quickNotesService.remove(pending.id))
  }, [mutateNotes])

  const removeNote = useCallback(
    (id) => {
      commitNoteRemoval()
      pendingNoteRef.current = { id, timer: setTimeout(commitNoteRemoval, UNDO_MS) }
      setPendingNoteId(id)
    },
    [commitNoteRemoval],
  )

  const undoRemoveNote = useCallback(() => {
    const pending = pendingNoteRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingNoteRef.current = null
    setPendingNoteId(null)
  }, [])

  // Si se sale del Inicio con un borrado pendiente, se manda igual.
  useEffect(() => () => commitNoteRemoval(), [commitNoteRemoval])

  // --- Derivados ------------------------------------------------------------
  const derived = useMemo(
    () => ({
      upcoming: upcomingDates(dates.items, todayKey),
      next: pickNextDate(dates.items, todayKey),
      pending: sortPendingTasks(tasks.items),
      done: sortDoneTasks(tasks.items),
      summary: buildWeekSummary({ dates: dates.items, tasks: tasks.items, todayKey }),
      markers: buildDayMarkers(dates.items, tasks.items),
      notes: notes.items
        .filter((note) => note.id !== pendingNoteId)
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    }),
    [dates.items, tasks.items, notes.items, pendingNoteId, todayKey],
  )

  return {
    todayKey,
    lastSheet,
    dates: { items: dates.items, upcoming: derived.upcoming, next: derived.next, loading: dates.loading, error: dates.error },
    tasks: { pending: derived.pending, done: derived.done, loading: tasks.loading, error: tasks.error },
    notes: { items: derived.notes, pendingRemoval: pendingNoteId !== null, loading: notes.loading, error: notes.error },
    summary: derived.summary,
    markers: derived.markers,
    createDate,
    updateDate,
    deleteDate,
    createTask,
    toggleTask,
    renameTask,
    deleteTask,
    createNote,
    updateNote,
    removeNote,
    undoRemoveNote,
  }
}
