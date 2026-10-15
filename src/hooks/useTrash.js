/**
 * Estado de la página de la papelera. Ver docs/features/trash.md.
 */

import { useCallback, useEffect, useState } from 'react'
import { trashService, TABLE_BY_KIND } from '../services/trash.service.js'

/**
 * @returns {{
 *   items: import('../types/models.js').TrashItem[],
 *   loading: boolean,
 *   error: string|null,
 *   restore: (item: import('../types/models.js').TrashItem) => Promise<string|null>,
 *   purge: (item: import('../types/models.js').TrashItem) => Promise<string|null>,
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

  const drop = (item) => setItems((current) => current.filter((candidate) => candidate.id !== item.id))

  const restore = useCallback(async (item) => {
    const { error: restoreError } = await trashService.restore(TABLE_BY_KIND[item.kind], item.id)
    if (restoreError) {
      setError(restoreError)
      return restoreError
    }
    drop(item)
    return null
  }, [])

  const purge = useCallback(async (item) => {
    const { error: purgeError } = await trashService.purgeForever(item.kind, item.id)
    if (purgeError) {
      setError(purgeError)
      return purgeError
    }
    drop(item)
    return null
  }, [])

  const emptyTrash = useCallback(async () => {
    for (const item of items) {
      const failure = await purge(item)
      if (failure) return failure
    }
    return null
  }, [items, purge])

  return { items, loading, error, restore, purge, emptyTrash, reload }
}
