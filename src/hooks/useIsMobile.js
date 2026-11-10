/**
 * ¿La pantalla es de celular? Usa el mismo corte que el explorador (`md` de
 * Tailwind: 768 px). Reacciona a la rotación y al cambio de tamaño.
 * Ver docs/features/mobile.md.
 */

import { useEffect, useState } from 'react'

/** Breakpoint compartido con `WorkspaceLayout` (desde `md` es escritorio). */
export const MOBILE_QUERY = '(max-width: 767px)'

/**
 * @returns {boolean}
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(MOBILE_QUERY).matches,
  )

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = (event) => setMobile(event.matches)
    setMobile(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return mobile
}
