/**
 * Lienzo React Flow del canvas de carrera, estilo n8n. Ver docs/features/career-map.md.
 *
 * - Los nodos se arrastran y su posición se guarda (layout híbrido, ADR-012).
 * - Doble click o click derecho en el fondo → crear materia en ese punto.
 * - Si la carrera usa correlativas (ADR-013): unir el punto derecho de una
 *   materia con el izquierdo de otra crea una correlativa; click en una
 *   arista la quita. Sin correlativas, unirlas crea una "relación" (línea
 *   punteada sin flecha, migración 0014).
 * - Con años, las materias se acomodan en columnas por año con su título, y
 *   siempre hay un nodo de inicio con una línea a cada año (o a cada materia
 *   que no depende de otra): ninguna queda suelta.
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
import { StartNode, YearHeaderNode } from './MapMarkers'
import { computeCareerLayout, CAREER_NODE_WIDTH, CAREER_NODE_HEIGHT } from '../../../lib/graph/dagreLayout.js'
import { computeGridLayout, findFreeSpot, resolvePosition } from '../../../lib/graph/canvasPositions.js'
import { computeSubjectStates, describeBlockReason } from '../../../lib/graph/subjectStatus.js'
import { computeYearLayout, startPosition, startTargets, yearHeaderId } from '../../../lib/graph/careerStart.js'
import { PREREQUISITE_KIND_META, PREREQUISITE_KINDS } from '../../../constants/prerequisiteKinds.js'
import { useFlowCanvas } from '../../../hooks/useFlowCanvas.js'
import { useI18n } from '../../../hooks/useI18n.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { subject: SubjectNode, start: StartNode, yearHeader: YearHeaderNode }
/** Id del nodo de inicio (no es una materia). */
const START_ID = 'start'
/** Lo que comparten los nodos fijos: no se arrastran, no se eligen, no se conectan. */
const FIXED_NODE = { draggable: false, selectable: false, connectable: false }
const NODE_SIZE = { width: CAREER_NODE_WIDTH, height: CAREER_NODE_HEIGHT }

/** Un click con un temblor de pocos px no empieza a arrastrar la materia. */
const DRAG_THRESHOLD_PX = 4
/** Tras soltar una materia, durante este rato un click en su nombre no la abre. */
const DRAG_CLICK_GUARD_MS = 300

/**
 * @typedef {Object} CareerMapProps
 * @property {import('../../../types/models.js').Subject[]} subjects
 * @property {import('../../../types/models.js').Prerequisite[]} prerequisites
 * @property {boolean} usesPrerequisites
 * @property {string} careerName - Rótulo del nodo de inicio.
 * @property {(id: string, year: number|null) => void} onChangeYear
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
  careerName,
  onChangeYear,
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
  const { t, lang } = useI18n()
  const wrapperRef = useRef(null)
  const canvas = useFlowCanvas({ wrapperRef, onMove: onMoveSubjects })
  // El "+" de cada nodo necesita leer posiciones vivas de React Flow; va por un
  // ref (asignado más abajo) para no recrear todos los nodos en cada render.
  const requestNextRef = useRef(() => {})
  /** Cuándo terminó el último arrastre: soltar una materia no la abre (el nombre también se agarra). */
  const lastDragEndRef = useRef(0)

  // Sin correlativas, solo se ven las relaciones (no bloquean ni ordenan nada).
  const activePrerequisites = useMemo(
    () => (usesPrerequisites ? prerequisites : prerequisites.filter((p) => p.kind === PREREQUISITE_KINDS.relacion)),
    [usesPrerequisites, prerequisites],
  )
  const states = useMemo(() => computeSubjectStates(subjects, activePrerequisites), [subjects, activePrerequisites])

  // Con al menos una materia con año, el acomodo es en columnas por año.
  const yearLayout = useMemo(
    () => (subjects.some((subject) => subject.year != null) ? computeYearLayout(subjects, NODE_SIZE) : null),
    [subjects],
  )

  const autoPositions = useMemo(() => {
    if (yearLayout) return yearLayout.positions
    const hasLayoutEdges = activePrerequisites.some((p) => p.kind === PREREQUISITE_KINDS.cursar)
    return hasLayoutEdges
      ? computeCareerLayout(subjects, activePrerequisites)
      : computeGridLayout(
          subjects.map((subject) => subject.id),
          NODE_SIZE,
        )
  }, [subjects, activePrerequisites, yearLayout])

  const hasManualLayout = subjects.some((subject) => subject.pos_x != null)

  const subjectNodes = useMemo(
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
            blockReason: describeBlockReason(state, lang),
            usesPrerequisites,
            onNavigate: () => {
              if (Date.now() - lastDragEndRef.current < DRAG_CLICK_GUARD_MS) return
              onNavigateSubject(subject.id)
            },
            onChangeStatus: (status) => onChangeStatus(subject.id, status),
            onChangeYear: (year) => onChangeYear(subject.id, year),
            onEditPrerequisites: () => onEditPrerequisites(subject),
            onDelete: () => onDeleteSubject(subject),
            onAddNext: () => requestNextRef.current(subject),
          },
        }
      }),
    [subjects, states, autoPositions, usesPrerequisites, onNavigateSubject, onChangeStatus, onChangeYear, onEditPrerequisites, onDeleteSubject, lang],
  )

  /** Inicio + títulos de año: fijos, se recalculan con las posiciones de las materias. */
  const markerNodes = useMemo(() => {
    if (subjects.length === 0) return []
    const headers = (yearLayout?.columns ?? []).map((column) => ({
      id: yearHeaderId(column.year),
      type: 'yearHeader',
      position: { x: column.x, y: column.y },
      data: {
        virtual: true,
        label: column.year == null ? t('careerMap.map.noYear') : t('careerMap.map.yearHeader', { year: column.year }),
      },
      ...FIXED_NODE,
    }))
    const start = {
      id: START_ID,
      type: 'start',
      position: startPosition([...subjectNodes, ...headers].map((node) => node.position), NODE_SIZE),
      data: { virtual: true, label: careerName || t('careerMap.map.start') },
      ...FIXED_NODE,
    }
    return [start, ...headers]
  }, [subjects.length, subjectNodes, yearLayout, careerName, t])

  const computedNodes = useMemo(() => [...subjectNodes, ...markerNodes], [subjectNodes, markerNodes])

  const computedEdges = useMemo(() => {
    const subjectIds = new Set(subjects.map((subject) => subject.id))
    const prerequisiteEdges = activePrerequisites
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
        // La relación no tiene flecha: solo une.
        ...(PREREQUISITE_KIND_META[p.kind].arrow ? { markerEnd: { type: MarkerType.ArrowClosed } } : {}),
      }))
    // Línea de inicio: a cada año, o a cada materia que no depende de otra.
    const startEdges =
      subjects.length === 0
        ? []
        : startTargets(subjects, activePrerequisites, yearLayout?.columns ?? []).map((target) => ({
            id: `${START_ID}->${target}`,
            source: START_ID,
            target,
            selectable: false,
            focusable: false,
            style: { strokeWidth: 1.5, opacity: 0.45 },
          }))
    return [...prerequisiteEdges, ...startEdges]
  }, [activePrerequisites, subjects, yearLayout])

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
        nodesConnectable
        nodeDragThreshold={DRAG_THRESHOLD_PX}
        onNodeDragStop={(event, node, dragged) => {
          lastDragEndRef.current = Date.now()
          canvas.handleDragStop(event, node, dragged)
        }}
        onNodeDoubleClick={(_event, node) => {
          if (node.type === 'subject') onNavigateSubject(node.id)
        }}
        onConnect={({ source, target }) => onConnect({ requiresId: source, subjectId: target })}
        isValidConnection={({ source, target }) => source !== target && source !== START_ID && !target.startsWith('year:')}
        onEdgeClick={(_event, edge) => {
          if (edge.data?.prerequisite) onRemovePrerequisite(edge.data.prerequisite)
        }}
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
            ＋ {t('careerMap.map.addSubject')}
          </button>
          {hasManualLayout && (
            <button
              type="button"
              onClick={onResetLayout}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted shadow transition-colors hover:text-text"
              title={t('careerMap.map.resetTitle')}
            >
              ⟲ {t('careerMap.map.reset')}
            </button>
          )}
        </Panel>

        <Panel position="bottom-center" className="!mb-3 hidden rounded-lg bg-surface/90 px-3 py-1.5 text-[11px] text-text-muted shadow md:block">
          {t('careerMap.map.hint')}
          {usesPrerequisites ? t('careerMap.map.hintPrereq') : t('careerMap.map.hintRelated')}
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
            <span className="text-sm font-medium">{t('careerMap.map.addFirst')}</span>
            <span className="text-[11px]">{t('careerMap.map.orDoubleClick')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
