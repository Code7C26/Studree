import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toPublicMarkdown } from './publicMarkdown.js'

test('quita las imágenes adjuntas y deja el texto de los links adjuntos', () => {
  const md = [
    '# Fotosíntesis',
    '',
    '![Hoja de la planta](adjunto:abc-123)',
    '',
    'Mirá el [esquema](adjunto:def-456) del proceso.',
  ].join('\n')
  assert.equal(
    toPublicMarkdown(md),
    ['# Fotosíntesis', '', 'Mirá el esquema del proceso.'].join('\n'),
  )
})

test('los [[Tema]] quedan como texto', () => {
  assert.equal(toPublicMarkdown('Ver [[Fotosíntesis]] y [[Clorofila|la clorofila]].'), 'Ver Fotosíntesis y la clorofila.')
})

test('conserva encabezados, listas y links normales', () => {
  const md = '# Tema\n\n- uno\n- dos\n\n[Wikipedia](https://es.wikipedia.org/wiki/Fotosíntesis)'
  assert.equal(toPublicMarkdown(md), md)
})

test('sin contenido devuelve string vacío', () => {
  assert.equal(toPublicMarkdown(''), '')
  assert.equal(toPublicMarkdown(null), '')
})
