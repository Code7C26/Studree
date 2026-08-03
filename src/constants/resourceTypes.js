/**
 * Tipos de recurso de un tema. `isUrl` indica si el contenido es un enlace (URL)
 * o texto libre (nota). Ver docs/features/resources.md.
 */
export const RESOURCE_TYPES = Object.freeze({
  note: { label: 'Nota', icon: '📝', isUrl: false, placeholder: 'Escribí tu apunte…' },
  link: { label: 'Enlace', icon: '🔗', isUrl: true, placeholder: 'https://…' },
  video: { label: 'Video', icon: '🎬', isUrl: true, placeholder: 'https://youtube.com/…' },
  file: {
    label: 'Archivo',
    icon: '📄',
    isUrl: true,
    placeholder: 'Enlace al archivo (Drive, Dropbox…)',
  },
})

/** Lista de tipos (para iterar en la UI). */
export const RESOURCE_TYPE_LIST = Object.entries(RESOURCE_TYPES).map(
  ([value, meta]) => ({ value, ...meta }),
)
