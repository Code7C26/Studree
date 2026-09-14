/**
 * Lienzo React Flow del canvas de carrera. Ver docs/features/career-map.md.
 */

import { useEffect, useMemo } from 'react'
import { ReactFlow, Background, Controls, MiniMap, MarkerType, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SubjectNode } from './SubjectNode'
import { computeCareerLayout } from '../../../lib/graph/dagreLayout.js'
import { computeSubjectStates, describeBlockReason } from '../../../lib/graph/subjectStatus.js'
import { PREREQUISITE_KIND_META } from '../../../constants/prerequisiteKinds.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { subject: SubjectNode }

/**
 * @param {Object} props
 * @param {import('../../../types/models.js').Subject[]} props.subjects
 * @param {import('../../../types/models.js').Prerequisite[]} props.prerequisites
 * @param {(id: string) => void} props.onNavigateSubject
 * @param {(id: string, status: import('../../../types/models.js').SubjectStatus) => void} props.onChangeStatus
 * @param {(subject: import('../../../types/models.js').Subject) => void} props.onEditPrerequisites
 * @param {(id: string) => void} props.onDeleteSubject
 */
export function CareerMap({ subjects, prerequisites, onNavigateSubject, onChangeStatus, onEditPrerequisites, onDeleteSubject }) {
  const states = useMemo(() => computeSubjectStates(subjects, prerequisites), [subjects, prerequisites])
  const positionById = useMemo(() => computeCareerLayout(subjects, prerequisites), [subjects, prerequisites])

  const computedNodes = useMemo(
    () =>
      subjects.map((subject) => {
        const state = states.get(subject.id)
        return {
          id: subject.id,
          type: 'subject',
          position: positionById.get(subject.id) ?? { x: 0, y: 0 },
          data: {
            subject,
            status: state.status,
            blockReason: describeBlockReason(state),
            onNavigate: () => onNavigateSubject(subject.id),
            onChangeStatus: (status) => onChangeStatus(subject.id, status),
            onEditPrerequisites: () => onEditPrerequisites(subject),
            onDelete: () => onDeleteSubject(subject.id),
          },
        }
      }),
    [subjects, states, positionById, onNavigateSubject, onChangeStatus, onEditPrerequisites, onDeleteSubject],
  )

  const computedEdges = useMemo(() => {
    const subjectIds = new Set(subjects.map((subject) => subject.id))
    return prerequisites
      .filter((p) => subjectIds.has(p.subject_id) && subjectIds.has(p.requires_id))
      .map((p) => ({
        id: p.id,
        source: p.requires_id,
        target: p.subject_id,
        style: PREREQUISITE_KIND_META[p.kind].dashed ? { strokeDasharray: '5 5' } : undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
  }, [prerequisites, subjects])

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges)

  // La estructura de datos manda (ADR-008): cada cambio recalcula nodos/aristas
  // desde cero, no se editan a mano.
  useEffect(() => setNodes(computedNodes), [computedNodes, setNodes])
  useEffect(() => setEdges(computedEdges), [computedEdges, setEdges])

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-xl border border-border bg-bg">
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
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
