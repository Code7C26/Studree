/**
 * Saludo del Inicio (ADR-018). Ver docs/features/home.md. Funciones puras; los textos salen del
 * diccionario `home` y siguen el idioma (Fase 18).
 */

import { getLang, tIn } from '../i18n/index.js'

/**
 * @param {Date} date
 * @param {string} [lang]
 * @returns {string}
 */
export function greetingFor(date, lang = getLang()) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 13) return tIn(lang, 'home.greeting.morning')
  if (hour >= 13 && hour < 20) return tIn(lang, 'home.greeting.afternoon')
  return tIn(lang, 'home.greeting.evening')
}

/**
 * @param {Date} date
 * @param {string} [lang]
 * @returns {string} "Jueves 15 de octubre" (en: "Thursday, October 15")
 */
export function formatLongDay(date, lang = getLang()) {
  return tIn(lang, 'home.longDay', {
    weekday: tIn(lang, `dates.weekdays.${date.getDay()}`),
    day: date.getDate(),
    month: tIn(lang, `home.longMonths.${date.getMonth()}`),
  })
}

/**
 * @param {string} title - Título de la fecha importante.
 * @param {number} days - Días que faltan (0 = hoy).
 * @param {string} [lang]
 * @returns {string}
 */
export function describeNextDate(title, days, lang = getLang()) {
  if (days <= 0) return tIn(lang, 'home.nextLine.today', { title })
  if (days === 1) return tIn(lang, 'home.nextLine.tomorrow', { title })
  return tIn(lang, 'home.nextLine.inDays', { title, count: days })
}
