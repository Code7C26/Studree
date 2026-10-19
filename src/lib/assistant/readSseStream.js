/**
 * Lee un stream SSE del asistente y reenvía cada evento a `onEvent`.
 * Puro (sin supabase ni `import.meta`): se testea en Node con `ReadableStream`.
 *
 * Siempre cancela el lector al terminar (no solo `releaseLock`): si el cliente
 * deja de leer, el servidor tiene que dejar de generar y gastar cuota.
 */

import { createSseParser } from './sse.js'

/**
 * @typedef {'done'|'error'|'eof'|'aborted'|'callback'} SseEnd
 *   `done`/`error`: el stream terminó y se vio ese evento (`done` gana). No se
 *   corta al ver `error`: tras `steps` todavía llega `usage`.
 *   `eof`: terminó sin `done` ni `error`. `aborted`: cortó el `signal`.
 *   `callback`: `onEvent` lanzó; se registró, se canceló el stream y se dejó de leer.
 */

/**
 * @param {ReadableStream<Uint8Array>} body
 * @param {(event: any) => void} onEvent
 * @param {{signal?: AbortSignal, logError?: (...args: unknown[]) => void}} [options]
 * @returns {Promise<{ended: SseEnd}>}
 */
export async function readSseStream(body, onEvent, { signal, logError = console.error } = {}) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser()
  let sawDone = false
  let sawError = false

  /** @returns {boolean} false si `onEvent` lanzó. */
  function dispatch(events) {
    for (const event of events) {
      if (event?.type === 'done') sawDone = true
      else if (event?.type === 'error') sawError = true
      try {
        onEvent(event)
      } catch (error) {
        logError('[assistant] onEvent lanzó un error:', error)
        return false
      }
    }
    return true
  }

  try {
    for (;;) {
      if (signal?.aborted) return { ended: 'aborted' }
      const { done, value } = await reader.read()
      if (done) break
      if (!dispatch(parser.push(decoder.decode(value, { stream: true })))) return { ended: 'callback' }
    }
    if (!dispatch(parser.push(decoder.decode()))) return { ended: 'callback' }
    if (!dispatch(parser.flush())) return { ended: 'callback' }
    return { ended: sawDone ? 'done' : sawError ? 'error' : 'eof' }
  } finally {
    reader.cancel().catch(() => {})
  }
}
