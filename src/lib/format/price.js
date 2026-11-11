/**
 * Precio para mostrar en la pantalla de planes y el checkout (Fase 17, docs/features/plans.md).
 * Sin centavos: los precios de los planes son enteros.
 * @param {number} amount
 * @param {string} currency - Código ISO 4217 (ej. 'ARS').
 * @param {'es'|'en'} lang
 * @returns {string}
 */
export function formatPrice(amount, currency, lang) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
