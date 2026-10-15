/**
 * Modo lectura de la carpeta (ADR-017): oculta header, explorador, tabs,
 * índice y toolbar, y deja solo el papel. Ver docs/features/folder.md.
 *
 * El estado es compartido entre `AppLayout` (header), `WorkspaceLayout`
 * (explorador y tabs) y la carpeta, por eso es un contexto. El *provider* vive
 * en `components/layout/ReadingModeProvider.jsx` (misma razón que `useAuth`:
 * Fast Refresh).
 */

import { createContext, useContext } from 'react'

/** @type {React.Context<{reading: boolean, setReading: (value: boolean) => void}>} */
export const ReadingModeContext = createContext({ reading: false, setReading: () => {} })

/** @returns {{reading: boolean, setReading: (value: boolean) => void}} */
export function useReadingMode() {
  return useContext(ReadingModeContext)
}
