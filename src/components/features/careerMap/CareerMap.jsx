/**
 * Lienzo React Flow del canvas de carrera, estilo n8n. Ver docs/features/career-map.md.
 *
 * - Los nodos se arrastran y su posición se guarda (layout híbrido, ADR-012).
 * - Doble click o click derecho en el fondo → crear materia en ese punto.
 * - Si la carrera usa correlativas (ADR-013): unir el punto derecho de una
 *   materia con el izquierdo de otra crea una correlativa; click en una
 *   arista la quita.
 */

import { useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SubjectNode } from './SubjectNode'
import { computeCareerLayout, CAREER_NODE_WIDTH, CAREER_NODE_HEIGHT } from '../../../lib/graph/dagreLayout.js'
import { computeGridLayout, findFreeSpot, resolvePosition } from '../../../lib/graph/canvasPositions.js'
import { computeSubjectStates, describeBlockReason } from '../../../lib/graph/subjectStatus.js'
import { PREREQUISITE_KIND_META, PREREQUISITE_KINDS } from '../../../constants/prerequisiteKinds.js'
import { useFlowCanvas } from '../../../hooks/useFlowCanvas.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { subject: SubjectNode }
const NODE_SIZE = { width: CAREER_NODE_WIDTH, height: CAREER_NODE_HEIGHT }

/**
 * @typedef {Object} CareerMapProps
 * @property {import('../../../types/models.js').Subject[]} subjects
 * @property {import('../../../types/models.js').Prerequisite[]} prerequisites
 * @property {boolean} usesPrerequisites
 * @property {(id: string) => void} onNavigateSubject
 * @property {(id: string, status: import('../../../types/models.js').SubjectStatus) => void} onChangeStatus
 * @property {(subject: import('../../../types/models.js').Subject) => void} onEditPrerequisites
 * @property {(subject: import('../../../types/models.js').Subject) => void} onDeleteSubject
 * @property {(request: {position: {x: number, y: number}|null, requires: import('../../../types/models.js').Subject|null}) => void} onRequestCreate
 * @property {(connection: {requiresId: string, subjectId: string}) => void} onConnect
 * @property {(prerequisite: import('../../../types/models.js').Prerequisite) => void} onRemovePrerequisite
 * @property {(moves: Array<{id: string, x: number, y: number}>) => void} onMoveSubjects
 * @property {() => void} onResetLayout
 */

/** @param {CareerMapProps} props */
export function CareerMap(props) {
  return (
    <ReactFlowProvider>
      <CareerMapCanvas {...props} />
    </ReactFlowProvider>
  )
}

/** @param {CareerMapProps} props */
function CareerMapCanvas({
  subjects,
  prerequisites,
  usesPrerequisites,
  onNavigateSubject,
  onChangeStatus,
  onEditPrerequisites,
  onDeleteSubject,
  onRequestCreate,
  onConnect,
  onRemovePrerequisite,
  onMoveSubjects,
  onResetLayout,
}) {
  const wrapperRef = useRef(null)
  const canvas = useFlowCanvas({ wrapperRef, onMove: onMoveSubjects })
  // El "+" de cada nodo necesita leer posiciones vivas de React Flow; va por un
  // ref (asignado más abajo) para no recrear todos los nodos en cada render.
  const requestNextRef = useRef(() => {})

  // Sin correlativas, el grafo no tiene aristas: no se calculan bloqueos ni se dibujan.
  const activePrerequisites = useMemo(
    () => (usesPrerequisites ? prerequisites : []),
    [usesPrerequisites, prerequisites],
  )
  const states = useMemo(() => computeSubjectStates(subjects, activePrerequisites), [subjects, activePrerequisites])

  const autoPositions = useMemo(() => {
    const hasLayoutEdges = activePrerequisites.some((p) => p.kind === PREREQUISITE_KINDS.cursar)
    return hasLayoutEdges
      ? computeCareerLayout(subjects, activePrerequisites)
      : computeGridLayout(
          subjects.map((subject) => subject.id),
          NODE_SIZE,
        )
  }, [subjects, activePrerequisites])

  const hasManualLayout = subjects.some((subject) => subject.pos_x != null)

  const computedNodes = useMemo(
    () =>
      subjects.map((subject) => {
        const state = states.get(subject.id)
        return {
          id: subject.id,
          type: 'subject',
          position: resolvePosition(subject.pos_x, subject.pos_y, autoPositions.get(subject.id)),
          data: {
            subject,
            saved: subject.pos_x != null && subject.pos_y != null,
            status: state.status,
            blockReason: describeBlockReason(state),
            usesPrerequisites,
            onNavigate: () => onNavigateSubject(subject.id),
            onChangeStatus: (status) => onChangeStatus(subject.id, status),
            onEditPrerequisites: () => onEditPrerequisites(subject),
            onDelete: () => onDeleteSubject(subject),
            onAddNext: () => requestNextRef.current(subject),
          },
        }
      }),
    [subjects, states, autoPositions, usesPrerequisites, onNavigateSubject, onChangeStatus, onEditPrerequisites, onDeleteSubject],
  )

  const computedEdges = useMemo(() => {
    const subjectIds = new Set(subjects.map((subject) => subject.id))
    return activePrerequisites
      .filter((p) => subjectIds.has(p.subject_id) && subjectIds.has(p.requires_id))
      .map((p) => ({
        id: p.id,
        source: p.requires_id,
        target: p.subject_id,
        data: { prerequisite: p },
        style: {
          strokeWidth: 2,
          ...(PREREQUISITE_KIND_META[p.kind].dashed ? { strokeDasharray: '6 4' } : {}),
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
  }, [activePrerequisites, subjects])

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges)

  // La estructura de datos manda: cada cambio de datos (incluidas las
  // posiciones guardadas) recalcula nodos y aristas.
  useEffect(() => setNodes(computedNodes), [computedNodes, setNodes])
  useEffect(() => setEdges(computedEdges), [computedEdges, setEdges])

  requestNextRef.current = (subject) => {
    const origin = canvas.positionOf(subject.id)
    const position =
      canvas.isManual() && origin
        ? findFreeSpot({ x: origin.x + CAREER_NODE_WIDTH + 80, y: origin.y }, canvas.occupiedPositions(), { x: 0, y: CAREER_NODE_HEIGHT + 30 }, NODE_SIZE)
        : null
    onRequestCreate({ position, requires: usesPrerequisites ? subject : null })
  }

  function requestCreateAtCenter() {
    const position = canvas.isManual()
      ? findFreeSpot(canvas.viewportCenter(), canvas.occupiedPositions(), { x: 0, y: CAREER_NODE_HEIGHT + 30 }, NODE_SIZE)
      : null
    onRequestCreate({ position, requires: null })
  }

  /** Doble click / click derecho en el fondo: la materia nace en ese punto. */
  function requestCreateAtPointer(event) {
    if (!canvas.isPaneTarget(event)) return
    event.preventDefault()
    const point = canvas.pointFromEvent(event)
    canvas.freezeLayout()
    onRequestCreate({ position: { x: point.x - CAREER_NODE_WIDTH / 2, y: point.y - 30 }, requires: null })
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-bg"
      onDoubleClick={requestCreateAtPointer}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable={usesPrerequisites}
        onNodeDragStop={canvas.handleDragStop}
        onNodeDoubleClick={(_event, node) => onNavigateSubject(node.id)}
        onConnect={({ source, target }) => onConnect({ requiresId: source, subjectId: target })}
        isValidConnection={({ source, target }) => source !== target}
        onEdgeClick={(_event, edge) => onRemovePrerequisite(edge.data.prerequisite)}
        onPaneContextMenu={requestCreateAtPointer}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.1 }}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!hidden sm:!block" />

        <Panel position="top-left" className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={requestCreateAtCenter} className="btn-accent px-3 py-1.5 text-sm shadow">
            ＋ Materia
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
          Doble click en el lienzo: nueva materia · Arrastrá para mover
          {usesPrerequisites && ' · Uní los puntos para crear una correlativa · Click en una flecha para quitarla'}
        </Panel>
      </ReactFlow>

      {subjects.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={requestCreateAtCenter}
            className="pointer-events-auto flex w-56 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface/80 px-6 py-8 text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span className="text-3xl" aria-hidden="true">
              ＋
            </span>
            <span className="text-sm font-medium">Agregar primera materia</span>
            <span className="text-[11px]">o hacé doble click en el lienzo</span>
          </button>
        </div>
      )}
    </div>
  )
}
