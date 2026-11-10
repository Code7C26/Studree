import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTranscriptionEvent, createTranscriptionState, transcriptionError } from './transcription.js'

test('acumula deltas de texto e ignora otros eventos', () => {
  const state = createTranscriptionState()
  applyTranscriptionEvent(state, { type: 'text', delta: '# Tema\n' })
  applyTranscriptionEvent(state, { type: 'text', delta: 'Texto' })
  applyTranscriptionEvent(state, { type: 'usage', used: 1 })
  applyTranscriptionEvent(state, { type: 'done' })
  assert.deepEqual(state, { text: '# Tema\nTexto', error: null })
})

test('guarda el primer error y no lo pisa', () => {
  const state = createTranscriptionState()
  applyTranscriptionEvent(state, { type: 'error', code: 'no_text', message: 'x' })
  applyTranscriptionEvent(state, { type: 'error', code: 'server' })
  assert.equal(state.error, 'no_text')
})

test('transcriptionError traduce códigos conocidos y cae en generic', () => {
  assert.match(transcriptionError('no_text'), /texto|foto/i)
  assert.match(transcriptionError('inventado'), /transcribir|foto/i)
  assert.match(transcriptionError(null), /transcribir|foto/i)
})
