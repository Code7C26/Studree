/**
 * Fecha de creación de una hoja importada (ver docs/features/import.md):
 * `creada:` del frontmatter → nombre `AAAA-MM-DD HH-MM` (export de Studree) →
 * fecha del archivo → ahora. Las dos primeras son hora LOCAL.
 */

const ISO_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
// El guion va al final de la clase de caracteres: con el guion primero, Tailwind (que escanea
// el código) lo tomaba por una clase suya y generaba CSS inválido. Significa lo mismo.
const FILE_NAME = /^(\d{4})-(\d{2})-(\d{2})[ T_](\d{2})[:.-](\d{2})/

/** @param {RegExpMatchArray|null} match @returns {Date|null} */
function localDate(match) {
  if (!match) return null
  const [, y, m, d, h, mi] = match.map(Number)
  const date = new Date(y, m - 1, d, h, mi)
  return Number.isNaN(date.getTime()) || date.getMonth() !== m - 1 ? null : date
}

/**
 * @param {{meta: Record<string, string>, fileName: string, lastModified?: Date|null, now?: Date}} params
 * @returns {string} ISO
 */
export function resolveCreatedAt({ meta, fileName, lastModified = null, now = new Date() }) {
  const fromMeta = localDate((meta.creada ?? '').match(ISO_LOCAL))
  if (fromMeta) return fromMeta.toISOString()
  const fromName = localDate((fileName ?? '').match(FILE_NAME))
  if (fromName) return fromName.toISOString()
  if (lastModified instanceof Date && !Number.isNaN(lastModified.getTime())) return lastModified.toISOString()
  return now.toISOString()
}
