/**
 * Trae el árbol (con `content_md`) que necesita el export a Markdown.
 * Ver docs/features/markdown-export.md.
 *
 * Vive aparte de `useFolder`/`useExplorerTree` porque necesita el
 * contenido completo de cada hoja, no solo el título — traerlo siempre sería
 * desperdiciar red en el resto de la app.
 *
 * Jerarquía de 3 niveles (ADR-014): carrera → materia → hoja.
 */

import { useCallback, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService } from '../services/sheets.service.js'
import { attachmentsService } from '../services/attachments.service.js'
import { collectTreeAttachments } from '../lib/export/toZip.js'
import { t } from '../lib/i18n/index.js'

const EXPORT_SHEET_COLUMNS = 'id, subject_id, content_md, created_at, updated_at'

/** Lanza el error de un ServiceResult como excepción (lo atrapa `run`). */
function unwrap({ data, error }) {
  if (error) throw new Error(error)
  return data ?? []
}

/** @param {Object[]} rows @param {string} field */
function groupBy(rows, field) {
  const groups = new Map()
  for (const row of rows) {
    if (!groups.has(row[field])) groups.set(row[field], [])
    groups.get(row[field]).push(row)
  }
  return groups
}

/** @param {Object} sheet @param {Map<string, Array>} attachmentsBySheet */
const toExportSheet = (sheet, attachmentsBySheet) => ({
  created_at: sheet.created_at,
  content_md: sheet.content_md,
  updated_at: sheet.updated_at,
  attachments: attachmentsBySheet.get(sheet.id) ?? [],
})

/**
 * Materias con sus hojas, con UNA consulta de hojas (`IN`) para todas.
 * Los adjuntos (filas) solo se traen para el `.zip`: el `.md` único y "Copiar
 * para IA" los describen desde el Markdown y no los necesitan.
 * @param {import('../types/models.js').Subject[]} subjectRows
 * @param {boolean} withAttachments
 * @returns {Promise<Array<{name: string, sheets: Array}>>}
 */
async function buildSubjectTrees(subjectRows, withAttachments) {
  const sheets = unwrap(
    await sheetsService.listByParents(
      subjectRows.map((subject) => subject.id),
      EXPORT_SHEET_COLUMNS,
    ),
  )
  const attachments = withAttachments ? unwrap(await attachmentsService.listBySheets(sheets.map((sheet) => sheet.id))) : []
  const attachmentsBySheet = groupBy(attachments, 'sheet_id')
  const sheetsBySubject = groupBy(sheets, 'subject_id')
  return subjectRows.map((subject) => ({
    name: subject.name,
    sheets: (sheetsBySubject.get(subject.id) ?? []).map((sheet) => toExportSheet(sheet, attachmentsBySheet)),
  }))
}

/** @param {string} subjectId @param {boolean} withAttachments */
async function fetchSubjectTree(subjectId, withAttachments) {
  const { data: subject, error } = await subjectsService.get(subjectId)
  if (error) throw new Error(error)
  if (!subject) throw new Error(t('importExport.export.subjectNotFound'))

  const { data: career } = await careersService.get(subject.career_id)
  const [tree] = await buildSubjectTrees([subject], withAttachments)
  return { ...tree, careerName: career?.name ?? '' }
}

/** @param {string} careerId @param {boolean} withAttachments */
async function fetchCareerTree(careerId, withAttachments) {
  const { data: career, error: careerError } = await careersService.get(careerId)
  if (careerError) throw new Error(careerError)
  if (!career) throw new Error(t('importExport.export.careerNotFound'))

  const subjectRows = unwrap(await subjectsService.list(careerId))
  return { name: career.name, subjects: await buildSubjectTrees(subjectRows, withAttachments) }
}

/**
 * Todas las carreras del usuario (RLS filtra), con 3 consultas en total (más
 * las de adjuntos, de a tramos, si van).
 * @param {boolean} withAttachments
 */
async function fetchAllTree(withAttachments) {
  const [careers, subjects] = await Promise.all([
    careersService.list().then(unwrap),
    subjectsService.list().then(unwrap),
  ])
  const subjectTrees = await buildSubjectTrees(subjects, withAttachments)
  const treesByCareer = groupBy(
    subjects.map((subject, index) => ({ career_id: subject.career_id, tree: subjectTrees[index] })),
    'career_id',
  )
  return careers.map((career) => ({
    name: career.name,
    subjects: (treesByCareer.get(career.id) ?? []).map((entry) => entry.tree),
  }))
}

/**
 * `options.withAttachments`: traer las filas de adjuntos de cada hoja (solo el `.zip`).
 * @typedef {{withAttachments?: boolean}} ExportTreeOptions
 * @returns {{
 *   loading: boolean,
 *   error: string|null,
 *   loadSubjectTree: (subjectId: string, options?: ExportTreeOptions) => Promise<{name: string, careerName: string, sheets: Array}|null>,
 *   loadCareerTree: (careerId: string, options?: ExportTreeOptions) => Promise<{name: string, subjects: Array}|null>,
 *   loadAllTree: (options?: ExportTreeOptions) => Promise<Array<{name: string, subjects: Array}>|null>,
 *   loadAttachmentFiles: (tree: Object|Array) => Promise<{files: Map<string, Blob>, failed: number}>,
 * }}
 */
export function useExportTree() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(async (fetcher) => {
    setLoading(true)
    setError(null)
    try {
      return await fetcher()
    } catch (err) {
      setError(err.message ?? t('importExport.export.failed'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSubjectTree = useCallback(
    (subjectId, { withAttachments = false } = {}) => run(() => fetchSubjectTree(subjectId, withAttachments)),
    [run],
  )
  const loadCareerTree = useCallback(
    (careerId, { withAttachments = false } = {}) => run(() => fetchCareerTree(careerId, withAttachments)),
    [run],
  )
  const loadAllTree = useCallback(({ withAttachments = false } = {}) => run(() => fetchAllTree(withAttachments)), [run])

  /**
   * Descarga los archivos de los adjuntos del árbol (solo para el `.zip`).
   * Los que fallan quedan como texto en el `.md` (`[imagen: …]`).
   */
  const loadAttachmentFiles = useCallback(async (tree) => {
    const files = new Map()
    let failed = 0
    for (const attachment of collectTreeAttachments(tree)) {
      const blob = await attachmentsService.download(attachment.storage_path)
      if (blob) files.set(attachment.id, blob)
      else failed += 1
    }
    return { files, failed }
  }, [])

  return { loading, error, loadSubjectTree, loadCareerTree, loadAllTree, loadAttachmentFiles }
}
