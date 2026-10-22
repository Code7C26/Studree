import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initialChat, reduceEvent, addUserMessage, setProposalStatus, finishRequest, setError, setNotice, chatMood,
  threadItems, appendExchange, MAX_MESSAGES, MAX_MESSAGE_CHARS,
} from './chatState.js'

const prop = (over = {}) => ({ id: 'p1', kind: 'append', sheetId: 's1', markdown: 'hola', source: 'notes', status: 'pending', ...over })

test('estado inicial vacío', () => {
  assert.deepEqual(initialChat(), {
    messages: [], proposals: [], busy: false, status: null, usage: null, quiz: null, error: null,
    notice: null, truncated: false, turn: 0, summary: null,
  })
})

test('addUserMessage agrega el mensaje, marca busy y limpia error y status', () => {
  const s = addUserMessage({ ...initialChat(), error: 'x', status: 'y' }, 'hola')
  assert.deepEqual(s.messages, [{ role: 'user', text: 'hola', turn: 1 }])
  assert.equal(s.busy, true)
  assert.equal(s.error, null)
  assert.equal(s.status, null)
})

test('text crea el mensaje del asistente si no hay y después concatena', () => {
  let s = addUserMessage(initialChat(), 'hola')
  s = reduceEvent(s, { type: 'text', delta: 'Ho' })
  s = reduceEvent(s, { type: 'text', delta: 'la!' })
  assert.deepEqual(s.messages, [{ role: 'user', text: 'hola', turn: 1 }, { role: 'assistant', text: 'Hola!', turn: 1 }])
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

test('quiz se guarda; grades no toca el chat (las notas las junta useAssistant)', () => {
  const s = reduceEvent(initialChat(), { type: 'quiz', questions: [{ id: 'q1' }] })
  assert.deepEqual(s.quiz, [{ id: 'q1' }])
  const after = reduceEvent(s, { type: 'grades', grades: [{ id: 'q1', correct: true, feedback: 'ok' }] })
  assert.equal(after, s)
  assert.ok(!('grades' in after))
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

test('una acción de chip sin texto usa la etiqueta visible y deja busy', () => {
  const s = addUserMessage({ ...initialChat(), truncated: true }, 'Resumir materia')
  assert.deepEqual(s.messages, [{ role: 'user', text: 'Resumir materia', turn: 1 }])
  assert.equal(s.busy, true)
  assert.equal(s.truncated, false)
})

test('done marca truncated si viene truncated o un finishReason distinto de STOP', () => {
  const busy = addUserMessage(initialChat(), 'x')
  assert.equal(reduceEvent(busy, { type: 'done' }).truncated, false)
  assert.equal(reduceEvent(busy, { type: 'done', finishReason: 'STOP' }).truncated, false)
  assert.equal(reduceEvent(busy, { type: 'done', truncated: true }).truncated, true)
  assert.equal(reduceEvent(busy, { type: 'done', finishReason: 'MAX_TOKENS' }).truncated, true)
})

test('finishRequest libera el chat (corte o stream sin done) y conserva el error del stream', () => {
  let s = addUserMessage(initialChat(), 'x')
  s = reduceEvent(s, { type: 'tool', name: 'read_sheet' })
  const cut = finishRequest(s)
  assert.equal(cut.busy, false)
  assert.equal(cut.status, null)
  assert.equal(cut.error, null)
  const withError = finishRequest(s, 'Se cortó.')
  assert.equal(withError.error, 'Se cortó.')
  const afterStreamError = finishRequest(reduceEvent(s, { type: 'error', message: 'Del stream.' }), null)
  assert.equal(afterStreamError.error, 'Del stream.')
})

test('finishRequest sin nada que cambiar devuelve el mismo estado', () => {
  const s = initialChat()
  assert.equal(finishRequest(s), s)
})

test('setError pone y limpia el aviso sin tocar busy', () => {
  const busy = addUserMessage(initialChat(), 'x')
  const s = setError(busy, 'Es de Premium.')
  assert.equal(s.error, 'Es de Premium.')
  assert.equal(s.busy, true)
  assert.equal(setError(s, null).error, null)
  assert.equal(setError(s, '').error, null)
})

test('chatMood: pensando, escribiendo, triste y en reposo', () => {
  let s = addUserMessage(initialChat(), 'x')
  assert.equal(chatMood(s), 'thinking')
  s = reduceEvent(s, { type: 'text', delta: 'Ho' })
  assert.equal(chatMood(s), 'writing')
  assert.equal(chatMood(reduceEvent(s, { type: 'done' })), 'idle')
  assert.equal(chatMood(reduceEvent(s, { type: 'error', message: 'x' })), 'sad')
})

test('setNotice es una nota neutra: no es error ni pone triste al Brote, y un mensaje nuevo la limpia', () => {
  const s = setNotice(initialChat(), 'El plan de estudio es parte de Premium.')
  assert.equal(s.notice, 'El plan de estudio es parte de Premium.')
  assert.equal(s.error, null)
  assert.equal(chatMood(s), 'idle')
  assert.equal(addUserMessage(s, 'hola').notice, null)
  assert.equal(setNotice(s, null).notice, null)
})

test('una propuesta conserva la selección válida con la que se pidió (para verificar el reemplazo)', () => {
  const selection = { sheetId: 'sh1', from: 2, to: 9, text: 'abcdefg' }
  const raw = { id: 'p9', kind: 'replace_selection', sheetId: 'sh1', markdown: 'x', source: 'notes', selection }
  const s = reduceEvent(initialChat(), { type: 'proposal', proposal: raw })
  assert.deepEqual(s.proposals[0].selection, selection)
  const bad = reduceEvent(initialChat(), { type: 'proposal', proposal: { ...raw, selection: { sheetId: 'sh1', from: 'a' } } })
  assert.equal('selection' in bad.proposals[0], false)
})

const P1 = prop({ id: 'p-turn-1' })
const labels = (s) => threadItems(s).map((i) => (i.type === 'message' ? i.message.text : i.proposal.id))

test('threadItems: cada propuesta va después del último mensaje de su turno', () => {
  let s = addUserMessage(initialChat(), 'a')
  s = reduceEvent(s, { type: 'text', delta: 'r1' })
  s = reduceEvent(s, { type: 'proposal', proposal: P1 })
  s = finishRequest(s)
  s = addUserMessage(s, 'b')
  s = reduceEvent(s, { type: 'text', delta: 'r2' })
  assert.deepEqual(labels(s), ['a', 'r1', P1.id, 'b', 'r2'])
})

test('threadItems: propuestas de turnos ya recortados van al principio', () => {
  let s = addUserMessage(initialChat(), 'a')
  s = reduceEvent(s, { type: 'proposal', proposal: P1 })
  for (let i = 0; i < MAX_MESSAGES + 5; i++) s = addUserMessage(s, `m${i}`)
  const items = threadItems(s)
  assert.equal(items[0].type, 'proposal')
  assert.equal(items[0].proposal.id, P1.id)
  assert.equal(items.length, MAX_MESSAGES + 1)
})

test('setProposalStatus guarda sheetCreatedAt al aplicar', () => {
  let s = reduceEvent(initialChat(), { type: 'proposal', proposal: prop({ id: 'a' }) })
  s = setProposalStatus(s, 'a', 'applied', { sheetCreatedAt: '2026-10-17T12:00:00Z' })
  assert.equal(s.proposals[0].appliedSheetCreatedAt, '2026-10-17T12:00:00Z')
  const r = setProposalStatus(s, 'a', 'rejected')
  assert.equal(r.proposals[0].status, 'rejected')
})

test('appendExchange suma el intercambio en turnos nuevos y solo propuestas pendientes', () => {
  let s = addUserMessage(initialChat(), 'hola')
  s = finishRequest(s)
  const exchange = {
    messages: [{ role: 'user', text: 'Resumir' }, { role: 'assistant', text: 'Listo' }],
    proposals: [prop({ id: 'x', status: 'pending' }), prop({ id: 'y', status: 'applied' })],
  }
  const t = appendExchange(s, exchange)
  assert.deepEqual(t.messages.map((m) => [m.text, m.turn]), [['hola', 1], ['Resumir', 2], ['Listo', 2]])
  assert.deepEqual(t.proposals.map((p) => [p.id, p.turn]), [['x', 2]])
  assert.equal(t.turn, 2)
  assert.deepEqual(labels(t), ['hola', 'Resumir', 'Listo', 'x'])
})

test('evento summary válido queda en state.summary; uno sin sections se ignora', () => {
  const summary = { title: 'T', sections: [{ heading: 'h', bullets: ['a'] }] }
  const s = reduceEvent(initialChat(), { type: 'summary', summary })
  assert.deepEqual(s.summary, summary)
  assert.equal(reduceEvent(initialChat(), { type: 'summary', summary: { title: 'T' } }).summary, null)
  assert.equal(reduceEvent(initialChat(), { type: 'summary', summary: { sections: [] } }).summary, null)
})
