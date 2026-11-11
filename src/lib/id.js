/**
 * Generación de identificadores.
 *
 * Desde ADR-010 las tablas de Supabase usan columnas `uuid`, así que los IDs
 * tienen que ser UUID válidos: el formato corto anterior (`timestamp-random`)
 * era rechazado por Postgres.
 *
 * El ID se genera en el cliente (en vez de dejar que lo ponga
 * `default gen_random_uuid()`) porque el guardado es optimista: la UI necesita
 * el ID para pintar la fila nueva ANTES de que Supabase responda (ADR-007).
 */

/**
 * Genera un UUID v4.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback para contextos sin `crypto.randomUUID` (navegador viejo o sin HTTPS).
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  throw new Error('No hay una fuente de aleatoriedad segura para generar IDs.')
}
