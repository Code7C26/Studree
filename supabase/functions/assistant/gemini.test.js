import test from 'node:test'
import assert from 'node:assert/strict'
import { createSseParser } from './sse.js'
import { buildGeminiRequest, streamGemini, GeminiError } from './gemini.js'

const enc = new TextEncoder()
const sseResponse = (chunks, init = {}) =>
  new Response(
    new ReadableStream({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch))
        c.close()
      },
    }),
    { status: 200, ...init },
  )
const ev = (obj) => `data: ${JSON.stringify(obj)}\r\n\r\n`
const textChunk = (t) => ({ candidates: [{ content: { role: 'model', parts: [{ text: t }] } }] })

function fakeFetch(res) {
  const calls = []
  const fn = async (url, init) => {
    calls.push({ url, init })
    return res
  }
  fn.calls = calls
  return fn
}
const run = (fetchImpl, extra = {}) =>
  streamGemini({ fetchImpl, apiKey: 'test-key', model: 'm-test', body: { contents: [] }, onText: () => {}, ...extra })

test('sse: reensambla cortes, ignora [DONE] y JSON inválido', () => {
  const p = createSseParser()
  assert.deepEqual(p.push('data: {"a":'), [])
  assert.deepEqual(p.push('1}\n\ndata: {"b":2}\n'), [{ a: 1 }])
  assert.deepEqual(p.push('\ndata: [DONE]\n\ndata: no-json\n\n'), [{ b: 2 }])
})

test('sse: tolera CRLF y comentarios', () => {
  const p = createSseParser()
  assert.deepEqual(p.push(': ping\r\ndata: {"x":1}\r\n\r\n'), [{ x: 1 }])
})

test('buildGeminiRequest arma el cuerpo REST', () => {
  const b = buildGeminiRequest({
    systemPrompt: 'sys',
    contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
    tools: [{ functionDeclarations: [{ name: 'x' }] }],
  })
  assert.deepEqual(b.systemInstruction, { parts: [{ text: 'sys' }] })
  assert.equal(b.contents.length, 1)
  assert.deepEqual(b.tools, [{ functionDeclarations: [{ name: 'x' }] }])
  assert.equal(b.generationConfig, undefined)
  const j = buildGeminiRequest({ systemPrompt: 's', contents: [], json: { schema: { type: 'OBJECT' } } })
  assert.equal(j.generationConfig.responseMimeType, 'application/json')
  assert.deepEqual(j.generationConfig.responseSchema, { type: 'OBJECT' })
  assert.equal(j.tools, undefined)
})

test('(a) dos chunks de texto: onText dos veces y text concatenado', async () => {
  const seen = []
  const f = fakeFetch(sseResponse([ev(textChunk('Ho')), ev(textChunk('la'))]))
  const r = await run(f, { onText: (t) => seen.push(t) })
  assert.deepEqual(seen, ['Ho', 'la'])
  assert.equal(r.text, 'Hola')
  assert.deepEqual(r.calls, [])
})

test('(b) functionCall: calls y modelParts idénticos a lo recibido', async () => {
  const part = { functionCall: { name: 'read_sheet', args: { sheet_id: 's1' } }, thoughtSignature: 'sig==' }
  const f = fakeFetch(sseResponse([ev({ candidates: [{ content: { role: 'model', parts: [part] } }] })]))
  const r = await run(f)
  assert.deepEqual(r.calls, [{ name: 'read_sheet', args: { sheet_id: 's1' } }])
  assert.deepEqual(r.modelParts, [part])
})

test('(c) corte en medio de una línea data se reensambla', async () => {
  const full = ev(textChunk('abc'))
  const f = fakeFetch(sseResponse([full.slice(0, 20), full.slice(20, 45), full.slice(45)]))
  const r = await run(f)
  assert.equal(r.text, 'abc')
})

test('(d) HTTP 429 -> upstream con status', async () => {
  const f = fakeFetch(new Response('{"error":"quota"}', { status: 429 }))
  await assert.rejects(run(f), (e) => e instanceof GeminiError && e.kind === 'upstream' && e.status === 429)
})

test('fetch que lanza -> upstream sin filtrar la clave', async () => {
  const f = async () => {
    throw new Error('boom')
  }
  await assert.rejects(run(f), (e) => e.kind === 'upstream' && !String(e.message).includes('test-key'))
})

test('(e) promptFeedback.blockReason -> blocked', async () => {
  const f = fakeFetch(sseResponse([ev({ promptFeedback: { blockReason: 'SAFETY' } })]))
  await assert.rejects(run(f), (e) => e.kind === 'blocked')
})

test('finishReason SAFETY sin contenido -> blocked', async () => {
  const f = fakeFetch(sseResponse([ev({ candidates: [{ finishReason: 'SAFETY' }] })]))
  await assert.rejects(run(f), (e) => e.kind === 'blocked')
})

test('(f) stream sin texto ni llamadas -> empty', async () => {
  const f = fakeFetch(sseResponse([ev({ candidates: [{ finishReason: 'STOP' }] })]))
  await assert.rejects(run(f), (e) => e.kind === 'empty')
})

test('texto de razonamiento (thought) no se emite pero queda en modelParts', async () => {
  const parts = [{ text: 'pienso', thought: true }, { text: 'respuesta' }]
  const seen = []
  const f = fakeFetch(sseResponse([ev({ candidates: [{ content: { role: 'model', parts } }] })]))
  const r = await run(f, { onText: (t) => seen.push(t) })
  assert.deepEqual(seen, ['respuesta'])
  assert.equal(r.text, 'respuesta')
  assert.deepEqual(r.modelParts, parts)
})

test('(g) la clave viaja por header y no en la URL', async () => {
  const f = fakeFetch(sseResponse([ev(textChunk('x'))]))
  await run(f)
  const { url, init } = f.calls[0]
  assert.ok(url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/m-test:streamGenerateContent'))
  assert.ok(url.includes('alt=sse'))
  assert.ok(!url.includes('test-key'))
  assert.equal(init.headers['x-goog-api-key'], 'test-key')
  assert.equal(init.method, 'POST')
})

test('acota el texto acumulado', async () => {
  const big = 'a'.repeat(30000)
  const f = fakeFetch(sseResponse([ev(textChunk(big)), ev(textChunk(big)), ev(textChunk(big))]))
  const r = await run(f)
  assert.ok(r.text.length <= 60000)
})

test('acota la cantidad de partes', async () => {
  const parts = Array.from({ length: 100 }, (_, i) => ({ functionCall: { name: 'get_agenda', args: { i } } }))
  const f = fakeFetch(sseResponse([ev({ candidates: [{ content: { role: 'model', parts } }] })]))
  await assert.rejects(run(f), (e) => e.kind === 'upstream')
})
