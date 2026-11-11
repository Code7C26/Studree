import { Icon } from '../../ui/Icon'
import { daysLeft, describeContents, trashItemTitle } from '../../../lib/trash/trashItems.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * Una fila de la papelera. Ver docs/features/trash.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').TrashItem} props.item
 * @param {() => void} props.onRestore
 * @param {() => void} props.onPurge - Pide confirmación (la hace la página).
 * @param {boolean} props.busy
 */
export function TrashItemRow({ item, onRestore, onPurge, busy }) {
  const { t } = useI18n()
  const where = item.kind === 'sheet' ? `${item.subject_name}, ${item.career_name}` : item.career_name
  const contents = describeContents(item)
  const days = daysLeft(item.deleted_at)

  return (
    <li className="flex flex-col gap-3 border-b border-border px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs text-text-muted">{t(`trash.kinds.${item.kind}`)}</p>
        <p className="truncate font-medium text-text" title={trashItemTitle(item)}>
          {trashItemTitle(item)}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {[where && t('trash.from', { where }), contents, days === 0 ? t('trash.deletesToday') : t('trash.deletesIn', { count: days })]
            .filter(Boolean)
            .join('. ')}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:border-accent hover:text-accent disabled:opacity-40"
        >
          <Icon name="restore" /> {t('trash.restore')}
        </button>
        <button
          type="button"
          onClick={onPurge}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-muted hover:text-red-300 disabled:opacity-40"
        >
          <Icon name="trash" /> {t('trash.purge')}
        </button>
      </div>
    </li>
  )
}
