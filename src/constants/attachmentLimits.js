/**
 * Límites de los adjuntos (Fase 13). Iguales al check de `attachments.size_bytes`
 * y al `file_size_limit` del bucket (migración 0006).
 */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
export const MAX_ATTACHMENT_LABEL = '20 MB'
