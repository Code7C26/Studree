/**
 * Repaso espaciado con cajas de Leitner (Fase 15). Funciones puras: no tocan Supabase.
 *
 * Caja 1 → hoy, 2 → 1 día, 3 → 2 días, 4 → 4 días, 5 → 8 días.
 * Acertar sube una caja (tope 5); fallar vuelve a la 1 y vence ahora.
 */

export const REVIEW_DAYS = [0, 1, 2, 4, 8]
export const MIN_BOX = 1
export const MAX_BOX = 5

const DAY_MS = 86400000

/** @param {number} box */
const clampBox = (box) => Math.min(MAX_BOX, Math.max(MIN_BOX, Math.trunc(Number(box) || MIN_BOX)))

/**
 * @typedef {{ box?: number }} ReviewCard
 * @typedef {{ box: number, due_at: string, last_reviewed_at: string }} ReviewResult
 */

/**
 * Calcula el estado de una tarjeta después de repasarla.
 * @param {ReviewCard} card
 * @param {boolean} correct
 * @param {Date} [now]
 * @returns {ReviewResult}
 */
export function nextReview(card, correct, now = new Date()) {
  const box = correct ? clampBox((Number(card?.box) || MIN_BOX) + 1) : MIN_BOX
  const days = REVIEW_DAYS[box - 1]
  return {
    box,
    due_at: new Date(now.getTime() + days * DAY_MS).toISOString(),
    last_reviewed_at: now.toISOString(),
  }
}

/**
 * @param {{ due_at?: string|null }} card
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDue(card, now = new Date()) {
  if (!card?.due_at) return true
  return new Date(card.due_at).getTime() <= now.getTime()
}

/**
 * @template {{ due_at?: string|null }} T
 * @param {T[]} cards
 * @param {Date} [now]
 * @returns {T[]}
 */
export function dueCards(cards, now = new Date()) {
  return (cards || []).filter((card) => isDue(card, now))
}

/**
 * Clave de traducción de la caja, para que la UI la resuelva con `t()`.
 * @param {number} box
 * @returns {string}
 */
export function boxLabel(box) {
  return `flashcards.box.${clampBox(box)}`
}
