import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as copy from './landingCopy.js'

/** Recorre todas las cadenas del módulo de textos (objetos y arrays anidados). */
function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, out))
  return out
}

const strings = collectStrings(copy)

test('"Empezar gratis" entra a la app por "/"', () => {
  assert.equal(copy.START_PATH, '/')
})

test('el texto tiene contenido para revisar', () => {
  assert.ok(strings.length > 30)
})

test('los textos no usan emojis', () => {
  for (const text of strings) assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, text)
})

test('los textos no fijan precios, porcentajes ni monedas', () => {
  for (const text of strings) assert.doesNotMatch(text, /\$|USD|ARS|€|%|\bpesos?\b|\bd[oó]lares?\b/i, text)
})

test('los textos no inventan cifras de usuarios ni testimonios', () => {
  for (const text of strings) {
    assert.doesNotMatch(text, /\d+\s*(usuarios|estudiantes|alumnos)/i, text)
    assert.doesNotMatch(text, /testimonio|universidad de/i, text)
  }
})

test('la landing no promete que el Brote escriba solo', () => {
  assert.ok(copy.BROTE.guarantees.some((text) => /nunca escribe/i.test(text)))
})

test('los planes tienen las dos columnas con contenido', () => {
  assert.ok(copy.PLANS.free.length >= 4)
  assert.ok(copy.PLANS.premium.length >= 4)
})
