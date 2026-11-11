import { useCallback, useEffect, useState } from 'react'
import { pdfFileName } from '../lib/assistant/summaryDoc.js'

/** @typedef {import('../lib/assistant/summaryDoc.js').SummaryDoc} SummaryDoc */

/**
 * "Descargar PDF" sin librerías: monta la copia imprimible (el que llama
 * dibuja `<SummaryPrint doc={printing} />`), marca `html.printing`, pone el
 * título de la pestaña con el nombre sugerido del archivo y abre el diálogo de
 * impresión del navegador ("Guardar como PDF"). Al terminar (`afterprint`) o al
 * desmontar, restaura título y clase.
 * @returns {{printing: SummaryDoc|null, print: (doc: SummaryDoc) => void}}
 */
export function usePrintSummary() {
  const [printing, setPrinting] = useState(/** @type {SummaryDoc|null} */ (null))

  useEffect(() => {
    if (!printing) return undefined
    const root = document.documentElement
    const previousTitle = document.title
    root.classList.add('printing')
    document.title = pdfFileName(printing.title, printing.createdAt)
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done)
    // Un frame después: que la copia imprimible ya esté en el DOM.
    const frame = window.requestAnimationFrame(() => window.print())
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', done)
      root.classList.remove('printing')
      document.title = previousTitle
    }
  }, [printing])

  const print = useCallback((/** @type {SummaryDoc} */ doc) => {
    setPrinting((current) => current ?? doc)
  }, [])

  return { printing, print }
}
