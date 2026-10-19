import test from 'node:test'
import assert from 'node:assert/strict'
import { runConversation } from './loop.js'

const script = (steps) => {
  const seen = []
  const fn = async (contents) => {
    seen.push(structuredClone(contents))
    return steps.length > 1 ? steps.shift() : steps[0]
  }
  fn.seen = seen
  return fn
}
const start = () => [{ role: 'user', parts: [{ text: 'hola' }] }]
const call = (name, args = {}) => ({ name, args })
const asParts = (calls) => calls.map((c) => ({ functionCall: c }))

test('sin herramientas: un solo llamado', async () => {
  const callModel = script([{ text: 'listo', calls: [], modelParts: [{ text: 'listo' }] }])
  const events = []
  const r = await runConversation({ callModel, runTool: async () => ({ result: {} }), contents: start(), emit: (e) => events.push(e) })
  assert.equal(callModel.seen.length, 1)
  assert.equal(r.finalText, 'listo')
  assert.deepEqual(events, [])
})

test('con herramienta: el 2º llamado recibe modelParts intactas y functionResponse', async () => {
  const modelParts = [{ functionCall: call('read_sheet', { sheet_id: 's1' }), thoughtSignature: 'sig' }]
  const callModel = script([
    { text: '', calls: [call('read_sheet', { sheet_id: 's1' })], modelParts },
    { text: 'fin', calls: [], modelParts: [{ text: 'fin' }] },
  ])
  const events = []
  const runTool = async (name, args) => ({ result: { name, args, content: 'x' } })
  const r = await runConversation({ callModel, runTool, contents: start(), emit: (e) => events.push(e) })
  const second = callModel.seen[1]
  assert.equal(second.length, 3)
  assert.deepEqual(second[1], { role: 'model', parts: modelParts })
  assert.equal(second[2].role, 'user')
  assert.equal(second[2].parts.length, 1)
  assert.equal(second[2].parts[0].functionResponse.name, 'read_sheet')
  assert.equal(second[2].parts[0].functionResponse.response.content, 'x')
  assert.deepEqual(events, [{ type: 'tool', name: 'read_sheet' }])
  assert.equal(r.finalText, 'fin')
})

test('propose_append emite proposal pending', async () => {
  const proposal = { id: 'p1', kind: 'append', status: 'pending' }
  const c = [call('propose_append')]
  const callModel = script([
    { text: '', calls: c, modelParts: asParts(c) },
    { text: 'ok', calls: [], modelParts: [{ text: 'ok' }] },
  ])
  const events = []
  await runConversation({ callModel, runTool: async () => ({ result: { ok: true }, proposal }), contents: start(), emit: (e) => events.push(e) })
  assert.deepEqual(events[0], { type: 'tool', name: 'propose_append' })
  assert.deepEqual(events[1], { type: 'proposal', proposal })
  assert.equal(events[1].proposal.status, 'pending')
})

test('varias llamadas: una functionResponse por llamada, en orden', async () => {
  const c = [call('get_agenda'), call('search_notes', { query: 'q' })]
  const callModel = script([
    { text: '', calls: c, modelParts: asParts(c) },
    { text: 'x', calls: [], modelParts: [{ text: 'x' }] },
  ])
  await runConversation({ callModel, runTool: async (n) => ({ result: { n } }), contents: start(), emit: () => {} })
  const parts = callModel.seen[1][2].parts
  assert.deepEqual(parts.map((p) => p.functionResponse.name), ['get_agenda', 'search_notes'])
})

test('modelo que pide herramientas siempre: corta en 6 con error steps', async () => {
  const c = [call('get_agenda')]
  const callModel = script([{ text: '', calls: c, modelParts: asParts(c) }])
  const events = []
  await runConversation({ callModel, runTool: async () => ({ result: {} }), contents: start(), emit: (e) => events.push(e) })
  assert.equal(callModel.seen.length, 6)
  assert.deepEqual(events.at(-1), { type: 'error', code: 'steps' })
})

test('acota llamadas por turno: las de más reciben error y no se ejecutan', async () => {
  const c = Array.from({ length: 12 }, () => call('get_agenda'))
  const callModel = script([
    { text: '', calls: c, modelParts: asParts(c) },
    { text: 'x', calls: [], modelParts: [{ text: 'x' }] },
  ])
  let ran = 0
  const runTool = async () => {
    ran++
    return { result: {} }
  }
  await runConversation({ callModel, runTool, contents: start(), emit: () => {} })
  assert.equal(ran, 8)
  const parts = callModel.seen[1][2].parts
  assert.equal(parts.length, 12)
  assert.ok(parts[11].functionResponse.response.error)
})

test('si runTool lanza, falla cerrado con error en la respuesta', async () => {
  const c = [call('read_sheet')]
  const callModel = script([
    { text: '', calls: c, modelParts: asParts(c) },
    { text: 'x', calls: [], modelParts: [{ text: 'x' }] },
  ])
  const runTool = async () => {
    throw new Error('x')
  }
  await runConversation({ callModel, runTool, contents: start(), emit: () => {} })
  assert.ok(callModel.seen[1][2].parts[0].functionResponse.response.error)
})

test('no muta los contents recibidos', async () => {
  const c = start()
  const callModel = script([{ text: 'a', calls: [], modelParts: [{ text: 'a' }] }])
  await runConversation({ callModel, runTool: async () => ({ result: {} }), contents: c, emit: () => {} })
  assert.equal(c.length, 1)
})
