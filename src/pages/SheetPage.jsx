import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useSheet } from '../hooks/useSheet.js'
import { useSheetLinks } from '../hooks/useSheetLinks.js'
import { SheetEditor } from '../components/features/sheetEditor/SheetEditor'
import { EditorToolbar } from '../components/features/sheetEditor/EditorToolbar'
import { SheetLinksPanel } from '../components/features/sheetEditor/SheetLinksPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { sheetPath, subjectMapPath } from '../constants/routes'

const STATUS_LABELS = {
  idle: '',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'Error al guardar',
}

/**
 * Editor de una hoja: TipTap en rico, Markdown como fuente de verdad (ADR-011),
 * con el panel de enlaces `[[ ]]` debajo (ADR-015).
 * Ver docs/features/sheet-editor.md.
 */
export function SheetPage() {
  const { sheetId } = useParams()
  const navigate = useNavigate()
  const { sheet, loading, error, syncStatus, saveTitle, updateContent } = useSheet(sheetId)
  const { openTab } = useOutletContext()
  const [title, setTitle] = useState('')
  const [editor, setEditor] = useState(null)
  /** Markdown actual del editor (para detectar `[[links]]` que todavía no existen). */
  const [markdown, setMarkdown] = useState('')
  const [creatingTitle, setCreatingTitle] = useState(null)
  const [linkError, setLinkError] = useState(null)
  const links = useSheetLinks(sheet, markdown, syncStatus)

  // Asegura que la tab de esta hoja exista (navegación directa por URL o refresh).
  useEffect(() => {
    if (sheet) openTab(sheet.id, sheet.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id, sheet?.title])

  // Solo al cambiar de hoja: no se quiere pisar lo que el usuario está tipeando
  // en el título (o el contenido) cada vez que `sheet` se actualiza por otro motivo.
  useEffect(() => {
    if (sheet) {
      setTitle(sheet.title)
      setMarkdown(sheet.content_md)
      setLinkError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id])

  /** @param {string} next */
  function handleContentChange(next) {
    setMarkdown(next)
    updateContent(next)
  }

  /** @param {{id: string, title: string}} target */
  function openSheet(target) {
    openTab(target.id, target.title)
    navigate(sheetPath(target.id))
  }

  /** Crea la hoja de un `[[Título]]` que todavía no existe y la abre. */
  async function handleCreateLinked(newTitle) {
    setCreatingTitle(newTitle)
    const { data, error: createError } = await links.createSheet(newTitle)
    setCreatingTitle(null)
    setLinkError(createError)
    if (data) openSheet(data)
  }

  async function handleTitleBlur() {
    const failure = await saveTitle(title)
    // Si no se pudo (ej. título repetido en la materia), se vuelve al que estaba guardado.
    if (failure && sheet) setTitle(sheet.title)
  }

  if (loading && !sheet) {
    return <p className="text-center text-text-muted">Cargando…</p>
  }

  if (error && !sheet) {
    return <EmptyState title="Hoja no encontrada" message={error} />
  }

  if (!sheet) return null

  const statusLabel = STATUS_LABELS[syncStatus]
  const visibleError = linkError ?? (syncStatus === 'error' ? error : null)

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <Link to={subjectMapPath(sheet.subject_id)} className="text-sm text-text-muted hover:text-text">
        ← Volver a la materia
      </Link>

      <div className="mt-1 flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={handleTitleBlur}
          className="w-full bg-transparent text-2xl font-bold outline-none"
          aria-label="Título de la hoja"
        />
        {statusLabel && (
          <span className={`shrink-0 text-xs ${syncStatus === 'error' ? 'text-red-400' : 'text-text-muted'}`}>
            {statusLabel}
          </span>
        )}
      </div>

      {visibleError && (
        <p role="alert" className="mt-2 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {visibleError}
        </p>
      )}

      <div className="mt-3">
        <EditorToolbar editor={editor} />
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-bg p-4">
        {/* `key` fuerza a remontar el editor al cambiar de hoja: `content` de
            TipTap solo se lee al montar, no se re-sincroniza solo. */}
        <SheetEditor key={sheet.id} content={sheet.content_md} onChange={handleContentChange} onReady={setEditor} />
      </div>

      <div className="mt-3">
        <SheetLinksPanel
          outgoing={links.outgoing}
          incoming={links.incoming}
          unresolved={links.unresolved}
          onOpenSheet={openSheet}
          onCreateSheet={handleCreateLinked}
          creating={creatingTitle}
        />
      </div>
    </div>
  )
}
