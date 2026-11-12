/**
 * Interacciones compartidas por los canvas de React Flow con layout HÍBRIDO
 * (ADR-012): arrastrar y guardar posición, crear con doble click / click
 * derecho en el lienzo, y decidir dónde nace un nodo nuevo.
 *
 * Modelo mental:
 * - **Modo automático**: ningún nodo tiene posición guardada → todo lo ubica dagre.
 * - **Modo manual**: apenas el usuario arrastra un nodo (o crea uno en un punto
 *   concreto del lienzo), se "congelan" las posiciones de TODOS los nodos
 *   visibles. Si no, dagre recalcularía los no guardados alrededor del que se
 *   movió y el canvas se desacomodaría solo.
 * - "Reordenar" (en el hook de datos) borra todo y vuelve al modo automático.
 *
 * Cada nodo tiene que llevar `data.saved` (si su posición está guardada).
 * Tiene que usarse dentro de un `<ReactFlowProvider>`.
 */

import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

/**
 * @typedef {{id: string, x: number, y: number}} CanvasMove
 */

/**
 * @param {Object} params
 * @param {React.RefObject<HTMLDivElement>} params.wrapperRef - Contenedor del lienzo.
 * @param {(moves: CanvasMove[]) => void} params.onMove - Guarda posiciones.
 * @returns {{
 *   isManual: () => boolean,
 *   pointFromEvent: (event: React.MouseEvent) => {x: number, y: number},
 *   viewportCenter: () => {x: number, y: number},
 *   occupiedPositions: () => Array<{x: number, y: number}>,
 *   positionOf: (nodeId: string) => {x: number, y: number}|null,
 *   freezeLayout: (extra?: CanvasMove[]) => void,
 *   handleDragStop: (event: React.MouseEvent, node: Object, nodes: Object[]) => void,
 *   isPaneTarget: (event: React.MouseEvent) => boolean,
 * }}
 */
export function useFlowCanvas({ wrapperRef, onMove }) {
  const { screenToFlowPosition, getNodes, getNode } = useReactFlow()

  const isManual = useCallback(() => getNodes().some((node) => node.data?.saved), [getNodes])

  const pointFromEvent = useCallback(
    (event) => screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    [screenToFlowPosition],
  )

  const viewportCenter = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
  }, [wrapperRef, screenToFlowPosition])

  /** Materias del lienzo: los nodos fijos (`data.virtual`: inicio, títulos de año) no cuentan. */
  const realNodes = useCallback(() => getNodes().filter((node) => !node.data?.virtual), [getNodes])

  const occupiedPositions = useCallback(() => realNodes().map((node) => node.position), [realNodes])

  const positionOf = useCallback((nodeId) => getNode(nodeId)?.position ?? null, [getNode])

  /** Guarda la posición actual de todos los nodos que todavía no la tenían (+ `extra`). */
  const freezeLayout = useCallback(
    (extra = []) => {
      const extraIds = new Set(extra.map((move) => move.id))
      const unsaved = realNodes()
        .filter((node) => !node.data?.saved && !extraIds.has(node.id))
        .map((node) => ({ id: node.id, x: node.position.x, y: node.position.y }))
      const moves = [...unsaved, ...extra]
      if (moves.length > 0) onMove(moves)
    },
    [realNodes, onMove],
  )

  const handleDragStop = useCallback(
    (_event, _node, draggedNodes) => {
      const moved = draggedNodes.filter((node) => !node.data?.virtual)
      freezeLayout(moved.map((node) => ({ id: node.id, x: node.position.x, y: node.position.y })))
    },
    [freezeLayout],
  )

  /** Si el evento ocurrió sobre el fondo del lienzo (no sobre un nodo o un control). */
  const isPaneTarget = useCallback(
    (event) => event.target instanceof Element && event.target.classList.contains('react-flow__pane'),
    [],
  )

  return { isManual, pointFromEvent, viewportCenter, occupiedPositions, positionOf, freezeLayout, handleDragStop, isPaneTarget }
}
