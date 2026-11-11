/**
 * Estado de "Foto a hoja" (Fase 16): comprime la foto, pide la transcripción al
 * Brote, deja revisarla y solo entonces llama a `onCreated`. Cancelar en
 * cualquier paso no crea nada. Ver docs/features/photo-notes.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { compressPhoto, transcribePhoto } from '../services/photos.service.js'
import { t } from '../lib/i18n/index.js'

/**
 * @typedef {'preparing'|'transcribing'|'review'|'error'} PhotoStage
 */

/**
 * @param {{subjectId: string, onCreated: (markdown: string) => void}} params
 */
export function usePhotoSheet({ subjectId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState(/** @type {PhotoStage} */ ('preparing'))
  const [preview, setPreview] = useState(/** @type {string|null} */ (null))
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(/** @type {string|null} */ (null))
  const abortRef = useRef(/** @type {AbortController|null} */ (null))
  /** Cada foto arranca una corrida nueva: una respuesta vieja se descarta. */
  const runRef = useRef(0)

  const reset = useCallback(() => {
    setOpen(false)
    setStage('preparing')
    setPreview(null)
    setDraft('')
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    runRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    reset()
  }, [reset])

  useEffect(() => () => abortRef.current?.abort(), [])

  /**
   * Empieza el flujo con una foto elegida en la cámara.
   * @param {File} file
   */
  const pick = useCallback(
    async (file) => {
      const run = (runRef.current += 1)
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setOpen(true)
      setStage('preparing')
      setPreview(null)
      setDraft('')
      setError(null)

      let image
      try {
        image = await compressPhoto(file)
      } catch (compressError) {
        if (run !== runRef.current) return
        setStage('error')
        setError(/** @type {Error} */ (compressError)?.message ?? t('camera.photoError'))
        return
      }
      if (run !== runRef.current) return
      setPreview(image.dataUrl)
      setStage('transcribing')

      const { data, error: transcribeError } = await transcribePhoto({
        subjectId,
        image,
        signal: controller.signal,
        onText: (delta) => {
          if (run === runRef.current) setDraft((text) => text + delta)
        },
      })
      if (run !== runRef.current) return
      abortRef.current = null
      if (transcribeError) {
        setStage('error')
        setError(transcribeError)
        return
      }
      setDraft(data.text)
      setStage('review')
    },
    [subjectId],
  )

  /** Crea la hoja con el texto revisado. Devuelve false si está vacío. */
  const confirm = useCallback(() => {
    const markdown = draft.trim()
    if (!markdown) {
      setStage('error')
      setError(t('camera.empty'))
      return false
    }
    onCreated(markdown)
    cancel()
    return true
  }, [draft, onCreated, cancel])

  return {
    open,
    stage,
    preview,
    draft,
    setDraft,
    error,
    pick,
    cancel,
    confirm,
    retake: () => {
      abortRef.current?.abort()
      reset()
    },
  }
}
