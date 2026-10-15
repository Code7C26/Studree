/**
 * Árbol → Markdown único (ver docs/features/markdown-export.md).
 *
 * Jerarquía de 3 niveles (ADR-014) expresada como headings. Las hojas no
 * tienen título (ADR-017): su heading es la fecha y hora de creación.
 *   materia sola → `#` materia, `##` hoja (fecha)
 *   carrera      → `#` carrera, `##` materia, `###` hoja
 *   todo         → `#` "Mis apuntes", `##` carrera, `###` materia, `####` hoja
 *
 * Los headings DENTRO de cada hoja se corren de nivel para quedar debajo del
 * heading de la hoja (si no, un `# Intro` de la hoja quedaba al mismo nivel que
 * la carrera y una IA leía mal la estructura). Solo afecta al export: el dato
 * guardado no cambia.
 *
 * El `.md` único no lleva archivos: los adjuntos quedan descritos como texto
 * (`[imagen: …]` / `[archivo: …]`). Los archivos van solo en el `.zip`.
 *
 * Funciones puras: no hablan con services ni con el DOM (eso vive en
 * useExportTree.js y download.js).
 */

import { formatSheetDateLong } from '../format/sheetDate.js'
import { describeAttachmentRefs } from '../attachments/refs.js'

const MAX_HEADING = 6
const FENCE = /^\s{0,3}(`{3,}|~{3,})/
const HEADING = /^(\s{0,3})(#{1,6})(\s|$)/

/**
 * Corre los headings ATX (`# Título`) `by` niveles, con tope en `######`.
 * No toca lo que está dentro de bloques de código (``` o ~~~).
 * @param {string} markdown
 * @param {number} by
 * @returns {string}
 */
export function shiftHeadings(markdown, by) {
  let fence = null
  return (markdown ?? '')
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(FENCE)
      if (fenceMatch) {
        const marker = fenceMatch[1][0]
        if (fence === null) fence = marker
        else if (fence === marker) fence = null
        return line
      }
      if (fence !== null) return line
      return line.replace(HEADING, (_whole, indent, hashes, after) => {
        const level = Math.min(hashes.length + by, MAX_HEADING)
        return `${indent}${'#'.repeat(level)}${after}`
      })
    })
    .join('\n')
}

/** @param {number} level */
const heading = (level, text) => `${'#'.repeat(Math.min(level, MAX_HEADING))} ${text}`

/**
 * @param {{created_at: string, content_md: string}} sheet
 * @param {number} level - Nivel del heading de la hoja.
 */
function sheetToMarkdown(sheet, level) {
  const content = shiftHeadings(describeAttachmentRefs(sheet.content_md?.trim() ?? ''), level)
  return [heading(level, formatSheetDateLong(sheet.created_at)), content].filter(Boolean).join('\n\n')
}

/**
 * @param {{name: string, sheets: Array}} subject
 * @param {number} level - Nivel del heading de la materia.
 */
function subjectToMarkdown(subject, level) {
  return [heading(level, subject.name), ...subject.sheets.map((sheet) => sheetToMarkdown(sheet, level + 1))].join('\n\n')
}

/**
 * @param {{name: string, subjects: Array}} career
 * @param {number} level - Nivel del heading de la carrera.
 */
function careerToMarkdown(career, level) {
  return [heading(level, career.name), ...career.subjects.map((subject) => subjectToMarkdown(subject, level + 1))].join(
    '\n\n',
  )
}

/**
 * Una sola materia: la materia es el heading de nivel 1.
 * @param {{name: string, sheets: Array}} subject
 * @returns {string}
 */
export function subjectTreeToMarkdown(subject) {
  return subjectToMarkdown(subject, 1)
}

/**
 * Una carrera completa.
 * @param {{name: string, subjects: Array}} career
 * @returns {string}
 */
export function careerTreeToMarkdown(career) {
  return careerToMarkdown(career, 1)
}

/**
 * Todas las carreras del usuario.
 * @param {Array<{name: string, subjects: Array}>} careers
 * @returns {string}
 */
export function allTreeToMarkdown(careers) {
  return [heading(1, 'Mis apuntes'), ...careers.map((career) => careerToMarkdown(career, 2))].join('\n\n')
}

/**
 * Antepone un preámbulo que le explica a una IA qué está leyendo: de dónde
 * sale, cómo está organizado y qué significan los `[[links]]`. Es lo que usa
 * "Copiar para IA".
 * @param {string} markdown
 * @param {string} scopeLabel - Ej. `la materia "Genética"`.
 * @returns {string}
 */
export function withAiPreamble(markdown, scopeLabel) {
  const date = new Date().toISOString().slice(0, 10)
  const preamble = [
    `> Apuntes de estudio exportados de Studree el ${date} (${scopeLabel}).`,
    '> Estructura: cada heading de nivel superior agrupa a los de abajo (carrera › materia › hoja).',
    '> Cada hoja es un apunte en Markdown y su título es la fecha y hora en que se escribió (orden cronológico).',
    '> `[[Tema]]` es un enlace al título (tema) con ese nombre dentro de la misma materia.',
  ].join('\n')
  return `${preamble}\n\n${markdown}`
}
