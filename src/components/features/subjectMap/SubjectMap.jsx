/**
 * Lienzo React Flow del canvas de materia (ADR-014), estilo n8n: las HOJAS son
 * los nodos y los `[[links]]` entre ellas, las aristas (ADR-015).
 * Ver docs/features/subject-map.md.
 *
 * - Los nodos se arrastran y su posición se guarda (layout híbrido, ADR-012).
 * - Unir el punto derecho de una hoja con el izquierdo de otra las enlaza;
 *   click en una flecha pide quitar el enlace.
 * - "+" en una hoja → hoja nueva enlazada desde esa.
 * - Doble click o click derecho en el fondo → hoja nueva en ese punto.
 * - Click / doble click en una hoja → se abre en el editor.
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
import { SheetNode } from './SheetNode'
import { computeSheetLayout, SHEET_NODE_WIDTH, SHEET_NODE_HEIGHT } from '../../../lib/graph/dagreLayout.js'
import { findFreeSpot, resolvePosition } from '../../../lib/graph/canvasPositions.js'
import { useFlowCanvas } from '../../../hooks/useFlowCanvas.js'

// Referencia estable: React Flow recrea todos los nodos si `nodeTypes` cambia de identidad.
const nodeTypes = { sheet: SheetNode }
const NODE_SIZE = { width: SHEET_NODE_WIDTH, height: SHEET_NODE_HEIGHT }

/**
 * @typedef {Object} SubjectMapProps
 * @property {import('../../../types/models.js').Sheet[]} sheets
 * @property {import('../../../types/models.js').SheetLink[]} links
 * @property {(sheet: import('../../../types/models.js').Sheet) => void} onOpenSheet
 * @property {(sheet: import('../../../types/models.js').Sheet) => void} onDeleteSheet
 * @property {(request: {position: {x: number, y: number}|null, linkFrom: import('../../../types/models.js').Sheet|null}) => void} onRequestCreate
 * @property {(sourceId: string, targetId: string) => void} onConnect
 * @property {(link: import('../../../types/models.js').SheetLink) => void} onRemoveLink
 * @property {(moves: Array<{id: string, x: number, y: number}>) => void} onMoveNodes
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
function SubjectMapCanvas({
  sheets,
  links,
  onOpenSheet,
  onDeleteSheet,
  onRequestCreate,
  onConnect,
  onRemoveLink,
  onMoveNodes,
  onResetLayout,
}) {
  const wrapperRef = useRef(null)
  const canvas = useFlowCanvas({ wrapperRef, onMove: onMoveNodes })
  // El "+" de cada nodo lee posiciones vivas de React Flow: va por ref (asignado
  // más abajo) para no recrear todos los nodos en cada render.
  const requestLinkedRef = useRef(() => {})

  const autoPositions = useMemo(() => computeSheetLayout(sheets, links), [sheets, links])
  const hasManualLayout = sheets.some((sheet) => sheet.pos_x != null)

  const linkCounts = useMemo(() => {
    const counts = new Map()
    for (const link of links) {
      counts.set(link.source_id, (counts.get(link.source_id) ?? 0) + 1)
      counts.set(link.target_id, (counts.get(link.target_id) ?? 0) + 1)
    }
    return counts
  }, [links])

  const computedNodes = useMemo(
    () =>
      sheets.map((sheet) => ({
        id: sheet.id,
        type: 'sheet',
        position: resolvePosition(sheet.pos_x, sheet.pos_y, autoPositions.get(sheet.id)),
        data: {
          sheet,
          saved: sheet.pos_x != null && sheet.pos_y != null,
          linkCount: linkCounts.get(sheet.id) ?? 0,
          onOpen: () => onOpenSheet(sheet),
          onDelete: () => onDeleteSheet(sheet),
          onAddLinked: () => requestLinkedRef.current(sheet),
        },
      })),
    [sheets, autoPositions, linkCounts, onOpenSheet, onDeleteSheet],
  )

  const computedEdges = useMemo(() => {
    const ids = new Set(sheets.map((sheet) => sheet.id))
    return links
      .filter((link) => ids.has(link.source_id) && ids.has(link.target_id))
      .map((link) => ({
        id: link.id,
        source: link.source_id,
        target: link.target_id,
        data: { link },
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
  }, [links, sheets])

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges)

  // La estructura de datos manda: cada cambio de datos (incluidas las
  // posiciones guardadas) recalcula nodos y aristas.
  useEffect(() => setNodes(computedNodes), [computedNodes, setNodes])
  useEffect(() => setEdges(computedEdges), [computedEdges, setEdges])

  requestLinkedRef.current = (sheet) => {
    const origin = canvas.positionOf(sheet.id)
    const position =
      canvas.isManual() && origin
        ? findFreeSpot(
            { x: origin.x + SHEET_NODE_WIDTH + 80, y: origin.y },
            canvas.occupiedPositions(),
            { x: 0, y: SHEET_NODE_HEIGHT + 30 },
            NODE_SIZE,
          )
        : null
    onRequestCreate({ position, linkFrom: sheet })
  }

  function requestCreateAtCenter() {
    const position = canvas.isManual()
      ? findFreeSpot(canvas.viewportCenter(), canvas.occupiedPositions(), { x: 0, y: SHEET_NODE_HEIGHT + 30 }, NODE_SIZE)
      : null
    onRequestCreate({ position, linkFrom: null })
  }

  /** Doble click / click derecho en el fondo: la hoja nace en ese punto. */
  function requestCreateAtPointer(event) {
    if (!canvas.isPaneTarget(event)) return
    event.preventDefault()
    const point = canvas.pointFromEvent(event)
    canvas.freezeLayout()
    onRequestCreate({
      position: { x: point.x - SHEET_NODE_WIDTH / 2, y: point.y - SHEET_NODE_HEIGHT / 2 },
      linkFrom: null,
    })
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
        onNodeDragStop={canvas.handleDragStop}
        onNodeDoubleClick={(_event, node) => onOpenSheet(node.data.sheet)}
        onConnect={({ source, target }) => onConnect(source, target)}
        isValidConnection={({ source, target }) => source !== target}
        onEdgeClick={(_event, edge) => onRemoveLink(edge.data.link)}
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
            ＋ Hoja
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
          Doble click en el lienzo: nueva hoja · Uní los puntos para enlazar dos hojas · Click en una flecha para quitar el
          enlace · Escribí [[Título]] en una hoja para enlazarla
        </Panel>
      </ReactFlow>

      {sheets.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={requestCreateAtCenter}
            className="pointer-events-auto flex w-56 flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface/80 px-6 py-8 text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span className="text-3xl" aria-hidden="true">
              ＋
            </span>
            <span className="text-sm font-medium">Crear la primera hoja</span>
            <span className="text-[11px]">o hacé doble click en el lienzo</span>
          </button>
        </div>
      )}
    </div>
  )
}
