import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { useFolder } from '../hooks/useFolder.js'
import { useHotkeys } from '../hooks/useHotkeys.js'
import { useReadingMode } from '../hooks/useReadingMode.js'
import { FolderSheet } from '../components/features/folder/FolderSheet'
import { TopicIndex } from '../components/features/folder/TopicIndex'
import { FolderSearchBar } from '../components/features/folder/FolderSearchBar'
import { EditorToolbar } from '../components/features/sheetEditor/EditorToolbar'
import { ExportDialog } from '../components/features/export/ExportDialog'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { careerPath } from '../constants/routes'
import { subjectCssVars } from '../constants/subjectTones.js'
import { extractHeadings } from '../lib/markdown/headings.js'
import { scrollToCurrentHit } from '../lib/editor/highlightExtension.js'
import { formatSheetDate } from '../lib/format/sheetDate.js'
import { isLocalSheet } from '../lib/editor/folderSheets.js'

/** Distancia desde el borde superior del scroll a partir de la cual un tema cuenta como "el que estás leyendo". */
const ACTIVE_TOPIC_OFFSET = 140
const NOTICE_MS = 3000

/** Botón de la barra de herramientas de la carpeta (Leer, Exportar). */
const TOOL =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-2 disabled:opacity-40'

/** Headings de primer nivel del editor, en el mismo orden que `extractHeadings`. */
const topLevelHeadings = (editor) =>
  editor && !editor.isDestroyed ? editor.view.dom.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4') : []

/**
 * Ruta `/materias/:subjectId`. Monta la carpeta con `key={subjectId}`: al pasar
 * de una materia a otra se arranca de cero (editores, búsqueda, posición
 * inicial) en vez de arrastrar el estado y el scroll de la anterior.
 */
export function SubjectFolderPage() {
  const { subjectId } = useParams()
  return <SubjectFolder key={subjectId} subjectId={subjectId} />
}

/**
 * La Carpeta de una materia (ADR-017): todas sus hojas seguidas, en orden
 * cronológico, sobre papel crema con el color de la materia (ADR-018); índice de temas, buscador y modo lectura.
 * Ver docs/features/folder.md.
 *
 * `?hoja=:id` posiciona en esa hoja (contrato con el Inicio); sin parámetro,
 * va a la última hoja (lo normal es seguir escribiendo al final).
 *
 * @param {{subjectId: string}} props
 */
function SubjectFolder({ subjectId }) {
  const [searchParams] = useSearchParams()
  const targetSheetId = searchParams.get('hoja')
  const { openTab } = useOutletContext()
  const { reading, setReading } = useReadingMode()
  const {
    subject,
    subjectError,
    sheets,
    loading,
    error,
    clearError,
    reload,
    addLocalSheet,
    replaceLocalSheet,
    deleteSheet,
    updateLiveContent,
  } = useFolder(subjectId)

  const containerRef = useRef(null)
  /** key de hoja → editor TipTap montado. */
  const editorsRef = useRef(new Map())
  /** key de hoja → cancelar autosave pendiente (antes de borrar). */
  const cancelersRef = useRef(new Map())
  const [activeEditor, setActiveEditor] = useState(null)
  const [activeTopicId, setActiveTopicId] = useState(null)
  const [autoFocusKey, setAutoFocusKey] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  // Búsqueda: término, coincidencia actual (índice global) y cuántas hay por hoja.
  const [term, setTerm] = useState('')
  const [current, setCurrent] = useState(null)
  const [hitCounts, setHitCounts] = useState({})
  const [focusSignal, setFocusSignal] = useState(0)

  useEffect(() => {
    if (subject) openTab(subject.id, subject.name, subject.color)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id, subject?.name, subject?.color])

  // Salir del modo lectura al irse de la carpeta.
  useEffect(() => () => setReading(false), [setReading])

  /** @type {import('../components/features/folder/TopicIndex').FolderTopic[]} */
  const topics = useMemo(
    () =>
      sheets.flatMap((sheet) =>
        extractHeadings(sheet.content_md)
          // Los headings vacíos no van al índice, pero conservan su `index`
          // (sigue alineado con el n-ésimo heading del editor).
          .filter((heading) => heading.text)
          .map((heading) => ({
            ...heading,
            id: `${sheet.key}:${heading.index}`,
            sheetKey: sheet.key,
          })),
      ),
    [sheets],
  )

  const goToTopic = useCallback((topic) => {
    const element = topLevelHeadings(editorsRef.current.get(topic.sheetKey))[topic.index]
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const showNotice = useCallback((message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), NOTICE_MS)
  }, [])

  const handleWikiLink = useCallback(
    (title) => {
      const wanted = title.trim().toLowerCase()
      const topic = topics.find((candidate) => candidate.text.toLowerCase() === wanted)
      if (topic) goToTopic(topic)
      else showNotice(`No hay un tema «${title}» en esta materia.`)
    },
    [topics, goToTopic, showNotice],
  )

  // Tema activo: el último heading que pasó el borde superior del área de scroll.
  useEffect(() => {
    const scroller = containerRef.current?.closest('main')
    if (!scroller) return undefined
    let frame = null
    const update = () => {
      frame = null
      const top = scroller.getBoundingClientRect().top + ACTIVE_TOPIC_OFFSET
      let active = null
      for (const topic of topics) {
        const element = topLevelHeadings(editorsRef.current.get(topic.sheetKey))[topic.index]
        if (element && element.getBoundingClientRect().top <= top) active = topic.id
      }
      setActiveTopicId(active ?? topics[0]?.id ?? null)
    }
    const onScroll = () => {
      if (frame == null) frame = window.requestAnimationFrame(update)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (frame != null) window.cancelAnimationFrame(frame)
    }
  }, [topics])

  // Posición inicial: la hoja de `?hoja=` o, si no está (o no existe), la última.
  const positionedRef = useRef(null)
  useEffect(() => {
    if (loading || sheets.length === 0 || positionedRef.current === `${subjectId}:${targetSheetId}`) return
    positionedRef.current = `${subjectId}:${targetSheetId}`
    const target = sheets.find((sheet) => sheet.id === targetSheetId) ?? sheets[sheets.length - 1]
    window.requestAnimationFrame(() =>
      document.getElementById(`hoja-${target.id}`)?.scrollIntoView({ block: 'start' }),
    )
  }, [loading, sheets, subjectId, targetSheetId])

  // ---- Búsqueda ----------------------------------------------------------

  /** Hojas con coincidencias, en orden de la carpeta: [{key, count, offset}]. */
  const hitLayout = useMemo(() => {
    let offset = 0
    return sheets.map((sheet) => {
      const count = term.trim() ? (hitCounts[sheet.key] ?? 0) : 0
      const entry = { key: sheet.key, count, offset }
      offset += count
      return entry
    })
  }, [sheets, hitCounts, term])
  const totalHits = hitLayout.reduce((sum, entry) => sum + entry.count, 0)

  // Si cambian las coincidencias (se escribió o se borró texto), la actual se ajusta al rango.
  useEffect(() => {
    if (totalHits === 0) setCurrent(null)
    else setCurrent((value) => (value == null ? 0 : Math.min(value, totalHits - 1)))
  }, [totalHits])

  /** key de hoja → índice local de la coincidencia actual (o null). */
  const currentLocation = useMemo(() => {
    if (current == null) return null
    const entry = hitLayout.find((candidate) => current >= candidate.offset && current < candidate.offset + candidate.count)
    return entry ? { key: entry.key, local: current - entry.offset } : null
  }, [current, hitLayout])

  // Scroll a la coincidencia actual SOLO cuando el usuario navega (↑ ↓ Enter) o
  // cambia lo que busca — no cada vez que escribe en una hoja con el buscador abierto.
  const scrollToHitRef = useRef(false)
  const currentKey = currentLocation?.key ?? null
  const currentLocal = currentLocation?.local ?? null
  useEffect(() => {
    if (!scrollToHitRef.current || currentKey == null) return
    scrollToHitRef.current = false
    scrollToCurrentHit(editorsRef.current.get(currentKey))
  }, [currentKey, currentLocal])

  const handleHitsChange = useCallback((key, count) => {
    setHitCounts((counts) => (counts[key] === count ? counts : { ...counts, [key]: count }))
  }, [])

  const goToHit = (step) => {
    if (totalHits === 0) return
    scrollToHitRef.current = true
    setCurrent((value) => ((value ?? -step) + step + totalHits) % totalHits)
  }

  // ---- Atajos ------------------------------------------------------------

  const bindings = useMemo(
    () => ({
      'mod+f': () => setFocusSignal((value) => value + 1),
      ...(reading ? { escape: () => setReading(false) } : {}),
    }),
    [reading, setReading],
  )
  useHotkeys(bindings, !loading)

  // ---- Hojas -------------------------------------------------------------

  // Solo en desarrollo: cuánto tarda en montar todos los editores (criterio de
  // rendimiento de docs/features/folder.md: < ~1 s; si no, montaje perezoso).
  const mountStartRef = useRef(performance.now())
  const mountReportedRef = useRef(false)

  const handleEditor = useCallback((key, editor) => {
    if (editor) {
      editorsRef.current.set(key, editor)
      return
    }
    editorsRef.current.delete(key)
    // La hoja con foco se borró: la toolbar no puede seguir apuntando a un editor destruido.
    setActiveEditor((active) => (active && active.isDestroyed ? null : active))
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV || mountReportedRef.current || loading || sheets.length === 0) return
    const timer = window.setInterval(() => {
      if (editorsRef.current.size < sheets.length) return
      window.clearInterval(timer)
      mountReportedRef.current = true
      console.info(`[carpeta] ${sheets.length} hojas montadas en ${Math.round(performance.now() - mountStartRef.current)} ms`)
    }, 50)
    return () => window.clearInterval(timer)
  }, [loading, sheets.length])

  function handleAddSheet() {
    const id = addLocalSheet()
    setAutoFocusKey(id)
    window.requestAnimationFrame(() => document.getElementById(`hoja-${id}`)?.scrollIntoView({ block: 'center' }))
  }

  async function removeSheet(sheet) {
    cancelersRef.current.get(sheet.key)?.()
    // Por `key`: si la hoja nueva se creó mientras se confirmaba, su id ya cambió.
    await deleteSheet(sheet.key)
  }

  function handleRequestDelete(sheet) {
    // Una hoja nueva que todavía no se guardó (y está vacía) no necesita confirmación.
    if (isLocalSheet(sheet) && !sheet.content_md.trim()) removeSheet(sheet)
    else setPendingDelete(sheet)
  }

  async function handleConfirmDelete() {
    const sheet = pendingDelete
    setPendingDelete(null)
    if (sheet) await removeSheet(sheet)
  }

  // ---- Render ------------------------------------------------------------

  if (subjectError) {
    return <EmptyState title="Materia no encontrada" message={subjectError} />
  }

  return (
    <div
      ref={containerRef}
      style={subjectCssVars(subject?.color)}
      className={
        reading
          ? 'flex justify-center'
          : 'grid justify-center gap-8 md:grid-cols-[13rem_minmax(0,52rem)] lg:grid-cols-[15rem_minmax(0,52rem)_15rem]'
      }
    >
      {!reading && (
        <aside className="sticky top-0 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto md:block">
          {subject && (
            <Link
              to={careerPath(subject.career_id)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
            >
              <Icon name="chevron-left" size={14} /> Volver a la carrera
            </Link>
          )}
          <h1 className="mt-2 flex items-center gap-2 font-display text-xl font-bold" title={subject?.name}>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--subject)] shadow-[0_0_10px_var(--subject)]"
              aria-hidden="true"
            />
            <span className="truncate">{subject?.name ?? 'Cargando…'}</span>
          </h1>
          <p className="mb-4 mt-1 text-xs text-text-muted">
            {sheets.length} hoja{sheets.length === 1 ? '' : 's'}, {topics.length} tema{topics.length === 1 ? '' : 's'}
          </p>
          <h2 className="mb-2 text-xs font-medium text-text-muted">Temas</h2>
          <TopicIndex topics={topics} activeId={activeTopicId} onGo={goToTopic} />
        </aside>
      )}

      <div className={reading ? 'w-full max-w-[52rem]' : 'min-w-0'}>
        {!reading && (
          <div className="glass sticky -top-6 z-10 mb-5 flex w-full flex-wrap items-center gap-2 bg-surface/95 px-2 py-1.5 shadow-lg shadow-black/30">
            <div className="min-w-[12rem] flex-1">
              <FolderSearchBar
                term={term}
                onTermChange={(value) => {
                  scrollToHitRef.current = true
                  setTerm(value)
                  setCurrent(null)
                }}
                total={totalHits}
                current={current}
                onNext={() => goToHit(1)}
                onPrevious={() => goToHit(-1)}
                onClose={() => {
                  setTerm('')
                  setCurrent(null)
                }}
                focusSignal={focusSignal}
              />
            </div>
            <EditorToolbar editor={activeEditor} />
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setReading(true)}
              title="Ocultar todo menos las hojas (Esc para salir)"
              className={`${TOOL} text-text-muted hover:text-text`}
            >
              <Icon name="book-open" /> Leer
            </button>
            <button type="button" onClick={() => setExportOpen(true)} disabled={!subject} className={`${TOOL} text-accent-soft hover:text-accent`}>
              Exportar
            </button>
          </div>
        )}

        {notice && (
          <p role="status" className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <span>{error}</span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={reload} className="underline">
                Reintentar
              </button>
              <button type="button" onClick={clearError} aria-label="Cerrar aviso">
                <Icon name="close" size={14} />
              </button>
            </span>
          </p>
        )}

        <div className="space-y-8 pb-24">
          {loading && sheets.length === 0 ? (
            <p className="mt-8 text-center text-text-muted">Cargando…</p>
          ) : (
            <>
              {sheets.length === 0 && !error && (
                <EmptyState
                  title="La carpeta está vacía"
                  message="Agregá la primera hoja y empezá a escribir. Usá # Título para marcar los temas."
                />
              )}
              {sheets.map((sheet) => (
                <FolderSheet
                  key={sheet.key}
                  sheet={sheet}
                  autoFocus={sheet.key === autoFocusKey}
                  onCreated={replaceLocalSheet}
                  onRequestDelete={handleRequestDelete}
                  onLiveContent={updateLiveContent}
                  onEditor={handleEditor}
                  onFocusEditor={setActiveEditor}
                  onWikiLink={handleWikiLink}
                  searchTerm={term}
                  currentHit={currentLocation?.key === sheet.key ? currentLocation.local : null}
                  onHitsChange={handleHitsChange}
                  cancelers={cancelersRef}
                />
              ))}
              {!reading && subject && (
                <button
                  type="button"
                  onClick={handleAddSheet}
                  className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-4 text-sm text-text-muted transition-colors hover:border-[var(--subject)] hover:text-[var(--subject-light)]"
                >
                  <Icon name="plus" /> Nueva hoja
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {reading && (
        <button
          type="button"
          onClick={() => setReading(false)}
          className="glass fixed right-4 top-4 z-50 px-3 py-1.5 text-sm text-text-muted hover:text-text"
        >
          Salir del modo lectura (Esc)
        </button>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title="Eliminar hoja"
        message={
          pendingDelete
            ? `Se va a eliminar la hoja del ${formatSheetDate(pendingDelete.created_at)} con todo su contenido. No se puede deshacer.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {subject && (
        <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} careerId={subject.career_id} subjectId={subjectId} />
      )}
    </div>
  )
}
