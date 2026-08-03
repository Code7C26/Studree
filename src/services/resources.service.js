import { STORAGE_KEYS } from '../constants/storageKeys'
import { readStorage, writeStorage } from './storage.service'
import { generateId } from '../lib/id'

/**
 * CRUD de recursos (apuntes/enlaces/videos/archivos) asociados a un nodo del mapa.
 * Persiste en localStorage. Ver docs/DB_SCHEMA.md y docs/features/resources.md.
 */

/** @returns {import('../types/models.js').Resource[]} */
export function getAllResources() {
  return readStorage(STORAGE_KEYS.resources, [])
}

/**
 * Recursos de un nodo.
 * @param {string} nodeId
 * @returns {import('../types/models.js').Resource[]}
 */
export function getResources(nodeId) {
  return getAllResources().filter((resource) => resource.nodeId === nodeId)
}

/**
 * @param {{nodeId: string, type: string, title: string, content: string}} data
 * @returns {import('../types/models.js').Resource}
 */
export function createResource({ nodeId, type, title, content }) {
  /** @type {import('../types/models.js').Resource} */
  const resource = {
    id: generateId(),
    nodeId,
    type,
    title: title.trim(),
    content: content.trim(),
    createdAt: Date.now(),
  }
  writeStorage(STORAGE_KEYS.resources, [...getAllResources(), resource])
  return resource
}

/**
 * @param {string} id
 * @param {Partial<import('../types/models.js').Resource>} updates
 * @returns {import('../types/models.js').Resource|undefined}
 */
export function updateResource(id, updates) {
  let updated
  const next = getAllResources().map((resource) => {
    if (resource.id !== id) return resource
    updated = { ...resource, ...updates }
    return updated
  })
  writeStorage(STORAGE_KEYS.resources, next)
  return updated
}

/** @param {string} id */
export function deleteResource(id) {
  writeStorage(
    STORAGE_KEYS.resources,
    getAllResources().filter((resource) => resource.id !== id),
  )
}

/**
 * Cascada: borra los recursos de un conjunto de nodos.
 * @param {string[]} nodeIds
 */
export function deleteResourcesByNodes(nodeIds) {
  const ids = new Set(nodeIds)
  writeStorage(
    STORAGE_KEYS.resources,
    getAllResources().filter((resource) => !ids.has(resource.nodeId)),
  )
}
