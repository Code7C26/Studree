/**
 * Límites de largo del Inicio (ver docs/features/home.md).
 * Son los mismos `check` de la migración 0005: la UI los usa como `maxLength`
 * para no mandar algo que la base va a rechazar.
 */
export const HOME_LIMITS = Object.freeze({
  dateTitle: 120,
  taskText: 300,
  noteBody: 2000,
})
