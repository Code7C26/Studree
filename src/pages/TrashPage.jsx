import { useState } from 'react'
import { useTrash } from '../hooks/useTrash.js'
import { TrashItemRow } from '../components/features/trash/TrashItemRow'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { TRASH_DAYS, purgeMessage } from '../lib/trash/trashItems.js'
import { useI18n } from '../hooks/useI18n.js'

/**
 * `/papelera`: lo borrado, para restaurar o borrar para siempre.
 * Ver docs/features/trash.md.
 */
export function TrashPage() {
  const { t } = useI18n()
  const { items, loading, error, restore, purge, nestedItems, emptyTrash } = useTrash()
  const [confirm, setConfirm] = useState(null) // { type: 'one', item, nested } | { type: 'all' }
  const [busy, setBusy] = useState(false)

  async function run(action) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  /** Antes de confirmar, averigua qué otros elementos listados se borran junto con este. */
  function askPurge(item) {
    return run(async () => {
      const nested = await nestedItems(item)
      setConfirm({ type: 'one', item, nested })
    })
  }

  async function handleConfirm() {
    const pending = confirm
    setConfirm(null)
    if (pending?.type === 'one') await run(() => purge(pending.item))
    if (pending?.type === 'all') await run(emptyTrash)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t('trash.title')}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {t('trash.help', { days: TRASH_DAYS })}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirm({ type: 'all' })}
            disabled={busy}
            className="self-start rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:border-red-800 hover:text-red-300 disabled:opacity-40 sm:self-auto"
          >
            {t('trash.emptyAll')}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="mt-10 text-center text-text-muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Icon name="trash" size={32} className="text-text-muted" />}
            title={t('trash.emptyTitle')}
            message={t('trash.emptyMessage')}
          />
        </div>
      ) : (
        <ul className="mt-6">
          {items.map((item) => (
            <TrashItemRow
              key={`${item.kind}:${item.id}`}
              item={item}
              busy={busy}
              onRestore={() => run(() => restore(item))}
              onPurge={() => askPurge(item)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirm != null}
        title={confirm?.type === 'all' ? t('trash.emptyAll') : t('trash.purgeTitle')}
        message={
          confirm?.type === 'all'
            ? t('trash.emptyAllMessage')
            : confirm
              ? purgeMessage(confirm.item, confirm.nested ?? [])
              : ''
        }
        confirmLabel={t('trash.purge')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
