/* global Deno */
// Edge Function `assistant` (el Brote). Solo cableado: arma las dependencias
// reales y delega en `handleRequest`. Sin lógica propia.
//
// Seguridad: el cliente de Supabase usa la anon key + el JWT del USUARIO (RLS
// siempre; nunca service_role). `GEMINI_API_KEY` y `GEMINI_MODEL` se leen solo
// acá, de los secrets de la función; nunca se loguean ni viajan en respuestas.
// Si el despliegue no acepta `index.js`, renombrar a `index.ts` sin cambios.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleSafely } from './handler.js'
import { createAccount } from './account.js'
import { createDb } from './supabaseDb.js'
import { streamGemini } from './gemini.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
// Proyectos nuevos exponen la clave pública como SUPABASE_PUBLISHABLE_KEY.
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? ''
const HAS_SUPABASE = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''

const env = { model: GEMINI_MODEL, hasApiKey: GEMINI_API_KEY !== '', hasSupabase: HAS_SUPABASE }
const notConfigured = () => {
  throw new Error('Supabase no configurado')
}

/** Arma las dependencias reales. Sin Supabase no crea el cliente: el handler responde 503 `config`. */
function buildDeps(req) {
  if (!HAS_SUPABASE) {
    return { getUser: notConfigured, getPlanRow: notConfigured, countUsage: notConfigured, recordUsage: notConfigured, makeDb: notConfigured, callGemini: notConfigured, now: () => new Date(), env }
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return {
    ...createAccount(client),
    makeDb: () => createDb(client),
    callGemini: (args) => streamGemini({ ...args, fetchImpl: fetch, apiKey: GEMINI_API_KEY, model: GEMINI_MODEL }),
    now: () => new Date(),
    env,
  }
}

// `handleSafely`: cualquier error no previsto igual vuelve como JSON 500 con CORS.
Deno.serve((req) => handleSafely(req, buildDeps))
