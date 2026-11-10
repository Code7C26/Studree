/**
 * Materia compartida por link, sin sesión (Fase 15). Ver docs/features/share.md.
 */

import { useEffect, useState } from 'react'
import { sharedLinksService } from '../services/sharedLinks.service.js'

/**
 * @param {string} token
 * @returns {{
 *   subject: import('../types/models.js').PublicSubject|null,
 *   loading: boolean,
 *   error: string|null,
 * }}
 */
export function usePublicSubject(token) {
  const [subject, setSubject] = useState(/** @type {import('../types/models.js').PublicSubject|null} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string|null} */ (null))

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    sharedLinksService.getPublic(token).then(({ data, error: message }) => {
      if (!active) return
      setSubject(data)
      setError(message)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [token])

  return { subject, loading, error }
}
