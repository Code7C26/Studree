import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clearAllCache } from './cache.service.js'

/** localStorage falso en memoria. */
function installLocalStorage(initial) {
  const map = new Map(Object.entries(initial))
  globalThis.localStorage = {
    get length() { return map.size },
    key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: (key) => { map.delete(key) },
  }
  return map
}

test('clearAllCache borra la cache y las preferencias, pero conserva el idioma', () => {
  const map = installLocalStorage({
    'studree:ui:lang': 'en',
    'studree:cache:x': '1',
    'studree:ui:tabs': '[]',
    'otra-app:clave': 'queda',
  })
  clearAllCache()
  assert.deepEqual([...map.keys()].sort(), ['otra-app:clave', 'studree:ui:lang'])
})
