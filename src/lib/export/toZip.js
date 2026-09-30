/**
 * Árbol → `.zip` con estructura de carpetas (Fase 7.6 prioridad 2, ver
 * docs/features/markdown-export.md). No importa `jszip` acá: el caller
 * (`ExportDialog`) lo carga con `import()` dinámico y pasa el constructor,
 * para no meter la librería en el bundle inicial de quien nunca exporta.
 */

import { buildFrontmatter } from './frontmatter.js'

const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g

/** @param {string} name */
function sanitizeName(name) {
  return name.trim().replace(INVALID_FILENAME_CHARS, '-')
}

/**
 * Prefijo `01 - `, `02 - `… según la posición en la lista ya ordenada (no el
 * campo `position` crudo: así no importa si tiene huecos).
 * @param {number} index - 0-based.
 * @param {string} name
 */
function withOrderPrefix(index, name) {
  return `${String(index + 1).padStart(2, '0')} - ${sanitizeName(name)}`
}

/**
 * Vuelca las unidades → temas → hojas de una materia dentro de una carpeta ya
 * creada de JSZip.
 * @param {import('jszip')} folder
 * @param {Array} units
 * @param {string} subjectName - Para el frontmatter de cada hoja.
 */
function addUnitsToZip(folder, units, subjectName) {
  units.forEach((unit, unitIndex) => {
    const unitFolder = folder.folder(withOrderPrefix(unitIndex, unit.name))

    for (const topic of unit.topics) {
      const topicFolder = unitFolder.folder(sanitizeName(topic.name))

      for (const sheet of topic.sheets) {
        const frontmatter = buildFrontmatter({
          subjectName,
          unitName: unit.name,
          topicName: topic.name,
          date: (sheet.updated_at ?? '').slice(0, 10),
        })
        topicFolder.file(`${sanitizeName(sheet.title)}.md`, `${frontmatter}\n${sheet.content_md ?? ''}`)
      }
    }
  })
}

/**
 * @param {import('jszip')} folder
 * @param {{name: string, units: Array}} subject
 */
function addSubjectToZip(folder, subject) {
  const subjectFolder = folder.folder(sanitizeName(subject.name))
  addUnitsToZip(subjectFolder, subject.units, subject.name)
}

/**
 * @param {typeof import('jszip')} JSZip - Constructor ya importado por el caller.
 * @param {{name: string, subjects: Array}} career
 * @returns {Promise<Blob>}
 */
export async function careerTreeToZip(JSZip, career) {
  const zip = new JSZip()
  const root = zip.folder(sanitizeName(career.name))
  for (const subject of career.subjects) addSubjectToZip(root, subject)
  return zip.generateAsync({ type: 'blob' })
}

/**
 * @param {typeof import('jszip')} JSZip
 * @param {{name: string, units: Array}} subject
 * @returns {Promise<Blob>}
 */
export async function subjectTreeToZip(JSZip, subject) {
  const zip = new JSZip()
  const root = zip.folder(sanitizeName(subject.name))
  addUnitsToZip(root, subject.units, subject.name)
  return zip.generateAsync({ type: 'blob' })
}
