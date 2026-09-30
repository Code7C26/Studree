/**
 * Árbol → Markdown único (Fase 7.6, ver docs/features/markdown-export.md).
 *
 * No convierte nada: `content_md` ya es Markdown (ADR-011), estas funciones
 * solo concatenan y anteponen los headings de jerarquía. Puras: no hablan con
 * services ni con el DOM (eso vive en useExportTree.js y download.js).
 */

/** @param {{title: string, content_md: string}} sheet */
function sheetToMarkdown(sheet) {
  const title = sheet.title?.trim() ? `**${sheet.title.trim()}**` : ''
  const content = sheet.content_md?.trim() ?? ''
  return [title, content].filter(Boolean).join('\n\n')
}

/**
 * @param {{name: string, sheets: Array}} topic
 * @param {number} level - Profundidad del heading (`#`.repeat(level)).
 */
function topicToMarkdown(topic, level) {
  const heading = '#'.repeat(level)
  const sheets = topic.sheets.map(sheetToMarkdown).filter(Boolean)
  return [`${heading} ${topic.name}`, ...sheets].join('\n\n')
}

/** @param {{name: string, topics: Array}} unit */
function unitToMarkdown(unit, level) {
  const heading = '#'.repeat(level)
  const topics = unit.topics.map((topic) => topicToMarkdown(topic, level + 1))
  return [`${heading} ${unit.name}`, ...topics].join('\n\n')
}

/** @param {{name: string, units: Array}} subject */
function subjectToMarkdown(subject, level) {
  const heading = '#'.repeat(level)
  const units = subject.units.map((unit) => unitToMarkdown(unit, level + 1))
  return [`${heading} ${subject.name}`, ...units].join('\n\n')
}

/**
 * Exporta una sola materia: la materia queda como heading de nivel 1.
 * @param {{name: string, units: Array}} subject
 * @returns {string}
 */
export function subjectTreeToMarkdown(subject) {
  return subjectToMarkdown(subject, 1)
}

/**
 * Exporta una carrera completa: carrera en `#`, cada materia en `##`.
 * @param {{name: string, subjects: Array}} career
 * @returns {string}
 */
export function careerTreeToMarkdown(career) {
  const subjects = career.subjects.map((subject) => subjectToMarkdown(subject, 2))
  return [`# ${career.name}`, ...subjects].join('\n\n')
}
