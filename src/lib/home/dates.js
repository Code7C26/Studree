/**
 * Fechas del Inicio (ver docs/features/home.md). Funciones puras.
 *
 * Los días se manejan como claves `YYYY-MM-DD` en la HORA LOCAL del navegador
 * (igual que la columna `date` de Postgres, que no tiene zona): así una fecha
 * no se corre de día por la diferencia con UTC.
 */

import { getLang, tIn } from '../i18n/index.js'
import { formatSheetDate } from '../format/sheetDate.js'
import { formatNumericDate, pad } from '../format/dateParts.js'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * @param {Date} date
 * @returns {string} `YYYY-MM-DD` en hora local.
 */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * @param {string} key - `YYYY-MM-DD`
 * @returns {Date} Medianoche local de ese día.
 */
export function parseDateKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * @param {string} key
 * @param {number} days
 * @returns {string}
 */
export function addDays(key, days) {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/**
 * Días enteros entre hoy y `key` (negativo si ya pasó). `Math.round` absorbe
 * los días de 23 o 25 horas de los cambios de horario.
 * @param {string} key
 * @param {string} todayKey
 * @returns {number}
 */
export function daysUntil(key, todayKey) {
  return Math.round((parseDateKey(key).getTime() - parseDateKey(todayKey).getTime()) / DAY_MS)
}

/**
 * @param {number} days
 * @param {string} [lang]
 * @returns {string} "hoy", "mañana", "en 3 días", "ayer", "hace 3 días" (en: "today", "in 3 days"…).
 */
export function formatCountdown(days, lang = getLang()) {
  if (days === 0) return tIn(lang, 'dates.countdown.today')
  if (days === 1) return tIn(lang, 'dates.countdown.tomorrow')
  if (days === -1) return tIn(lang, 'dates.countdown.yesterday')
  return days > 0 ? tIn(lang, 'dates.countdown.inDays', { count: days }) : tIn(lang, 'dates.countdown.daysAgo', { count: -days })
}

/**
 * @param {string} iso
 * @param {Date} [now]
 * @param {string} [lang]
 * @returns {string} "recién", "hace 15 min", "hace 2 horas", "hace 3 días" o "el 01/08/2026".
 */
export function formatRelativeTime(iso, now = new Date(), lang = getLang()) {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (minutes < 1) return tIn(lang, 'dates.relative.justNow')
  if (minutes < 60) return tIn(lang, 'dates.relative.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return tIn(lang, 'dates.relative.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return tIn(lang, 'dates.relative.daysAgo', { count: days })
  return tIn(lang, 'dates.relative.onDate', { date: formatNumericDate(date, lang, true) })
}

/**
 * Mismo formato que la barra de las hojas en La Carpeta (`formatSheetDate`).
 * @param {string} iso
 * @param {Date} [now]
 * @param {string} [lang]
 * @returns {string} "Martes 14/10 · 18:30" (con año si no es el actual).
 */
export function formatDateTime(iso, now = new Date(), lang = getLang()) {
  return formatSheetDate(iso, now, lang)
}

/**
 * @param {string} key
 * @param {string} [lang]
 * @returns {string} "mar 20/10" (en: "Tue 10/20")
 */
export function formatShortDate(key, lang = getLang()) {
  const date = parseDateKey(key)
  return `${tIn(lang, `dates.weekdaysShort.${date.getDay()}`)} ${formatNumericDate(date, lang)}`
}

/**
 * @param {string} key
 * @param {string} [lang]
 * @returns {string} "20/10" (en: "10/20")
 */
export function formatDayMonth(key, lang = getLang()) {
  return formatNumericDate(parseDateKey(key), lang)
}

/**
 * @param {number} year
 * @param {number} month - 0-based.
 * @param {string} [lang]
 * @returns {string} "Octubre 2026" (en: "October 2026")
 */
export function formatMonthTitle(year, month, lang = getLang()) {
  return `${tIn(lang, `dates.months.${month}`)} ${year}`
}
