// Metadatos de un pedido de examen o resumen (a qué materia/carrera pertenece). Puro.

/**
 * @typedef {{type: 'sheet'|'subject'|'career'|'all', id?: string}} ScopeValue
 * @typedef {Object} RequestMeta
 * @property {ScopeValue} scope
 * @property {string|null} subjectId  Solo para hoja/materia.
 * @property {string|null} careerId  `null` en "todas mis materias": no depende de ninguna carrera.
 * @property {string|null} subjectName  Solo para hoja/materia (para el título).
 */

/**
 * @param {ScopeValue} scopeValue
 * @param {{subject?: {id?: string, name?: string}|null, career?: {id?: string}|null}|null|undefined} context
 * @returns {RequestMeta}
 */
export function requestMeta(scopeValue, context) {
  const bySubject = scopeValue.type === 'sheet' || scopeValue.type === 'subject'
  let careerId = null
  if (scopeValue.type === 'career') careerId = scopeValue.id ?? null
  else if (scopeValue.type !== 'all') careerId = context?.career?.id ?? null
  return {
    scope: scopeValue,
    subjectId: bySubject ? context?.subject?.id ?? (scopeValue.type === 'subject' ? scopeValue.id ?? null : null) : null,
    careerId,
    subjectName: bySubject ? context?.subject?.name ?? null : null,
  }
}
