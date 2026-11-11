/** Idiomas de la interfaz (Fase 18). El primero es el de respaldo. */
export const LANGS = Object.freeze(['es', 'en'])

/**
 * Idioma inicial: el guardado si es válido; si no, el del navegador (`en*` → inglés, todo lo
 * demás → castellano).
 * @param {string|null|undefined} stored - Lo guardado en localStorage.
 * @param {string|undefined} browserLang - `navigator.language`.
 * @returns {'es'|'en'}
 */
export function detectLang(stored, browserLang) {
  if (stored === 'es' || stored === 'en') return stored
  return typeof browserLang === 'string' && browserLang.toLowerCase().startsWith('en') ? 'en' : 'es'
}
