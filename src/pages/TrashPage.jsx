import { useState } from 'react'
import { useTrash } from '../hooks/useTrash.js'
import { TrashItemRow } from '../components/features/trash/TrashItemRow'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { TRASH_DAYS, purgeMessage } from '../lib/trash/trashItems.js'

/**
 * `/papelera`: lo borrado, para restaurar o borrar para siempre.
 * Ver docs/features/trash.md.
 */
export function TrashPage() {
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
          <h1 className="font-display text-3xl font-bold">Papelera</h1>
          <p className="mt-1 text-sm text-text-muted">
            Lo que borrás queda acá {TRASH_DAYS} días. Después se borra solo, con sus adjuntos.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirm({ type: 'all' })}
            disabled={busy}
            className="self-start rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:border-red-800 hover:text-red-300 disabled:opacity-40 sm:self-auto"
          >
            Vaciar papelera
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="mt-10 text-center text-text-muted">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<Icon name="trash" size={32} className="text-text-muted" />}
            title="La papelera está vacía"
            message="Lo que borres va a aparecer acá."
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
        title={confirm?.type === 'all' ? 'Vaciar papelera' : 'Borrar para siempre'}
        message={
          confirm?.type === 'all'
            ? 'Se borra para siempre todo lo que está en la papelera, con sus adjuntos. No se puede deshacer.'
            : confirm
              ? purgeMessage(confirm.item, confirm.nested ?? [])
              : ''
        }
        confirmLabel="Borrar para siempre"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
