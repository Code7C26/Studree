/**
 * Cliente único de Supabase (fuente de verdad de los datos — ver ADR-007).
 *
 * Las credenciales se leen de las variables de entorno definidas en `.env.local`
 * (template en `.env.example`). La `anon key` es PÚBLICA por diseño: lo que
 * protege los datos son las políticas de RLS del esquema, no el secreto de la
 * clave. Ver `docs/03-security.md`.
 *
 * Los services de cada feature (careers, subjects, units, topics, sheets,
 * prerequisites) se apoyan en `getSupabase()`; ningún componente debe importar
 * este cliente directamente.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * `true` si ambas variables de entorno están cargadas.
 * Permite que la app arranque (y avise) aunque falten las claves, en vez de
 * romper con un error críptico de `createClient`.
 * @type {boolean}
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Instancia única del cliente, o `null` si faltan las variables de entorno.
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Completá .env.local (ver .env.example) y reiniciá el dev server.',
  )
}

/**
 * Devuelve el cliente de Supabase o lanza un error explicativo si no está
 * configurado. Usar esto en los services en lugar de `supabase` directamente.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 * @throws {Error} Si faltan las variables de entorno.
 */
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado: faltan VITE_SUPABASE_URL y/o ' + // i18n-ignore: error de desarrollo (nadie lo ve en la interfaz)
        'VITE_SUPABASE_ANON_KEY en .env.local (ver .env.example).',
    )
  }
  return supabase
}
