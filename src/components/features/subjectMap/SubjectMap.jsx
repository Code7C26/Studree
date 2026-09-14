/**
 * Lienzo React Flow del canvas de materia (Unidad → Tema). Ver docs/features/subject-map.md.
 */

import { useEffect, useMemo } from 'react'
import { ReactFlow, Background, Controls, MarkerType, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { UnitNode } from './UnitNode'
import { TopicNode } from './TopicNode'
import { computeSubjectMapLayout } from '../../../lib/graph/dagreLayout.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { unit: UnitNode, topic: TopicNode }

/**
 * @param {Object} props
 * @param {import('../../../hooks/useSubjectMap.js').UnitWithTopics[]} props.units
 * @param {(topic: import('../../../types/models.js').Topic) => void} props.onOpenTopic
 * @param {(unitId: string) => void} props.onDeleteUnit
 * @param {(unitId: string, topicId: string) => void} props.onDeleteTopic
 */
export function SubjectMap({ units, onOpenTopic, onDeleteUnit, onDeleteTopic }) {
  const positionById = useMemo(() => computeSubjectMapLayout(units), [units])

  const computedNodes = useMemo(() => {
    const nodes = []
    for (const unit of units) {
      nodes.push({
        id: `unit:${unit.id}`,
        type: 'unit',
        position: positionById.get(`unit:${unit.id}`) ?? { x: 0, y: 0 },
        data: { unit, topicCount: unit.topics.length, onDelete: () => onDeleteUnit(unit.id) },
      })
      for (const topic of unit.topics) {
        nodes.push({
          id: `topic:${topic.id}`,
          type: 'topic',
          position: positionById.get(`topic:${topic.id}`) ?? { x: 0, y: 0 },
          data: {
            topic,
            sheetCount: topic.sheetCount,
            onOpen: () => onOpenTopic(topic),
            onDelete: () => onDeleteTopic(unit.id, topic.id),
          },
        })
      }
    }
    return nodes
  }, [units, positionById, onOpenTopic, onDeleteUnit, onDeleteTopic])

  const computedEdges = useMemo(
    () =>
      units.flatMap((unit) =>
        unit.topics.map((topic) => ({
          id: `${unit.id}->${topic.id}`,
          source: `unit:${unit.id}`,
          target: `topic:${topic.id}`,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      ),
    [units],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges)

  // La estructura de datos manda (ADR-008): cada cambio recalcula nodos/aristas
  // desde cero, no se editan a mano.
  useEffect(() => setNodes(computedNodes), [computedNodes, setNodes])
  useEffect(() => setEdges(computedEdges), [computedEdges, setEdges])

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-xl border border-border bg-bg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
