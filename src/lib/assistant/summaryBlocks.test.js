import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSummaryBody } from './summaryBlocks.js'

test('párrafos con negrita y lista', () => {
  assert.deepEqual(parseSummaryBody('Hola **mundo**\nsigue\n\n- a\n- **b**'), [
    { type: 'p', inlines: [{ text: 'Hola ', bold: false }, { text: 'mundo', bold: true }, { text: ' sigue', bold: false }] },
    { type: 'ul', items: [[{ text: 'a', bold: false }], [{ text: 'b', bold: true }]] },
  ])
})

test('HTML y ** sin cerrar quedan literales', () => {
  assert.deepEqual(parseSummaryBody('<script>x</script> **abierto'), [
    { type: 'p', inlines: [{ text: '<script>x</script> **abierto', bold: false }] },
  ])
})

test('lista numerada y vacío', () => {
  assert.deepEqual(parseSummaryBody('1. uno\n2. dos').map((b) => b.type), ['ol'])
  assert.deepEqual(parseSummaryBody(''), [])
  assert.deepEqual(parseSummaryBody(null), [])
})

test('listas mezcladas se separan', () => {
  assert.deepEqual(parseSummaryBody('- a\n* b\n1. c').map((b) => b.type), ['ul', 'ol'])
})
