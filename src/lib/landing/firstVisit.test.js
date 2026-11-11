import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFirstVisit, needsEntryChoice } from './firstVisit.js'

test('un navegador sin nada de Studree es una primera visita', () => {
  assert.equal(isFirstVisit([]), true)
  assert.equal(isFirstVisit(['sb-abc-auth-token', 'otra-app:algo']), true)
})

test('el idioma solo no cuenta: puede guardarse antes de entrar a la app', () => {
  assert.equal(isFirstVisit(['studree:ui:lang']), true)
})

test('quien ya vio la landing no es primera visita', () => {
  assert.equal(isFirstVisit(['studree:ui:landing-seen']), false)
})

test('quien ya usó la app en este dispositivo no ve la landing de golpe', () => {
  assert.equal(isFirstVisit(['studree:cache:careers']), false)
  assert.equal(isFirstVisit(['studree:ui:tabs', 'studree:ui:lang']), false)
})

test('el cartel de entrada aparece al invitado que todavía no eligió', () => {
  assert.equal(needsEntryChoice({ isAnonymous: true, choiceMade: false }), true)
})

test('no aparece si ya eligió o si tiene cuenta con email', () => {
  assert.equal(needsEntryChoice({ isAnonymous: true, choiceMade: true }), false)
  assert.equal(needsEntryChoice({ isAnonymous: false, choiceMade: false }), false)
})
