import { useCallback, useEffect, useState } from 'react'
import {
  getResources,
  createResource as createResourceSvc,
  updateResource as updateResourceSvc,
  deleteResource as deleteResourceSvc,
} from '../services/resources.service'

/**
 * Estado + acciones de los recursos de un nodo (tema).
 * @param {string|undefined} nodeId
 */
export function useResources(nodeId) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setResources(nodeId ? getResources(nodeId) : [])
  }, [nodeId])

  useEffect(() => {
    setLoading(true)
    refresh()
    setLoading(false)
  }, [refresh])

  const addResource = useCallback(
    (data) => {
      if (!nodeId) return
      createResourceSvc({ ...data, nodeId })
      refresh()
    },
    [nodeId, refresh],
  )

  const editResource = useCallback(
    (id, updates) => {
      updateResourceSvc(id, updates)
      refresh()
    },
    [refresh],
  )

  const removeResource = useCallback(
    (id) => {
      deleteResourceSvc(id)
      refresh()
    },
    [refresh],
  )

  return { resources, loading, addResource, editResource, removeResource }
}
