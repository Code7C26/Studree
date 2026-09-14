/**
 * Estados de una materia (ver docs/DB_SCHEMA.md y docs/features/career-map.md).
 *
 * IMPORTANTE: `bloqueada` NO se persiste. Es un estado DERIVADO que se calcula en
 * `src/lib/graph/subjectStatus.js` a partir de las correlativas de tipo 'cursar'.
 * Solo los tres primeros existen como valor válido en la columna `subjects.status`.
 */

/** Estados que el usuario declara (los únicos que van a la base). */
export const SUBJECT_STATUS = Object.freeze({
  pendiente: 'pendiente',
  cursando: 'cursando',
  aprobada: 'aprobada',
})

/** Estado derivado: le falta alguna correlativa para cursar. */
export const BLOCKED_STATUS = 'bloqueada'

/** Valores aceptados por la columna `subjects.status` (coincide con el CHECK del SQL). */
export const SUBJECT_STATUS_VALUES = Object.freeze(Object.values(SUBJECT_STATUS))

/**
 * Etiqueta visible y clases de borde por estado efectivo.
 * Los colores salen del design system (tailwind.config.js) — Mandamiento VII.
 * @type {Readonly<Record<import('../types/models.js').EffectiveStatus, {label: string, border: string, text: string}>>}
 */
export const STATUS_STYLES = Object.freeze({
  aprobada: { label: 'Aprobada', border: 'border-accent', text: 'text-accent' },
  cursando: { label: 'Cursando', border: 'border-accent-soft', text: 'text-accent-soft' },
  pendiente: { label: 'Pendiente', border: 'border-border', text: 'text-text-muted' },
  bloqueada: { label: 'Bloqueada', border: 'border-border', text: 'text-text-muted' },
})
