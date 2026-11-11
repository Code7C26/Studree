import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_PHOTO_BASE64,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_SIDE,
  base64Length,
  fitWithin,
  isBase64,
  photoDataUrlToBase64,
  photoExtension,
} from './photo.js'

test('fitWithin no agranda y respeta el lado mayor', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 })
  assert.deepEqual(fitWithin(3200, 2400), { width: MAX_PHOTO_SIDE, height: 1200 })
  assert.deepEqual(fitWithin(2400, 3200), { width: 1200, height: MAX_PHOTO_SIDE })
  assert.deepEqual(fitWithin(4000, 4000, 1000), { width: 1000, height: 1000 })
})

test('fitWithin con datos inválidos devuelve 0x0', () => {
  for (const [w, h] of [[0, 10], [10, 0], [-1, 5], [NaN, 5], [undefined, 5]]) {
    assert.deepEqual(fitWithin(w, h), { width: 0, height: 0 })
  }
  assert.deepEqual(fitWithin(10, 10, 0), { width: 0, height: 0 })
})

test('base64Length y tope coinciden con 1,5 MB', () => {
  assert.equal(base64Length(0), 0)
  assert.equal(base64Length(1), 4)
  assert.equal(base64Length(3), 4)
  assert.equal(base64Length(MAX_PHOTO_BYTES), 2_000_000)
  assert.equal(MAX_PHOTO_BASE64, 2_000_000)
})

test('isBase64 acepta solo base64 canónico', () => {
  assert.equal(isBase64('aGVsbG8='), true)
  assert.equal(isBase64('AAAA'), true)
  for (const bad of ['', 'aGVsbG8', 'aGVs bG8=', 'data:image/png;base64,AAAA', 'a-b_c=', null, 5]) {
    assert.equal(isBase64(bad), false, String(bad))
  }
})

test('photoDataUrlToBase64 acepta imágenes permitidas y descarta el resto', () => {
  assert.deepEqual(photoDataUrlToBase64('data:image/jpeg;base64,aGVsbG8='), {
    mimeType: 'image/jpeg',
    data: 'aGVsbG8=',
  })
  for (const url of [
    'data:image/gif;base64,aGVsbG8=',
    'data:image/jpeg;base64,no-es-base64',
    'data:image/jpeg,aGVsbG8=',
    'https://x/a.jpg',
    null,
  ]) {
    assert.equal(photoDataUrlToBase64(url), null, String(url))
  }
  const big = `data:image/jpeg;base64,${'A'.repeat(MAX_PHOTO_BASE64 + 4)}`
  assert.equal(photoDataUrlToBase64(big), null)
})

test('photoExtension solo distingue los tipos permitidos', () => {
  assert.equal(photoExtension('image/png'), 'png')
  assert.equal(photoExtension('image/webp'), 'webp')
  assert.equal(photoExtension('image/jpeg'), 'jpg')
  assert.equal(photoExtension('otro'), 'jpg')
})
