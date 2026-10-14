/**
 * Rutas de la aplicación (ver docs/02-architecture.md).
 * Centralizadas para no hardcodear strings de ruta en componentes.
 *
 * Las rutas del modelo viejo (`/carpetas`, `/carpetas/:folderId`) fueron
 * reemplazadas por `/carreras` y `/carreras/:careerId` (ADR-010).
 */
export const ROUTES = Object.freeze({
  home: '/',
  login: '/entrar',
  careers: '/carreras', // workspace: panel de inicio con las carreras
  careerMap: '/carreras/:careerId', // canvas de materias + correlativas
  subjectMap: '/materias/:subjectId', // canvas de hojas + links (ADR-014)
  sheet: '/hojas/:sheetId', // editor de la hoja
  profile: '/perfil',
})

/** @param {string} careerId */
export const careerPath = (careerId) => `/carreras/${careerId}`

/** @param {string} subjectId */
export const subjectMapPath = (subjectId) => `/materias/${subjectId}`

/** @param {string} sheetId */
export const sheetPath = (sheetId) => `/hojas/${sheetId}`
