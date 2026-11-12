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
  /** Solo las une (línea punteada sin flecha): no es requisito, no bloquea ni ordena (0014). */
  relacion: 'relacion',
})

/** Valores aceptados por la columna `prerequisites.kind` (coincide con el CHECK del SQL). */
export const PREREQUISITE_KIND_VALUES = Object.freeze(Object.values(PREREQUISITE_KINDS))

/**
 * Claves de las etiquetas (diccionario `careerMap.kinds`) y estilo de arista por tipo.
 * Solo las de `cursar` participan del cálculo de `bloqueada`. `relacion` no tiene flecha.
 * @type {Readonly<Record<import('../types/models.js').PrerequisiteKind, {labelKey: string, helpKey: string, dashed: boolean, arrow: boolean}>>}
 */
export const PREREQUISITE_KIND_META = Object.freeze({
  cursar: {
    labelKey: 'careerMap.kinds.cursar.label',
    helpKey: 'careerMap.kinds.cursar.help',
    dashed: false,
    arrow: true,
  },
  rendir: {
    labelKey: 'careerMap.kinds.rendir.label',
    helpKey: 'careerMap.kinds.rendir.help',
    dashed: true,
    arrow: true,
  },
  relacion: {
    labelKey: 'careerMap.kinds.relacion.label',
    helpKey: 'careerMap.kinds.relacion.help',
    dashed: true,
    arrow: false,
  },
})
