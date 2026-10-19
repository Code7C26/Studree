// Cliente de la Gemini API (REST, generateContent en streaming por SSE).
// La clave viaja SOLO por el header `x-goog-api-key` (nunca en la URL ni en
// mensajes de error). El modelo es un parámetro (secret GEMINI_MODEL).
// `modelParts` son las partes crudas del modelo: se reenvían intactas en el
// turno siguiente (incluye `thoughtSignature` de las llamadas a herramientas).

import { createSseParser } from './sse.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Topes de lo que acumulamos de una respuesta. */
const MAX_TEXT_CHARS = 60_000
const MAX_PARTS = 64
const BLOCKED_FINISH = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY', 'RECITATION'])

export class GeminiError extends Error {
  /**
   * @param {'upstream'|'blocked'|'empty'} kind
   * @param {number} [status]
   */
  constructor(kind, status = 0, message = kind) {
    super(message)
    this.name = 'GeminiError'
    this.kind = kind
    this.status = status
  }
}

/**
 * Cuerpo REST del pedido.
 * @param {{systemPrompt: string, contents: object[], tools?: object[], json?: {schema: object}}} p
 * @returns {object}
 */
export function buildGeminiRequest({ systemPrompt, contents, tools, json }) {
  const body = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents }
  if (tools?.length) body.tools = tools
  if (json) body.generationConfig = { responseMimeType: 'application/json', responseSchema: json.schema }
  return body
}

/**
 * Llama al modelo en streaming y acumula texto, llamadas y partes crudas.
 * @param {{fetchImpl: typeof fetch, apiKey: string, model: string, body: object, onText?: (t: string) => void}} p
 * @returns {Promise<{text: string, calls: Array<{name: string, args: object}>, modelParts: object[]}>}
 */
export async function streamGemini({ fetchImpl, apiKey, model, body, onText = () => {} }) {
  const url = `${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
  let res
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    })
  } catch {
    throw new GeminiError('upstream', 0, 'No se pudo contactar al modelo')
  }
  if (!res.ok) {
    try {
      await res.body?.cancel()
    } catch {
      // ya cerrado
    }
    throw new GeminiError('upstream', res.status, `El modelo respondió ${res.status}`)
  }
  if (!res.body) throw new GeminiError('upstream', res.status, 'Respuesta sin cuerpo')

  const state = { text: '', calls: [], modelParts: [], blocked: false, finish: null }

  function handle(event) {
    if (event?.promptFeedback?.blockReason) state.blocked = true
    const cand = event?.candidates?.[0]
    if (cand?.finishReason) state.finish = cand.finishReason
    for (const part of cand?.content?.parts ?? []) {
      if (state.modelParts.length >= MAX_PARTS) throw new GeminiError('upstream', 0, 'Demasiadas partes')
      state.modelParts.push(part)
      if (part.functionCall?.name) {
        state.calls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} })
      } else if (typeof part.text === 'string' && part.text && !part.thought) {
        const room = MAX_TEXT_CHARS - state.text.length
        if (room <= 0) continue
        const piece = part.text.slice(0, room)
        state.text += piece
        onText(piece)
      }
    }
  }

  const parser = createSseParser()
  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const ev of parser.push(decoder.decode(value, { stream: true }))) handle(ev)
    }
    for (const ev of parser.push(decoder.decode())) handle(ev)
    for (const ev of parser.flush()) handle(ev)
  } catch (e) {
    if (e instanceof GeminiError) throw e
    throw new GeminiError('upstream', 0, 'Se cortó la respuesta del modelo')
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // nada que liberar
    }
  }

  const hasOutput = state.text || state.calls.length
  if (state.blocked || (!hasOutput && BLOCKED_FINISH.has(state.finish))) {
    throw new GeminiError('blocked', 0, 'El modelo bloqueó la respuesta')
  }
  if (!hasOutput) throw new GeminiError('empty', 0, 'El modelo no devolvió nada')
  return { text: state.text, calls: state.calls, modelParts: state.modelParts }
}
