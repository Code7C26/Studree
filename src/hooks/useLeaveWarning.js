import { useEffect } from 'react'

/**
 * Con `active`, el navegador pregunta antes de cerrar o recargar la pestaña
 * (una prueba sin terminar no se guarda a medias). El texto del aviso lo
 * decide el navegador.
 * @param {boolean} active
 */
export function useLeaveWarning(active) {
  useEffect(() => {
    if (!active) return undefined
    const onBeforeUnload = (/** @type {BeforeUnloadEvent} */ event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])
}
