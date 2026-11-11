import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateAuthError } from './authErrors.js'

const err = (message) => ({ message })

test('translateAuthError en castellano (los textos de siempre)', () => {
  assert.equal(translateAuthError(err('Invalid login credentials'), 'es'), 'Email o contraseña incorrectos.')
  assert.equal(translateAuthError(err('User already registered'), 'es'), 'Ese email ya tiene cuenta. Iniciá sesión.')
  assert.equal(translateAuthError(err('Password should be at least 6 characters'), 'es'), 'La contraseña debe tener al menos 6 caracteres.')
  assert.equal(translateAuthError(err('email rate limit exceeded'), 'es'), 'Demasiados intentos. Esperá un momento.')
  assert.equal(translateAuthError(null, 'es'), null)
})

test('translateAuthError en inglés', () => {
  assert.equal(translateAuthError(err('Invalid login credentials'), 'en'), 'Wrong email or password.')
  assert.equal(translateAuthError(err('User already registered'), 'en'), 'That email already has an account. Sign in.')
  assert.equal(translateAuthError(err('Password should be at least 6 characters'), 'en'), 'The password must be at least 6 characters long.')
  assert.equal(translateAuthError(err('Email not confirmed'), 'en').startsWith('Your email is not confirmed yet.'), true)
})

test('guardar la cuenta de invitado: email ya usado y reintento muy rápido', () => {
  assert.equal(
    translateAuthError(err('A user with this email address has already been registered'), 'es'),
    'Ese email ya tiene cuenta. Iniciá sesión.',
  )
  assert.equal(
    translateAuthError(err('For security purposes, you can only request this after 42 seconds.'), 'es'),
    'Demasiados intentos. Esperá un momento.',
  )
})

test('red caída y errores desconocidos: mensaje propio, nunca el texto crudo del proveedor', () => {
  assert.equal(translateAuthError(err('Failed to fetch'), 'es'), 'No hay conexión. Revisá tu internet e intentá de nuevo.')
  assert.equal(translateAuthError(err('Failed to fetch'), 'en'), 'No connection. Check your internet and try again.')
  assert.equal(translateAuthError(err('Something exotic happened'), 'es'), 'No se pudo completar la operación.')
  assert.equal(translateAuthError(err('Something exotic happened'), 'en'), 'The operation could not be completed.')
  assert.equal(translateAuthError(err(''), 'en'), 'The operation could not be completed.')
})
