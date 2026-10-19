/* global Deno */
// Edge Function `assistant` (el Brote). Solo cableado: arma las dependencias
// reales y delega en `handleRequest`. Sin lógica propia.
//
// Seguridad: el cliente de Supabase usa la anon key + el JWT del USUARIO (RLS
// siempre; nunca service_role). `GEMINI_API_KEY` y `GEMINI_MODEL` se leen solo
// acá, de los secrets de la función; nunca se loguean ni viajan en respuestas.
// Si el despliegue no acepta `index.js`, renombrar a `index.ts` sin cambios.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleRequest } from './handler.js'
import { createAccount } from './account.js'
import { createDb } from './supabaseDb.js'
import { streamGemini } from './gemini.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? ''

Deno.serve((req) => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return handleRequest(req, {
    ...createAccount(client),
    makeDb: () => createDb(client),
    callGemini: (args) => streamGemini({ ...args, fetchImpl: fetch, apiKey: GEMINI_API_KEY, model: GEMINI_MODEL }),
    now: () => new Date(),
    env: { model: GEMINI_MODEL, hasApiKey: GEMINI_API_KEY !== '' },
  })
})
