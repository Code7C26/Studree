/**
 * Frontmatter YAML de una hoja para el export `.zip` (ver
 * docs/features/markdown-export.md). Se arma a mano: son 3 campos fijos, no
 * justifica sumar `js-yaml` como dependencia solo para esto.
 */

/** Escapa barras y comillas dobles para un valor YAML entre comillas. */
function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * @param {Object} meta
 * @param {string} meta.careerName
 * @param {string} meta.subjectName
 * @param {string} meta.date - `AAAA-MM-DD` (vacío si no se conoce).
 * @returns {string}
 */
export function buildFrontmatter({ careerName, subjectName, date }) {
  return [
    '---',
    `carrera: ${yamlString(careerName)}`,
    `materia: ${yamlString(subjectName)}`,
    ...(date ? [`fecha: ${date}`] : []),
    '---',
    '',
  ].join('\n')
}
