import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SHORTCUTS, buildShortcutRequest, shortcutLabel } from './shortcuts.js'
import { MAX } from '../../../supabase/functions/assistant/config.js'
import { validateRequest } from '../../../supabase/functions/assistant/request.js'

const sel = { sheetId: 'sh1', from: 3, to: 20, text: 'La mitocondria produce energía.' }

test('SHORTCUTS tiene los cuatro atajos en orden', () => {
  assert.deepEqual(
    SHORTCUTS.map((s) => s.id),
    ['explain', 'refute', 'complete', 'ask'],
  )
  assert.deepEqual(
    SHORTCUTS.map((s) => s.label),
    ['Explicar', 'Refutar', 'Completar', 'Preguntame'],
  )
})

test('los 4 ids producen action shortcut con la selección {sheetId, text}', () => {
  for (const { id } of SHORTCUTS) {
    const req = buildShortcutRequest(id, sel)
    assert.equal(req.action, 'shortcut')
    assert.deepEqual(req.selection, { sheetId: 'sh1', text: sel.text })
    assert.ok(req.message.length > 0)
  }
})

test('el message de complete cita el texto seleccionado y pide propose_*', () => {
  const { message } = buildShortcutRequest('complete', sel)
  assert.ok(message.includes(sel.text))
  assert.match(message, /propose_/)
})

test('refute pide propose_*; ask no', () => {
  assert.match(buildShortcutRequest('refute', sel).message, /propose_/)
  assert.doesNotMatch(buildShortcutRequest('ask', sel).message, /propose_/)
})

test('selection.text se recorta a MAX.selection y el message no pasa MAX.message', () => {
  const long = { ...sel, text: 'x'.repeat(MAX.selection + 500) }
  for (const { id } of SHORTCUTS) {
    const req = buildShortcutRequest(id, long)
    assert.equal(req.selection.text.length, MAX.selection)
    assert.ok(req.message.length <= MAX.message)
  }
})

test('el pedido armado pasa la validación del servidor', () => {
  for (const { id } of SHORTCUTS) {
    const body = { ...buildShortcutRequest(id, sel), history: [], mode: 'notes', scope: { type: 'subject', id: 'sub1' } }
    const result = validateRequest(body)
    assert.equal(result.ok, true, JSON.stringify(result))
  }
})

test('un id desconocido o sin selección tira error', () => {
  assert.throws(() => buildShortcutRequest('raro', sel))
  assert.throws(() => buildShortcutRequest('explain', null))
  assert.throws(() => buildShortcutRequest('explain', { sheetId: 'sh1', text: '   ' }))
})

test('shortcutLabel arma el texto visible con la etiqueta y un pedazo del texto', () => {
  const label = shortcutLabel('explain', sel)
  assert.ok(label.startsWith('Explicar'))
  assert.ok(label.includes('La mitocondria'))
  assert.ok(shortcutLabel('explain', { ...sel, text: 'y'.repeat(500) }).length < 200)
})
