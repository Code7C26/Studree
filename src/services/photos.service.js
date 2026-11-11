/**
 * Fotos para transcribir (Fase 16): comprime la imagen en el navegador y pide
 * la transcripción al Brote. La foto NUNCA se guarda: solo viaja al modelo.
 * Ver docs/features/photo-notes.md y docs/API_DOCS.md.
 */

import { streamAssistant } from './assistant.service.js'
import { buildTranscribeRequest } from '../lib/assistant/transcribeRequest.js'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_PHOTO_BASE64,
  PHOTO_QUALITY,
  MAX_PHOTO_SIDE,
  fitWithin,
  photoDataUrlToBase64,
} from '../lib/photos/photo.js'
import {
  applyTranscriptionEvent,
  createTranscriptionState,
  transcriptionError,
} from '../lib/photos/transcription.js'
import { t } from '../lib/i18n/index.js'

/** Tope del archivo original antes de comprimir (una foto de celular normal no llega). */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024

/**
 * @typedef {import('../types/models.js').ServiceResult<{text: string}>} TranscribeResult
 */

/** Carga el archivo como imagen, sin dejar el object URL colgado. */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(t('camera.photoError')))
    }
    image.src = url
  })
}

/** Dibuja la imagen en un canvas opaco (sin transparencia ni EXIF) y la exporta. */
function renderJpeg(image, width, height, quality) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('camera.photoError'))
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Comprime una foto a JPEG ≤ `MAX_PHOTO_SIDE` y ≤ `MAX_PHOTO_BYTES`.
 * Reintenta con menos calidad y, si hace falta, menos tamaño.
 * @param {File} file
 * @returns {Promise<{dataUrl: string, mimeType: 'image/jpeg', data: string}>}
 */
export async function compressPhoto(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error(t('camera.badType'))
  if (file.size > MAX_ORIGINAL_BYTES) throw new Error(t('camera.tooLarge'))

  const image = await loadImage(file)
  let { width, height } = fitWithin(image.naturalWidth, image.naturalHeight, MAX_PHOTO_SIDE)
  if (!width || !height) throw new Error(t('camera.photoError'))

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const quality = Math.max(0.5, PHOTO_QUALITY - attempt * 0.1)
    const dataUrl = renderJpeg(image, width, height, quality)
    if (dataUrl.length <= MAX_PHOTO_BASE64) {
      const parsed = photoDataUrlToBase64(dataUrl)
      if (!parsed) break
      return { dataUrl, ...parsed }
    }
    width = Math.max(1, Math.round(width * 0.85))
    height = Math.max(1, Math.round(height * 0.85))
  }
  throw new Error(t('camera.tooLarge'))
}

/**
 * Pide la transcripción de una foto. Devuelve el Markdown acumulado o el
 * mensaje de error ya traducido. Si `signal` aborta, resuelve sin error.
 * @param {{subjectId: string, image: {mimeType: string, data: string}, signal?: AbortSignal, onText?: (text: string) => void}} params
 * @returns {Promise<TranscribeResult>}
 */
export async function transcribePhoto({ subjectId, image, signal, onText }) {
  const state = createTranscriptionState()
  const { error } = await streamAssistant({
    request: buildTranscribeRequest({ subjectId, image }),
    signal,
    onEvent: (event) => {
      applyTranscriptionEvent(state, event)
      if (event?.type === 'text') onText?.(event.delta)
    },
  })
  if (error) return { data: null, error }
  if (state.error) return { data: null, error: transcriptionError(state.error) }
  const text = state.text.trim()
  if (!text) return { data: null, error: t('camera.empty') }
  return { data: { text }, error: null }
}
