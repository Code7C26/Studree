/**
 * Grilla mensual del calendario del Inicio (ver docs/features/home.md).
 * Sin librerías: 6 semanas × 7 días, la semana empieza el LUNES.
 */

import { toDateKey } from './dates.js'

/** Encabezados de la grilla, de lunes a domingo. */
export const WEEKDAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * @typedef {{key: string, day: number, inMonth: boolean}} CalendarCell
 */

/**
 * Siempre 6 filas (aunque el mes entre en 5) para que el panel no cambie de
 * alto al pasar de mes.
 * @param {number} year
 * @param {number} month - 0-based.
 * @returns {CalendarCell[][]}
 */
export function buildMonthGrid(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7 // lunes = 0
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(year, month, 1 - offset + week * 7 + weekday)
      return { key: toDateKey(date), day: date.getDate(), inMonth: date.getMonth() === month }
    }),
  )
}

/**
 * @param {number} year
 * @param {number} month - 0-based.
 * @param {number} delta - Meses a mover (negativo = atrás).
 * @returns {{year: number, month: number}}
 */
export function shiftMonth(year, month, delta) {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}
