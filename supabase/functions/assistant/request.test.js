import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX } from './config.js'
import { validateRequest } from './request.js'

const UUID = '11111111-1111-4111-8111-111111111111'
const base = { action: 'chat', message: 'hola', scope: { type: 'subject', id: UUID } }
const answer = { id: 'q1', question: '¿Qué es?', expected: 'Algo', given: 'Algo' }

test('pedido válido: ok y mode por defecto notes', () => {
  const r = validateRequest(base)
  assert.equal(r.ok, true)
  assert.equal(r.value.mode, 'notes')
  assert.deepEqual(r.value.history, [])
})

test('body que no es objeto → error', () => {
  for (const b of [null, undefined, 'x', 42, []]) assert.equal(validateRequest(b).ok, false)
})

test('acción inválida → error', () => {
  assert.equal(validateRequest({ ...base, action: 'hackear' }).ok, false)
  assert.equal(validateRequest({ ...base, action: undefined }).ok, false)
})

test('chat y shortcut sin mensaje (o en blanco) → error', () => {
  for (const action of ['chat', 'shortcut']) {
    assert.equal(validateRequest({ ...base, action, message: '' }).ok, false)
    assert.equal(validateRequest({ ...base, action, message: '   ' }).ok, false)
    assert.equal(validateRequest({ ...base, action, message: undefined }).ok, false)
  }
})

test('acciones sin mensaje (summary) lo aceptan vacío; mensaje no string → error', () => {
  const r = validateRequest({ ...base, action: 'summary', message: undefined })
  assert.equal(r.ok, true)
  assert.equal(r.value.message, '')
  assert.equal(validateRequest({ ...base, message: 5 }).ok, false)
})

test('scope: subject sin id → error; all sin id → ok; tipo inválido → error', () => {
  assert.equal(validateRequest({ ...base, scope: { type: 'subject' } }).ok, false)
  assert.equal(validateRequest({ ...base, scope: { type: 'subject', id: '' } }).ok, false)
  assert.equal(validateRequest({ ...base, scope: { type: 'all' } }).ok, true)
  assert.equal(validateRequest({ ...base, scope: { type: 'planeta', id: 'x' } }).ok, false)
  assert.equal(validateRequest({ ...base, scope: undefined }).ok, false)
})

test('mode: external ok; otro valor → error', () => {
  assert.equal(validateRequest({ ...base, mode: 'external' }).value.mode, 'external')
  assert.equal(validateRequest({ ...base, mode: 'raro' }).ok, false)
})

test('historial de 30 turnos queda en los últimos 20', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `t${i}` }))
  const r = validateRequest({ ...base, history })
  assert.equal(r.ok, true)
  assert.equal(r.value.history.length, MAX.history)
  assert.equal(r.value.history[0].text, 't10')
  assert.equal(r.value.history[19].text, 't29')
})

test('historial: rol inválido o forma inválida → error', () => {
  assert.equal(validateRequest({ ...base, history: [{ role: 'system', text: 'x' }] }).ok, false)
  assert.equal(validateRequest({ ...base, history: [{ role: 'user', text: 5 }] }).ok, false)
  assert.equal(validateRequest({ ...base, history: 'x' }).ok, false)
})

test('historial: turno en el tope pasa, uno de más falla (no se recorta en silencio)', () => {
  const turn = (n) => [{ role: 'user', text: 'a'.repeat(n) }]
  assert.equal(validateRequest({ ...base, history: turn(MAX.message) }).ok, true)
  assert.equal(validateRequest({ ...base, history: turn(MAX.message + 1) }).ok, false)
  assert.equal(validateRequest({ ...base, history: turn(1_000_000) }).ok, false)
})

test('message: exactamente en el tope pasa, uno de más falla', () => {
  assert.equal(validateRequest({ ...base, message: 'a'.repeat(MAX.message) }).ok, true)
  assert.equal(validateRequest({ ...base, message: 'a'.repeat(MAX.message + 1) }).ok, false)
  assert.equal(validateRequest({ ...base, message: 'a'.repeat(5000) }).ok, false)
})

test('selection: en el tope pasa, uno de más falla, forma inválida falla', () => {
  const sel = (text) => ({ ...base, selection: { sheetId: UUID, text } })
  assert.equal(validateRequest(sel('a'.repeat(MAX.selection))).ok, true)
  assert.equal(validateRequest(sel('a'.repeat(MAX.selection + 1))).ok, false)
  assert.equal(validateRequest({ ...base, selection: { text: 'x' } }).ok, false)
})

test('quiz: count 1..15 y tipos válidos', () => {
  const q = (quiz) => validateRequest({ ...base, action: 'quiz', quiz })
  assert.equal(q({ count: 15, types: ['mcq', 'tf', 'open'] }).ok, true)
  assert.equal(q({ count: 16, types: ['mcq'] }).ok, false)
  assert.equal(q({ count: 0, types: ['mcq'] }).ok, false)
  assert.equal(q({ count: 1.5, types: ['mcq'] }).ok, false)
  assert.equal(q({ count: 3, types: ['otro'] }).ok, false)
  assert.equal(q({ count: 3, types: [] }).ok, false)
})

test('quiz_grade sin answers (o vacío) → error', () => {
  const g = (answers) => validateRequest({ ...base, action: 'quiz_grade', message: '', answers })
  assert.equal(g(undefined).ok, false)
  assert.equal(g([]).ok, false)
})

test('quiz_grade: 15 respuestas ok, 16 error, item inválido error', () => {
  const g = (answers) => validateRequest({ ...base, action: 'quiz_grade', message: '', answers })
  assert.equal(g(Array.from({ length: 15 }, () => answer)).ok, true)
  assert.equal(g(Array.from({ length: 16 }, () => answer)).ok, false)
  assert.equal(g([{ ...answer, given: 7 }]).ok, false)
  assert.equal(g([{ id: 'q1' }]).ok, false)
  assert.equal(g([{ ...answer, given: 'a'.repeat(MAX.message + 1) }]).ok, false)
})

test('scope.id y selection.sheetId tienen que ser UUID (si no, 400 y no un 500 de PostgREST)', () => {
  for (const id of ['s1', '11111111-1111-4111-8111-11111111111', '11111111-1111-4111-8111-111111111111x', "1' or 1=1", ' 11111111-1111-4111-8111-111111111111']) {
    for (const type of ['sheet', 'subject', 'career']) {
      assert.equal(validateRequest({ ...base, scope: { type, id } }).ok, false, `${type} ${id}`)
    }
    assert.equal(validateRequest({ ...base, selection: { sheetId: id, text: 'x' } }).ok, false, `sheetId ${id}`)
  }
  assert.equal(validateRequest({ ...base, scope: { type: 'career', id: 'ABCDEF01-1111-4111-8111-111111111111' } }).ok, true)
  assert.equal(validateRequest({ ...base, selection: { sheetId: UUID, text: 'x' } }).ok, true)
})

test('uiLang: "en" se conserva; ausente u otro valor → "es"; un pedido anterior sigue siendo válido', () => {
  assert.equal(validateRequest({ ...base, uiLang: 'en' }).value.uiLang, 'en')
  assert.equal(validateRequest({ ...base, uiLang: 'es' }).value.uiLang, 'es')
  for (const bad of ['fr', 5, null, undefined, {}]) assert.equal(validateRequest({ ...base, uiLang: bad }).value.uiLang, 'es')
  assert.equal(validateRequest(base).ok, true)
})
