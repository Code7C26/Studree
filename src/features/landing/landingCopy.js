import { ROUTES } from '../../constants/routes.js'
import { getLang } from '../../lib/i18n/index.js'
import es from '../../lib/i18n/es/landing.js'
import en from '../../lib/i18n/en/landing.js'

/**
 * "Empezar gratis" entra directo a la app: AuthProvider abre una sesión de invitado y la cuenta
 * con email se agrega después desde el Perfil (el login rebota a quien ya tiene sesión).
 */
export const START_PATH = ROUTES.home

/**
 * Todo el copy de la landing en el idioma pedido (Fase 18). Vive en los diccionarios
 * `lib/i18n/{es,en}/landing.js`; la landing no lleva selector propio: sigue el idioma guardado o el
 * del navegador. Forma: hero, navLabel, navLinks, problem, steps, brote, folder, ownership, plans,
 * closing, footer.
 * @param {string} [lang]
 */
export function getLandingCopy(lang = getLang()) {
  return lang === 'en' ? en : es
}
