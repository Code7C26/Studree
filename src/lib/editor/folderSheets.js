/**
 * Reglas puras de las hojas de la carpeta (ADR-017). Ver docs/features/folder.md
 * y docs/features/sheet-editor.md. Las usan `useFolder` y `useSheetAutosave`;
 * viven acá para poder probarlas sin React.
 */

/** Prefijo del id de una hoja que todavía no existe en Supabase (＋ Nueva hoja sin escribir). */
export const LOCAL_SHEET_PREFIX = 'local:'

/**
 * @param {{id: string}} sheet
 * @returns {boolean}
 */
export function isLocalSheet(sheet) {
  return sheet.id.startsWith(LOCAL_SHEET_PREFIX)
}

/**
 * Hojas en el orden de la carpeta: las guardadas por `created_at` (la más
 * vieja arriba) y las locales al final, en el orden en que se agregaron.
 * @template {{id: string, created_at: string}} T
 * @param {T[]} sheets
 * @returns {T[]}
 */
export function orderFolderSheets(sheets) {
  const saved = sheets.filter((sheet) => !isLocalSheet(sheet))
  const local = sheets.filter(isLocalSheet)
  saved.sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [...saved, ...local]
}

/**
 * ¿Con qué contenido arranca una hoja, dado su borrador local? (fix de la Fase 0)
 *
 * El borrador `{ content, baseUpdatedAt }` solo gana si el servidor NO cambió
 * desde que se escribió (`baseUpdatedAt === updated_at`) y su contenido es
 * distinto: es trabajo que no llegó a guardarse y hay que reenviarlo. Si el
 * servidor cambió (otro dispositivo guardó después) o el borrador tiene el
 * formato viejo (string), se descarta para no pisar nada.
 *
 * @param {{content: string, baseUpdatedAt: string}|string|null} draft
 * @param {{content_md: string, updated_at: string}} server
 * @returns {{content: string, resend: boolean, clearDraft: boolean}}
 */
export function resolveDraft(draft, server) {
  if (draft == null) return { content: server.content_md, resend: false, clearDraft: false }

  const usable =
    typeof draft === 'object' && draft.baseUpdatedAt === server.updated_at && draft.content !== server.content_md
  if (usable) return { content: draft.content, resend: true, clearDraft: false }

  return { content: server.content_md, resend: false, clearDraft: true }
}

/**
 * Hojas locales a restaurar desde su borrador (escritas sin conexión, la
 * pestaña se cerró antes de que se crearan). Solo las que tienen texto.
 * @param {Record<string, {content: string, created_at: string}>} drafts
 * @param {string} subjectId
 * @returns {Array<{id: string, key: string, subject_id: string, content_md: string, created_at: string, updated_at: null}>}
 */
export function restoreLocalSheets(drafts, subjectId) {
  return Object.entries(drafts ?? {})
    .filter(([id, draft]) => id.startsWith(LOCAL_SHEET_PREFIX) && draft?.content?.trim())
    .map(([id, draft]) => ({
      id,
      key: id,
      subject_id: subjectId,
      content_md: draft.content,
      created_at: draft.created_at,
      updated_at: null,
    }))
}

/**
 * Hojas de la carpeta después de una carga.
 * - Si la carga FALLÓ, no se reemplaza nada: lo que devuelve la lista en ese
 *   caso es la cache vieja, y montar editores sobre eso podría descartar un
 *   borrador válido o pisar el servidor con contenido viejo.
 * - Si salió bien: filas del servidor (conservando la `key` de cada hoja y el
 *   contenido que se está escribiendo) + las locales actuales, en orden.
 * @param {Array<Object>} current - Hojas en pantalla (con `key`).
 * @param {Array<Object>|null} rows - Filas del servidor.
 * @param {string|null} error
 * @param {Map<string, string>} live - id → contenido que se está escribiendo.
 * @returns {Array<Object>}
 */
export function nextFolderSheets(current, rows, error, live) {
  if (error) return current
  const keyById = new Map(current.map((sheet) => [sheet.id, sheet.key]))
  const saved = (rows ?? []).map((row) => ({
    ...row,
    key: keyById.get(row.id) ?? row.id,
    content_md: live.get(row.id) ?? row.content_md,
  }))
  return orderFolderSheets([...saved, ...current.filter(isLocalSheet)])
}
