import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTranscribeRequest } from './transcribeRequest.js'

const IMAGE = { mimeType: 'image/jpeg', data: 'aGVsbG8=' }

test('arma el pedido transcribe con alcance de materia', () => {
  const r = buildTranscribeRequest({ subjectId: 's1', image: IMAGE, lang: 'es' })
  assert.deepEqual(r, {
    action: 'transcribe',
    message: '',
    history: [],
    mode: 'notes',
    scope: { type: 'subject', id: 's1' },
    uiLang: 'es',
    image: IMAGE,
  })
})

test('respeta inglés y no comparte la referencia de la imagen', () => {
  const image = { ...IMAGE }
  const r = buildTranscribeRequest({ subjectId: 's1', image, lang: 'en' })
  assert.equal(r.uiLang, 'en')
  assert.notEqual(r.image, image)
  r.image.data = 'AAAA'
  assert.equal(image.data, 'aGVsbG8=')
})
