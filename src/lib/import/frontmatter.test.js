import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitFrontmatter } from './frontmatter.js'

test('lee el frontmatter del export de Studree', () => {
  const text = '---\ncarrera: "Lic. en \\"Bio\\""\nmateria: "Genética"\ncreada: 2026-10-14T18:30\nfecha: 2026-10-15\n---\n\n# Mitosis\n'
  const { meta, body } = splitFrontmatter(text)
  assert.deepEqual(meta, { carrera: 'Lic. en "Bio"', materia: 'Genética', creada: '2026-10-14T18:30', fecha: '2026-10-15' })
  assert.equal(body, '# Mitosis\n')
})

test('sin frontmatter devuelve el texto entero', () => {
  assert.deepEqual(splitFrontmatter('# Hola\n---\nno es frontmatter'), { meta: {}, body: '# Hola\n---\nno es frontmatter' })
})

test('acepta CRLF y comillas simples', () => {
  const { meta, body } = splitFrontmatter("---\r\nmateria: 'Física'\r\n---\r\nTexto")
  assert.equal(meta.materia, 'Física')
  assert.equal(body, 'Texto')
})

test('ignora el BOM y acepta un bloque vacío', () => {
  assert.deepEqual(splitFrontmatter('\uFEFF---\nmateria: "G"\n---\n# x').meta, { materia: 'G' })
  assert.deepEqual(splitFrontmatter('---\n---\n# x'), { meta: {}, body: '# x' })
})
