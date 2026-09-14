/**
 * Auto-layout del canvas de carrera con dagre (ADR-008): las posiciones de los
 * nodos se calculan SIEMPRE a partir de las correlativas, nunca se persisten.
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

export const CAREER_NODE_WIDTH = 200
export const CAREER_NODE_HEIGHT = 88

export const SUBJECT_MAP_NODE_WIDTH = 180
export const SUBJECT_MAP_NODE_HEIGHT = 64

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
 * Layout del canvas de materia: Unidad → Tema. Es un árbol (cada tema cuelga
 * de una sola unidad), así que ya es un DAG por construcción — no hace falta
 * validar ciclos acá (a diferencia del canvas de carrera).
 *
 * Los ids de nodo llevan prefijo (`unit:`/`topic:`) porque unidades y temas
 * son tablas distintas: sin el prefijo, un id de unidad y uno de tema podrían
 * (en teoría) pisarse en el mismo grafo.
 *
 * @param {Array<import('../../types/models.js').Unit & {topics: import('../../types/models.js').Topic[]}>} units
 * @returns {Map<string, {x: number, y: number}>} `"unit:<id>"`/`"topic:<id>"` → posición.
 */
export function computeSubjectMapLayout(units) {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 64 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const unit of units) {
    const unitNodeId = `unit:${unit.id}`
    graph.setNode(unitNodeId, { width: SUBJECT_MAP_NODE_WIDTH, height: SUBJECT_MAP_NODE_HEIGHT })

    for (const topic of unit.topics) {
      const topicNodeId = `topic:${topic.id}`
      graph.setNode(topicNodeId, { width: SUBJECT_MAP_NODE_WIDTH, height: SUBJECT_MAP_NODE_HEIGHT })
      graph.setEdge(unitNodeId, topicNodeId)
    }
  }

  dagre.layout(graph)

  const positions = new Map()
  for (const nodeId of graph.nodes()) {
    const node = graph.node(nodeId)
    positions.set(nodeId, {
      x: node.x - SUBJECT_MAP_NODE_WIDTH / 2,
      y: node.y - SUBJECT_MAP_NODE_HEIGHT / 2,
    })
  }
  return positions
}
