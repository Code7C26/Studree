import { STORAGE_KEYS } from '../constants/storageKeys'
import { readStorage, writeStorage } from './storage.service'
import { generateId } from '../lib/id'
import { deleteResourcesByNodes } from './resources.service'

/**
 * CRUD de nodos del mapa conceptual (temas/conceptos). Persiste en localStorage.
 * Ver docs/DB_SCHEMA.md y docs/features/concept-map.md.
 */

/** @returns {import('../types/models.js').TreeNode[]} */
export function getAllNodes() {
  return readStorage(STORAGE_KEYS.nodes, [])
}

/**
 * Nodos de una materia.
 * @param {string} subjectId
 * @returns {import('../types/models.js').TreeNode[]}
 */
export function getNodes(subjectId) {
  return getAllNodes().filter((node) => node.subjectId === subjectId)
}

/**
 * Crea un tema (nodo). Sin `parentId` se crea como raíz.
 * @param {{subjectId: string, label: string, parentId?: string|null}} data
 * @returns {import('../types/models.js').TreeNode}
 */
export function createNode({ subjectId, label, parentId = null }) {
  /** @type {import('../types/models.js').TreeNode} */
  const node = {
    id: generateId(),
    subjectId,
    parentId: parentId ?? null,
    label: label.trim(),
    completed: false,
    position: null,
    createdAt: Date.now(),
  }
  writeStorage(STORAGE_KEYS.nodes, [...getAllNodes(), node])
  return node
}

/**
 * Actualiza campos de un nodo (label, completed, position...).
 * @param {string} id
 * @param {Partial<import('../types/models.js').TreeNode>} updates
 * @returns {import('../types/models.js').TreeNode|undefined}
 */
export function updateNode(id, updates) {
  let updated
  const next = getAllNodes().map((node) => {
    if (node.id !== id) return node
    updated = { ...node, ...updates }
    return updated
  })
  writeStorage(STORAGE_KEYS.nodes, next)
  return updated
}

/**
 * Borra un nodo y todos sus descendientes (cascada por `parentId`).
 * @param {string} id
 */
export function deleteNode(id) {
  const all = getAllNodes()
  const toDelete = new Set([id])

  // Propagar a los descendientes hasta que no haya más por agregar.
  let changed = true
  while (changed) {
    changed = false
    for (const node of all) {
      if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
        toDelete.add(node.id)
        changed = true
      }
    }
  }

  writeStorage(
    STORAGE_KEYS.nodes,
    all.filter((node) => !toDelete.has(node.id)),
  )
  deleteResourcesByNodes([...toDelete])
}

/**
 * Cascada: borra todos los nodos de una materia (y sus recursos).
 * @param {string} subjectId
 */
export function deleteNodesBySubject(subjectId) {
  const removedIds = getNodes(subjectId).map((node) => node.id)
  writeStorage(
    STORAGE_KEYS.nodes,
    getAllNodes().filter((node) => node.subjectId !== subjectId),
  )
  deleteResourcesByNodes(removedIds)
}
