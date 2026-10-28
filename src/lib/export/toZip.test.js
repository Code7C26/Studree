import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subjectTreeToZip, collectTreeAttachments, encodeAttachmentPath } from './toZip.js'

/** JSZip mínimo: guarda las rutas y su contenido en un Map. */
class FakeZip {
  constructor() {
    this.files = new Map()
  }
  folder(name) {
    return new FakeFolder(this, name)
  }
  file(path, content) {
    this.files.set(path, content)
  }
  async generateAsync() {
    return this.files
  }
}
class FakeFolder {
  constructor(root, prefix) {
    this.root = root
    this.prefix = prefix
  }
  folder(name) {
    return new FakeFolder(this.root, `${this.prefix}/${name}`)
  }
  file(name, content) {
    this.root.files.set(`${this.prefix}/${name}`, content)
  }
}

const attachment = (id, name) => ({ id, name, mime_type: 'image/jpeg', size_bytes: 1, storage_path: `u/${id}/${name}`, sheet_id: 's' })

test('el .zip lleva los adjuntos en adjuntos/ y reescribe las referencias a rutas relativas', async () => {
  const subject = {
    name: 'Genética',
    careerName: 'Bio',
    sheets: [
      {
        created_at: '2026-10-14T21:30:00Z',
        updated_at: null,
        content_md: '![foto pizarrón (2).jpg](adjunto:a1) y [tp.pdf](adjunto:a2) y ![perdida](adjunto:a3)',
        attachments: [attachment('a1', 'foto pizarrón (2).jpg'), attachment('a2', 'tp.pdf'), attachment('a3', 'perdida.png')],
      },
    ],
  }
  const files = new Map([
    ['a1', 'BLOB1'],
    ['a2', 'BLOB2'],
  ])
  const out = await subjectTreeToZip(FakeZip, subject, files)
  assert.equal(out.get('Genética/adjuntos/foto pizarrón (2).jpg'), 'BLOB1')
  assert.equal(out.get('Genética/adjuntos/tp.pdf'), 'BLOB2')
  const md = [...out.entries()].find(([path]) => path.endsWith('.md'))[1]
  assert.ok(md.includes('![foto pizarrón (2).jpg](adjuntos/foto%20pizarr%C3%B3n%20%282%29.jpg)'))
  assert.match(md, /\[tp\.pdf\]\(adjuntos\/tp\.pdf\)/)
  assert.match(md, /\[imagen: perdida\]/) // sin archivo descargado → texto
})

test('dos adjuntos con el mismo nombre en la misma materia no se pisan', async () => {
  const sheet = (id) => ({
    created_at: '2026-10-14T21:30:00Z',
    updated_at: null,
    content_md: `![a.png](adjunto:${id})`,
    attachments: [attachment(id, 'a.png')],
  })
  const out = await subjectTreeToZip(FakeZip, { name: 'M', careerName: 'C', sheets: [sheet('x'), sheet('y')] }, new Map([['x', 'X'], ['y', 'Y']]))
  assert.equal(out.get('M/adjuntos/a.png'), 'X')
  assert.equal(out.get('M/adjuntos/a (2).png'), 'Y')
})

test('collectTreeAttachments junta los adjuntos de materia, carrera o todo', () => {
  const s = { sheets: [{ attachments: [attachment('1', 'a')] }, { attachments: [] }] }
  assert.equal(collectTreeAttachments(s).length, 1)
  assert.equal(collectTreeAttachments({ subjects: [s, s] }).length, 2)
  assert.equal(collectTreeAttachments([{ subjects: [s] }, { subjects: [s] }]).length, 2)
})

test('encodeAttachmentPath codifica # ? y paréntesis, y cada segmento se decodifica al original', () => {
  assert.equal(encodeAttachmentPath('adjuntos/tema #2 (b).png'), 'adjuntos/tema%20%232%20%28b%29.png')
  const name = 'tema #2 (b)? a&b+c;d.png'
  const segment = encodeAttachmentPath(`adjuntos/${name}`).split('/')[1]
  assert.equal(decodeURIComponent(segment), name)
})

test('nombres con puntuación escapada por el editor no ganan barras en el export', async () => {
  const subject = {
    name: 'M',
    careerName: 'C',
    sheets: [
      {
        created_at: '2026-10-14T21:30:00Z',
        updated_at: null,
        content_md: '![\\_borrador\\*.png](adjunto:b1) [\\[v\\]\\_\\\\.pdf](adjunto:b2)',
        attachments: [
          { ...attachment('b1', '_borrador*.png'), mime_type: 'image/png' },
          { ...attachment('b2', '[v]_\\.pdf'), mime_type: 'application/pdf' },
        ],
      },
    ],
  }
  const out = await subjectTreeToZip(FakeZip, subject, new Map([['b1', 'B'], ['b2', 'P']]))
  const md = [...out.entries()].find(([path]) => path.endsWith('.md'))[1]
  assert.ok(md.includes('![_borrador*.png](adjuntos/'))
  // Solo se escapan [ ] y \
  assert.ok(md.includes('[\\[v\\]_\\\\.pdf](adjuntos/'))
  assert.ok(!md.includes('\\_') && !md.includes('\\*'))
})

test('en inglés: las claves del frontmatter no cambian y el texto descriptivo sale en inglés', async () => {
  const subject = {
    name: '',
    careerName: 'Bio',
    sheets: [{ created_at: '2025-10-14T21:30:00Z', updated_at: null, content_md: '![lost](adjunto:a3)', attachments: [attachment('a3', 'lost.png')] }],
  }
  const out = await subjectTreeToZip(FakeZip, subject, new Map(), 'en')
  const [path, md] = [...out.entries()].find(([entry]) => entry.endsWith('.md'))
  assert.ok(path.startsWith('Untitled/'), path)
  for (const key of ['carrera:', 'materia:', 'creada:']) assert.ok(md.includes(key), key)
  assert.match(md, /[image: lost]/)
  const es = await subjectTreeToZip(FakeZip, subject, new Map(), 'es')
  assert.ok([...es.keys()][0].startsWith('Sin título/'))
})
