/**
 * Capa base de persistencia sobre localStorage.
 * Aísla el acceso a localStorage para poder migrar a un backend en el futuro
 * (ver ADR-003 en docs/02-architecture.md). Los services de cada feature
 * (materias, nodos, recursos) se apoyarán en estos helpers.
 */

/**
 * Lee y parsea un valor de localStorage.
 * @template T
 * @param {string} key - Clave (usar STORAGE_KEYS de constants/storageKeys.js).
 * @param {T} fallback - Valor por defecto si no existe o falla el parseo.
 * @returns {T}
 */
export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.error(`[storage] Error leyendo "${key}":`, error)
    return fallback
  }
}

/**
 * Serializa y guarda un valor en localStorage.
 * @param {string} key - Clave (usar STORAGE_KEYS de constants/storageKeys.js).
 * @param {unknown} value - Valor a guardar (se serializa con JSON.stringify).
 * @returns {boolean} true si se guardó correctamente.
 */
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`[storage] Error guardando "${key}":`, error)
    return false
  }
}
