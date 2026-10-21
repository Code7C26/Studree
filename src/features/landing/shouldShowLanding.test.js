import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowLanding } from './shouldShowLanding.js'

test('muestra la landing en "/" sin sesión una vez cargada la sesión', () => {
  assert.equal(shouldShowLanding({ pathname: '/', loading: false, user: null }), true)
})

test('no muestra la landing mientras la sesión se está cargando', () => {
  assert.equal(shouldShowLanding({ pathname: '/', loading: true, user: null }), false)
})

test('no muestra la landing con sesión', () => {
  assert.equal(shouldShowLanding({ pathname: '/', loading: false, user: { id: 'u1' } }), false)
})

test('no muestra la landing fuera de "/" aunque no haya sesión', () => {
  for (const pathname of ['/carreras', '/materias/abc', '/hojas/abc', '/entrar', '/perfil']) {
    assert.equal(shouldShowLanding({ pathname, loading: false, user: null }), false, pathname)
  }
})
