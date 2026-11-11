/**
 * Planes y checkout simulado (Fase 17). Ver docs/features/plans.md.
 * Los topes y funciones de cada plan NO van acá: los decide el servidor
 * (`supabase/functions/assistant/config.js`).
 */

/** Precio mensual de Premium (decisión del equipo, 2026-11-11). */
export const PREMIUM_PRICE = Object.freeze({ amount: 4999, currency: 'ARS' })

/** Medio de pago de prueba que muestra el checkout (no hay campos de tarjeta). */
export const DEMO_CARD_LAST4 = '4242'

/** Duración mínima de "Procesando el pago…", para que se lea como un pago. */
export const CHECKOUT_DELAY_MS = 1200
