/**
 * Rutas de la aplicación (ver docs/02-architecture.md).
 * Centralizadas para no hardcodear strings de ruta en componentes.
 */
export const ROUTES = Object.freeze({
  home: '/',
  folders: '/carpetas',
  folder: '/carpetas/:folderId', // materias de la carpeta
  subjectMap: '/materias/:subjectId', // mapa conceptual de la materia
  profile: '/perfil',
})

/** @param {string} folderId */
export const folderPath = (folderId) => `/carpetas/${folderId}`

/** @param {string} subjectId */
export const subjectMapPath = (subjectId) => `/materias/${subjectId}`
