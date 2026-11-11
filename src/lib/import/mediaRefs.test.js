import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildZipIndex, findMediaRefs, replaceMediaRefs, mimeFromName } from './mediaRefs.js'

const index = buildZipIndex([
  'Bio/Genética/adjuntos/foto pizarrón (2).jpg',
  'Bio/Genética/adjuntos/tp.pdf',
  'Bio/Genética/adjuntos/tema #2 (b).png',
  'Vault/assets/diagrama.png',
])

test('rutas relativas al .md, codificadas o con <>', () => {
  const md = '![a](adjuntos/foto%20pizarr%C3%B3n%20%282%29.jpg) [tp](<adjuntos/tp.pdf>) ![web](https://x.com/a.png)'
  const refs = findMediaRefs(md, 'Bio/Genética/2026-10-14 18-30.md', index)
  assert.deepEqual(
    refs.map((ref) => [ref.isImage, ref.zipPath]),
    [
      [true, 'Bio/Genética/adjuntos/foto pizarrón (2).jpg'],
      [false, 'Bio/Genética/adjuntos/tp.pdf'],
    ],
  )
})

test('rutas escritas por el export (# y paréntesis codificados)', () => {
  const [ref] = findMediaRefs('![a](adjuntos/tema%20%232%20%28b%29.png)', 'Bio/Genética/a.md', index)
  assert.equal(ref.zipPath, 'Bio/Genética/adjuntos/tema #2 (b).png')
})

test('rutas con ../', () => {
  const [ref] = findMediaRefs('![d](../assets/diagrama.png)', 'Vault/notas/clase.md', index)
  assert.equal(ref.zipPath, 'Vault/assets/diagrama.png')
})

test('![[archivo]] de Obsidian por nombre; [[Tema]] no se toca', () => {
  const refs = findMediaRefs('![[diagrama.png]] y [[Mitosis]] y ![[Otra nota]]', 'Vault/notas/clase.md', index)
  assert.equal(refs.length, 1)
  assert.equal(refs[0].zipPath, 'Vault/assets/diagrama.png')
  assert.equal(refs[0].isImage, true)
  assert.equal(refs[0].text, 'diagrama.png')
})

test('lo que no está en el zip, links .md y código se ignoran', () => {
  const md = '![x](no-existe.png) [otra](otra.md) `![y](adjuntos/tp.pdf)`'
  assert.equal(findMediaRefs(md, 'Bio/Genética/a.md', index).length, 0)
})

test('replaceMediaRefs reemplaza por posición', () => {
  const md = 'A ![a](adjuntos/tp.pdf) B'
  const refs = findMediaRefs(md, 'Bio/Genética/a.md', index)
  assert.equal(replaceMediaRefs(md, refs, () => '![a](adjunto:1)'), 'A ![a](adjunto:1) B')
})

test('mimeFromName', () => {
  assert.equal(mimeFromName('a.JPG'), 'image/jpeg')
  assert.equal(mimeFromName('a.pdf'), 'application/pdf')
  assert.equal(mimeFromName('a.xyz'), 'application/octet-stream')
})

test('el texto del link pierde todos los escapes de CommonMark', () => {
  const index = buildZipIndex(['a/_b*.png'])
  const [ref] = findMediaRefs('![\\_b\\*.png](_b*.png)', 'a/x.md', index)
  assert.equal(ref.text, '_b*.png')
})
