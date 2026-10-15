import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  attachmentHref,
  parseAttachmentHref,
  attachmentMarkdown,
  findAttachmentRefs,
  rewriteAttachmentRefs,
  stripAttachmentRefs,
  describeAttachmentRefs,
  isImageMime,
  codeRanges,
} from './refs.js'

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'

test('href ida y vuelta', () => {
  assert.equal(attachmentHref(ID), `adjunto:${ID}`)
  assert.equal(parseAttachmentHref(`adjunto:${ID}`), ID)
  assert.equal(parseAttachmentHref('https://x.com/a.png'), null)
  assert.equal(parseAttachmentHref(null), null)
})

test('attachmentMarkdown escapa corchetes del nombre', () => {
  assert.equal(attachmentMarkdown({ id: ID, name: 'foto pizarrón (2).jpg', isImage: true }), `![foto pizarrón (2).jpg](adjunto:${ID})`)
  assert.equal(attachmentMarkdown({ id: ID, name: 'tp [final].pdf', isImage: false }), `[tp \\[final\\].pdf](adjunto:${ID})`)
})

test('findAttachmentRefs encuentra imágenes y links, no otros links', () => {
  const md = `Hola ![foto](adjunto:${ID}) y [apunte.pdf](adjunto:${ID}) y [web](https://x.com)`
  const refs = findAttachmentRefs(md)
  assert.equal(refs.length, 2)
  assert.deepEqual(
    refs.map(({ isImage, text, id }) => ({ isImage, text, id })),
    [
      { isImage: true, text: 'foto', id: ID },
      { isImage: false, text: 'apunte.pdf', id: ID },
    ],
  )
})

test('findAttachmentRefs ignora referencias dentro de bloques de código', () => {
  const md = '```\n![x](adjunto:abc)\n```\n\n`[y](adjunto:def)`'
  assert.equal(findAttachmentRefs(md).length, 0)
})

test('findAttachmentRefs acepta un título opcional y nombres con corchetes escapados', () => {
  const md = `![a \\[1\\]](adjunto:${ID} "Título")`
  const [ref] = findAttachmentRefs(md)
  assert.equal(ref.text, 'a [1]')
})

test('rewriteAttachmentRefs reemplaza y deja igual cuando el callback da null', () => {
  const md = `![a](adjunto:1) [b](adjunto:2)`
  const out = rewriteAttachmentRefs(md, (ref) => (ref.id === '1' ? '![a](adjuntos/a.png)' : null))
  assert.equal(out, '![a](adjuntos/a.png) [b](adjunto:2)')
})

test('stripAttachmentRefs quita imágenes y deja el texto de los links', () => {
  assert.equal(stripAttachmentRefs(`# Clase\n\n![foto](adjunto:1)\n\nVer [tp.pdf](adjunto:2).`), '# Clase\n\n\n\nVer tp.pdf.')
})

test('describeAttachmentRefs para el .md único y Copiar para IA', () => {
  assert.equal(describeAttachmentRefs(`![foto](adjunto:1) y [tp.pdf](adjunto:2)`), '[imagen: foto] y [archivo: tp.pdf]')
})

test('isImageMime', () => {
  assert.equal(isImageMime('image/png'), true)
  assert.equal(isImageMime('application/pdf'), false)
  assert.equal(isImageMime(''), false)
})

test('findAttachmentRefs: imagen dentro de link sin escapar el [ externo', () => {
  const refs = findAttachmentRefs('[![img](adjunto:1)](http://x)')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].isImage, true)
  assert.equal(refs[0].text, 'img')
  assert.equal(refs[0].id, '1')
  assert.equal(refs[0].index, 1)
})

test('findAttachmentRefs: [ sin cerrar antes de una imagen no la tapa', () => {
  const refs = findAttachmentRefs('ver [nota ![x](adjunto:1)')
  assert.equal(refs.length, 1)
  assert.equal(refs[0].isImage, true)
  assert.equal(refs[0].text, 'x')
})

test('codeRanges(null) devuelve lista vacía', () => {
  assert.deepEqual(codeRanges(null), [])
})
