/**
 * Fecha y hora de una hoja (ADR-017): las hojas no tienen título, se
 * identifican por cuándo se crearon. Ver docs/features/folder.md.
 *
 * Funciones puras. Usan la hora LOCAL del navegador (es lo que el estudiante
 * espera ver: "la clase del martes a las 18:30"). Los formateadores "de pantalla" siguen el
 * idioma (Fase 18); `sheetLocalIso` y `sheetFileName` son formato de archivo y NO cambian.
 */

import { getLang, tIn } from '../i18n/index.js'
import { formatNumericDate, formatTime, pad } from './dateParts.js'

/**
 * Para la barra de la hoja: `Martes 14/10 · 18:30`; con año si no es el actual
 * (`Lunes 03/03/2025 · 09:05`). En inglés: `Tuesday 10/14 · 6:30 PM`.
 * @param {string} iso
 * @param {Date} [now]
 * @param {string} [lang]
 * @returns {string}
 */
export function formatSheetDate(iso, now = new Date(), lang = getLang()) {
  const date = new Date(iso)
  const withYear = date.getFullYear() !== now.getFullYear()
  return `${tIn(lang, `dates.weekdays.${date.getDay()}`)} ${formatNumericDate(date, lang, withYear)} · ${formatTime(date, lang)}`
}

/**
 * Solo día y mes (chips de fuentes de un resumen): `17/10` (en: `10/17`).
 * @param {string} iso
 * @param {string} [lang]
 * @returns {string}
 */
export function formatSheetDay(iso, lang = getLang()) {
  return formatNumericDate(new Date(iso), lang)
}

/**
 * Siempre con año (export: el archivo puede leerse años después).
 * @param {string} iso
 * @param {string} [lang]
 * @returns {string}
 */
export function formatSheetDateLong(iso, lang = getLang()) {
  const date = new Date(iso)
  return `${tIn(lang, `dates.weekdays.${date.getDay()}`)} ${formatNumericDate(date, lang, true)} · ${formatTime(date, lang)}`
}

/**
 * Fecha y hora local en formato ISO corto, para el frontmatter: `2026-10-14T18:30`.
 * Siempre 24 horas: es formato de archivo, no depende del idioma.
 * @param {string} iso
 * @returns {string}
 */
export function sheetLocalIso(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${formatTime(date, 'es')}`
}

/**
 * Nombre de archivo ordenable alfabéticamente: `2026-10-14 18-30`.
 * @param {string} iso
 * @returns {string}
 */
export function sheetFileName(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}`
}
