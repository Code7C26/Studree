/**
 * Fechas del Inicio (ver docs/features/home.md). Funciones puras.
 *
 * Los días se manejan como claves `YYYY-MM-DD` en la HORA LOCAL del navegador
 * (igual que la columna `date` de Postgres, que no tiene zona): así una fecha
 * no se corre de día por la diferencia con UTC.
 */

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_MS = 24 * 60 * 60 * 1000

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0')

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
 * @returns {string} "hoy", "mañana", "en 3 días", "ayer", "hace 3 días".
 */
export function formatCountdown(days) {
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  if (days === -1) return 'ayer'
  return days > 0 ? `en ${days} días` : `hace ${-days} días`
}

/**
 * @param {string} iso
 * @param {Date} [now]
 * @returns {string} "recién", "hace 15 min", "hace 2 horas", "hace 3 días" o "el 01/08/2026".
 */
export function formatRelativeTime(iso, now = new Date()) {
  const date = new Date(iso)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? 'hace 1 día' : `hace ${days} días`
  return `el ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

/**
 * Mismo formato que la barra de las hojas en La Carpeta (`lib/format/sheetDate.js`
 * de esa fase; se unifican después del merge).
 * @param {string} iso
 * @param {Date} [now]
 * @returns {string} "Martes 14/10 · 18:30" (con año si no es el actual).
 */
export function formatDateTime(iso, now = new Date()) {
  const date = new Date(iso)
  const year = date.getFullYear() === now.getFullYear() ? '' : `/${date.getFullYear()}`
  return `${WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}${year} · ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * @param {string} key
 * @returns {string} "mar 20/10"
 */
export function formatShortDate(key) {
  const date = parseDateKey(key)
  return `${WEEKDAYS_SHORT[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

/**
 * @param {string} key
 * @returns {string} "20/10"
 */
export function formatDayMonth(key) {
  const date = parseDateKey(key)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

/**
 * @param {number} year
 * @param {number} month - 0-based.
 * @returns {string} "Octubre 2026"
 */
export function formatMonthTitle(year, month) {
  return `${MONTHS[month]} ${year}`
}
