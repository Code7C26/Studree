import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { useFolder } from '../hooks/useFolder.js'
import { useFolderAttachments } from '../hooks/useFolderAttachments.js'
import { useHotkeys } from '../hooks/useHotkeys.js'
import { useSheetTemplates } from '../hooks/useSheetTemplates.js'
import { useReadingMode } from '../hooks/useReadingMode.js'
import { FolderSheet } from '../components/features/folder/FolderSheet'
import { TopicIndex } from '../components/features/folder/TopicIndex'
import { FolderSearchBar } from '../components/features/folder/FolderSearchBar'
import { EditorToolbar } from '../components/features/sheetEditor/EditorToolbar'
import { NewSheetButton } from '../components/features/templates/NewSheetButton'
import { TemplatesManager } from '../components/features/templates/TemplatesManager'
import { ExportDialog } from '../components/features/export/ExportDialog'
import { ImportDialog } from '../components/features/import/ImportDialog'
import { SelectionShortcuts } from '../components/features/assistant/SelectionShortcuts'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PromptDialog } from '../components/ui/PromptDialog'
import { UndoToast } from '../components/ui/UndoToast'
import { careerPath } from '../constants/routes'
import { subjectCssVars } from '../constants/subjectTones.js'
import { extractHeadings } from '../lib/markdown/headings.js'
import { editorToMarkdown } from '../lib/markdown/serialize.js'
import { stripAttachmentRefs } from '../lib/attachments/refs.js'
import { scrollToCurrentHit } from '../lib/editor/highlightExtension.js'
import { formatSheetDate } from '../lib/format/sheetDate.js'
import { isLocalSheet } from '../lib/editor/folderSheets.js'
import { assistantBridge } from '../lib/assistant/bridge.js'
import { applyProposalToEditor } from '../lib/assistant/editorApply.js'
import { withOriginMark } from '../lib/assistant/applyProposal.js'
import { buildShortcutRequest, shortcutLabel } from '../lib/assistant/shortcuts.js'

/**
 * Margen (px) para que un tema cuente como "el que estás leyendo". Se suma al
 * `scroll-margin-top` real de cada heading (index.css): al saltar a un tema, el
 * heading queda justo en esa línea, así que tiene que contar como activo.
 */
const ACTIVE_TOPIC_TOLERANCE = 8
const NOTICE_MS = 3000
/** Ruling O: una propuesta solo se aplica sobre la carpeta abierta. */
const NOT_IN_FOLDER = 'Abrí la materia de esa hoja para aplicar el cambio.'
const UNSAVED_SHEET = 'Esperá a que la hoja se guarde para usar los atajos del Brote.'

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
    restoreSheet,
    updateLiveContent,
  } = useFolder(subjectId)

  const realSheetIds = useMemo(() => sheets.filter((sheet) => !isLocalSheet(sheet)).map((sheet) => sheet.id), [sheets])
  const attachmentsState = useFolderAttachments(realSheetIds)
  const folderAttachmentApi = useMemo(
    () => ({
      upload: attachmentsState.upload,
      resolveUrl: attachmentsState.resolveUrl,
      isUploading: attachmentsState.isUploading,
      open: attachmentsState.open,
    }),
    [attachmentsState.upload, attachmentsState.resolveUrl, attachmentsState.isUploading, attachmentsState.open],
  )
  /** key de hoja → función que sube archivos a esa hoja (la registra cada FolderSheet). */
  const uploadersRef = useRef(new Map())
  const fileInputRef = useRef(null)
  const [pendingAttachment, setPendingAttachment] = useState(null)
  const [templateSource, setTemplateSource] = useState(null)
  const [managerOpen, setManagerOpen] = useState(false)
  const { templates, all: allTemplates, createTemplate, renameTemplate, updateTemplateContent, deleteTemplate } = useSheetTemplates()

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
  const [importOpen, setImportOpen] = useState(false)
  const importTarget = useMemo(() => (subject ? { mode: 'subject', subjectId, subjectName: subject.name } : null), [subject, subjectId])
  const [notice, setNotice] = useState(null)
  /** Aviso "Deshacer" tras mandar una hoja a la papelera: `{message, sheetId}`. */
  const [undo, setUndo] = useState(null)
  const closeUndo = useCallback(() => setUndo(null), [])

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

  /**
   * Tema elegido en el índice (o con `[[Tema]]`). Los últimos temas no llegan a
   * su línea de lectura porque se termina el scroll: mientras el scroll esté al
   * final y ese heading se vea, sigue marcado. Se olvida al scrollear a mano.
   */
  const chosenTopicRef = useRef(null)

  const goToTopic = useCallback((topic) => {
    const element = topLevelHeadings(editorsRef.current.get(topic.sheetKey))[topic.index]
    if (!element) return
    chosenTopicRef.current = topic.id
    setActiveTopicId(topic.id)
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  // Tema activo: el último heading que llegó a su línea de lectura (borde superior del
  // área de scroll + su scroll-margin-top, el mismo lugar donde lo deja un salto).
  useEffect(() => {
    const scroller = containerRef.current?.closest('main')
    if (!scroller) return undefined
    let frame = null
    const update = () => {
      frame = null
      const top = scroller.getBoundingClientRect().top + ACTIVE_TOPIC_TOLERANCE
      let active = null
      for (const topic of topics) {
        const element = topLevelHeadings(editorsRef.current.get(topic.sheetKey))[topic.index]
        if (!element) continue
        const margin = parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0
        if (element.getBoundingClientRect().top - margin <= top) active = topic.id
      }
      const atEnd = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 2
      const chosen = chosenTopicRef.current && topics.find((topic) => topic.id === chosenTopicRef.current)
      if (atEnd && chosen) {
        const element = topLevelHeadings(editorsRef.current.get(chosen.sheetKey))[chosen.index]
        const box = element?.getBoundingClientRect()
        const view = scroller.getBoundingClientRect()
        if (box && box.top >= view.top && box.top < view.bottom) active = chosen.id
      }
      setActiveTopicId(active ?? topics[0]?.id ?? null)
    }
    // Scroll hecho por el usuario: se olvida el tema elegido (el salto suave no dispara esto).
    const forgetChosen = () => {
      chosenTopicRef.current = null
    }
    const onScroll = () => {
      if (frame == null) frame = window.requestAnimationFrame(update)
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('wheel', forgetChosen, { passive: true })
    scroller.addEventListener('touchmove', forgetChosen, { passive: true })
    scroller.addEventListener('keydown', forgetChosen)
    update()
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('wheel', forgetChosen)
      scroller.removeEventListener('touchmove', forgetChosen)
      scroller.removeEventListener('keydown', forgetChosen)
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

  function handleAddSheet(content = '') {
    const id = addLocalSheet(content)
    setAutoFocusKey(id)
    window.requestAnimationFrame(() => document.getElementById(`hoja-${id}`)?.scrollIntoView({ block: 'center' }))
  }

  // ---- Brote (asistente) --------------------------------------------------
  // La carpeta publica en `assistantBridge` la materia, la hoja activa, la
  // selección y cómo aplicar una propuesta. Toda edición entra por el editor
  // (onUpdate → autosave), nunca por el service. Ver docs/features/assistant.md.

  const sheetsRef = useRef(sheets)
  sheetsRef.current = sheets
  const activeEditorRef = useRef(activeEditor)
  activeEditorRef.current = activeEditor

  /** Hoja (de las montadas) a la que pertenece un editor. */
  const sheetOfEditor = useCallback((editor) => {
    if (!editor || editor.isDestroyed) return null
    const key = [...editorsRef.current].find(([, candidate]) => candidate === editor)?.[0]
    return key ? (sheetsRef.current.find((sheet) => sheet.key === key) ?? null) : null
  }, [])

  const activeSheet = sheetOfEditor(activeEditor)
  const activeSheetId = activeSheet && !isLocalSheet(activeSheet) ? activeSheet.id : null

  /** Selección no vacía del editor activo, en una hoja ya guardada. */
  const getSelection = useCallback(() => {
    const editor = activeEditorRef.current
    const sheet = sheetOfEditor(editor)
    if (!sheet || isLocalSheet(sheet)) return null
    const { from, to, empty } = editor.state.selection
    if (empty) return null
    const text = editor.state.doc.textBetween(from, to, '\n')
    return text.trim() ? { sheetId: sheet.id, from, to, text } : null
  }, [sheetOfEditor])

  /** La implementación cambia con el estado; el contexto publicado llama siempre a la última. */
  const applyRef = useRef(/** @type {(proposal: any) => import('../lib/assistant/bridge.js').ApplyResult} */ (() => ({ ok: false, error: NOT_IN_FOLDER })))
  applyRef.current = (proposal) => {
    if (proposal?.kind === 'new_sheet') {
      if (proposal.subjectId !== subjectId) return { ok: false, error: NOT_IN_FOLDER }
      // Mismo camino que una plantilla: hoja local con contenido, que se crea al montarse.
      handleAddSheet(withOriginMark(proposal.markdown, proposal.source))
      return { ok: true }
    }
    const sheet = sheetsRef.current.find((candidate) => candidate.id === proposal?.sheetId)
    const editor = sheet ? editorsRef.current.get(sheet.key) : null
    if (!editor || editor.isDestroyed) return { ok: false, error: NOT_IN_FOLDER }
    const result = applyProposalToEditor(editor, proposal, proposal.selection ?? null)
    if (result.ok) document.getElementById(`hoja-${sheet.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return result
  }
  const apply = useCallback((proposal) => applyRef.current(proposal), [])

  useEffect(() => {
    if (!subject) return
    assistantBridge.set({
      subject: { id: subject.id, name: subject.name },
      // El nombre de la carrera no se carga en la carpeta; para el alcance alcanza el id.
      career: subject.career_id ? { id: subject.career_id, name: '' } : null,
      sheetId: activeSheetId,
      getSelection,
      apply,
    })
    // Al irse de la carpeta el Brote se queda sin contexto (no puede aplicar nada).
    return () => assistantBridge.set(null)
  }, [subject, activeSheetId, getSelection, apply])

  // Un atajo encolado que el panel todavía no tomó no puede dispararse después
  // en otra carpeta (la carpeta se remonta por materia: `key={subjectId}`).
  useEffect(() => () => assistantBridge.clearRequest(), [])

  const handleShortcut = useCallback(
    (id) => {
      const selection = getSelection()
      if (!selection) {
        if (sheetOfEditor(activeEditorRef.current) && isLocalSheet(sheetOfEditor(activeEditorRef.current))) showNotice(UNSAVED_SHEET)
        return
      }
      assistantBridge.request({ request: buildShortcutRequest(id, selection), label: shortcutLabel(id, selection), selection })
    },
    [getSelection, sheetOfEditor, showNotice],
  )

  async function removeSheet(sheet) {
    cancelersRef.current.get(sheet.key)?.()
    // Por `key`: si la hoja nueva se creó mientras se confirmaba, su id ya cambió.
    const { sheetId } = await deleteSheet(sheet.key)
    if (sheetId) setUndo({ message: 'Hoja movida a la papelera', sheetId })
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
          : // Índice desde lg. Las hojas toman primero su ancho (hasta 52rem) y las columnas de
            // los costados se reparten lo que sobra: con lugar quedan iguales (hojas centradas en
            // la pantalla); sin lugar la de la derecha se achica a 0 en vez de angostar las hojas.
            'grid gap-8 lg:grid-cols-[minmax(13rem,1fr)_minmax(0,52rem)_minmax(0,1fr)]'
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          // Hoja del editor con foco; si no hay (sin foco aún, o se borró), la última de la carpeta.
          const focusedKey =
            activeEditor && !activeEditor.isDestroyed
              ? [...editorsRef.current].find(([, editor]) => editor === activeEditor)?.[0]
              : undefined
          const key = focusedKey ?? sheets[sheets.length - 1]?.key
          if (key && event.target.files?.length) uploadersRef.current.get(key)?.(Array.from(event.target.files))
          event.target.value = ''
        }}
      />

      {!reading && (
        <aside className="sticky top-0 hidden max-h-[calc(100vh-8rem)] w-full max-w-[15rem] self-start justify-self-end overflow-y-auto lg:block">
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
            <EditorToolbar editor={activeEditor} onAttach={() => fileInputRef.current?.click()} canAttach={sheets.length > 0} />
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setReading(true)}
              title="Ocultar todo menos las hojas (Esc para salir)"
              className={`${TOOL} text-text-muted hover:text-text`}
            >
              <Icon name="book-open" /> Leer
            </button>
            <button type="button" onClick={() => setImportOpen(true)} disabled={!subject} className={`${TOOL} text-text-muted hover:text-text`}>
              <Icon name="upload" /> Importar
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
        {(error || attachmentsState.error) && (
          <p role="alert" className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <span>{error ?? attachmentsState.error}</span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={reload} className="underline">
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  clearError()
                  attachmentsState.clearError()
                }}
                aria-label="Cerrar aviso"
              >
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
                  onSaveAsTemplate={setTemplateSource}
                  onLiveContent={updateLiveContent}
                  onEditor={handleEditor}
                  onFocusEditor={setActiveEditor}
                  onWikiLink={handleWikiLink}
                  searchTerm={term}
                  currentHit={currentLocation?.key === sheet.key ? currentLocation.local : null}
                  onHitsChange={handleHitsChange}
                  cancelers={cancelersRef}
                  attachments={attachmentsState.bySheet.get(sheet.id) ?? []}
                  attachmentApi={folderAttachmentApi}
                  onRequestRemoveAttachment={setPendingAttachment}
                  uploaders={uploadersRef}
                />
              ))}
              {!reading && subject && (
                <NewSheetButton
                  templates={allTemplates}
                  onBlank={() => handleAddSheet()}
                  onPick={(template) => handleAddSheet(template.content_md)}
                  onManage={() => setManagerOpen(true)}
                />
              )}
            </>
          )}
        </div>
      </div>

      <SelectionShortcuts editor={activeEditor} hidden={reading} onPick={handleShortcut} />

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
        title="Mover a la papelera"
        confirmLabel="Mover a la papelera"
        message={
          pendingDelete
            ? `La hoja del ${formatSheetDate(pendingDelete.created_at)} se mueve a la papelera. Podés restaurarla durante 30 días.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingAttachment != null}
        title="Borrar adjunto"
        message={
          pendingAttachment
            ? `Se borra «${pendingAttachment.name}» para siempre. Donde estaba en el texto va a decir "Adjunto no disponible".`
            : ''
        }
        confirmLabel="Borrar"
        onConfirm={async () => {
          const attachment = pendingAttachment
          setPendingAttachment(null)
          if (attachment) await attachmentsState.remove(attachment)
        }}
        onCancel={() => setPendingAttachment(null)}
      />

      <PromptDialog
        open={templateSource != null}
        title="Guardar como plantilla"
        label="Nombre de la plantilla"
        placeholder="Ej. Clase de laboratorio"
        submitLabel="Guardar"
        onClose={() => setTemplateSource(null)}
        onSubmit={(name) => {
          const editor = editorsRef.current.get(templateSource.key)
          const markdown = editor && !editor.isDestroyed ? editorToMarkdown(editor) : templateSource.content_md
          return createTemplate(name, stripAttachmentRefs(markdown))
        }}
      >
        <p className="text-xs text-text-muted">Se guarda el contenido actual de la hoja, sin los adjuntos.</p>
      </PromptDialog>

      <TemplatesManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        templates={templates}
        onRename={renameTemplate}
        onUpdateContent={updateTemplateContent}
        onDelete={deleteTemplate}
      />

      {subject && (
        <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} careerId={subject.career_id} subjectId={subjectId} />
      )}

      {importTarget && <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} target={importTarget} />}

      <UndoToast
        message={undo?.message ?? null}
        onUndo={() => {
          const sheetId = undo?.sheetId
          setUndo(null)
          if (sheetId) restoreSheet(sheetId)
        }}
        onClose={closeUndo}
      />
    </div>
  )
}
