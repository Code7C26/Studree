/**
 * Plan de importación (puro, ver docs/features/import.md): a qué carrera y
 * materia va cada `.md`, con qué fecha, qué imágenes lleva y qué se saltea. El
 * service (`import.service.js`) solo ejecuta este plan.
 */

import { splitFrontmatter } from './frontmatter.js'
import { resolveCreatedAt } from './createdAt.js'
import { buildZipIndex, findMediaRefs } from './mediaRefs.js'
import { unescapeMarkdownText } from '../attachments/refs.js'

export const IMPORT_FALLBACK_NAME = 'Importado'
const EXPORT_ROOT = 'Studree'

/** @param {string} name */
const nameKey = (name) => name.trim().toLowerCase()
/** @param {string} path */
const basename = (path) => path.split('/').pop() ?? path

/**
 * Carpetas de sistema y archivos ocultos (`.obsidian/`, `__MACOSX/`, `.DS_Store`).
 * @param {string} path
 */
export function isIgnoredPath(path) {
  return path.split('/').some((segment) => segment.startsWith('.') || segment === '__MACOSX')
}

/** Carrera y materia de un `.md` según su carpeta y su frontmatter. */
function destinationFor(path, meta) {
  let dirs = path.split('/').slice(0, -1).map((segment) => segment.trim()).filter(Boolean)
  if (dirs.length >= 2 && dirs[0] === EXPORT_ROOT) dirs = dirs.slice(1)
  const careerName = meta.carrera?.trim() || (dirs.length >= 2 ? dirs[dirs.length - 2] : '') || IMPORT_FALLBACK_NAME
  const subjectName = meta.materia?.trim() || (dirs.length >= 1 ? dirs[dirs.length - 1] : '') || IMPORT_FALLBACK_NAME
  return { careerName, subjectName }
}

/**
 * @param {Object} params
 * @param {Array<{path: string, text: string, lastModified?: Date|null}>} params.mdEntries
 * @param {string[]} params.filePaths
 * @param {{mode: 'subject', subjectId: string, subjectName: string}|{mode: 'careers'}} params.target
 * @param {Array<{id: string, name: string, subjects: Array<{id: string, name: string}>}>} params.existingCareers
 * @param {Date} [params.now]
 */
export function buildImportPlan({ mdEntries: rawEntries, filePaths: rawPaths, target, existingCareers, now = new Date() }) {
  // Zips hechos en Windows pueden traer `\` como separador.
  const mdEntries = rawEntries.map((entry) => ({ ...entry, path: entry.path.replaceAll('\\', '/') }))
  const filePaths = rawPaths.map((path) => path.replaceAll('\\', '/'))
  const visibleFiles = filePaths.filter((path) => !isIgnoredPath(path))
  const index = buildZipIndex(visibleFiles)
  const careersByKey = new Map(existingCareers.map((career) => [nameKey(career.name), career]))
  const groups = new Map()
  const skipped = []
  const referenced = new Set()

  for (const entry of mdEntries) {
    if (isIgnoredPath(entry.path)) continue
    const { meta, body } = splitFrontmatter(entry.text)
    if (!body.trim()) {
      skipped.push({ path: entry.path, reason: 'Está vacía.' })
      continue
    }
    const media = findMediaRefs(body, entry.path, index)
    for (const ref of media) referenced.add(ref.zipPath)
    const sheet = {
      path: entry.path,
      created_at: resolveCreatedAt({ meta, fileName: basename(entry.path), lastModified: entry.lastModified ?? null, now }),
      content_md: body,
      media,
      duplicate: false,
    }

    let group
    if (target.mode === 'subject') {
      group = groups.get('subject') ?? { careerName: '', careerId: null, subjectName: target.subjectName, subjectId: target.subjectId, sheets: [] }
      groups.set('subject', group)
    } else {
      const { careerName, subjectName } = destinationFor(entry.path, meta)
      const key = `${nameKey(careerName)}/${nameKey(subjectName)}`
      group = groups.get(key)
      if (!group) {
        const career = careersByKey.get(nameKey(careerName)) ?? null
        const subject = career?.subjects.find((candidate) => nameKey(candidate.name) === nameKey(subjectName)) ?? null
        group = {
          careerName: career?.name ?? careerName,
          careerId: career?.id ?? null,
          subjectName: subject?.name ?? subjectName,
          subjectId: subject?.id ?? null,
          sheets: [],
        }
        groups.set(key, group)
      }
    }
    group.sheets.push(sheet)
  }

  for (const path of visibleFiles) {
    if (!referenced.has(path)) skipped.push({ path, reason: 'No es un .md ni está usado en una hoja.' })
  }

  return { groups: [...groups.values()], skipped }
}

const LINK_DESTINATION = /(!?)\[((?:\\.|[^[\]\\])*)\]\([^)]*\)/g

/**
 * Misma hoja = mismo minuto de creación y mismo contenido (sin espacios de los
 * bordes). Se ignoran los destinos de links e imágenes (en la base son
 * `adjunto:<id>` y en el archivo importado una ruta) y los escapes de su texto
 * (el editor guarda `\_a\*.png`; el export escribe `_a*.png`).
 */
const sheetKey = (createdAt, content) =>
  `${new Date(createdAt).toISOString().slice(0, 16)}|${(content ?? '')
    .replace(LINK_DESTINATION, (_, bang, text) => `${bang}[${unescapeMarkdownText(text)}]()`)
    .trim()}`

/**
 * Marca como duplicadas las hojas que ya existen en la materia destino o que
 * se repiten dentro del mismo import: importar dos veces no duplica.
 * @param {ReturnType<typeof buildImportPlan>} plan
 * @param {Map<string, Array<{created_at: string, content_md: string}>>} existingBySubject
 */
export function markDuplicates(plan, existingBySubject) {
  return {
    ...plan,
    groups: plan.groups.map((group) => {
      const seen = new Set((group.subjectId ? (existingBySubject.get(group.subjectId) ?? []) : []).map((s) => sheetKey(s.created_at, s.content_md)))
      return {
        ...group,
        sheets: group.sheets.map((sheet) => {
          const key = sheetKey(sheet.created_at, sheet.content_md)
          const duplicate = seen.has(key)
          seen.add(key)
          return { ...sheet, duplicate }
        }),
      }
    }),
  }
}

/** @param {ReturnType<typeof buildImportPlan>} plan */
export function summarizePlan(plan) {
  const newCareers = new Set(plan.groups.filter((g) => !g.careerId && g.careerName).map((g) => nameKey(g.careerName)))
  const live = plan.groups.flatMap((group) => group.sheets.filter((sheet) => !sheet.duplicate))
  return {
    newCareers: newCareers.size,
    newSubjects: plan.groups.filter((group) => !group.subjectId).length,
    sheets: live.length,
    duplicates: plan.groups.reduce((n, group) => n + group.sheets.filter((sheet) => sheet.duplicate).length, 0),
    media: live.reduce((n, sheet) => n + new Set(sheet.media.map((ref) => ref.zipPath)).size, 0),
    skipped: plan.skipped.length,
  }
}

/** @param {number} n @param {string} one @param {string} many */
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** @param {string[]} parts */
const joinList = (parts) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`)

/**
 * "Se van a crear 2 carreras, 5 materias, 40 hojas y 12 adjuntos. 3 hojas ya existen y se saltean."
 * @param {ReturnType<typeof summarizePlan>} summary
 */
export function describeSummary(summary) {
  const parts = [
    summary.newCareers > 0 && plural(summary.newCareers, 'carrera', 'carreras'),
    summary.newSubjects > 0 && plural(summary.newSubjects, 'materia', 'materias'),
    summary.sheets > 0 && plural(summary.sheets, 'hoja', 'hojas'),
    summary.media > 0 && plural(summary.media, 'adjunto', 'adjuntos'),
  ].filter(Boolean)
  const sentences = [parts.length > 0 ? `Se van a crear ${joinList(parts)}.` : 'No hay hojas nuevas para importar.']
  if (summary.duplicates > 0) {
    sentences.push(`${plural(summary.duplicates, 'hoja ya existe', 'hojas ya existen')} y se ${summary.duplicates === 1 ? 'saltea' : 'saltean'}.`)
  }
  if (summary.skipped > 0) {
    sentences.push(`${plural(summary.skipped, 'archivo no se importa', 'archivos no se importan')}.`)
  }
  return sentences.join(' ')
}
