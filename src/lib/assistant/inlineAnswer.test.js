import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createInline, reduceInline, addInlineAnswer, inlineHistory, pendingProposal, inlineView,
} from './inlineAnswer.js'
import { buildShortcutRequest, shortcutLabel } from './shortcuts.js'
import { setProposalStatus } from './chatState.js'

const SELECTION = { sheetId: 'h1', from: 1, to: 24, text: 'La célula es la unidad' }
const SCOPE = { type: 'subject', id: 's1' }

/** @param {'explain'|'refute'|'complete'|'ask'} id */
const itemFor = (id, over = {}) => ({
  request: buildShortcutRequest(id, SELECTION),
  label: shortcutLabel(id, SELECTION),
  selection: SELECTION,
  target: 'inline',
  shortcutId: id,
  ...over,
})
const ITEM = itemFor('complete')

const prop = (id, over = {}) => ({
  type: 'proposal',
  proposal: { id, kind: 'append', sheetId: 'h1', markdown: `texto ${id}`, source: 'notes', status: 'pending', ...over },
})

test('createInline arranca ocupada, con la etiqueta como primer mensaje y el alcance guardado', () => {
  const a = createInline(7, ITEM, { mode: 'notes', scope: SCOPE })
  assert.equal(a.id, 7)
  assert.equal(a.shortcutId, 'complete')
  assert.equal(a.label, ITEM.label)
  assert.equal(a.selection, SELECTION)
  assert.equal(a.requestMessage, ITEM.request.message)
  assert.deepEqual(a.scope, SCOPE)
  assert.equal(a.external, false)
  assert.equal(a.answered, false)
  assert.equal(a.chat.busy, true)
  assert.deepEqual(a.chat.messages, [{ role: 'user', text: ITEM.label, turn: 1 }])
})

test('createInline deduce el atajo de la etiqueta si el pedido no lo trae', () => {
  const a = createInline(1, itemFor('refute', { shortcutId: undefined }), { mode: 'notes', scope: SCOPE })
  assert.equal(a.shortcutId, 'refute')
  assert.equal(inlineView(a).label, 'Refutar')
})

test('reduceInline ignora eventos de otra tarjeta', () => {
  const a = createInline(1, ITEM, { mode: 'notes', scope: SCOPE })
  assert.equal(reduceInline(a, 2, { type: 'text', delta: 'viejo' }), a)
  assert.equal(inlineView(reduceInline(a, 1, { type: 'text', delta: 'hola' })).replies[0].text, 'hola')
})

test('reduceInline sin tarjeta (cerrada) sigue en null', () => {
  assert.equal(reduceInline(null, 1, { type: 'text', delta: 'tarde' }), null)
})

test('Preguntame: canAnswer solo con la pregunta llegada, sin responder y sin busy', () => {
  let a = createInline(1, itemFor('ask'), { mode: 'notes', scope: SCOPE })
  assert.equal(inlineView(a).canAnswer, false) // todavía no llegó nada
  a = reduceInline(a, 1, { type: 'text', delta: '¿Qué es una célula?' })
  assert.equal(inlineView(a).canAnswer, false) // llegando (busy)
  a = reduceInline(a, 1, { type: 'done' })
  assert.equal(inlineView(a).canAnswer, true)
  a = addInlineAnswer(a, 'La unidad de la vida')
  assert.equal(a.answered, true)
  assert.equal(inlineView(a).busy, true)
  assert.equal(inlineView(a).canAnswer, false)
  a = reduceInline(a, 1, { type: 'text', delta: 'Bien.' })
  a = reduceInline(a, 1, { type: 'done' })
  assert.equal(inlineView(a).canAnswer, false) // se responde una sola vez

  // Otro atajo nunca pide respuesta.
  let b = createInline(2, itemFor('explain'), { mode: 'notes', scope: SCOPE })
  b = reduceInline(b, 2, { type: 'text', delta: 'Es…' })
  b = reduceInline(b, 2, { type: 'done' })
  assert.equal(inlineView(b).canAnswer, false)
})

test('inlineHistory arranca con el pedido completo, no con la etiqueta', () => {
  let a = createInline(1, itemFor('ask'), { mode: 'notes', scope: SCOPE })
  a = reduceInline(a, 1, { type: 'text', delta: '¿Qué es?' })
  a = reduceInline(a, 1, { type: 'done' })
  const history = inlineHistory(a)
  assert.deepEqual(history, [
    { role: 'user', text: itemFor('ask').request.message },
    { role: 'model', text: '¿Qué es?' },
  ])
  assert.ok(!history.some((h) => h.text === itemFor('ask').label))
  const answered = addInlineAnswer(a, 'Una cosa')
  assert.deepEqual(inlineHistory(answered).at(-1), { role: 'user', text: 'Una cosa' })
})

test('inlineView: external según el modo y la última propuesta pendiente', () => {
  assert.equal(inlineView(createInline(1, ITEM, { mode: 'external', scope: SCOPE })).external, true)
  let a = createInline(1, ITEM, { mode: 'notes', scope: SCOPE })
  assert.equal(inlineView(a).external, false)
  assert.equal(inlineView(a).proposal, null)
  a = reduceInline(a, 1, prop('p1'))
  a = reduceInline(a, 1, prop('p2'))
  assert.equal(pendingProposal(a).id, 'p2')
  assert.equal(inlineView(a).proposal.id, 'p2')
  a = { ...a, chat: setProposalStatus(a.chat, 'p2', 'failed') }
  assert.equal(inlineView(a).proposal.id, 'p1')
  a = { ...a, chat: setProposalStatus(a.chat, 'p1', 'applied') }
  assert.equal(pendingProposal(a), null)
})

test('inlineView: etiqueta del atajo, respuestas sin el pedido y estado de la tarjeta', () => {
  assert.equal(inlineView(null), null)
  let a = createInline(3, ITEM, { mode: 'notes', scope: SCOPE })
  a = reduceInline(a, 3, { type: 'tool', name: 'read_sheet' })
  const view = inlineView(a)
  assert.equal(view.id, 3)
  assert.equal(view.label, 'Completar')
  assert.deepEqual(view.replies, [])
  assert.equal(view.busy, true)
  assert.equal(view.status, 'Leyendo tus hojas…')
  assert.equal(view.error, null)
  assert.equal(view.notice, null)
  a = reduceInline(a, 3, { type: 'error', message: 'Tope agotado' })
  assert.equal(inlineView(a).error, 'Tope agotado')
  assert.equal(inlineView(a).busy, false)
})
