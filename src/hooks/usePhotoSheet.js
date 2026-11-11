/**
 * Estado de "Foto a hoja" (Fase 16): comprime la foto, pide la transcripción al
 * Brote, deja revisarla y elegir dónde va (hoja nueva o al final de una hoja que ya
 * existe) y solo entonces llama a `onCreated`. Cancelar en cualquier paso no crea
 * nada. Ver docs/features/photo-notes.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { compressPhoto, transcribePhoto } from '../services/photos.service.js'
import { t } from '../lib/i18n/index.js'

/**
 * @typedef {'preparing'|'transcribing'|'review'|'error'} PhotoStage
 */

/**
 * @param {{
 *   subjectId: string,
 *   onCreated: (markdown: string, sheetId: string|null) => {ok: boolean, error?: string}|void,
 * }} params  `sheetId` = hoja existente a la que se agrega; `null` = hoja nueva.
 */
export function usePhotoSheet({ subjectId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState(/** @type {PhotoStage} */ ('preparing'))
  const [preview, setPreview] = useState(/** @type {string|null} */ (null))
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(/** @type {string|null} */ (null))
  /** Dónde se guarda: `null` = hoja nueva; si no, la id de una hoja que ya existe. */
  const [targetSheetId, setTargetSheetId] = useState(/** @type {string|null} */ (null))
  const abortRef = useRef(/** @type {AbortController|null} */ (null))
  /** Cada foto arranca una corrida nueva: una respuesta vieja se descarta. */
  const runRef = useRef(0)

  const reset = useCallback(() => {
    setOpen(false)
    setStage('preparing')
    setPreview(null)
    setDraft('')
    setError(null)
    setTargetSheetId(null)
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

  /** Guarda el texto revisado donde se eligió. Devuelve false si está vacío o no se pudo. */
  const confirm = useCallback(() => {
    const markdown = draft.trim()
    if (!markdown) {
      setStage('error')
      setError(t('camera.empty'))
      return false
    }
    const result = onCreated(markdown, targetSheetId)
    if (result && result.ok === false) {
      // Sigue en revisión con el texto intacto: se puede elegir otra hoja o una nueva.
      setError(result.error ?? t('camera.appendFailed'))
      return false
    }
    cancel()
    return true
  }, [draft, targetSheetId, onCreated, cancel])

  return {
    open,
    stage,
    preview,
    draft,
    setDraft,
    targetSheetId,
    setTargetSheetId,
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
