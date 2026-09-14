/**
 * Cache optimista sobre localStorage (ADR-007).
 *
 * REGLA CENTRAL: esto NO es la base de datos, es una copia descartable para que
 * la UI pinte instantáneo mientras la lectura real viaja a Supabase. Ante
 * cualquier conflicto GANA SUPABASE. Borrar esta cache no debe perder ningún dato.
 *
 * Por eso acá no hay lógica de negocio ni resolución de conflictos: solo
 * leer / escribir / invalidar. Reemplaza a `storage.service.js` del modelo viejo.
 */

import { STORAGE_KEYS } from '../constants/storageKeys.js'

/**
 * Lee un valor de la cache.
 * @template T
 * @param {string} key - Clave (usar STORAGE_KEYS).
 * @param {T} fallback - Valor por defecto si no existe o el JSON está corrupto.
 * @returns {T}
 */
export function readCache(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.warn(`[cache] No se pudo leer "${key}":`, error)
    return fallback
  }
}

/**
 * Escribe un valor en la cache.
 * Nunca lanza: si falla (modo privado, cuota llena), la app tiene que seguir
 * funcionando igual, porque la fuente de verdad es Supabase.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} true si se guardó.
 */
export function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[cache] No se pudo guardar "${key}":`, error)
    return false
  }
}

/**
 * Borra una entrada de la cache.
 * @param {string} key
 */
export function clearCache(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`[cache] No se pudo borrar "${key}":`, error)
  }
}

/**
 * Clave de cache de una colección, opcionalmente acotada a un padre.
 * Ej. `cacheKey('subjects', careerId)` → `studree:cache:subjects:<careerId>`.
 * @param {string} collection
 * @param {string} [parentId]
 * @returns {string}
 */
export function cacheKey(collection, parentId) {
  const base = `${STORAGE_KEYS.cachePrefix}${collection}`
  return parentId ? `${base}:${parentId}` : base
}

/**
 * Borra TODAS las entradas de cache de Studree.
 * Se usa al cerrar sesión: la cache de un usuario no puede quedar visible para
 * el siguiente que inicie sesión en el mismo navegador.
 */
export function clearAllCache() {
  try {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEYS.cachePrefix)) toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)
  } catch (error) {
    console.warn('[cache] No se pudo limpiar la cache:', error)
  }
}
