import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useExportTree } from '../../../hooks/useExportTree.js'
import {
  subjectTreeToMarkdown,
  careerTreeToMarkdown,
  allTreeToMarkdown,
  withAiPreamble,
} from '../../../lib/export/toSingleMarkdown.js'
import { subjectTreeToZip, careerTreeToZip, allTreeToZip } from '../../../lib/export/toZip.js'
import { downloadTextFile, downloadBlob, buildExportFilename } from '../../../lib/export/download.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * Diálogo de export a Markdown: `.md` único, `.zip` con carpetas, o "Copiar
 * para IA" (el `.md` al portapapeles con un preámbulo). Ver
 * docs/features/markdown-export.md.
 *
 * Alcance según desde dónde se abre:
 * - sin `careerId` (panel de carreras) → todo;
 * - con `careerId` → la carrera;
 * - con `subjectId` además → se puede elegir esta materia o toda la carrera.
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.careerId]
 * @param {string} [props.subjectId]
 */
export function ExportDialog({ open, onClose, careerId, subjectId }) {
  const { t } = useI18n()
  const defaultScope = subjectId ? 'subject' : careerId ? 'career' : 'all'
  const [scope, setScope] = useState(defaultScope)
  const [format, setFormat] = useState('md')
  const [working, setWorking] = useState(false)
  const [notice, setNotice] = useState(null)
  const { loading, error, loadSubjectTree, loadCareerTree, loadAllTree, loadAttachmentFiles } = useExportTree()

  useEffect(() => {
    if (open) {
      setScope(defaultScope)
      setNotice(null)
    }
  }, [open, defaultScope])

  const busy = loading || working

  /** Trae el árbol del alcance elegido y arma el Markdown único. */
  async function buildMarkdown() {
    if (scope === 'subject') {
      const tree = await loadSubjectTree(subjectId)
      return tree && { name: tree.name, markdown: subjectTreeToMarkdown(tree), label: t('importExport.export.labelSubject', { name: tree.name }) }
    }
    if (scope === 'career') {
      const tree = await loadCareerTree(careerId)
      return tree && { name: tree.name, markdown: careerTreeToMarkdown(tree), label: t('importExport.export.labelCareer', { name: tree.name }) }
    }
    const careers = await loadAllTree()
    return careers && { name: t('importExport.export.fileNameAll'), markdown: allTreeToMarkdown(careers), label: t('importExport.export.labelAll') }
  }

  async function handleDownload() {
    setNotice(null)
    if (format === 'md') {
      const result = await buildMarkdown()
      if (!result) return
      downloadTextFile(buildExportFilename(result.name), result.markdown)
      onClose()
      return
    }

    const withAttachments = { withAttachments: true }
    const tree =
      scope === 'subject'
        ? await loadSubjectTree(subjectId, withAttachments)
        : scope === 'career'
          ? await loadCareerTree(careerId, withAttachments)
          : await loadAllTree(withAttachments)
    if (!tree) return

    setWorking(true)
    try {
      const { files, failed } = await loadAttachmentFiles(tree)
      // Dinámico: quien nunca exporta a .zip no paga el peso de jszip en el bundle inicial.
      const { default: JSZip } = await import('jszip')
      const blob =
        scope === 'subject'
          ? await subjectTreeToZip(JSZip, tree, files)
          : scope === 'career'
            ? await careerTreeToZip(JSZip, tree, files)
            : await allTreeToZip(JSZip, tree, files)
      downloadBlob(buildExportFilename(scope === 'all' ? t('importExport.export.fileNameAll') : tree.name, 'zip'), blob)
      if (failed > 0) {
        setNotice(t('importExport.export.attachmentsFailed', { count: failed }))
        return
      }
      onClose()
    } catch {
      setNotice(t('importExport.export.zipFailed'))
    } finally {
      setWorking(false)
    }
  }

  async function handleCopyForAi() {
    setNotice(null)
    const result = await buildMarkdown()
    if (!result) return
    try {
      await navigator.clipboard.writeText(withAiPreamble(result.markdown, result.label))
      setNotice(t('importExport.export.copied'))
    } catch {
      setNotice(t('importExport.export.clipboardFailed'))
    }
  }

  const scopes = [
    ...(subjectId ? [{ id: 'subject', label: t('importExport.export.scopeSubject') }] : []),
    ...(careerId ? [{ id: 'career', label: t('importExport.export.scopeCareer') }] : []),
    { id: 'all', label: t('importExport.export.scopeAll') },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('importExport.export.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          {t('importExport.export.intro')}
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-text-muted">{t('importExport.export.scope')}</legend>
          {scopes.map((option) => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="export-scope"
                value={option.id}
                checked={scope === option.id}
                onChange={() => setScope(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-text-muted">{t('importExport.export.formatLegend')}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="export-format" value="md" checked={format === 'md'} onChange={() => setFormat('md')} />
            {t('importExport.export.formatMd')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="export-format" value="zip" checked={format === 'zip'} onChange={() => setFormat('zip')} />
            {t('importExport.export.formatZip')}
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-soft">
            {notice}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.close')}
          </Button>
          <Button variant="ghost" onClick={handleCopyForAi} disabled={busy}>
            📋 {t('importExport.export.copyForAi')}
          </Button>
          <Button onClick={handleDownload} disabled={busy}>
            {working ? t('importExport.export.preparing') : busy ? t('importExport.export.generating') : t('importExport.export.download', { format })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
