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

export const CAREER_NODE_WIDTH = 220
export const CAREER_NODE_HEIGHT = 110


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
