import { Icon } from '../../ui/Icon'
import { formatBytes } from '../../../lib/attachments/files.js'
import { isImageMime } from '../../../lib/attachments/refs.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * "Adjuntos (N)" al pie de una hoja, sobre el papel (ADR-018). Ver
 * docs/features/attachments.md. No se muestra si la hoja no tiene adjuntos.
 * @param {Object} props
 * @param {import('../../../types/models.js').Attachment[]} props.attachments
 * @param {(attachment: import('../../../types/models.js').Attachment) => void} props.onOpen
 * @param {(attachment: import('../../../types/models.js').Attachment) => void} props.onRemove - Pide confirmación (la página).
 */
export function AttachmentList({ attachments, onOpen, onRemove }) {
  const { t } = useI18n()
  if (!attachments?.length) return null

  return (
    <section aria-label={t('folder.attachments.section')} className="border-t border-paper-border px-7 py-3 text-sm text-ink">
      <h3 className="mb-1.5 text-xs font-medium text-ink-muted">{t('folder.attachments.title', { count: attachments.length })}</h3>
      <ul className="space-y-0.5">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="group flex items-center gap-2">
            <Icon name={isImageMime(attachment.mime_type) ? 'image' : 'paperclip'} size={14} className="text-ink-muted" />
            <button
              type="button"
              onClick={() => onOpen(attachment)}
              className="min-w-0 truncate rounded text-left hover:underline"
              title={t('folder.attachments.open', { name: attachment.name })}
            >
              {attachment.name}
            </button>
            <span className="shrink-0 text-xs tabular-nums text-ink-muted">{formatBytes(attachment.size_bytes)}</span>
            <button
              type="button"
              onClick={() => onRemove(attachment)}
              aria-label={t('folder.attachments.remove', { name: attachment.name })}
              className="ml-auto rounded p-1 text-ink-muted opacity-0 transition-opacity hover:text-red-700 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Icon name="trash" size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
