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

test('500, 503 y red caen en el genérico', () => {
  assert.equal(translateAssistantError(500, { code: 'server' }), GENERIC)
  assert.equal(translateAssistantError(503, { code: 'config' }), GENERIC)
  assert.equal(translateAssistantError(0, undefined), GENERIC)
})
