import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { assistantBridge } from '../lib/assistant/bridge.js'
import { summaryToMarkdown } from '../lib/assistant/summaryDoc.js'
import { subjectFolderPath } from '../constants/routes'
import { t } from '../lib/i18n/index.js'


/**
 * "Guardar como hoja": agrega el resumen como hoja nueva de su materia por el
 * mismo camino que una propuesta `new_sheet`. Con la carpeta de esa materia
 * abierta la aplica ahí; si no, deja la propuesta en el puente y navega a la
 * carpeta, que la aplica al cargar.
 * @returns {{save: (doc: import('../lib/assistant/summaryDoc.js').SummaryDoc) => {ok: boolean, inFolder?: boolean, error?: string}}}
 */
export function useSaveSummaryAsSheet() {
  const navigate = useNavigate()
  const save = useCallback(
    (doc) => {
      const subjectId = doc?.subjectId
      if (!subjectId) return { ok: false, error: t('study.summary.notSingleSubject') }
      const proposal = /** @type {any} */ ({
        id: `summary-${doc.id ?? Date.now()}`,
        kind: 'new_sheet',
        subjectId,
        markdown: summaryToMarkdown(doc),
        source: doc.external ? 'external' : 'notes',
        status: 'pending',
      })
      const context = assistantBridge.get()
      if (context?.subject?.id === subjectId) {
        try {
          const result = context.apply(proposal)
          if (result?.ok) return { ok: true, inFolder: true }
          return { ok: false, error: result && 'error' in result ? result.error : t('study.summary.sheetFailed') }
        } catch (error) {
          console.error('[summary] apply lanzó un error:', error)
          return { ok: false, error: t('study.summary.sheetFailed') }
        }
      }
      assistantBridge.setPendingApply({ subjectId, proposal })
      navigate(subjectFolderPath(subjectId))
      return { ok: true, inFolder: false }
    },
    [navigate],
  )
  return { save }
}
