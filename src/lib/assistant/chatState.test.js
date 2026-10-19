import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialChat, reduceEvent, addUserMessage, setProposalStatus, MAX_MESSAGES, MAX_MESSAGE_CHARS,
} from './chatState.js'

const prop = (over = {}) => ({ id: 'p1', kind: 'append', sheetId: 's1', markdown: 'hola', source: 'notes', status: 'pending', ...over })

test('estado inicial vacío', () => {
  assert.deepEqual(initialChat(), {
    messages: [], proposals: [], busy: false, status: null, usage: null, quiz: null, grades: null, error: null,
  })
})

test('addUserMessage agrega el mensaje, marca busy y limpia error y status', () => {
  const s = addUserMessage({ ...initialChat(), error: 'x', status: 'y' }, 'hola')
  assert.deepEqual(s.messages, [{ role: 'user', text: 'hola' }])
  assert.equal(s.busy, true)
  assert.equal(s.error, null)
  assert.equal(s.status, null)
})

test('text crea el mensaje del asistente si no hay y después concatena', () => {
  let s = addUserMessage(initialChat(), 'hola')
  s = reduceEvent(s, { type: 'text', delta: 'Ho' })
  s = reduceEvent(s, { type: 'text', delta: 'la!' })
  assert.deepEqual(s.messages, [{ role: 'user', text: 'hola' }, { role: 'assistant', text: 'Hola!' }])
})

test('text con delta inválido se ignora', () => {
  const s = reduceEvent(initialChat(), { type: 'text', delta: 5 })
  assert.equal(s.messages.length, 0)
})

test('un mensaje del asistente no pasa del tope de caracteres', () => {
  let s = reduceEvent(initialChat(), { type: 'text', delta: 'a'.repeat(MAX_MESSAGE_CHARS - 2) })
  s = reduceEvent(s, { type: 'text', delta: 'bbbbbb' })
  assert.equal(s.messages[0].text.length, MAX_MESSAGE_CHARS)
})

test('se guardan solo los últimos MAX_MESSAGES mensajes', () => {
  let s = initialChat()
  for (let i = 0; i < MAX_MESSAGES + 10; i++) s = addUserMessage(s, `m${i}`)
  assert.equal(s.messages.length, MAX_MESSAGES)
  assert.equal(s.messages.at(-1).text, `m${MAX_MESSAGES + 9}`)
})

test('tool fija un estado legible y done lo limpia', () => {
  let s = addUserMessage(initialChat(), 'x')
  s = reduceEvent(s, { type: 'tool', name: 'read_sheet' })
  assert.equal(s.status, 'Leyendo tus hojas…')
  s = reduceEvent(s, { type: 'tool', name: 'get_agenda' })
  assert.equal(s.status, 'Mirando tu agenda…')
  s = reduceEvent(s, { type: 'tool', name: 'propose_append' })
  assert.equal(s.status, 'Preparando una propuesta…')
  s = reduceEvent(s, { type: 'tool', name: 'raro' })
  assert.equal(s.status, 'Pensando…')
  s = reduceEvent(s, { type: 'done' })
  assert.equal(s.status, null)
  assert.equal(s.busy, false)
})

test('proposal entra siempre como pending, aunque venga applied', () => {
  const s = reduceEvent(initialChat(), { type: 'proposal', proposal: prop({ status: 'applied' }) })
  assert.equal(s.proposals.length, 1)
  assert.equal(s.proposals[0].status, 'pending')
})

test('proposal malformada o repetida se ignora', () => {
  let s = reduceEvent(initialChat(), { type: 'proposal', proposal: { id: 'x' } })
  assert.equal(s.proposals.length, 0)
  s = reduceEvent(s, { type: 'proposal', proposal: prop() })
  s = reduceEvent(s, { type: 'proposal', proposal: prop({ markdown: 'otro' }) })
  assert.equal(s.proposals.length, 1)
  assert.equal(s.proposals[0].markdown, 'hola')
})

test('quiz y grades se guardan', () => {
  let s = reduceEvent(initialChat(), { type: 'quiz', questions: [{ id: 'q1' }] })
  assert.deepEqual(s.quiz, [{ id: 'q1' }])
  s = reduceEvent(s, { type: 'grades', grades: [{ id: 'q1', correct: true, feedback: 'ok' }] })
  assert.equal(s.grades.length, 1)
})

test('error deja busy false, el mensaje y limpia status', () => {
  let s = addUserMessage(initialChat(), 'x')
  s = reduceEvent(s, { type: 'tool', name: 'read_sheet' })
  s = reduceEvent(s, { type: 'error', code: 'upstream', message: 'Se cayó.' })
  assert.equal(s.busy, false)
  assert.equal(s.error, 'Se cayó.')
  assert.equal(s.status, null)
})

test('usage después de error no reabre busy ni borra el error', () => {
  let s = addUserMessage(initialChat(), 'x')
  s = reduceEvent(s, { type: 'error', code: 'steps', message: 'Demasiados pasos.' })
  s = reduceEvent(s, { type: 'usage', action: 'chat', used: 1, max: 5 })
  assert.equal(s.busy, false)
  assert.equal(s.error, 'Demasiados pasos.')
  assert.equal(s.usage.used, 1)
})

test('evento desconocido o nulo no cambia el estado', () => {
  const s = initialChat()
  assert.equal(reduceEvent(s, { type: 'nada' }), s)
  assert.equal(reduceEvent(s, null), s)
})

test('setProposalStatus cambia solo esa propuesta y valida el estado', () => {
  let s = reduceEvent(initialChat(), { type: 'proposal', proposal: prop({ id: 'a' }) })
  s = reduceEvent(s, { type: 'proposal', proposal: prop({ id: 'b' }) })
  const t = setProposalStatus(s, 'a', 'applied')
  assert.deepEqual(t.proposals.map((p) => p.status), ['applied', 'pending'])
  assert.equal(setProposalStatus(s, 'a', 'pending'), s)
})
