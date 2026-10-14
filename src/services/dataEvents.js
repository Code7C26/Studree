/**
 * Aviso global de "cambió la estructura de datos" (crear / renombrar / borrar).
 *
 * El explorador lateral y el command palette se arman con su propio árbol
 * (`useExplorerTree`), independiente del estado de cada página. Sin este aviso,
 * crear una materia en el canvas no aparecía en el explorador hasta recargar.
 *
 * Lo emiten los services después de una escritura EXITOSA; lo escucha
 * `useExplorerTree`. Los guardados de alta frecuencia (posiciones de nodos,
 * autosave del editor) NO lo emiten: no cambian la estructura del árbol.
 */

const EVENT_NAME = 'studree:data-changed'

/** Notifica que la estructura de datos cambió. */
export function notifyDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_NAME))
}

/**
 * Se suscribe al aviso.
 * @param {() => void} listener
 * @returns {() => void} Función para desuscribirse.
 */
export function onDataChanged(listener) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
