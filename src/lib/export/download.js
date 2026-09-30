/**
 * Descarga de archivos generados en el cliente (Fase 7.6). El export es
 * 100% cliente: se arma un Blob y se dispara la descarga con un link
 * temporal, sin pasar por ningún endpoint (docs/features/markdown-export.md).
 */

/** @param {string} name */
function sanitizeFilenamePart(name) {
  return name.trim().replace(/[/\\:*?"<>|]/g, '-')
}

/**
 * Arma el nombre `studree-<carrera-o-materia>-<AAAA-MM-DD>.<extension>`.
 * @param {string} name
 * @param {string} [extension]
 * @returns {string}
 */
export function buildExportFilename(name, extension = 'md') {
  const date = new Date().toISOString().slice(0, 10)
  return `studree-${sanitizeFilenamePart(name)}-${date}.${extension}`
}

/**
 * Descarga un Blob ya armado (usado tanto por `downloadTextFile` como por el
 * export `.zip`, que arma su propio Blob con `jszip`).
 * @param {string} filename
 * @param {Blob} blob
 */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType]
 */
export function downloadTextFile(filename, content, mimeType = 'text/markdown') {
  downloadBlob(filename, new Blob([content], { type: mimeType }))
}
