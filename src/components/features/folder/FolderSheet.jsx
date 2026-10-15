/**
 * Una hoja de la carpeta (ADR-017): barra con fecha y hora + editor sobre
 * papel blanco. Ver docs/features/folder.md.
 *
 * Cada hoja guarda sola (`useSheetAutosave`). Al borrar, primero se cancela lo
 * pendiente: si no, el guardado del desmontaje volvería a crear o guardar la
 * hoja recién borrada.
 */

import { useEffect, useRef } from 'react'
import { SheetEditor } from '../sheetEditor/SheetEditor'
import { useSheetAutosave } from '../../../hooks/useSheetAutosave.js'
import { formatSheetDate } from '../../../lib/format/sheetDate.js'

const STATUS_LABELS = { idle: '', saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar' }

/**
 * @param {Object} props
 * @param {import('../../../hooks/useFolder.js').FolderSheet} props.sheet
 * @param {boolean} [props.autoFocus] - Hoja recién agregada: el cursor va ahí.
 * @param {(localId: string, created: import('../../../types/models.js').Sheet) => void} props.onCreated
 * @param {(sheet: Object) => void} props.onRequestDelete - Pide confirmación (la hace la página).
 * @param {(id: string, markdown: string) => void} props.onLiveContent
 * @param {(key: string, editor: import('@tiptap/react').Editor|null) => void} props.onEditor
 * @param {(editor: import('@tiptap/react').Editor) => void} props.onFocusEditor
 * @param {(title: string) => void} props.onWikiLink
 * @param {string} props.searchTerm
 * @param {number|null} props.currentHit
 * @param {(key: string, count: number) => void} props.onHitsChange
 * @param {{current: Map<string, () => void>}} props.cancelers - Para cancelar lo pendiente antes de borrar.
 */
export function FolderSheet({
  sheet,
  autoFocus = false,
  onCreated,
  onRequestDelete,
  onLiveContent,
  onEditor,
  onFocusEditor,
  onWikiLink,
  searchTerm,
  currentHit,
  onHitsChange,
  cancelers,
}) {
  const { initialContent, syncStatus, error, updateContent, cancel } = useSheetAutosave({ sheet, onCreated })
  const editorRef = useRef(null)
  const idRef = useRef(sheet.id)
  idRef.current = sheet.id

  useEffect(() => {
    const map = cancelers.current
    map.set(sheet.key, cancel)
    return () => map.delete(sheet.key)
  }, [cancelers, sheet.key, cancel])

  /** @param {string} markdown */
  function handleChange(markdown) {
    updateContent(markdown)
    onLiveContent(idRef.current, markdown)
  }

  function handleReady(editor) {
    editorRef.current = editor
    onEditor(sheet.key, editor)
    if (editor && autoFocus) editor.commands.focus('end')
  }

  const status = STATUS_LABELS[syncStatus]

  return (
    <article id={`hoja-${sheet.id}`} data-sheet-key={sheet.key} className="scroll-mt-24 rounded-lg bg-paper text-ink shadow-lg">
      <header className="group flex items-center justify-between gap-3 border-b border-paper-border px-6 py-2 text-xs text-ink-muted">
        <span className="font-medium">{formatSheetDate(sheet.created_at)}</span>
        <span className="flex items-center gap-2">
          {status && <span className={syncStatus === 'error' ? 'text-red-600' : ''} title={error ?? undefined}>{status}</span>}
          <button
            type="button"
            onClick={() => onRequestDelete(sheet)}
            aria-label={`Eliminar la hoja del ${formatSheetDate(sheet.created_at)}`}
            className="rounded p-0.5 opacity-0 transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
          >
            ✕
          </button>
        </span>
      </header>
      <div className="px-6 py-4">
        <SheetEditor
          content={initialContent}
          onChange={handleChange}
          onReady={handleReady}
          onFocusEditor={onFocusEditor}
          onWikiLink={onWikiLink}
          searchTerm={searchTerm}
          currentHit={currentHit}
          onHitsChange={(count) => onHitsChange(sheet.key, count)}
        />
      </div>
    </article>
  )
}
