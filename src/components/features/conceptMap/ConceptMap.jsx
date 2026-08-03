import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TopicNode } from './TopicNode'

const nodeTypes = { topic: TopicNode }

/**
 * Lienzo del mapa conceptual (React Flow). Convierte los TreeNode del dominio en
 * nodos/edges de React Flow. Layout jerárquico por defecto + drag libre (híbrido).
 * @param {Object} props
 * @param {import('../../../types/models.js').TreeNode[]} props.nodes
 * @param {Record<string, {x:number, y:number}>} props.layout - Posiciones auto-layout.
 * @param {(id: string) => void} props.onToggle
 * @param {(parentId: string) => void} props.onAddChild
 * @param {(id: string) => void} props.onDelete
 * @param {(id: string, position: {x:number, y:number}) => void} props.onMove
 * @param {(node: import('../../../types/models.js').TreeNode) => void} props.onOpenResources
 * @param {Record<string, number>} props.resourceCounts - Recursos por nodo (para el badge).
 */
export function ConceptMap({
  nodes,
  layout,
  onToggle,
  onAddChild,
  onDelete,
  onMove,
  onOpenResources,
  resourceCounts,
}) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setRfEdges] = useEdgesState([])

  // Edges derivados de parentId (memoizados para no recrearlos en cada render).
  const edges = useMemo(
    () =>
      nodes
        .filter((node) => node.parentId)
        .map((node) => ({
          id: `${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
        })),
    [nodes],
  )

  useEffect(() => {
    setRfNodes(
      nodes.map((node) => ({
        id: node.id,
        type: 'topic',
        position: node.position ?? layout[node.id] ?? { x: 0, y: 0 },
        data: {
          label: node.label,
          completed: node.completed,
          resourceCount: resourceCounts[node.id] ?? 0,
          onToggle: () => onToggle(node.id),
          onOpen: () => onOpenResources(node),
          onAddChild: () => onAddChild(node.id),
          onDelete: () => onDelete(node.id),
        },
      })),
    )
  }, [
    nodes,
    layout,
    resourceCounts,
    onToggle,
    onOpenResources,
    onAddChild,
    onDelete,
    setRfNodes,
  ])

  useEffect(() => {
    setRfEdges(edges)
  }, [edges, setRfEdges])

  const handleNodeDragStop = useCallback(
    (_event, node) => {
      onMove(node.id, node.position)
    },
    [onMove],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onNodeDragStop={handleNodeDragStop}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
