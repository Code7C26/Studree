/**
 * Saludo del Inicio (ADR-018). Ver docs/features/home.md. Funciones puras.
 */

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** @param {Date} date @returns {string} */
export function greetingFor(date) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 13) return 'Buenos días.'
  if (hour >= 13 && hour < 20) return 'Buenas tardes.'
  return 'Buenas noches.'
}

/** @param {Date} date @returns {string} "Jueves 15 de octubre" */
export function formatLongDay(date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

/**
 * @param {string} title - Título de la fecha importante.
 * @param {number} days - Días que faltan (0 = hoy).
 * @returns {string}
 */
export function describeNextDate(title, days) {
  if (days <= 0) return `hoy tenés ${title}`
  if (days === 1) return `mañana tenés ${title}`
  return `${title} en ${days} días`
}
