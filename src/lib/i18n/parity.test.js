import { test } from 'node:test'
import assert from 'node:assert/strict'
import es from './es/index.js'
import en from './en/index.js'

const isPlural = (value) => value && typeof value === 'object' && ('one' in value || 'other' in value)

/** Aplana un diccionario a `{ 'a.b.c': valor }`; un plural `{one, other}` es una hoja. */
function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !isPlural(value)) flatten(value, path, out)
    else out[path] = value
  }
  return out
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

const flatEs = flatten(es)
const flatEn = flatten(en)

test('es y en tienen exactamente las mismas claves', () => {
  const onlyEs = Object.keys(flatEs).filter((key) => !(key in flatEn))
  const onlyEn = Object.keys(flatEn).filter((key) => !(key in flatEs))
  assert.deepEqual({ onlyEs, onlyEn }, { onlyEs: [], onlyEn: [] })
})

test('cada clave tiene los mismos {marcadores} y las mismas formas de plural en ambos idiomas', () => {
  const problems = []
  for (const key of Object.keys(flatEs)) {
    if (!(key in flatEn)) continue
    const a = flatEs[key]
    const b = flatEn[key]
    if (isPlural(a) !== isPlural(b)) {
      problems.push(`${key}: plural en un idioma y no en el otro`)
    } else if (isPlural(a)) {
      if (Object.keys(a).sort().join() !== Object.keys(b).sort().join()) problems.push(`${key}: formas de plural distintas`)
      for (const form of Object.keys(a)) {
        if (placeholders(a[form]) !== placeholders(b[form])) problems.push(`${key}.${form}: marcadores distintos`)
      }
    } else if (placeholders(a) !== placeholders(b)) {
      problems.push(`${key}: marcadores distintos`)
    }
  }
  assert.deepEqual(problems, [])
})

test('ningún texto en inglés está vacío (salvo que el castellano también lo sea: renglones en blanco de una muestra)', () => {
  const textsOf = (flat) =>
    Object.entries(flat).flatMap(([key, value]) =>
      isPlural(value) ? Object.entries(value).map(([form, text]) => [`${key}.${form}`, text]) : [[key, value]],
    )
  const spanish = new Map(textsOf(flatEs))
  const empty = textsOf(flatEn)
    .filter(([key, text]) => typeof text !== 'string' || (text.trim() === '' && spanish.get(key) !== ''))
    .map(([key]) => key)
  assert.deepEqual(empty, [])
})
