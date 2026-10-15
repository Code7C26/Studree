import { useEffect, useRef } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useImport } from '../../../hooks/useImport.js'
import { MAX_ATTACHMENT_LABEL } from '../../../constants/attachmentLimits.js'

/**
 * Importar `.md` / `.zip`: elegir → resumen → importar (con progreso) → informe.
 * Ver docs/features/import.md.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {{mode: 'subject', subjectId: string, subjectName: string}|{mode: 'careers'}} props.target - Memorizado.
 */
export function ImportDialog({ open, onClose, target }) {
  const { phase, summary, summaryText, progress, report, error, prepare, run, reset } = useImport(target)
  const inputRef = useRef(null)
  const busy = phase === 'reading' || phase === 'importing'

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const intro =
    target.mode === 'subject'
      ? `Cada .md se vuelve una hoja de «${target.subjectName}». También podés elegir un .zip con .md adentro.`
      : 'Elegí un .zip exportado de Studree (o de Obsidian): se recrean las carreras y materias, y cada hoja conserva su fecha.'

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Importar apuntes">
      {phase === 'idle' && (
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">{intro}</p>
          <p className="text-xs text-text-muted">
            Las imágenes y archivos del .zip que estén usados en una hoja se suben como adjuntos (hasta {MAX_ATTACHMENT_LABEL} cada uno).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".md,.zip,text/markdown,application/zip"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              event.target.value = ''
              if (files.length > 0) prepare(files)
            }}
          />
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => inputRef.current?.click()}>Elegir archivos</Button>
          </div>
        </div>
      )}

      {phase === 'reading' && <p className="text-sm text-text-muted">Leyendo archivos…</p>}

      {phase === 'ready' && (
        <div className="space-y-4 text-sm">
          <p className="text-text">{summaryText}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Elegir otros
            </Button>
            <Button onClick={run} disabled={!summary || summary.sheets === 0}>
              Importar
            </Button>
          </div>
        </div>
      )}

      {phase === 'importing' && (
        <div className="space-y-2 text-sm">
          <p className="text-text-muted">
            Importando… {progress.done} de {progress.total} hojas
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Progreso de la importación"
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {phase === 'done' && report && (
        <div className="space-y-3 text-sm">
          <p className="text-text">
            Listo: se importaron {report.sheets} hoja{report.sheets === 1 ? '' : 's'} y {report.attachments} adjunto
            {report.attachments === 1 ? '' : 's'}.
          </p>
          {report.failures.length > 0 && (
            <div>
              <p className="mb-1 text-text-muted">No se importó:</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-bg p-2 text-xs">
                {report.failures.map((failure) => (
                  <li key={`${failure.path}:${failure.reason}`}>
                    <span className="text-text">{failure.path}</span> <span className="text-text-muted">({failure.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
