import { createPortal } from 'react-dom'
import { SummaryDocument } from './SummaryDocument'

/**
 * Copia del resumen solo para imprimir: un portal a `body` (`#print-root`, oculto
 * en pantalla). Con `html.printing` la hoja de estilos de impresión esconde todo
 * lo demás (ver `index.css`).
 * @param {Object} props
 * @param {import('../../../lib/assistant/summaryDoc.js').SummaryDoc} props.doc
 */
export function SummaryPrint({ doc }) {
  return createPortal(
    <div id="print-root">
      <SummaryDocument doc={doc} print />
    </div>,
    document.body,
  )
}
