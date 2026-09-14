/**
 * Tipos de correlativa (ver docs/DB_SCHEMA.md).
 * En la facultad son requisitos distintos, por eso se modelan por separado y no
 * como un único "requiere".
 */

export const PREREQUISITE_KINDS = Object.freeze({
  /** Debe estar aprobada para poder CURSAR la materia. */
  cursar: 'cursar',
  /** Debe estar aprobada para poder RENDIR EL FINAL de la materia. */
  rendir: 'rendir',
})

/** Valores aceptados por la columna `prerequisites.kind` (coincide con el CHECK del SQL). */
export const PREREQUISITE_KIND_VALUES = Object.freeze(Object.values(PREREQUISITE_KINDS))

/**
 * Etiquetas y estilo de arista por tipo.
 * Solo las de `cursar` participan del cálculo de `bloqueada`.
 * @type {Readonly<Record<import('../types/models.js').PrerequisiteKind, {label: string, help: string, dashed: boolean}>>}
 */
export const PREREQUISITE_KIND_META = Object.freeze({
  cursar: {
    label: 'Para cursar',
    help: 'Debe estar aprobada para poder cursar esta materia.',
    dashed: false,
  },
  rendir: {
    label: 'Para rendir',
    help: 'Debe estar aprobada para poder rendir el final de esta materia.',
    dashed: true,
  },
})
