import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../ui/Icon'
import { studySummaryPath } from '../../../constants/routes'
import { usePrintSummary } from '../../../hooks/usePrintSummary.js'
import { useSaveSummaryAsSheet } from '../../../hooks/useSaveSummaryAsSheet.js'
import { SummaryDocument } from '../study/SummaryDocument'
import { SummaryPrint } from '../study/SummaryPrint'
import { QuizWindow } from './QuizWindow'

const BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50'
const SAVED_AS_SHEET = 'Agregué el resumen como hoja nueva.'

/**
 * Ventana grande del resumen (reusa `QuizWindow`): el documento sobre papel,
 * **Descargar PDF** (diálogo de impresión del navegador), **Guardar como hoja**
 * (si es de una sola materia), **Ver en Mi estudio** (cuando ya se guardó) y el
 * estado del guardado con **Reintentar**. Queda montada al cerrarse (`hidden`).
 * @param {Object} props
 * @param {import('../../../lib/assistant/summarySession.js').SummarySession} props.summaryDoc
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} props.onRetry  Reintenta el guardado en Mi estudio.
 */
export function SummaryWindow({ summaryDoc, open, onClose, onRetry }) {
  const { doc, status, savedId, saveError } = summaryDoc
  const { printing, print } = usePrintSummary()
  const { save } = useSaveSummaryAsSheet()
  const [sheetMessage, setSheetMessage] = useState(/** @type {{ok: boolean, text: string}|null} */ (null))
  const closeRef = useRef(/** @type {HTMLButtonElement|null} */ (null))

  // Al abrirse, el foco va a la ventana (Esc y Tab funcionan adentro).
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  const saveAsSheet = () => {
    const result = save(doc)
    if (!result.ok) setSheetMessage({ ok: false, text: result.error ?? 'No se pudo agregar el resumen como hoja.' })
    else if (result.inFolder) setSheetMessage({ ok: true, text: SAVED_AS_SHEET })
    else onClose()
  }

  return (
    <>
      <QuizWindow open={open} title={doc.title} onClose={onClose}>
        <div className="paper-sheet min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <SummaryDocument doc={doc} onNavigate={onClose} />
        </div>
        <footer className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => print(doc)} disabled={Boolean(printing)} className="btn-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-sm">
              <Icon name="arrow-down" size={14} />
              Descargar PDF
            </button>
            {doc.subjectId && (
              <button type="button" onClick={saveAsSheet} className={BUTTON}>
                <Icon name="file-text" size={14} />
                Guardar como hoja
              </button>
            )}
            {savedId && (
              <Link to={studySummaryPath(savedId)} onClick={onClose} className={BUTTON}>
                Ver en Mi estudio
              </Link>
            )}
            <button ref={closeRef} type="button" onClick={onClose} className={`${BUTTON} ml-auto`}>
              Cerrar
            </button>
          </div>
          <p className="text-xs text-text-muted">Elegí «Guardar como PDF» en el diálogo de impresión.</p>
          {status === 'saving' && (
            <p role="status" className="text-xs text-text-muted">
              Guardando…
            </p>
          )}
          {status === 'error' && (
            <p role="alert" className="flex flex-wrap items-center gap-2 text-xs text-red-300">
              {saveError ?? 'No se pudo guardar el resumen.'}
              <button type="button" onClick={onRetry} className={BUTTON}>
                Reintentar
              </button>
            </p>
          )}
          {sheetMessage && (
            <p role={sheetMessage.ok ? 'status' : 'alert'} className={`text-xs ${sheetMessage.ok ? 'text-accent-soft' : 'text-red-300'}`}>
              {sheetMessage.text}
            </p>
          )}
        </footer>
      </QuizWindow>
      {printing && <SummaryPrint doc={printing} />}
    </>
  )
}
