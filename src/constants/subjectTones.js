/**
 * Tonos de cada color de materia (ADR-018). Ver docs/features/folder.md.
 *
 * Las materias usan la paleta fija de `palette.js`. Cada color tiene tres
 * variantes elegidas para pasar contraste (≥ 4.5:1): `onPaper` para títulos y
 * links sobre el papel crema, `onDark` para el índice sobre el fondo oscuro y
 * `soft` como fondo del tema activo. Son valores POR DATO: se aplican con
 * `style` / variables CSS (Mandamiento II permite inline para lo dinámico).
 */

import { DEFAULT_COLOR } from './palette.js'

/** @typedef {{base: string, onPaper: string, onDark: string, soft: string}} SubjectTones */

/** @type {Readonly<Record<string, SubjectTones>>} */
const TONES = Object.freeze({
  '#22c55e': { base: '#22c55e', onPaper: '#15803d', onDark: '#86efac', soft: 'rgba(34,197,94,.16)' },
  '#3b82f6': { base: '#3b82f6', onPaper: '#1d4ed8', onDark: '#93c5fd', soft: 'rgba(59,130,246,.16)' },
  '#8b5cf6': { base: '#8b5cf6', onPaper: '#6d28d9', onDark: '#c4b5fd', soft: 'rgba(139,92,246,.16)' },
  '#f59e0b': { base: '#f59e0b', onPaper: '#b45309', onDark: '#fcd34d', soft: 'rgba(245,158,11,.16)' },
  '#ec4899': { base: '#ec4899', onPaper: '#be185d', onDark: '#f9a8d4', soft: 'rgba(236,72,153,.16)' },
  '#06b6d4': { base: '#06b6d4', onPaper: '#0e7490', onDark: '#67e8f9', soft: 'rgba(6,182,212,.16)' },
})

/**
 * @param {string|null} [color] - `subjects.color`.
 * @returns {SubjectTones} Los del verde si el color no es de la paleta.
 */
export function getSubjectTones(color) {
  const key = typeof color === 'string' ? color.toLowerCase() : ''
  return TONES[key] ?? TONES[DEFAULT_COLOR]
}

/**
 * Variables CSS para el contenedor de una materia (las usa `index.css`).
 * @param {string|null} [color]
 * @returns {Record<string, string>}
 */
export function subjectCssVars(color) {
  const tones = getSubjectTones(color)
  return {
    '--subject': tones.base,
    '--subject-ink': tones.onPaper,
    '--subject-light': tones.onDark,
    '--subject-soft': tones.soft,
  }
}
