import { ROUTES } from '../../constants/routes.js'

/**
 * Decide si en esta ruta se muestra la landing pública en vez del árbol de la app.
 * Solo en "/" y solo cuando ya se sabe que no hay sesión: mientras la sesión carga
 * no se muestra, para que quien tiene sesión no vea un destello de la landing.
 *
 * @param {{ pathname: string, loading: boolean, user: object|null }} state
 * @returns {boolean}
 */
export function shouldShowLanding({ pathname, loading, user }) {
  return pathname === ROUTES.home && !loading && !user
}
