import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getNodes,
  createNode,
  updateNode,
  deleteNode,
} from '../services/nodes.service'
import { computeTreeLayout } from '../lib/treeLayout'

/**
 * Estado + acciones del mapa conceptual de una materia.
 * @param {string} subjectId
 */
export function useConceptMap(subjectId) {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setNodes(getNodes(subjectId))
  }, [subjectId])

  useEffect(() => {
    setLoading(true)
    refresh()
    setLoading(false)
  }, [refresh])

  const addTopic = useCallback(
    ({ label, parentId }) => {
      createNode({ subjectId, label, parentId })
      refresh()
    },
    [subjectId, refresh],
  )

  const toggleComplete = useCallback(
    (id) => {
      const node = nodes.find((item) => item.id === id)
      if (!node) return
      updateNode(id, { completed: !node.completed })
      refresh()
    },
    [nodes, refresh],
  )

  // Persiste la posición tras arrastrar, sin refrescar el estado (no interrumpe el drag).
  const moveNode = useCallback((id, position) => {
    updateNode(id, { position })
  }, [])

  const removeTopic = useCallback(
    (id) => {
      deleteNode(id)
      refresh()
    },
    [refresh],
  )

  /** Progreso 0-100 = temas completados / total. */
  const progress = useMemo(() => {
    if (nodes.length === 0) return 0
    const done = nodes.filter((node) => node.completed).length
    return Math.round((done / nodes.length) * 100)
  }, [nodes])

  /** Posiciones del auto-layout jerárquico (para nodos sin posición manual). */
  const layout = useMemo(() => computeTreeLayout(nodes), [nodes])

  return {
    nodes,
    layout,
    loading,
    progress,
    addTopic,
    toggleComplete,
    moveNode,
    removeTopic,
  }
}
