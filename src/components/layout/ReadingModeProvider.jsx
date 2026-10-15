import { useMemo, useState } from 'react'
import { ReadingModeContext } from '../../hooks/useReadingMode.js'

/**
 * Provee el estado del modo lectura (ver hooks/useReadingMode.js).
 * @param {{children: React.ReactNode}} props
 */
export function ReadingModeProvider({ children }) {
  const [reading, setReading] = useState(false)
  const value = useMemo(() => ({ reading, setReading }), [reading])
  return <ReadingModeContext.Provider value={value}>{children}</ReadingModeContext.Provider>
}
