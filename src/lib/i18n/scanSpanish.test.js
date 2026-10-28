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

test('ignora rutas (/carreras) y console.* de varias líneas', () => {
  assert.deepEqual(texts("const r = '/carreras'"), [])
  assert.deepEqual(texts("console.warn(\n  '[auth] Sesión anónima no disponible',\n  error,\n)"), [])
})

test('un regex con comillas o backtick no rompe el análisis de lo que sigue', () => {
  assert.deepEqual(texts("const r = /[#>*_~`]/g\nconst a = 'Guardar'"), ['Guardar'])
  assert.deepEqual(texts('x.replace(/["\']/g, \'\')\n// Acción\nconst a = 1'), [])
})

test('una línea marcada con i18n-ignore (formato de archivo) no se reporta', () => {
  assert.deepEqual(texts("const key = 'carrera: Años' // i18n-ignore: formato de archivo"), [])
  assert.deepEqual(texts("const key = 'carrera: Años'"), ['carrera: Años'])
})

test('los identificadores en minúscula (ids del DOM, parámetros de URL) no cuentan como texto', () => {
  assert.deepEqual(texts("const id = `hoja-${sheet.id}`"), [])
  assert.deepEqual(texts("searchParams.get('hoja')"), [])
  assert.deepEqual(texts("const label = 'Hoja'"), ['Hoja'])
  assert.deepEqual(texts("const label = 'la hoja nueva'"), ['la hoja nueva'])
})
