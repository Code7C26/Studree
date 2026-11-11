// Cliente de la Gemini API (REST, generateContent en streaming por SSE).
// La clave viaja SOLO por el header `x-goog-api-key` (nunca en la URL ni en
// mensajes de error). El modelo es un parámetro (secret GEMINI_MODEL).
// `modelParts` son las partes crudas del modelo: se reenvían intactas en el
// turno siguiente. Las partes con `thoughtSignature` jamás se tocan; solo se
// fusionan fragmentos de texto consecutivos sin firma, para no crecer con el
// streaming.

import { createSseParser } from './sse.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Topes de lo que acumulamos de una respuesta. */
const MAX_TEXT_CHARS = 60_000
const MAX_CALLS = 64
const BLOCKED_FINISH = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY', 'RECITATION'])

const isAbort = (e, signal) => !!signal?.aborted || e?.name === 'AbortError'

export class GeminiError extends Error {
  /**
   * @param {'upstream'|'blocked'|'empty'|'aborted'} kind
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
 * `signal` (opcional) cancela el pedido y la lectura → GeminiError 'aborted'.
 * @param {{fetchImpl: typeof fetch, apiKey: string, model: string, body: object, onText?: (t: string) => void, signal?: AbortSignal}} p
 * @returns {Promise<{text: string, calls: Array<{id?: string, name: string, args: object}>, modelParts: object[], finishReason: string|null, truncated: boolean}>}
 */
export async function streamGemini({ fetchImpl, apiKey, model, body, onText = () => {}, signal }) {
  const url = `${BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
  let res
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (isAbort(e, signal)) throw new GeminiError('aborted', 0, 'Pedido cancelado')
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

  const state = { text: '', calls: [], modelParts: [], blocked: false, finish: null, thoughtChars: 0, truncated: false }

  /** Emite texto visible respetando el tope; devuelve lo que entró. */
  function emitText(text) {
    const room = MAX_TEXT_CHARS - state.text.length
    if (text.length > room) state.truncated = true
    const piece = text.slice(0, Math.max(room, 0))
    if (piece) {
      state.text += piece
      onText(piece)
    }
    return piece
  }

  /** Texto sin firma: se fusiona con el texto anterior para que modelParts quede compacto. */
  function pushText(part) {
    if (!part.text) return
    let piece
    if (part.thought) {
      const room = MAX_TEXT_CHARS - state.thoughtChars
      piece = part.text.slice(0, Math.max(room, 0))
      state.thoughtChars += piece.length
    } else {
      piece = emitText(part.text)
    }
    if (!piece) return
    const last = state.modelParts.at(-1)
    const plain = last && typeof last.text === 'string' && Object.keys(last).every((k) => k === 'text' || k === 'thought')
    if (plain && !!last.thought === !!part.thought) {
      last.text += piece
    } else {
      state.modelParts.push({ ...part, text: piece })
    }
  }

  function handle(event) {
    if (event?.promptFeedback?.blockReason) state.blocked = true
    const cand = event?.candidates?.[0]
    if (cand?.finishReason) state.finish = cand.finishReason
    for (const part of cand?.content?.parts ?? []) {
      if (part.functionCall?.name) {
        if (state.calls.length >= MAX_CALLS) throw new GeminiError('upstream', 0, 'Demasiadas llamadas')
        const { id, name, args } = part.functionCall
        state.calls.push({ ...(id ? { id } : {}), name, args: args ?? {} })
        state.modelParts.push(part)
      } else if (typeof part.text === 'string' && !part.thoughtSignature) {
        pushText(part)
      } else {
        // partes con firma u otras: intactas
        state.modelParts.push(part)
        if (typeof part.text === 'string' && part.text && !part.thought) emitText(part.text)
      }
    }
  }

  const parser = createSseParser()
  const decoder = new TextDecoder()
  const reader = res.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (signal?.aborted) throw new GeminiError('aborted', 0, 'Pedido cancelado')
      if (done) break
      for (const ev of parser.push(decoder.decode(value, { stream: true }))) handle(ev)
    }
    for (const ev of parser.push(decoder.decode())) handle(ev)
    for (const ev of parser.flush()) handle(ev)
  } catch (e) {
    try {
      await reader.cancel()
    } catch {
      // ya cerrado
    }
    if (e instanceof GeminiError) throw e
    if (isAbort(e, signal)) throw new GeminiError('aborted', 0, 'Pedido cancelado')
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
  return {
    text: state.text,
    calls: state.calls,
    modelParts: state.modelParts,
    finishReason: state.finish ?? null,
    truncated: state.truncated,
  }
}
