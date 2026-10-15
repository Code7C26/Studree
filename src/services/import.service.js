/**
 * Ejecuta un plan de importación (`lib/import/plan.js`). Ver docs/features/import.md.
 *
 * Por hoja: se crea con su fecha original, se suben sus imágenes/archivos como
 * adjuntos y, si hubo alguno, se guarda el Markdown con las referencias ya
 * reescritas a `adjunto:<id>`. Lo que falla va al informe y se sigue con lo
 * demás: lo ya importado queda importado.
 */

import { careersService } from './careers.service.js'
import { subjectsService } from './subjects.service.js'
import { sheetsService } from './sheets.service.js'
import { attachmentsService } from './attachments.service.js'
import { notifyDataChanged } from './dataEvents.js'
import { replaceMediaRefs, mimeFromName } from '../lib/import/mediaRefs.js'
import { attachmentMarkdown } from '../lib/attachments/refs.js'

/** @param {string} path */
const basename = (path) => path.split('/').pop() ?? path
/** @param {string} name */
const nameKey = (name) => name.trim().toLowerCase()

/**
 * @typedef {{careers: number, subjects: number, sheets: number, attachments: number, failures: Array<{path: string, reason: string}>}} ImportReport
 */

export const importService = {
  /**
   * @param {ReturnType<typeof import('../lib/import/plan.js').buildImportPlan>} plan - Ya pasado por `markDuplicates`.
   * @param {{readFile: (zipPath: string) => Promise<Blob|null>, onProgress?: (done: number, total: number) => void}} options
   * @returns {Promise<ImportReport>}
   */
  async executePlan(plan, { readFile, onProgress = () => {} }) {
    const report = { careers: 0, subjects: 0, sheets: 0, attachments: 0, failures: [] }
    const total = plan.groups.reduce((n, group) => n + group.sheets.filter((sheet) => !sheet.duplicate).length, 0)
    const createdCareers = new Map() // nombre → id (dos grupos de la misma carrera nueva)
    let done = 0
    const tick = () => onProgress((done += 1), total)
    const failGroup = (group, reason) => {
      for (const sheet of group.sheets.filter((candidate) => !candidate.duplicate)) {
        report.failures.push({ path: sheet.path, reason })
        tick()
      }
    }

    for (const group of plan.groups) {
      let careerId = group.careerId ?? createdCareers.get(nameKey(group.careerName)) ?? null
      if (!careerId && !group.subjectId) {
        const { data, error } = await careersService.create({ name: group.careerName })
        if (error) {
          failGroup(group, error)
          continue
        }
        careerId = data.id
        createdCareers.set(nameKey(group.careerName), careerId)
        report.careers += 1
      }

      let subjectId = group.subjectId
      if (!subjectId) {
        const { data, error } = await subjectsService.create({ career_id: careerId, name: group.subjectName })
        if (error) {
          failGroup(group, error)
          continue
        }
        subjectId = data.id
        report.subjects += 1
      }

      for (const sheet of group.sheets) {
        if (sheet.duplicate) continue
        const { data: created, error } = await sheetsService.create({
          subject_id: subjectId,
          content_md: sheet.content_md,
          created_at: sheet.created_at,
        })
        if (error) {
          report.failures.push({ path: sheet.path, reason: error })
          tick()
          continue
        }
        report.sheets += 1

        if (sheet.media.length > 0) {
          const uploaded = new Map() // zipPath → Attachment
          for (const ref of sheet.media) {
            if (uploaded.has(ref.zipPath)) continue
            const blob = await readFile(ref.zipPath)
            if (!blob) {
              report.failures.push({ path: ref.zipPath, reason: 'No se encontró en el .zip.' })
              continue
            }
            const name = basename(ref.zipPath)
            const file = new File([blob], name, { type: blob.type || mimeFromName(name) })
            const { data: attachment, error: uploadError } = await attachmentsService.upload(created.id, file, { name })
            if (uploadError) {
              report.failures.push({ path: ref.zipPath, reason: uploadError })
              continue
            }
            uploaded.set(ref.zipPath, attachment)
            report.attachments += 1
          }
          const content = replaceMediaRefs(sheet.content_md, sheet.media, (ref) => {
            const attachment = uploaded.get(ref.zipPath)
            return attachment ? attachmentMarkdown({ id: attachment.id, name: ref.text || attachment.name, isImage: ref.isImage }) : null
          })
          if (content !== sheet.content_md) {
            const { error: saveError } = await sheetsService.saveContent(created.id, content)
            if (saveError) report.failures.push({ path: sheet.path, reason: saveError })
          }
        }
        tick()
      }
    }

    notifyDataChanged()
    return report
  },
}
