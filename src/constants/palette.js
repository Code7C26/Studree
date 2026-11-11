/**
 * Paleta de colores para carpetas y materias.
 * Son valores POR DATO (dinámicos), por eso se aplican vía `style` inline en los
 * componentes (el Mandamiento II permite estilos inline para valores dinámicos).
 * El verde es el acento de marca y el color por defecto. `nameKey` es la clave del nombre en el
 * diccionario (`common.colors.*`): se traduce al mostrarlo.
 */
export const PALETTE = Object.freeze([
  { nameKey: 'common.colors.green', value: '#22c55e' },
  { nameKey: 'common.colors.blue', value: '#3b82f6' },
  { nameKey: 'common.colors.violet', value: '#8b5cf6' },
  { nameKey: 'common.colors.amber', value: '#f59e0b' },
  { nameKey: 'common.colors.pink', value: '#ec4899' },
  { nameKey: 'common.colors.cyan', value: '#06b6d4' },
])

/** Color por defecto (acento verde de marca). */
export const DEFAULT_COLOR = PALETTE[0].value
