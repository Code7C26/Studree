/**
 * Estado de la página de la papelera. Ver docs/features/trash.md.
 *
 * Después de restaurar o borrar SIEMPRE se recarga la lista (no se saca el
 * elemento a mano): restaurar una hoja revive su materia y su carrera, y
 * borrar una carrera arrastra materias listadas aparte. Una lista vieja no
 * debe quedar en pantalla ni usarse para "Vaciar papelera".
 */

import { useCallback, useEffect, useState } from 'react'
import { trashService, TABLE_BY_KIND } from '../services/trash.service.js'
import { nestedTrashItems } from '../lib/trash/trashItems.js'

/**
 * @returns {{
 *   items: import('../types/models.js').TrashItem[],
 *   loading: boolean,
 *   error: string|null,
 *   restore: (item: import('../types/models.js').TrashItem) => Promise<string|null>,
 *   purge: (item: import('../types/models.js').TrashItem) => Promise<string|null>,
 *   nestedItems: (item: import('../types/models.js').TrashItem) => Promise<import('../types/models.js').TrashItem[]>,
 *   emptyTrash: () => Promise<string|null>,
 *   reload: () => Promise<void>,
 * }}
 */
export function useTrash() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: listError } = await trashService.list()
    setItems(data)
    setError(listError)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  /** Recarga y, si hubo error, lo deja a la vista (la recarga lo limpiaría). */
  const finish = useCallback(
    async (failure) => {
      await reload()
      if (failure) setError(failure)
      return failure
    },
    [reload],
  )

  const restore = useCallback(
    async (item) => {
      const { error: restoreError } = await trashService.restore(TABLE_BY_KIND[item.kind], item.id)
      return finish(restoreError)
    },
    [finish],
  )

  const purge = useCallback(
    async (item) => {
      const { error: purgeError } = await trashService.purgeForever(item.kind, item.id)
      return finish(purgeError)
    },
    [finish],
  )

  /**
   * Otros elementos listados que se borran junto con `item` (para la
   * confirmación). Si no se pudo averiguar, lista vacía.
   */
  const nestedItems = useCallback(
    async (item) => {
      const { data: ids, error: idsError } = await trashService.trashedDescendantIds(item.kind, item.id)
      if (idsError || !ids) return []
      return nestedTrashItems(items, item, ids)
    },
    [items],
  )

  /** Vuelve a pedir la lista ANTES de borrar: nunca se vacía con una lista vieja. */
  const emptyTrash = useCallback(async () => {
    const { data: fresh, error: listError } = await trashService.list()
    if (listError) return finish(listError)
    for (const item of fresh) {
      const { error: purgeError } = await trashService.purgeForever(item.kind, item.id)
      if (purgeError) return finish(purgeError)
    }
    return finish(null)
  }, [finish])

  return { items, loading, error, restore, purge, nestedItems, emptyTrash, reload }
}
