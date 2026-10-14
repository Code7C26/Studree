/**
 * Lienzo React Flow del canvas de materia (Materia → Unidad → Tema), estilo n8n.
 * Ver docs/features/subject-map.md.
 *
 * - Los nodos se arrastran y su posición se guarda (layout híbrido, ADR-012).
 * - "+" en la materia → unidad nueva; "+" en una unidad → tema nuevo.
 * - Doble click o click derecho en el fondo → unidad nueva en ese punto.
 * - Click en un tema → panel de hojas (el canvas corta en Tema).
 */

import { useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SubjectRootNode } from './SubjectRootNode'
import { UnitNode } from './UnitNode'
import { TopicNode } from './TopicNode'
import { computeSubjectMapLayout, SUBJECT_MAP_NODE_WIDTH, SUBJECT_MAP_NODE_HEIGHT } from '../../../lib/graph/dagreLayout.js'
import { findFreeSpot, resolvePosition } from '../../../lib/graph/canvasPositions.js'
import { useFlowCanvas } from '../../../hooks/useFlowCanvas.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { subject: SubjectRootNode, unit: UnitNode, topic: TopicNode }
const NODE_SIZE = { width: SUBJECT_MAP_NODE_WIDTH, height: SUBJECT_MAP_NODE_HEIGHT }
/** Distancia vertical entre un padre y sus hijos nuevos, y horizontal entre hermanos. */
const CHILD_OFFSET = { x: SUBJECT_MAP_NODE_WIDTH + 32, y: SUBJECT_MAP_NODE_HEIGHT + 80 }

/**
 * @typedef {Object} SubjectMapProps
 * @property {import('../../../types/models.js').Subject} subject
 * @property {import('../../../hooks/useSubjectMap.js').UnitWithTopics[]} units
 * @property {(topic: import('../../../types/models.js').Topic) => void} onOpenTopic
 * @property {(unit: import('../../../types/models.js').Unit) => void} onDeleteUnit
 * @property {(unit: import('../../../types/models.js').Unit, topic: import('../../../types/models.js').Topic) => void} onDeleteTopic
 * @property {(request: {kind: 'unit'|'topic', unit?: import('../../../types/models.js').Unit, position: {x: number, y: number}|null}) => void} onRequestCreate
 * @property {(moves: Array<{id: string, x: number, y: number}>) => void} onMoveNodes - `id` = id de nodo con prefijo.
 * @property {() => void} onResetLayout
 */

/** @param {SubjectMapProps} props */
export function SubjectMap(props) {
  return (
    <ReactFlowProvider>
      <SubjectMapCanvas {...props} />
    </ReactFlowProvider>
  )
}

/** @param {SubjectMapProps} props */
function SubjectMapCanvas({ subject, units, onOpenTopic, onDeleteUnit, onDeleteTopic, onRequestCreate, onMoveNodes, onResetLayout }) {
  const wrapperRef = useRef(null)
  const canvas = useFlowCanvas({ wrapperRef, onMove: onMoveNodes })
  // Los "+" leen posiciones vivas de React Flow: van por ref (asignado abajo)
  // para no recrear todos los nodos en cada render.
  const requestChildRef = useRef(() => {})

  const rootId = `subject:${subject.id}`
  const autoPositions = useMemo(() => computeSubjectMapLayout(subject.id, units), [subject.id, units])

  const hasManualLayout =
    subject.map_x != null || units.some((unit) => unit.pos_x != null || unit.topics.some((topic) => topic.pos_x != null))

  const computedNodes = useMemo(() => {
    const nodes = [
      {
        id: rootId,
        type: 'subject',
        position: resolvePosition(subject.map_x, subject.map_y, autoPositions.get(rootId)),
        data: {
          subject,
          saved: subject.map_x != null && subject.map_y != null,
          unitCount: units.length,
          onAddChild: () => requestChildRef.current(rootId, units.length, { kind: 'unit' }),
        },
      },
    ]
    for (const unit of units) {
      const unitId = `unit:${unit.id}`
      nodes.push({
        id: unitId,
        type: 'unit',
        position: resolvePosition(unit.pos_x, unit.pos_y, autoPositions.get(unitId)),
        data: {
          unit,
          saved: unit.pos_x != null && unit.pos_y != null,
          topicCount: unit.topics.length,
          onAddChild: () => requestChildRef.current(unitId, unit.topics.length, { kind: 'topic', unit }),
          onDelete: () => onDeleteUnit(unit),
        },
      })
      for (const topic of unit.topics) {
        const topicId = `topic:${topic.id}`
        nodes.push({
          id: topicId,
          type: 'topic',
          position: resolvePosition(topic.pos_x, topic.pos_y, autoPositions.get(topicId)),
          data: {
            topic,
            saved: topic.pos_x != null && topic.pos_y != null,
            sheetCount: topic.sheetCount,
            onOpen: () => onOpenTopic(topic),
            onDelete: () => onDeleteTopic(unit, topic),
          },
        })
      }
    }
    return nodes
  }, [rootId, subject, units, autoPositions, onOpenTopic, onDeleteUnit, onDeleteTopic])

  const computedEdges = useMemo(() => {
    const edge = (source, target) => ({
      id: `${source}->${target}`,
      source,
      target,
      style: { strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
    })
    return units.flatMap((unit) => [
      edge(rootId, `unit:${unit.id}`),
      ...unit.topics.map((topic) => edge(`unit:${unit.id}`, `topic:${topic.id}`)),
    ])
  }, [rootId, units])

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges)

  // La estructura de datos manda: cada cambio de datos (incluidas las
  // posiciones guardadas) recalcula nodos y aristas.
  useEffect(() => setNodes(computedNodes), [computedNodes, setNodes])
  useEffect(() => setEdges(computedEdges), [computedEdges, setEdges])

  /**
   * "+" de un nodo: en modo manual el hijo nace debajo del padre, en el
   * primer lugar libre; en modo automático lo ubica dagre.
   */
  requestChildRef.current = (parentNodeId, siblingCount, request) => {
    const origin = canvas.positionOf(parentNodeId)
    const position =
      canvas.isManual() && origin
        ? findFreeSpot(
            { x: origin.x + (siblingCount > 0 ? CHILD_OFFSET.x * 0.5 : 0), y: origin.y + CHILD_OFFSET.y },
            canvas.occupiedPositions(),
            { x: CHILD_OFFSET.x, y: 0 },
            NODE_SIZE,
          )
        : null
    onRequestCreate({ ...request, position })
  }

  function requestUnitAtCenter() {
    requestChildRef.current(rootId, units.length, { kind: 'unit' })
  }

  /** Doble click / click derecho en el fondo: la unidad nace en ese punto. */
  function requestUnitAtPointer(event) {
    if (!canvas.isPaneTarget(event)) return
    event.preventDefault()
    const point = canvas.pointFromEvent(event)
    canvas.freezeLayout()
    onRequestCreate({
      kind: 'unit',
      position: { x: point.x - SUBJECT_MAP_NODE_WIDTH / 2, y: point.y - SUBJECT_MAP_NODE_HEIGHT / 2 },
    })
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-bg"
      onDoubleClick={requestUnitAtPointer}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable={false}
        onNodeDragStop={canvas.handleDragStop}
        onNodeDoubleClick={(_event, node) => {
          if (node.type === 'topic') onOpenTopic(node.data.topic)
        }}
        onPaneContextMenu={requestUnitAtPointer}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />

        <Panel position="top-left" className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={requestUnitAtCenter} className="btn-accent px-3 py-1.5 text-sm shadow">
            ＋ Unidad
          </button>
          {hasManualLayout && (
            <button
              type="button"
              onClick={onResetLayout}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted shadow transition-colors hover:text-text"
              title="Volver al acomodo automático"
            >
              ⟲ Reordenar
            </button>
          )}
        </Panel>

        <Panel position="bottom-center" className="!mb-3 hidden rounded-lg bg-surface/90 px-3 py-1.5 text-[11px] text-text-muted shadow md:block">
          ＋ en la materia: nueva unidad · ＋ en una unidad: nuevo tema · Click en un tema: sus hojas · Doble click en el
          lienzo: unidad ahí
        </Panel>
      </ReactFlow>
    </div>
  )
}
