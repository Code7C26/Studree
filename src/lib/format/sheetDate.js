/**
 * Fecha y hora de una hoja (ADR-017): las hojas no tienen título, se
 * identifican por cuándo se crearon. Ver docs/features/folder.md.
 *
 * Funciones puras. Usan la hora LOCAL del navegador (es lo que el estudiante
 * espera ver: "la clase del martes a las 18:30").
 */

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const pad = (value) => String(value).padStart(2, '0')

/** @param {Date} date */
function time(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Para la barra de la hoja: `Martes 14/10 · 18:30`; con año si no es el actual
 * (`Lunes 03/03/2025 · 09:05`).
 * @param {string} iso
 * @param {Date} [now]
 * @returns {string}
 */
export function formatSheetDate(iso, now = new Date()) {
  const date = new Date(iso)
  const year = date.getFullYear() === now.getFullYear() ? '' : `/${date.getFullYear()}`
  return `${WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}${year} · ${time(date)}`
}

/**
 * Siempre con año (export: el archivo puede leerse años después).
 * @param {string} iso
 * @returns {string}
 */
export function formatSheetDateLong(iso) {
  const date = new Date(iso)
  return `${WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${time(date)}`
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
