import { STORAGE_KEYS } from '../constants/storageKeys'
import { DEFAULT_COLOR } from '../constants/palette'
import { readStorage, writeStorage } from './storage.service'
import { generateId } from '../lib/id'
import { deleteSubjectsByFolder } from './subjects.service'

/**
 * CRUD de carpetas (carreras/cursos). Persiste en localStorage.
 * Borrado en cascada de sus materias (y los nodos de esas materias).
 * Ver docs/DB_SCHEMA.md y docs/features/folders-and-subjects.md.
 */

/** @returns {import('../types/models.js').Folder[]} */
export function getFolders() {
  return readStorage(STORAGE_KEYS.folders, [])
}

/**
 * @param {string} id
 * @returns {import('../types/models.js').Folder|undefined}
 */
export function getFolder(id) {
  return getFolders().find((folder) => folder.id === id)
}

/**
 * @param {{name: string, color?: string}} data
 * @returns {import('../types/models.js').Folder}
 */
export function createFolder({ name, color = DEFAULT_COLOR }) {
  const now = Date.now()
  /** @type {import('../types/models.js').Folder} */
  const folder = {
    id: generateId(),
    name: name.trim(),
    color,
    createdAt: now,
    updatedAt: now,
  }
  writeStorage(STORAGE_KEYS.folders, [...getFolders(), folder])
  return folder
}

/**
 * @param {string} id
 * @param {Partial<import('../types/models.js').Folder>} updates
 * @returns {import('../types/models.js').Folder|undefined}
 */
export function updateFolder(id, updates) {
  let updated
  const next = getFolders().map((folder) => {
    if (folder.id !== id) return folder
    updated = { ...folder, ...updates, updatedAt: Date.now() }
    return updated
  })
  writeStorage(STORAGE_KEYS.folders, next)
  return updated
}

/**
 * Borra una carpeta y, en cascada, sus materias y los nodos de esas materias.
 * @param {string} id
 */
export function deleteFolder(id) {
  writeStorage(
    STORAGE_KEYS.folders,
    getFolders().filter((folder) => folder.id !== id),
  )
  deleteSubjectsByFolder(id)
}
