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
  subjectCards: '/materias/:subjectId/tarjetas', // mazo de tarjetas (Fase 15, docs/features/flashcards.md)
  sheet: '/hojas/:sheetId', // links viejos: redirige a la carpeta en esa hoja
  shared: '/compartido/:token', // materia compartida por link: pública, fuera del layout (Fase 15)
  profile: '/perfil',
  plans: '/planes', // planes y checkout simulado (Fase 17, docs/features/plans.md)
  trash: '/papelera', // papelera (docs/features/trash.md)
  study: '/estudio', // Mi estudio: resúmenes y exámenes guardados; acepta ?tab=&materia=
  studySummary: '/estudio/resumenes/:summaryId',
  studyQuiz: '/estudio/examenes/:attemptId',
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

/**
 * Mi estudio, opcionalmente en una solapa y filtrado por materia (sin parámetros vacíos).
 * @param {{tab?: 'resumenes'|'examenes', subjectId?: string}} [opts]
 */
export const studyPath = ({ tab, subjectId } = {}) => {
  const params = new URLSearchParams()
  if (tab) params.set('tab', tab)
  if (subjectId) params.set('materia', subjectId)
  const query = params.toString()
  return query ? `/estudio?${query}` : '/estudio'
}

/** @param {string} summaryId */
export const studySummaryPath = (summaryId) => `/estudio/resumenes/${summaryId}`

/** @param {string} attemptId */
export const studyQuizPath = (attemptId) => `/estudio/examenes/${attemptId}`

/** Link p�blico de una materia compartida (Fase 15).
 * @param {string} token
 */
export const sharedPath = (token) => `/compartido/${token}`

/** Mazo de tarjetas de una materia (Fase 15).
 * @param {string} subjectId
 */
export const cardsPath = (subjectId) => `/materias/${subjectId}/tarjetas`
