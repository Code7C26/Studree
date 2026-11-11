// Cuenta del usuario para el asistente: quién es, su plan y su uso de IA.
// Usa el cliente de supabase-js creado con el JWT del USUARIO (RLS siempre;
// nunca service_role). Lo usa `index.js` para armar las dependencias reales
// del handler; está acá (y no en index.js) para poder testearlo en Node.
//
// Falla CERRADO: un conteo que no se pudo leer queda FALTANTE (no 0), y
// `decideAccess` deniega el pedido.

/**
 * @param {any} client cliente de supabase-js con el JWT del usuario
 * @param {{logError?: (...args: any[]) => void}} [opts]
 */
export function createAccount(client, { logError = (...args) => console.error(...args) } = {}) {
  return {
    /** Usuario del JWT, o null si el token no es válido. */
    async getUser(jwt) {
      const { data, error } = await client.auth.getUser(jwt)
      if (error || !data?.user?.id) return null
      return { id: data.user.id }
    },

    /** Fila de `user_plans` (o null si no tiene: cuenta como free). Lanza si falla la consulta. */
    async getPlanRow(userId) {
      const { data, error } = await client.from('user_plans').select('plan').eq('user_id', userId).maybeSingle()
      if (error) throw new Error(`No se pudo leer el plan: ${error.message ?? 'error'}`)
      return data ?? null
    },

    /**
     * Un conteo por cada pedido de `requiredCounts`. Si una consulta falla, esa
     * clave no aparece en el resultado.
     * @param {Array<{key: string, actions: string[], external: boolean, since: string}>} requests
     * @param {string} userId
     * @returns {Promise<Record<string, number>>}
     */
    async countUsage(requests, userId) {
      const counts = {}
      await Promise.all(
        requests.map(async (r) => {
          let q = client
            .from('ai_usage')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('action', r.actions)
            .gte('created_at', r.since)
          if (r.external) q = q.eq('external', true)
          const { count, error } = await q
          if (error || !Number.isFinite(count)) {
            logError('[assistant/account] no se pudo contar el uso', r.key, error?.message ?? 'sin count')
            return
          }
          counts[r.key] = count
        }),
      )
      return counts
    },

    /** Registra una acción en `ai_usage` (`user_id` lo pone la base con auth.uid()). Lanza si falla. */
    async recordUsage({ action, external }) {
      const { error } = await client.from('ai_usage').insert({ action, external: external === true })
      if (error) throw new Error(`No se pudo registrar el uso: ${error.message ?? 'error'}`)
    },
  }
}
