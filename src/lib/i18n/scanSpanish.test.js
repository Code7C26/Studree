import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findSpanish } from './scanSpanish.js'

const texts = (source) => findSpanish(source).map((hit) => hit.text)

test('detecta literales con tilde, ñ, ¿ y ¡', () => {
  assert.deepEqual(texts("const a = 'Acción'"), ['Acción'])
  assert.deepEqual(texts('const a = "Año nuevo"'), ['Año nuevo'])
  assert.deepEqual(texts('const a = `¿Seguro?`'), ['¿Seguro?'])
})

test('detecta palabras de la lista corta aunque no lleven tilde', () => {
  assert.deepEqual(texts("const a = 'Guardar'"), ['Guardar'])
  assert.deepEqual(texts('<button>Cancelar</button>'), ['Cancelar'])
})

test('detecta texto de JSX y atributos', () => {
  assert.deepEqual(texts('<p>Cargando hoja…</p>'), ['Cargando hoja…'])
  assert.deepEqual(texts('<button aria-label="Cerrar panel" />'), ['Cerrar panel'])
})

test('ignora comentarios, console.*, imports, URLs y literales permitidos', () => {
  assert.deepEqual(texts('// Guardar la acción\nconst a = 1'), [])
  assert.deepEqual(texts('/* Acción\n   en varias líneas */ const a = 1'), [])
  assert.deepEqual(texts("console.warn('[cache] No se pudo limpiar la acción')"), [])
  assert.deepEqual(texts("import x from './año.js'"), [])
  assert.deepEqual(texts("const url = 'https://example.com/a'"), [])
  assert.deepEqual(texts("const s = 'aprobada'"), [])
  assert.deepEqual(texts("const s = 'Castellano'"), [])
})

test('no marca código que ya usa t() ni texto en inglés', () => {
  assert.deepEqual(texts("<p>{t('home.greeting')}</p>"), [])
  assert.deepEqual(texts("const a = 'Save changes'"), [])
})
