import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveCreatedAt } from './createdAt.js'

const now = new Date('2026-10-20T12:00:00Z')
const local = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi).toISOString()

test('primero manda creada: del frontmatter (hora local)', () => {
  assert.equal(resolveCreatedAt({ meta: { creada: '2026-10-14T18:30' }, fileName: '2020-01-01 00-00.md', now }), local(2026, 10, 14, 18, 30))
})

test('después el nombre del archivo AAAA-MM-DD HH-MM', () => {
  assert.equal(resolveCreatedAt({ meta: {}, fileName: '2026-10-13 10-15 (2).md', now }), local(2026, 10, 13, 10, 15))
})

test('después la fecha del archivo y por último ahora', () => {
  const modified = new Date('2025-05-05T05:05:00Z')
  assert.equal(resolveCreatedAt({ meta: {}, fileName: 'clase.md', lastModified: modified, now }), modified.toISOString())
  assert.equal(resolveCreatedAt({ meta: {}, fileName: 'clase.md', lastModified: null, now }), now.toISOString())
})

test('una fecha inválida en el frontmatter no rompe: se usa la siguiente fuente', () => {
  assert.equal(resolveCreatedAt({ meta: { creada: 'ayer' }, fileName: 'clase.md', now }), now.toISOString())
})
