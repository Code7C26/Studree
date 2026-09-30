import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useExportTree } from '../../../hooks/useExportTree.js'
import { subjectTreeToMarkdown, careerTreeToMarkdown } from '../../../lib/export/toSingleMarkdown.js'
import { subjectTreeToZip, careerTreeToZip } from '../../../lib/export/toZip.js'
import { downloadTextFile, downloadBlob, buildExportFilename } from '../../../lib/export/download.js'

/**
 * Diálogo de export a Markdown (Fase 7.6): `.md` único concatenado o `.zip`
 * con estructura de carpetas y frontmatter, ver docs/features/markdown-export.md.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.careerId
 * @param {string} [props.subjectId] - Si se pasa, se puede elegir alcance (materia o carrera).
 */
export function ExportDialog({ open, onClose, careerId, subjectId }) {
  const [scope, setScope] = useState(subjectId ? 'subject' : 'career')
  const [format, setFormat] = useState('md')
  const [zipping, setZipping] = useState(false)
  const { loading, error, loadSubjectTree, loadCareerTree } = useExportTree()

  const busy = loading || zipping

  async function handleExport() {
    const exportSubject = scope === 'subject' && subjectId

    const tree = exportSubject ? await loadSubjectTree(subjectId) : await loadCareerTree(careerId)
    if (!tree) return

    if (format === 'zip') {
      setZipping(true)
      // Dinámico: quien nunca exporta a .zip no paga el peso de jszip en el bundle inicial.
      const { default: JSZip } = await import('jszip')
      const blob = exportSubject ? await subjectTreeToZip(JSZip, tree) : await careerTreeToZip(JSZip, tree)
      setZipping(false)
      downloadBlob(buildExportFilename(tree.name, 'zip'), blob)
    } else {
      const markdown = exportSubject ? subjectTreeToMarkdown(tree) : careerTreeToMarkdown(tree)
      downloadTextFile(buildExportFilename(tree.name), markdown)
    }

    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Exportar a Markdown">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Descargá el contenido en Markdown: un único archivo para subir a un proyecto de
          IA, o un <code>.zip</code> con estructura de carpetas para importar a Obsidian.
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-text-muted">Formato</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="export-format"
              value="md"
              checked={format === 'md'}
              onChange={() => setFormat('md')}
            />
            <code>.md</code> único (para IA)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="export-format"
              value="zip"
              checked={format === 'zip'}
              onChange={() => setFormat('zip')}
            />
            <code>.zip</code> con carpetas (para Obsidian)
          </label>
        </fieldset>

        {subjectId && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-text-muted">Alcance</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="export-scope"
                value="subject"
                checked={scope === 'subject'}
                onChange={() => setScope('subject')}
              />
              Esta materia
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="export-scope"
                value="career"
                checked={scope === 'career'}
                onChange={() => setScope('career')}
              />
              Toda la carrera
            </label>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? 'Generando…' : `Descargar .${format}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
