/**
 * Una hoja de la carpeta (ADR-017): barra con fecha y hora + editor sobre
 * papel crema, con el margen del color de la materia (ADR-018). Ver docs/features/folder.md.
 *
 * Cada hoja guarda sola (`useSheetAutosave`). Al borrar, primero se cancela lo
 * pendiente: si no, el guardado del desmontaje volvería a crear o guardar la
 * hoja recién borrada.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { SheetEditor } from '../sheetEditor/SheetEditor'
import { useSheetAutosave } from '../../../hooks/useSheetAutosave.js'
import { formatSheetDate, formatSheetDateLong } from '../../../lib/format/sheetDate.js'
import { Icon } from '../../ui/Icon'
import { AttachmentList } from '../attachments/AttachmentList'
import { insertAttachment, removeAttachment } from '../../../lib/editor/attachmentNodes.js'
import { isImageMime } from '../../../lib/attachments/refs.js'
import { generateId } from '../../../lib/id.js'
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL } from '../../../constants/attachmentLimits.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @param {Object} props
 * @param {import('../../../hooks/useFolder.js').FolderSheet} props.sheet
 * @param {boolean} [props.autoFocus] - Hoja recién agregada: el cursor va ahí.
 * @param {(localId: string, created: import('../../../types/models.js').Sheet) => void} props.onCreated
 * @param {(sheet: Object) => void} props.onRequestDelete - Pide confirmación (la hace la página).
 * @param {(sheet: Object) => void} props.onSaveAsTemplate - Pide el nombre y guarda la hoja como plantilla (la página).
 * @param {(id: string, markdown: string) => void} props.onLiveContent
 * @param {(key: string, editor: import('@tiptap/react').Editor|null) => void} props.onEditor
 * @param {(editor: import('@tiptap/react').Editor) => void} props.onFocusEditor
 * @param {(title: string) => void} props.onWikiLink
 * @param {string} props.searchTerm
 * @param {number|null} props.currentHit
 * @param {(key: string, count: number) => void} props.onHitsChange
 * @param {{current: Map<string, () => void>}} props.cancelers - Para cancelar lo pendiente antes de borrar.
 * @param {import('../../../types/models.js').Attachment[]} [props.attachments] - Adjuntos de la hoja.
 * @param {{upload: Function, resolveUrl: Function, isUploading: Function, open: Function}} props.attachmentApi
 * @param {(attachment: import('../../../types/models.js').Attachment) => void} props.onRequestRemoveAttachment - Pide confirmación (la página).
 * @param {{current: Map<string, (files: FileList|File[]) => void>}} props.uploaders - Para que el botón de adjuntar de la barra le pase archivos a la hoja con foco.
 * @param {() => void} [props.onBroteRemoved] - Se borró el bloque de arriba de la tarjeta del Brote (la página la cierra).
 */
export function FolderSheet({
  sheet,
  autoFocus = false,
  onCreated,
  onRequestDelete,
  onSaveAsTemplate,
  onLiveContent,
  onEditor,
  onFocusEditor,
  onWikiLink,
  searchTerm,
  currentHit,
  onHitsChange,
  cancelers,
  attachments = [],
  attachmentApi,
  onRequestRemoveAttachment,
  uploaders,
  onBroteRemoved,
}) {
  const { t } = useI18n()
  const { initialContent, syncStatus, error, updateContent, cancel, ensureCreated } = useSheetAutosave({ sheet, onCreated })
  const [uploadError, setUploadError] = useState(null)
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

  /**
   * Archivos soltados, pegados o elegidos con el botón de adjuntar. Una hoja
   * nueva se crea primero (el adjunto le da contenido). La referencia entra en
   * el texto ANTES de que termine la subida (se ve "Subiendo…"); si falla, se saca.
   * @param {FileList|File[]} fileList
   */
  async function handleFiles(fileList) {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return
    const failures = []
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        failures.push(t('folder.attachments.tooBig', { name: file.name, limit: MAX_ATTACHMENT_LABEL }))
        continue
      }
      const sheetId = await ensureCreated()
      if (!sheetId) {
        failures.push(t('folder.sheet.saveFailed'))
        break
      }
      const id = generateId()
      const uploading = attachmentApi.upload(sheetId, file, { id }) // registra "subiendo" en este tick
      insertAttachment(editor, { id, name: file.name, isImage: isImageMime(file.type) })
      const { error: uploadFailure } = await uploading
      if (uploadFailure) {
        removeAttachment(editor, id)
        failures.push(uploadFailure)
      }
    }
    // Se muestran todos los avisos de la tanda; si salió todo bien, se limpia el anterior.
    setUploadError(failures.length ? failures.join(' ') : null)
  }

  // El botón de adjuntar de la barra (página) le pasa los archivos a la hoja con foco.
  // Sin deps a propósito: `handleFiles` cierra sobre `ensureCreated`/`attachmentApi` actuales.
  useEffect(() => {
    const map = uploaders.current
    map.set(sheet.key, handleFiles)
    return () => map.delete(sheet.key)
  })

  const editorAttachments = useMemo(
    () => ({ resolve: attachmentApi.resolveUrl, isUploading: attachmentApi.isUploading, open: attachmentApi.open }),
    [attachmentApi],
  )

  const status = syncStatus === 'idle' ? '' : t(`folder.sheet.${syncStatus}`)

  return (
    <article
      id={`hoja-${sheet.id}`}
      data-sheet-key={sheet.key}
      className="paper-sheet scroll-mt-28 rounded-md border-l-[6px] border-[var(--subject)]"
    >
      <header className="group flex items-center justify-between gap-3 border-b border-paper-border px-7 py-2 text-xs text-ink-muted">
        <span className="font-medium">{formatSheetDateLong(sheet.created_at)}</span>
        <span className="flex items-center gap-2">
          {status && <span className={syncStatus === 'error' ? 'text-red-700' : ''} title={error ?? undefined}>{status}</span>}
          <button
            type="button"
            onClick={() => onSaveAsTemplate(sheet)}
            aria-label={t('folder.sheet.saveTemplateLabel', { date: formatSheetDate(sheet.created_at) })}
            title={t('folder.sheet.saveTemplateTitle')}
            className="rounded p-1 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Icon name="template" size={14} />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(sheet)}
            aria-label={t('folder.sheet.trashLabel', { date: formatSheetDate(sheet.created_at) })}
            className="rounded p-1 opacity-0 transition-opacity hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Icon name="trash" size={14} />
          </button>
        </span>
      </header>
      <div className="px-7 py-5">
        <SheetEditor
          content={initialContent}
          onChange={handleChange}
          onReady={handleReady}
          onFocusEditor={onFocusEditor}
          onWikiLink={onWikiLink}
          searchTerm={searchTerm}
          currentHit={currentHit}
          onHitsChange={(count) => onHitsChange(sheet.key, count)}
          onFiles={handleFiles}
          attachments={editorAttachments}
          onBroteRemoved={onBroteRemoved}
        />
      </div>
      {uploadError && (
        <p role="alert" className="border-t border-paper-border px-7 py-2 text-xs text-red-700">
          {uploadError}
        </p>
      )}
      <AttachmentList
        attachments={attachments}
        onOpen={(attachment) => attachmentApi.open(attachment.id)}
        onRemove={onRequestRemoveAttachment}
      />
    </article>
  )
}
