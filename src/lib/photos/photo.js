/**
 * Reglas puras de las fotos para transcribir (Fase 16): tipo, tamaño,
 * reducción y conversión a base64. Sin navegador ni canvas: se testea en Node.
 * La compresión real (canvas) vive en `photos.service.js`.
 */

/** Lado mayor de la foto comprimida (px). */
export const MAX_PHOTO_SIDE = 1600
/** Calidad JPEG de la foto comprimida. */
export const PHOTO_QUALITY = 0.82
/** Tope de la imagen comprimida (bytes binarios). */
export const MAX_PHOTO_BYTES = 1_500_000

/** Tipos que acepta el servidor. */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Cuántos caracteres ocupa una cantidad de bytes pasada a base64.
 * @param {number} bytes
 * @returns {number}
 */
export function base64Length(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 0
  return Math.ceil(bytes / 3) * 4
}

/** Tope de caracteres base64 que acepta el servidor. */
export const MAX_PHOTO_BASE64 = base64Length(MAX_PHOTO_BYTES)

/**
 * Escala un rectángulo para que su lado mayor no pase de `maxSide`, sin
 * deformarlo y sin agrandar imágenes chicas.
 * @param {number} width
 * @param {number} height
 * @param {number} [maxSide]
 * @returns {{width: number, height: number}}
 */
export function fitWithin(width, height, maxSide = MAX_PHOTO_SIDE) {
  const w = Math.max(0, Math.floor(Number(width) || 0))
  const h = Math.max(0, Math.floor(Number(height) || 0))
  if (!w || !h || !Number.isFinite(maxSide) || maxSide <= 0) return { width: 0, height: 0 }
  const side = Math.max(w, h)
  if (side <= maxSide) return { width: w, height: h }
  const scale = maxSide / side
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/**
 * ¿Es base64 canónico (sin prefijo, longitud múltiplo de 4)?
 * @param {unknown} data
 * @returns {boolean}
 */
export function isBase64(data) {
  return (
    typeof data === 'string' &&
    data.length > 0 &&
    data.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
}

/**
 * Convierte un data URL de imagen a `{mimeType, data}`. `null` si no es una
 * imagen permitida o el base64 está mal.
 * @param {string} dataUrl
 * @returns {{mimeType: 'image/jpeg'|'image/png'|'image/webp', data: string}|null}
 */
export function photoDataUrlToBase64(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
  if (!match) return null
  const [, mimeType, data] = match
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType) || !isBase64(data) || data.length > MAX_PHOTO_BASE64) return null
  return { mimeType: /** @type {'image/jpeg'|'image/png'|'image/webp'} */ (mimeType), data }
}

/**
 * Nombre de archivo seguro para logs de desarrollo (nunca se envía).
 * @param {unknown} name
 * @returns {string}
 */
export function photoExtension(mimeType) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}
