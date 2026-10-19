import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractTopics } from './topics.js'
import { extractHeadings } from '../../../src/lib/markdown/headings.js'

test('headings fuera de bloques de código', () => {
  assert.deepEqual(extractTopics('# A\n\ntexto\n## B\n```\n# no\n```'), ['A', 'B'])
})

test('#hashtag no es heading', () => {
  assert.deepEqual(extractTopics('#hashtag'), [])
})

test('heading vacío no entra', () => {
  assert.deepEqual(extractTopics('# \n# Uno\n##'), ['Uno'])
})

test('nivel 5 y headings indentados no cuentan; null/undefined → []', () => {
  assert.deepEqual(extractTopics('##### cinco\n  # indentado'), [])
  assert.deepEqual(extractTopics(undefined), [])
  assert.deepEqual(extractTopics(null), [])
})

test('limpia links, [[x]], marcas y escapes', () => {
  assert.deepEqual(extractTopics('# Ver [[Otro tema]]\n## [sitio](http://x.com)\n### a\\*b'), ['Ver Otro tema', 'sitio', 'ab'])
})

const MUESTRAS = [
  '# Intro\n\n```js\n# comentario\n## no\n```\n\n## Detalle\ntexto',
  '- item\n  # dentro de lista\n# Real\n1. uno\n## Otro `code` aquí',
  '# Ver [[Límites]] y [[Derivadas]]\n\n#hashtag\n## [doc](http://a.b/c) enlazado',
  '# **Negrita** y _cursiva_ ~~tachado~~\n~~~\n# no\n~~~\n### Final\n#### Nivel 4\n##### Nivel 5',
  '# \n##  \n# Con \\[\\[escape\\]\\] y \\# hash\n\n\n# Último',
]

for (const [i, md] of MUESTRAS.entries()) {
  test(`paridad con extractHeadings del cliente (muestra ${i + 1})`, () => {
    assert.deepEqual(extractTopics(md), extractHeadings(md).map((h) => h.text).filter(Boolean))
  })
}
