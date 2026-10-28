import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectLang } from './detectLang.js'
import { createI18n } from './core.js'

const dictionaries = {
  es: {
    a: { hello: 'Hola {name}', bye: 'Chau', count: { one: '{count} hoja', other: '{count} hojas' } },
    onlyEs: 'Solo castellano',
  },
  en: {
    a: { hello: 'Hello {name}', count: { one: '{count} sheet', other: '{count} sheets' } },
  },
}

/** Arma una instancia con almacenamiento y navegador falsos. */
function make({ stored = null, browser = undefined, failingStorage = false } = {}) {
  const writes = []
  const changes = []
  const i18n = createI18n({
    dictionaries,
    storage: {
      get: () => stored,
      set: (lang) => {
        if (failingStorage) throw new Error('storage lleno')
        writes.push(lang)
      },
    },
    browserLang: () => browser,
    onChange: (lang) => changes.push(lang),
  })
  return { i18n, writes, changes }
}

test('detectLang: el idioma guardado válido gana sobre el del navegador', () => {
  assert.equal(detectLang('en', 'es-AR'), 'en')
  assert.equal(detectLang('es', 'en-US'), 'es')
})

test('detectLang: sin guardado usa el navegador (en* → en, el resto → es)', () => {
  assert.equal(detectLang(null, 'en-GB'), 'en')
  assert.equal(detectLang(null, 'fr'), 'es')
  assert.equal(detectLang(null, undefined), 'es')
})

test('detectLang: un guardado inválido se ignora', () => {
  assert.equal(detectLang('xx', 'en-US'), 'en')
  assert.equal(detectLang('xx', 'fr'), 'es')
})

test('t interpola {marcadores} y deja el marcador si falta el valor', () => {
  const { i18n } = make()
  assert.equal(i18n.t('a.hello', { name: 'Ana' }), 'Hola Ana')
  assert.equal(i18n.t('a.hello'), 'Hola {name}')
})

test('t elige la forma de plural con values.count', () => {
  const { i18n } = make()
  assert.equal(i18n.t('a.count', { count: 1 }), '1 hoja')
  assert.equal(i18n.t('a.count', { count: 0 }), '0 hojas')
  assert.equal(i18n.t('a.count', { count: 2 }), '2 hojas')
})

test('t: clave que falta en en cae al castellano; si falta en ambos devuelve la clave', () => {
  const { i18n } = make({ stored: 'en' })
  assert.equal(i18n.t('a.hello', { name: 'Ana' }), 'Hello Ana')
  assert.equal(i18n.t('a.bye'), 'Chau')
  assert.equal(i18n.t('onlyEs'), 'Solo castellano')
  assert.equal(i18n.t('no.existe'), 'no.existe')
  assert.equal(i18n.t('a'), 'a')
})

test('setLang cambia el idioma, persiste, avisa a onChange y notifica una sola vez', () => {
  const { i18n, writes, changes } = make()
  let calls = 0
  i18n.subscribe(() => { calls += 1 })
  i18n.setLang('en')
  assert.equal(i18n.getLang(), 'en')
  assert.deepEqual(writes, ['en'])
  assert.deepEqual(changes, ['en'])
  assert.equal(calls, 1)
  i18n.setLang('en')
  assert.equal(calls, 1)
})

test('setLang ignora un idioma inválido y unsubscribe deja de notificar', () => {
  const { i18n } = make()
  let calls = 0
  const off = i18n.subscribe(() => { calls += 1 })
  i18n.setLang('xx')
  assert.equal(i18n.getLang(), 'es')
  assert.equal(calls, 0)
  off()
  i18n.setLang('en')
  assert.equal(calls, 0)
})

test('un storage que lanza no rompe setLang', () => {
  const { i18n } = make({ failingStorage: true })
  i18n.setLang('en')
  assert.equal(i18n.getLang(), 'en')
})

test('el idioma inicial sale del storage y, si no hay, del navegador', () => {
  assert.equal(make({ stored: 'en', browser: 'es-AR' }).i18n.getLang(), 'en')
  assert.equal(make({ browser: 'en-US' }).i18n.getLang(), 'en')
  assert.equal(make({}).i18n.getLang(), 'es')
})

test('tIn traduce a un idioma explícito sin tocar el idioma activo', () => {
  const { i18n } = make()
  assert.equal(i18n.tIn('en', 'a.hello', { name: 'Ana' }), 'Hello Ana')
  assert.equal(i18n.tIn('es', 'a.hello', { name: 'Ana' }), 'Hola Ana')
  assert.equal(i18n.tIn('en', 'a.bye'), 'Chau')
  assert.equal(i18n.getLang(), 'es')
})
