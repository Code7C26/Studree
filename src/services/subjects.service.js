import { STORAGE_KEYS } from '../constants/storageKeys'
import { DEFAULT_COLOR } from '../constants/palette'
import { readStorage, writeStorage } from './storage.service'
import { generateId } from '../lib/id'
import { deleteNodesBySubject } from './nodes.service'

/**
 * CRUD de materias. Persiste en localStorage. Borrado en cascada de sus nodos.
 * Ver docs/DB_SCHEMA.md y docs/features/folders-and-subjects.md.
 */

/** @returns {import('../types/models.js').Subject[]} */
export function getAllSubjects() {
  return readStorage(STORAGE_KEYS.subjects, [])
}

/**
 * Materias de una carpeta.
 * @param {string} folderId
 * @returns {import('../types/models.js').Subject[]}
 */
export function getSubjects(folderId) {
  return getAllSubjects().filter((subject) => subject.folderId === folderId)
}

/**
 * @param {string} id
 * @returns {import('../types/models.js').Subject|undefined}
 */
export function getSubject(id) {
  return getAllSubjects().find((subject) => subject.id === id)
}

/**
 * @param {{folderId: string, name: string, color?: string}} data
 * @returns {import('../types/models.js').Subject}
 */
export function createSubject({ folderId, name, color = DEFAULT_COLOR }) {
  const now = Date.now()
  /** @type {import('../types/models.js').Subject} */
  const subject = {
    id: generateId(),
    folderId,
    name: name.trim(),
    color,
    createdAt: now,
    updatedAt: now,
  }
  writeStorage(STORAGE_KEYS.subjects, [...getAllSubjects(), subject])
  return subject
}

/**
 * @param {string} id
 * @param {Partial<import('../types/models.js').Subject>} updates
 * @returns {import('../types/models.js').Subject|undefined}
 */
export function updateSubject(id, updates) {
  let updated
  const next = getAllSubjects().map((subject) => {
    if (subject.id !== id) return subject
    updated = { ...subject, ...updates, updatedAt: Date.now() }
    return updated
  })
  writeStorage(STORAGE_KEYS.subjects, next)
  return updated
}

/**
 * Borra una materia y, en cascada, sus nodos.
 * @param {string} id
 */
export function deleteSubject(id) {
  writeStorage(
    STORAGE_KEYS.subjects,
    getAllSubjects().filter((subject) => subject.id !== id),
  )
  deleteNodesBySubject(id)
}

/**
 * Cascada: borra todas las materias de una carpeta (y los nodos de cada una).
 * @param {string} folderId
 */
export function deleteSubjectsByFolder(folderId) {
  const toDelete = getSubjects(folderId)
  writeStorage(
    STORAGE_KEYS.subjects,
    getAllSubjects().filter((subject) => subject.folderId !== folderId),
  )
  for (const subject of toDelete) deleteNodesBySubject(subject.id)
}
