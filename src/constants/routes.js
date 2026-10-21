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
  welcome: '/bienvenida', // landing pública (docs/features/landing.md); fuera del layout de la app
  careers: '/carreras', // workspace: panel de inicio con las carreras
  careerMap: '/carreras/:careerId', // canvas de materias + correlativas
  subjectFolder: '/materias/:subjectId', // la carpeta de la materia (ADR-017); acepta ?hoja=:sheetId
  sheet: '/hojas/:sheetId', // links viejos: redirige a la carpeta en esa hoja
  profile: '/perfil',
})

/** @param {string} careerId */
export const careerPath = (careerId) => `/carreras/${careerId}`

/**
 * Carpeta de una materia, opcionalmente posicionada en una hoja (contrato con
 * el Inicio: "Seguí donde dejaste" navega a esto).
 * @param {string} subjectId
 * @param {string} [sheetId]
 */
export const subjectFolderPath = (subjectId, sheetId) =>
  sheetId ? `/materias/${subjectId}?hoja=${encodeURIComponent(sheetId)}` : `/materias/${subjectId}`
