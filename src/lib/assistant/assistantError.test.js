import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateAssistantError } from './assistantError.js'

const GENERIC = 'No se pudo hablar con el Brote. Probá de nuevo.'

test('401 pide volver a iniciar sesión', () => {
  assert.equal(translateAssistantError(401, { code: 'auth' }), 'Tu sesión expiró. Volvé a iniciar sesión.')
})

test('429 quota y 403 feature muestran el message del servidor', () => {
  assert.equal(translateAssistantError(429, { code: 'quota', message: 'Llegaste al tope de hoy.' }), 'Llegaste al tope de hoy.')
  assert.equal(translateAssistantError(403, { code: 'feature', message: 'Es de Premium.' }), 'Es de Premium.')
})

test('403/429 sin message usan el genérico, nunca el cuerpo crudo', () => {
  assert.equal(translateAssistantError(429, 'raw <html>'), GENERIC)
})

test('400 not_found y 400 genérico', () => {
  assert.equal(translateAssistantError(400, { code: 'not_found' }), 'Esa hoja o materia ya no existe (¿está en la papelera?).')
  assert.equal(translateAssistantError(400, { code: 'invalid', message: 'interno' }), 'No se pudo procesar el pedido.')
})

test('404 avisa que falta desplegar', () => {
  assert.equal(translateAssistantError(404, null), 'El asistente todavía no está disponible (falta desplegar la función).')
})

test('503 config avisa que faltan las claves de la función', () => {
  assert.equal(
    translateAssistantError(503, { code: 'config' }),
    'El asistente todavía no está configurado (faltan las claves de la función).',
  )
})

test('500, 503 sin code config y red caen en el genérico', () => {
  assert.equal(translateAssistantError(500, { code: 'server' }), GENERIC)
  assert.equal(translateAssistantError(503, { code: 'otro' }), GENERIC)
  assert.equal(translateAssistantError(503, null), GENERIC)
  assert.equal(translateAssistantError(0, undefined), GENERIC)
})

test('traducción por code + reason: topes y funciones de Premium, en cada idioma', () => {
  const quota = { code: 'quota', reason: 'chat', message: 'M' }
  assert.equal(translateAssistantError(429, quota, 'es'), 'Llegaste al tope de preguntas de hoy. Probá mañana o pasate a Premium.')
  assert.equal(translateAssistantError(429, quota, 'en'), 'You reached today’s question limit. Try again tomorrow or go Premium.')
  const feature = { code: 'feature', reason: 'weakReview', message: 'M' }
  assert.equal(translateAssistantError(403, feature, 'en'), 'Reviewing weak topics is part of Premium.')
  assert.equal(translateAssistantError(429, { code: 'quota', reason: 'unverified' }, 'es'), 'No pudimos verificar tu uso. Probá de nuevo.')
})

test('servidor viejo o código desconocido: se muestra el message del servidor, sin romper', () => {
  assert.equal(translateAssistantError(429, { code: 'quota', message: 'M' }, 'en'), 'M')
  assert.equal(translateAssistantError(429, { code: 'quota', reason: 'zzz', message: 'M' }, 'en'), 'M')
  assert.equal(translateAssistantError(403, { code: 'feature', reason: 'nueva', message: 'Solo Premium' }, 'es'), 'Solo Premium')
  assert.equal(translateAssistantError(429, { code: 'quota', reason: 'zzz' }, 'en'), 'Could not reach the Sprout. Try again.')
})

test('estados sin cuerpo, en inglés', () => {
  assert.equal(translateAssistantError(401, null, 'en'), 'Your session expired. Sign in again.')
  assert.equal(translateAssistantError(404, null, 'en'), 'The assistant is not available yet (the function has not been deployed).')
  assert.equal(translateAssistantError(400, { code: 'not_found' }, 'en'), 'That sheet or subject no longer exists (is it in the trash?).')
  assert.equal(translateAssistantError(0, undefined, 'en'), 'Could not reach the Sprout. Try again.')
})
