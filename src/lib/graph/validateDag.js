/**
 * Validación de que el grafo de correlativas sea un DAG (sin ciclos) — ADR-009.
 *
 * POR QUÉ ACÁ Y NO AL RENDERIZAR: dagre entra en bucle con un grafo circular, así
 * que un ciclo rompería el canvas en tiempo de render, tarde y sin poder atribuir
 * la causa. Se valida ANTES de escribir en la base: si el alta cerraría un ciclo,
 * se rechaza y se le muestra al usuario el ciclo concreto.
 *
 * Semántica de las aristas: `subject_id` REQUIERE `requires_id`.
 * O sea, la flecha apunta de la materia condicionada hacia la que debe estar
 * aprobada antes.
 */

/**
 * Arista mínima del grafo de correlativas.
 * @typedef {{subject_id: string, requires_id: string}} PrerequisiteEdge
 */

/**
 * Construye la lista de adyacencia: materia → materias que requiere.
 * @param {PrerequisiteEdge[]} edges
 * @returns {Map<string, string[]>}
 */
function buildAdjacency(edges) {
  /** @type {Map<string, string[]>} */
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.subject_id)) adjacency.set(edge.subject_id, [])
    adjacency.get(edge.subject_id).push(edge.requires_id)
  }
  return adjacency
}

/**
 * Busca un camino dirigido de `from` a `to` (búsqueda en profundidad iterativa).
 * Iterativa a propósito: una carrera con muchas correlativas encadenadas podría
 * desbordar la pila con recursión.
 * @param {Map<string, string[]>} adjacency
 * @param {string} from
 * @param {string} to
 * @returns {string[]|null} Camino `[from, ..., to]`, o null si no hay.
 */
function findPath(adjacency, from, to) {
  /** @type {Map<string, string|null>} */
  const cameFrom = new Map([[from, null]])
  const stack = [from]

  while (stack.length > 0) {
    const current = stack.pop()

    if (current === to) {
      const path = []
      for (let node = to; node != null; node = cameFrom.get(node)) path.push(node)
      return path.reverse()
    }

    for (const next of adjacency.get(current) ?? []) {
      if (!cameFrom.has(next)) {
        cameFrom.set(next, current)
        stack.push(next)
      }
    }
  }

  return null
}

/**
 * Determina si agregar la correlativa `subjectId → requiresId` cerraría un ciclo.
 *
 * Razonamiento: la arista nueva dice "subject requiere requires". Eso cierra un
 * ciclo si y solo si `requires` YA depende (directa o indirectamente) de `subject`.
 *
 * @param {PrerequisiteEdge[]} edges - Correlativas existentes (del mismo `kind` o de todos, según se quiera validar).
 * @param {string} subjectId - Materia condicionada.
 * @param {string} requiresId - Materia requerida.
 * @returns {string[]|null} El ciclo que se formaría, como `[subjectId, requiresId, ..., subjectId]`, o null si es seguro.
 */
export function wouldCreateCycle(edges, subjectId, requiresId) {
  // Caso trivial: una materia no puede ser correlativa de sí misma.
  // (La base también lo rechaza con el CHECK `no_self_prerequisite`.)
  if (subjectId === requiresId) return [subjectId, subjectId]

  const adjacency = buildAdjacency(edges)
  const pathBack = findPath(adjacency, requiresId, subjectId)
  if (!pathBack) return null

  // pathBack = [requiresId, ..., subjectId] → el ciclo completo cierra en subjectId.
  return [subjectId, ...pathBack]
}

/**
 * Busca un ciclo en un grafo completo (DFS de 3 colores).
 * Se usa como red de seguridad sobre datos ya guardados: filas creadas antes de
 * que existiera esta validación, o editadas a mano en el dashboard de Supabase.
 * @param {PrerequisiteEdge[]} edges
 * @returns {string[]|null} Un ciclo `[a, b, ..., a]`, o null si el grafo es un DAG.
 */
export function findCycle(edges) {
  const adjacency = buildAdjacency(edges)

  const WHITE = 0 // sin visitar
  const GRAY = 1 // en la rama que se está explorando
  const BLACK = 2 // terminado

  /** @type {Map<string, number>} */
  const color = new Map()
  /** @type {Map<string, string>} */
  const parent = new Map()

  /** @type {string[]} */
  const nodes = []
  for (const edge of edges) {
    nodes.push(edge.subject_id, edge.requires_id)
  }

  for (const start of new Set(nodes)) {
    if ((color.get(start) ?? WHITE) !== WHITE) continue

    // DFS iterativa con marca de post-orden para pintar de negro al salir.
    const stack = [{ node: start, entering: true }]

    while (stack.length > 0) {
      const frame = stack.pop()

      if (!frame.entering) {
        color.set(frame.node, BLACK)
        continue
      }

      if ((color.get(frame.node) ?? WHITE) !== WHITE) continue

      color.set(frame.node, GRAY)
      stack.push({ node: frame.node, entering: false })

      for (const next of adjacency.get(frame.node) ?? []) {
        const nextColor = color.get(next) ?? WHITE

        if (nextColor === GRAY) {
          // `next` es ancestro de `frame.node`: se cierra el ciclo.
          const cycle = []
          for (let node = frame.node; node !== next; node = parent.get(node)) {
            cycle.push(node)
          }
          cycle.push(next)
          cycle.reverse()
          cycle.push(next)
          return cycle
        }

        if (nextColor === WHITE) {
          parent.set(next, frame.node)
          stack.push({ node: next, entering: true })
        }
      }
    }
  }

  return null
}

/**
 * Traduce un ciclo de IDs a un texto legible para mostrarle al usuario.
 * Sin esto el error sería inútil: nadie puede accionar sobre una lista de UUIDs.
 * @param {string[]} cycle - Ciclo devuelto por `wouldCreateCycle` o `findCycle`.
 * @param {Map<string, string>} namesById - id → nombre de la materia.
 * @returns {string} Ej. "Análisis II → Álgebra → Análisis II".
 */
export function formatCycle(cycle, namesById) {
  return cycle.map((id) => namesById.get(id) ?? id).join(' → ')
}
