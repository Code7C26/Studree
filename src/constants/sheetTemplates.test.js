import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getFactoryTemplates, TEMPLATE_CONTENT_MAX, TEMPLATE_NAME_MAX } from './sheetTemplates.js'
import { extractHeadings } from '../lib/markdown/headings.js'

const FACTORY_TEMPLATES = getFactoryTemplates('es')

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

test('las plantillas de fábrica en castellano son las de siempre', () => {
  const clase = FACTORY_TEMPLATES.find((template) => template.id === 'factory:clase')
  assert.equal(clase.content_md, '# Clase\n\n## Conceptos clave\n\n- \n\n## Ejemplos\n\n\n## Dudas para preguntar\n\n- [ ] ')
  assert.deepEqual(FACTORY_TEMPLATES.map((template) => template.id), ['factory:clase', 'factory:resumen', 'factory:practica', 'factory:repaso'])
})

test('en inglés: mismos id, nombres y contenido propios, y cada una arranca con un tema #', () => {
  const english = getFactoryTemplates('en')
  assert.deepEqual(english.map((template) => template.id), FACTORY_TEMPLATES.map((template) => template.id))
  assert.deepEqual(english.map((template) => template.name), ['Class', 'Summary', 'Practice', 'Exam review'])
  for (const [index, template] of english.entries()) {
    assert.equal(template.factory, true)
    assert.notEqual(template.content_md, FACTORY_TEMPLATES[index].content_md)
    assert.equal(extractHeadings(template.content_md)[0].level, 1)
  }
})
