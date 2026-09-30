/**
 * Frontmatter YAML de una hoja para el export `.zip` (Fase 7.6, ver
 * docs/features/markdown-export.md). Se arma a mano: son 4 campos fijos, no
 * justifica sumar `js-yaml` como dependencia solo para esto.
 */

/** Escapa comillas dobles para un valor YAML entre comillas. */
function yamlString(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`
}

/**
 * @param {Object} meta
 * @param {string} meta.subjectName
 * @param {string} meta.unitName
 * @param {string} meta.topicName
 * @param {string} meta.date - `AAAA-MM-DD`.
 * @returns {string}
 */
export function buildFrontmatter({ subjectName, unitName, topicName, date }) {
  return [
    '---',
    `materia: ${yamlString(subjectName)}`,
    `unidad: ${yamlString(unitName)}`,
    `tema: ${yamlString(topicName)}`,
    `fecha: ${date}`,
    '---',
    '',
  ].join('\n')
}
