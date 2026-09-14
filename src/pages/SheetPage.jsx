import { useEffect, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { useSheet } from '../hooks/useSheet.js'
import { SheetEditor } from '../components/features/sheetEditor/SheetEditor'
import { EditorToolbar } from '../components/features/sheetEditor/EditorToolbar'
import { EmptyState } from '../components/ui/EmptyState'

const STATUS_LABELS = {
  idle: '',
  saving: 'Guardando…',
  saved: 'Guardado',
  error: 'Error al guardar',
}

/**
 * Editor de una hoja: TipTap en rico, Markdown como fuente de verdad (ADR-011).
 * Ver docs/features/sheet-editor.md.
 */
export function SheetPage() {
  const { sheetId } = useParams()
  const { sheet, loading, error, syncStatus, saveTitle, updateContent } = useSheet(sheetId)
  const { openTab } = useOutletContext()
  const [title, setTitle] = useState('')
  const [editor, setEditor] = useState(null)

  // Asegura que la tab de esta hoja exista (navegación directa por URL o refresh).
  useEffect(() => {
    if (sheet) openTab(sheet.id, sheet.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id, sheet?.title])

  // Solo al cambiar de hoja: no se quiere pisar lo que el usuario está tipeando
  // en el título cada vez que `sheet` se actualiza por otro motivo.
  useEffect(() => {
    if (sheet) setTitle(sheet.title)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id])

  if (loading && !sheet) {
    return <p className="text-center text-text-muted">Cargando…</p>
  }

  if (error && !sheet) {
    return <EmptyState title="Hoja no encontrada" message={error} />
  }

  if (!sheet) return null

  const statusLabel = STATUS_LABELS[syncStatus]

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => saveTitle(title)}
          className="w-full bg-transparent text-2xl font-bold outline-none"
          aria-label="Título de la hoja"
        />
        {statusLabel && (
          <span className={`shrink-0 text-xs ${syncStatus === 'error' ? 'text-red-400' : 'text-text-muted'}`}>
            {statusLabel}
          </span>
        )}
      </div>

      <div className="mt-3">
        <EditorToolbar editor={editor} />
      </div>

      <div className="mt-2 flex-1 overflow-y-auto rounded-lg border border-border bg-bg p-4">
        {/* `key` fuerza a remontar el editor al cambiar de hoja: `content` de
            TipTap solo se lee al montar, no se re-sincroniza solo. */}
        <SheetEditor key={sheet.id} content={sheet.content_md} onChange={updateContent} onReady={setEditor} />
      </div>
    </div>
  )
}
