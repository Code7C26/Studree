/**
 * Árbol → `.zip` con estructura de carpetas (ver docs/features/markdown-export.md).
 *
 *   Carrera/Materia/2026-10-14 18-30.md     (una por hoja, con frontmatter YAML)
 *   Carrera/Materia/adjuntos/<archivo>      (imágenes y archivos adjuntos de las hojas)
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
import { rewriteAttachmentRefs, escapeLinkText } from '../attachments/refs.js'

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

/** Carpeta de los adjuntos dentro de cada materia. */
export const ATTACHMENTS_DIR = 'adjuntos'

/**
 * Ruta relativa apta para un link Markdown: espacios, tildes y paréntesis
 * codificados (Obsidian y el import la decodifican).
 * @param {string} path
 */
export function encodeAttachmentPath(path) {
  // Por segmento y con encodeURIComponent: encodeURI deja `#`, `?`, `&`, `+` y `;`, que romperían el link.
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/\(/g, '%28').replace(/\)/g, '%29'))
    .join('/')
}

/**
 * Como `uniqueName`, pero con el sufijo antes de la extensión: `a (2).png`.
 * @param {string} name
 * @param {Set<string>} used
 */
function uniqueAttachmentName(name, used) {
  const clean = sanitizeName(name)
  const dot = clean.lastIndexOf('.')
  const base = dot > 0 ? clean.slice(0, dot) : clean
  const extension = dot > 0 ? clean.slice(dot) : ''
  let candidate = clean
  for (let copy = 2; used.has(candidate.toLowerCase()); copy += 1) candidate = `${base} (${copy})${extension}`
  used.add(candidate.toLowerCase())
  return candidate
}

/**
 * Vuelca las hojas de una materia dentro de una carpeta ya creada de JSZip.
 * @param {import('jszip')} folder
 * @param {Array<{created_at: string, content_md: string, updated_at: string|null, attachments?: Array}>} sheets
 * @param {{careerName: string, subjectName: string}} meta - Para el frontmatter.
 * @param {Map<string, Blob>} files - Archivos descargados, por id de adjunto.
 */
function addSheetsToFolder(folder, sheets, meta, files) {
  const used = new Set()
  const usedAttachments = new Set()
  for (const sheet of sheets) {
    // Adjuntos descargados → adjuntos/<nombre>; las referencias pasan a esa ruta.
    const paths = new Map()
    for (const attachment of sheet.attachments ?? []) {
      const blob = files.get(attachment.id)
      if (!blob) continue
      const fileName = uniqueAttachmentName(attachment.name, usedAttachments)
      folder.file(`${ATTACHMENTS_DIR}/${fileName}`, blob)
      paths.set(attachment.id, `${ATTACHMENTS_DIR}/${fileName}`)
    }
    const content = rewriteAttachmentRefs(sheet.content_md ?? '', (ref) => {
      const path = paths.get(ref.id)
      if (!path) return `[${ref.isImage ? 'imagen' : 'archivo'}: ${ref.text}]`
      return `${ref.isImage ? '!' : ''}[${escapeLinkText(ref.text)}](${encodeAttachmentPath(path)})`
    })
    const frontmatter = buildFrontmatter({
      ...meta,
      created: sheetLocalIso(sheet.created_at),
      date: (sheet.updated_at ?? '').slice(0, 10),
    })
    folder.file(`${uniqueName(sheetFileName(sheet.created_at), used)}.md`, `${frontmatter}\n${content}`)
  }
}

/**
 * @param {import('jszip')} parent
 * @param {{name: string, subjects: Array}} career
 * @param {Set<string>} used - Nombres ya usados en la carpeta padre.
 * @param {Map<string, Blob>} files
 */
function addCareerToFolder(parent, career, used, files) {
  const careerFolder = parent.folder(uniqueName(career.name, used))
  const subjectNames = new Set()
  for (const subject of career.subjects) {
    const subjectFolder = careerFolder.folder(uniqueName(subject.name, subjectNames))
    addSheetsToFolder(subjectFolder, subject.sheets, { careerName: career.name, subjectName: subject.name }, files)
  }
}

/**
 * Una materia: `Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip - Constructor ya importado por el caller.
 * @param {{name: string, careerName: string, sheets: Array}} subject
 * @param {Map<string, Blob>} [files] - Archivos de adjuntos por id (si falta uno queda como texto).
 * @returns {Promise<Blob>}
 */
export async function subjectTreeToZip(JSZip, subject, files = new Map()) {
  const zip = new JSZip()
  const root = zip.folder(sanitizeName(subject.name))
  addSheetsToFolder(root, subject.sheets, { careerName: subject.careerName, subjectName: subject.name }, files)
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Una carrera: `Carrera/Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip
 * @param {{name: string, subjects: Array}} career
 * @param {Map<string, Blob>} [files]
 * @returns {Promise<Blob>}
 */
export async function careerTreeToZip(JSZip, career, files = new Map()) {
  const zip = new JSZip()
  addCareerToFolder(zip, career, new Set(), files)
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Todo: `Studree/Carrera/Materia/Hoja.md`.
 * @param {typeof import('jszip')} JSZip
 * @param {Array<{name: string, subjects: Array}>} careers
 * @param {Map<string, Blob>} [files]
 * @returns {Promise<Blob>}
 */
export async function allTreeToZip(JSZip, careers, files = new Map()) {
  const zip = new JSZip()
  const root = zip.folder('Studree')
  const used = new Set()
  for (const career of careers) addCareerToFolder(root, career, used, files)
  return zip.generateAsync({ type: 'blob' })
}

/**
 * Todos los adjuntos de un árbol de export (materia, carrera o todas).
 * @param {{sheets?: Array, subjects?: Array}|Array} tree
 * @returns {import('../../types/models.js').Attachment[]}
 */
export function collectTreeAttachments(tree) {
  if (Array.isArray(tree)) return tree.flatMap(collectTreeAttachments)
  if (tree.subjects) return tree.subjects.flatMap(collectTreeAttachments)
  return (tree.sheets ?? []).flatMap((sheet) => sheet.attachments ?? [])
}
