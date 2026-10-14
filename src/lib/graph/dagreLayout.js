/**
 * Auto-layout de los canvas con dagre. Desde ADR-012 el layout es HÍBRIDO:
 * esto calcula la posición PROPUESTA de cada nodo, que se usa solo para los
 * nodos que el usuario todavía no acomodó a mano (ver canvasPositions.js).
 * "Reordenar" borra las posiciones guardadas y todo vuelve a lo de acá.
 *
 * Solo las correlativas de tipo `cursar` entran al grafo de layout: son las
 * que definen la progresión temporal ("cada nivel del layout equivale, en la
 * práctica, a un cuatrimestre alcanzable" — docs/features/career-map.md).
 * Mezclar los dos tipos en un mismo grafo podría cerrar un ciclo que la
 * validación NO detecta (se valida cada tipo por separado, ver
 * prerequisites.service.js), y dagre entra en bucle infinito con un grafo
 * circular (ver validateDag.js). Las de `rendir` igual se dibujan como
 * arista — solo no mueven el layout.
 */

import dagre from '@dagrejs/dagre'
import { computeGridLayout } from './canvasPositions.js'

export const CAREER_NODE_WIDTH = 220
export const CAREER_NODE_HEIGHT = 110

export const SHEET_NODE_WIDTH = 200
export const SHEET_NODE_HEIGHT = 76
/** Separación vertical entre el bloque de hojas conectadas y la grilla de sueltas. */
const LOOSE_SHEETS_GAP = 120

/**
 * @param {import('../../types/models.js').Subject[]} subjects
 * @param {import('../../types/models.js').Prerequisite[]} prerequisites
 * @returns {Map<string, {x: number, y: number}>} id de materia → posición (esquina superior izquierda).
 */
export function computeCareerLayout(subjects, prerequisites) {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 96 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const subject of subjects) {
    graph.setNode(subject.id, { width: CAREER_NODE_WIDTH, height: CAREER_NODE_HEIGHT })
  }

  for (const prerequisite of prerequisites) {
    if (prerequisite.kind !== 'cursar') continue
    if (!graph.hasNode(prerequisite.subject_id) || !graph.hasNode(prerequisite.requires_id)) continue
    // La arista de layout va de la REQUERIDA hacia la CONDICIONADA: dagre
    // ordena por rank en la dirección de la arista, y lo requerido tiene que
    // quedar a la izquierda (se cursa antes).
    graph.setEdge(prerequisite.requires_id, prerequisite.subject_id)
  }

  dagre.layout(graph)

  const positions = new Map()
  for (const subject of subjects) {
    const node = graph.node(subject.id)
    positions.set(subject.id, {
      x: node.x - CAREER_NODE_WIDTH / 2,
      y: node.y - CAREER_NODE_HEIGHT / 2,
    })
  }
  return positions
}

/**
 * Layout del canvas de materia (ADR-014): las HOJAS son los nodos y los
 * `[[links]]` entre ellas son las aristas (ADR-015).
 *
 * - Las hojas conectadas se ordenan con dagre `LR` (origen → enlazada).
 * - Las hojas sueltas (sin ningún link) van en grilla DEBAJO del bloque de
 *   dagre: dagre sin aristas apila todo en una columna larguísima.
 *
 * Los links pueden formar ciclos (A enlaza B y B enlaza A, algo normal en
 * apuntes): dagre los tolera porque invierte aristas internamente con
 * `acyclicer: 'greedy'`. A diferencia de las correlativas, acá NO se valida DAG.
 *
 * @param {Array<{id: string}>} sheets
 * @param {Array<{source_id: string, target_id: string}>} links
 * @returns {Map<string, {x: number, y: number}>} id de hoja → posición (esquina superior izquierda).
 */
export function computeSheetLayout(sheets, links) {
  const ids = new Set(sheets.map((sheet) => sheet.id))
  const edges = links.filter((link) => ids.has(link.source_id) && ids.has(link.target_id))
  const connected = new Set(edges.flatMap((link) => [link.source_id, link.target_id]))

  const positions = new Map()
  let bottom = 0

  if (connected.size > 0) {
    const graph = new dagre.graphlib.Graph()
    graph.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 96, acyclicer: 'greedy' })
    graph.setDefaultEdgeLabel(() => ({}))
    for (const id of connected) graph.setNode(id, { width: SHEET_NODE_WIDTH, height: SHEET_NODE_HEIGHT })
    for (const link of edges) graph.setEdge(link.source_id, link.target_id)
    dagre.layout(graph)

    for (const id of connected) {
      const node = graph.node(id)
      const position = { x: node.x - SHEET_NODE_WIDTH / 2, y: node.y - SHEET_NODE_HEIGHT / 2 }
      positions.set(id, position)
      bottom = Math.max(bottom, position.y + SHEET_NODE_HEIGHT)
    }
    bottom += LOOSE_SHEETS_GAP
  }

  const loose = sheets.filter((sheet) => !connected.has(sheet.id)).map((sheet) => sheet.id)
  const grid = computeGridLayout(loose, { width: SHEET_NODE_WIDTH, height: SHEET_NODE_HEIGHT })
  for (const [id, position] of grid) positions.set(id, { x: position.x, y: position.y + bottom })

  return positions
}
