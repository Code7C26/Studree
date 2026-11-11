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
 * Clave de la etiqueta (diccionario `careerMap.status`), ícono y clases por estado efectivo. Cada estado se ve DISTINTO
 * (ícono + color + borde): antes "aprobada" y "cursando" eran dos verdes casi
 * iguales y "pendiente"/"bloqueada" el mismo gris.
 * Los colores salen del design system (tailwind.config.js) — Mandamiento VII.
 * @type {Readonly<Record<import('../types/models.js').EffectiveStatus, {labelKey: string, icon: string, border: string, text: string, chip: string}>>}
 */
export const STATUS_STYLES = Object.freeze({
  aprobada: { labelKey: 'careerMap.status.aprobada', icon: '✓', border: 'border-accent', text: 'text-accent', chip: 'bg-accent/10 text-accent' },
  cursando: { labelKey: 'careerMap.status.cursando', icon: '◐', border: 'border-warn', text: 'text-warn', chip: 'bg-warn/10 text-warn' },
  pendiente: {
    labelKey: 'careerMap.status.pendiente',
    icon: '○',
    border: 'border-border',
    text: 'text-text-muted',
    chip: 'bg-surface-2 text-text-muted',
  },
  bloqueada: {
    labelKey: 'careerMap.status.bloqueada',
    icon: '🔒',
    border: 'border-border border-dashed',
    text: 'text-text-muted',
    chip: 'bg-surface-2 text-text-muted opacity-70',
  },
})
