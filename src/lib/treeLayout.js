/**
 * Auto-layout jerárquico para el mapa conceptual (raíz arriba, ramas hacia abajo).
 * Algoritmo clásico de árbol: las hojas se distribuyen horizontalmente y cada padre
 * se centra sobre sus hijos. La profundidad define la coordenada vertical.
 *
 * Los nodos con `position` manual (arrastrados por el usuario) NO se recalculan: eso
 * se resuelve en el hook, que prioriza la posición guardada sobre la calculada aquí.
 */

const H_GAP = 200 // separación horizontal entre hojas
const V_GAP = 130 // separación vertical entre niveles

/**
 * Calcula posiciones {x, y} para un conjunto de nodos de árbol.
 * Los nodos cuyo `parentId` no existe en la lista se tratan como raíces.
 * @param {import('../types/models.js').TreeNode[]} nodes
 * @returns {Record<string, {x: number, y: number}>} mapa id -> posición
 */
export function computeTreeLayout(nodes) {
  const ids = new Set(nodes.map((n) => n.id))

  /** @type {Map<string, import('../types/models.js').TreeNode[]>} */
  const childrenOf = new Map()
  for (const node of nodes) {
    const key = node.parentId && ids.has(node.parentId) ? node.parentId : '__root__'
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key).push(node)
  }

  /** @type {Record<string, {x: number, y: number}>} */
  const positions = {}
  let nextLeafX = 0

  /**
   * Coloca recursivamente un nodo y devuelve su coordenada x (centro del subárbol).
   * @param {import('../types/models.js').TreeNode} node
   * @param {number} depth
   * @returns {number}
   */
  function place(node, depth) {
    const children = childrenOf.get(node.id) ?? []
    let x
    if (children.length === 0) {
      x = nextLeafX * H_GAP
      nextLeafX += 1
    } else {
      const childXs = children.map((child) => place(child, depth + 1))
      x = (childXs[0] + childXs[childXs.length - 1]) / 2
    }
    positions[node.id] = { x, y: depth * V_GAP }
    return x
  }

  const roots = childrenOf.get('__root__') ?? []
  for (const root of roots) place(root, 0)

  return positions
}
