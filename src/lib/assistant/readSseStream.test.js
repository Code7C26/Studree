import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSseStream } from './readSseStream.js'

const enc = new TextEncoder()

/** Stream real con los chunks dados; `state.cancelled` marca si se canceló. */
function makeStream(chunks, { hang = false } = {}) {
  const state = { cancelled: false }
  const body = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c instanceof Uint8Array ? c : enc.encode(c))
      if (!hang) controller.close()
    },
    cancel() {
      state.cancelled = true
    },
  })
  return { body, state }
}

test('emoji partido entre chunks', async () => {
  const bytes = enc.encode('data: {"type":"text","text":"a😀b"}\n\n')
  const cut = bytes.indexOf(0xf0) + 2
  const { body } = makeStream([bytes.slice(0, cut), bytes.slice(cut)])
  const events = []
  const r = await readSseStream(body, (e) => events.push(e))
  assert.deepEqual(events, [{ type: 'text', text: 'a😀b' }])
  assert.equal(r.ended, 'eof')
})

test('CRLF partido entre chunks', async () => {
  const { body } = makeStream(['data: {"type":"done"}\r', '\n\r', '\n'])
  const events = []
  const r = await readSseStream(body, (e) => events.push(e))
  assert.deepEqual(events, [{ type: 'done' }])
  assert.equal(r.ended, 'done')
})

test('último evento sin salto final', async () => {
  const { body } = makeStream(['data: {"type":"done"}'])
  const events = []
  const r = await readSseStream(body, (e) => events.push(e))
  assert.deepEqual(events, [{ type: 'done' }])
  assert.equal(r.ended, 'done')
})

test('error seguido de usage sin done: reenvía todo y termina en error', async () => {
  const { body } = makeStream(['data: {"type":"error","code":"steps"}\n\ndata: {"type":"usage"}\n\n'])
  const events = []
  const r = await readSseStream(body, (e) => events.push(e))
  assert.deepEqual(events.map((e) => e.type), ['error', 'usage'])
  assert.equal(r.ended, 'error')
})

test('sin done ni error termina en eof', async () => {
  const { body } = makeStream(['data: {"type":"text","text":"x"}\n\n'])
  const r = await readSseStream(body, () => {})
  assert.equal(r.ended, 'eof')
})

test('onEvent que lanza: cancela el stream, loguea y deja de leer', async () => {
  const { body, state } = makeStream(['data: {"type":"text"}\n\ndata: {"type":"done"}\n\n'], { hang: true })
  const logged = []
  const seen = []
  const r = await readSseStream(
    body,
    (e) => {
      seen.push(e)
      throw new Error('boom')
    },
    { logError: (...a) => logged.push(a) },
  )
  assert.equal(r.ended, 'callback')
  assert.equal(seen.length, 1)
  assert.equal(logged.length, 1)
  await new Promise((res) => setTimeout(res, 0))
  assert.equal(state.cancelled, true)
})

test('abort con signal corta y cancela', async () => {
  const { body, state } = makeStream(['data: {"type":"text"}\n\n'], { hang: true })
  const ac = new AbortController()
  const events = []
  const r = await readSseStream(
    body,
    (e) => {
      events.push(e)
      ac.abort()
    },
    { signal: ac.signal },
  )
  assert.equal(r.ended, 'aborted')
  assert.equal(events.length, 1)
  await new Promise((res) => setTimeout(res, 0))
  assert.equal(state.cancelled, true)
})
