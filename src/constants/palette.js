/**
 * Paleta de colores para carpetas y materias.
 * Son valores POR DATO (dinámicos), por eso se aplican vía `style` inline en los
 * componentes (el Mandamiento II permite estilos inline para valores dinámicos).
 * El verde es el acento de marca y el color por defecto.
 */
export const PALETTE = Object.freeze([
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Ámbar', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cian', value: '#06b6d4' },
])

/** Color por defecto (acento verde de marca). */
export const DEFAULT_COLOR = PALETTE[0].value
