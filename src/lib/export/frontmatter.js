/**
 * Frontmatter YAML de una hoja para el export `.zip` (ver
 * docs/features/markdown-export.md). Se arma a mano: son 4 campos fijos, no
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
 * @param {string} meta.created - `AAAA-MM-DDTHH:MM` local: cuándo se escribió la hoja.
 * @param {string} meta.date - `AAAA-MM-DD` de la última edición (vacío si no se conoce).
 * @returns {string}
 */
export function buildFrontmatter({ careerName, subjectName, created, date }) {
  return [
    '---',
    `carrera: ${yamlString(careerName)}`, // i18n-ignore: claves del formato de export (el importador las lee)
    `materia: ${yamlString(subjectName)}`, // i18n-ignore
    `creada: ${created}`, // i18n-ignore
    ...(date ? [`fecha: ${date}`] : []), // i18n-ignore
    '---',
    '',
  ].join('\n')
}
