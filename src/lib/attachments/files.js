/**
 * Nombres y tamaños de archivos adjuntos (puras, ver docs/features/attachments.md).
 */

const MAX_NAME = 120

/**
 * Nombre apto para una ruta de Supabase Storage: sin tildes ni caracteres
 * fuera de su lista permitida. El nombre ORIGINAL (con tildes) se guarda en
 * `attachments.name`: este solo se usa en la ruta.
 * @param {string} name
 * @returns {string}
 */
export function storageSafeName(name) {
  const clean = (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\-()! ]+/g, '_')
    .replace(/_+/g, '_')
    .trim()
  if (!clean) return 'archivo'
  if (clean.length <= MAX_NAME) return clean
  const dot = clean.lastIndexOf('.')
  const extension = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : ''
  return clean.slice(0, MAX_NAME - extension.length) + extension
}

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
