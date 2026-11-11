/**
 * Registro de atajos de teclado globales del shell.
 * Ver docs/features/navigation-shell.md § Atajos.
 */

import { useEffect } from 'react'

/**
 * @param {Record<string, (event: KeyboardEvent) => void>} bindings
 *   Claves tipo `"mod+k"` (Ctrl en Windows/Linux, Cmd en Mac), `"mod+b"` o
 *   `"escape"`. El handler se llama con `preventDefault()` ya aplicado.
 * @param {boolean} [enabled=true]
 */
export function useHotkeys(bindings, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    /** @param {KeyboardEvent} event */
    function handleKeyDown(event) {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      for (const [combo, handler] of Object.entries(bindings)) {
        const parts = combo.toLowerCase().split('+')
        const needsMod = parts.includes('mod')
        const targetKey = parts[parts.length - 1]

        if (needsMod !== mod) continue
        if (key !== targetKey) continue

        event.preventDefault()
        handler(event)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bindings, enabled])
}
