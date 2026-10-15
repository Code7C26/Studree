/**
 * Árbol → `.zip` con estructura de carpetas (ver docs/features/markdown-export.md).
 *
 *   Carrera/Materia/2026-10-14 18-30.md     (una por hoja, con frontmatter YAML)
 *
 * Las hojas no tienen título (ADR-017): el archivo se llama como su fecha y
 * hora de creación, así el orden alfabético es el cronológico.
 *
 * Los nombres se sanitizan y se DEDUPLICAN sin distinguir mayúsculas
 * (`Resumen.md`, `resumen (2).md`): dos hojas o carpetas con el mismo nombre
 * ya no se pisan (Windows y macOS no distinguen mayúsculas en los paths).
 *
 * No importa `jszip` acá: el caller (`ExportDialog`) lo carga con `import()`
 * dinámico y pasa el constructor, para no meter la librería en el bundle
 * inicial de quien nunca exporta.
 */

import { buildFrontmatter } from './frontmatter.js'
import { sheetFileName, sheetLocalIso } from '../format/sheetDate.js'

const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g
const FALLBACK_NAME = 'Sin título'

/** @param {string} name */
function sanitizeName(name) {
  return name.trim().replace(INVALID_FILENAME_CHARS, '-') || FALLBACK_NAME
}

/**
 * Nombre de archivo/carpeta sanitizado y único dentro de `used`
 * (comparando sin mayúsculas). Registra el resultado en `used`.
 * @param {string} name
 * @param {Set<string>} used - Nombres ya usados en esa carpeta (en minúsculas).
 * @returns {string}
 */
export function uniqueName(name, used) {
  const base = sanitizeName(name)
  let candidate = base
  for (let copy = 2; used.has(candidate.toLowerCase()); copy += 1) candidate = `${base} (${copy})`
  used.add(candidate.toLowerCase())
  return candidate
}

/**
 * Vuelca las hojas de una materia dentro de una carpeta ya creada de JSZip.
 * @param {import('jszip')} folder
 * @param {Array<{created_at: string, content_md: string, updated_at: string|null}>} sheets
 * @param {{careerName: string, subjectName: string}} meta - Para el frontmatter.
 */
function addSheetsToFolder(folder, sheets, meta) {
  const used = new Set()
  for (const sheet of sheets) {
    const frontmatter = buildFrontmatter({
      ...meta,
      created: sheetLocalIso(sheet.created_at),
      date: (sheet.updated_at ?? '').slice(0, 10),
    })
    folder.file(`${uniqueName(sheetFileName(sheet.created_at), used)}.md`, `${frontmatter}\n${sheet.content_md ?? ''}`)
  }
}

/**
 * @param {import('jszip')} parent
 * @param {{name: string, subjects: Array}} career
 * @param {Set<string>} used - Nombres ya usados en la carpeta padre.
 */
function addCareerToFolder(parent, career, used) {
  const careerFolder = parent.folder(uniqueName(career.name, used))
  const subjectNames = new Set()
  for (const subject of career.subjects) {
    const subjectFolder = careerFolder.folder(uniqueName(subject.name, subjectNames))
    addSheetsToFolder(subjectFolder, subject.sheets, { careerName: career.name, subjectName: subject.name })
  }
}

/**
 * Una materia: `Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip - Constructor ya importado por el caller.
 * @param {{name: string, careerName: string, sheets: Array}} subject
 * @returns {Promise<Blob>}
 */
export async function subjectTreeToZip(JSZip, subject) {
  const zip = new JSZip()
  const root = zip.folder(sanitizeName(subject.name))
  addSheetsToFolder(root, subject.sheets, { careerName: subject.careerName, subjectName: subject.name })
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Una carrera: `Carrera/Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip
 * @param {{name: string, subjects: Array}} career
 * @returns {Promise<Blob>}
 */
export async function careerTreeToZip(JSZip, career) {
  const zip = new JSZip()
  addCareerToFolder(zip, career, new Set())
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Todo: `Studree/Carrera/Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip
 * @param {Array<{name: string, subjects: Array}>} careers
 * @returns {Promise<Blob>}
 */
export async function allTreeToZip(JSZip, careers) {
  const zip = new JSZip()
  const root = zip.folder('Studree')
  const used = new Set()
  for (const career of careers) addCareerToFolder(root, career, used)
  return zip.generateAsync({ type: 'blob' })
}
