import { LANGS, detectLang } from './detectLang.js'

/**
 * @typedef {Record<string, unknown>} Dictionary
 * @typedef {{get: () => string|null, set: (lang: string) => void}} LangStorage
 */

/** Busca `a.b.c` dentro de un diccionario anidado. */
function lookup(dictionary, key) {
  let node = dictionary
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object' || !(part in node)) return undefined
    node = /** @type {Record<string, unknown>} */ (node)[part]
  }
  return node
}

/** Una hoja del diccionario es un texto o un plural `{one, other}`. */
function resolveText(entry, values) {
  if (typeof entry === 'string') return entry
  if (entry && typeof entry === 'object' && ('one' in entry || 'other' in entry)) {
    const form = values && values.count === 1 ? 'one' : 'other'
    return typeof entry[form] === 'string' ? entry[form] : entry.other ?? entry.one
  }
  return undefined
}

/**
 * Crea una instancia de i18n: idioma activo, `t`, suscripción y persistencia.
 * Es JS puro (sin React ni `window`): lo usan por igual componentes, hooks, `lib/` y `services/`.
 *
 * @param {{dictionaries: {es: Dictionary, en: Dictionary}, storage: LangStorage, browserLang: () => string|undefined, onChange?: (lang: string) => void}} options
 */
export function createI18n({ dictionaries, storage, browserLang, onChange }) {
  const listeners = new Set()

  /** @param {() => unknown} read */
  const safely = (read) => {
    try {
      return read()
    } catch {
      return undefined
    }
  }

  /** @type {'es'|'en'} */
  let lang = detectLang(safely(() => storage.get()) ?? null, safely(() => browserLang()))

  /**
   * Traduce una clave. Si falta en el idioma activo cae al castellano y, si tampoco está,
   * devuelve la propia clave: nunca un texto vacío.
   * @param {string} key
   * @param {Record<string, string|number>} [values]
   * @returns {string}
   */
  function t(key, values) {
    const text = resolveText(lookup(dictionaries[lang], key), values) ?? resolveText(lookup(dictionaries.es, key), values)
    if (text === undefined) return key
    return values ? text.replace(/\{(\w+)\}/g, (marker, name) => (name in values ? String(values[name]) : marker)) : text
  }

  /** @returns {'es'|'en'} */
  const getLang = () => lang

  /** @param {string} next */
  function setLang(next) {
    if (next !== 'es' && next !== 'en') return
    if (next === lang) return
    lang = next
    safely(() => storage.set(next))
    safely(() => onChange?.(next))
    for (const listener of [...listeners]) listener()
  }

  /**
   * @param {() => void} listener
   * @returns {() => void} Para dejar de escuchar.
   */
  function subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return { t, getLang, setLang, subscribe, LANGS }
}
