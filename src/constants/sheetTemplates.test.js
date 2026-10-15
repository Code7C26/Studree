import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FACTORY_TEMPLATES, TEMPLATE_CONTENT_MAX, TEMPLATE_NAME_MAX } from './sheetTemplates.js'
import { extractHeadings } from '../lib/markdown/headings.js'

test('hay 4 plantillas de fábrica, con id, nombre y contenido válidos', () => {
  assert.deepEqual(FACTORY_TEMPLATES.map((t) => t.name), ['Clase', 'Resumen', 'Práctica', 'Repaso para parcial'])
  for (const template of FACTORY_TEMPLATES) {
    assert.match(template.id, /^factory:/)
    assert.equal(template.factory, true)
    assert.ok(template.name.length <= TEMPLATE_NAME_MAX)
    assert.ok(template.content_md.length > 0 && template.content_md.length <= TEMPLATE_CONTENT_MAX)
  }
})

test('cada plantilla arranca con un tema # (aparece en el índice de la carpeta)', () => {
  for (const template of FACTORY_TEMPLATES) {
    const [first] = extractHeadings(template.content_md)
    assert.equal(first.level, 1)
  }
})
