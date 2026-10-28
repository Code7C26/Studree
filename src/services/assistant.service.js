/**
 * Cliente del asistente (el Brote): habla con la Edge Function `assistant` por
 * streaming SSE. Ver docs/features/assistant.md y docs/API_DOCS.md.
 */

import { getSupabase } from './supabase.client.js'
import { readSseStream } from '../lib/assistant/readSseStream.js'
import { translateAssistantError } from '../lib/assistant/assistantError.js'
import { t } from '../lib/i18n/index.js'

export { translateAssistantError }

/**
 * Pide algo al asistente y reenvía cada evento SSE a `onEvent`, tal cual llegan
 * (no asume que `done` sea el último: tras un error `steps` viene `usage`).
 * Si el usuario corta con `signal`, resuelve `{data: null, error: null}`.
 * Si `onEvent` lanza, se cancela el stream y se devuelve un error propio.
 *
 * @param {{request: Object, signal?: AbortSignal, onEvent: (event: any) => void}} params
 * @returns {Promise<import('../types/models.js').ServiceResult<true>>}
 */
export async function streamAssistant({ request, signal, onEvent }) {
  const generic = translateAssistantError(0, null)
  try {
    // Se lee acá adentro (no al importar) para que el módulo sea importable en tests.
    const env = import.meta.env
    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
      console.error('[assistant] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local.')
      return { data: null, error: generic }
    }
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
        // cuerpo que no es JSON (o se abortó): se traduce solo por status
      }
      if (signal?.aborted) return { data: null, error: null }
      return { data: null, error: translateAssistantError(response.status, body) }
    }
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.body || !contentType.includes('text/event-stream')) return { data: null, error: generic }

    const { ended } = await readSseStream(response.body, onEvent, { signal })
    if (ended === 'aborted' || signal?.aborted) return { data: null, error: null }
    if (ended === 'callback') return { data: null, error: t('assistant.errors.unexpected') }
    if (ended === 'eof') return { data: null, error: generic }
    return { data: true, error: null }
  } catch (error) {
    if (signal?.aborted || /** @type {Error} */ (error)?.name === 'AbortError') return { data: null, error: null }
    return { data: null, error: generic }
  }
}
