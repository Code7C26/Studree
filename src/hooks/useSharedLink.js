/**
 * Estado del link para compartir una materia (Fase 15).
 * Ver docs/features/share.md.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { sharedLinksService } from '../services/sharedLinks.service.js'
import { sharedPath } from '../constants/routes.js'

/**
 * @param {string} subjectId
 * @returns {{
 *   link: import('../types/models.js').SharedLink|null,
 *   url: string|null,
 *   loading: boolean,
 *   busy: boolean,
 *   error: string|null,
 *   create: () => Promise<import('../types/models.js').SharedLink|null>,
 *   revoke: () => Promise<boolean>,
 *   copy: () => Promise<boolean>,
 *   clearError: () => void,
 * }}
 */
export function useSharedLink(subjectId) {
  const [link, setLink] = useState(/** @type {import('../types/models.js').SharedLink|null} */ (null))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(/** @type {string|null} */ (null))

  useEffect(() => {
    let active = true
    setLoading(true)
    sharedLinksService.getForSubject(subjectId).then(({ data, error: message }) => {
      if (!active) return
      setLink(data)
      setError(message)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [subjectId])

  const create = useCallback(async () => {
    setBusy(true)
    const { data, error: message } = await sharedLinksService.create(subjectId)
    setBusy(false)
    if (message) {
      setError(message)
      return null
    }
    setError(null)
    setLink(data)
    return data
  }, [subjectId])

  const revoke = useCallback(async () => {
    if (!link) return false
    setBusy(true)
    const { error: message } = await sharedLinksService.revoke(link.id)
    setBusy(false)
    if (message) {
      setError(message)
      return false
    }
    setLink(null)
    return true
  }, [link])

  const url = useMemo(() => (link ? `${window.location.origin}${sharedPath(link.token)}` : null), [link])

  const copy = useCallback(async () => {
    if (!url) return false
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }, [url])

  return {
    link,
    url,
    loading,
    busy,
    error,
    create,
    revoke,
    copy,
    clearError: useCallback(() => setError(null), []),
  }
}
