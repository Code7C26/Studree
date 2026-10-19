/**
 * Cliente del asistente (el Brote): habla con la Edge Function `assistant` por
 * streaming SSE. Ver docs/features/assistant.md y docs/API_DOCS.md.
 */

import { getSupabase } from './supabase.client.js'
import { createSseParser } from '../lib/assistant/sse.js'
import { translateAssistantError } from '../lib/assistant/assistantError.js'

export { translateAssistantError }

/**
 * Pide algo al asistente y reenvía cada evento SSE a `onEvent`, tal cual llegan
 * (no asume que `done` sea el último: tras un error `steps` viene `usage`).
 * Si el usuario corta con `signal`, resuelve `{data: null, error: null}`.
 *
 * @param {{request: Object, signal?: AbortSignal, onEvent: (event: any) => void}} params
 * @returns {Promise<import('../types/models.js').ServiceResult<true>>}
 */
export async function streamAssistant({ request, signal, onEvent }) {
  try {
    // Se lee acá adentro (no al importar) para que el módulo sea importable en tests.
    const env = import.meta.env
    const { data: sessionData } = await getSupabase().auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return { data: null, error: translateAssistantError(401, null) }

    const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/assistant`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.VITE_SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    })

    if (!response.ok) {
      let body = null
      try {
        body = await response.json()
      } catch {
        // cuerpo que no es JSON: se traduce solo por status
      }
      return { data: null, error: translateAssistantError(response.status, body) }
    }
    if (!response.body) return { data: null, error: translateAssistantError(500, null) }

    const parser = createSseParser()
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const event of parser.push(decoder.decode(value, { stream: true }))) onEvent(event)
    }
    for (const event of parser.push(decoder.decode())) onEvent(event)
    for (const event of parser.flush()) onEvent(event)
    return { data: true, error: null }
  } catch (error) {
    if (signal?.aborted || /** @type {Error} */ (error)?.name === 'AbortError') return { data: null, error: null }
    return { data: null, error: translateAssistantError(0, null) }
  }
}
