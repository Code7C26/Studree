/**
 * Primera visita del dispositivo (docs/features/landing.md). Lógica pura: recibe las claves de
 * localStorage para poder testearla sin navegador.
 */

import { STORAGE_KEYS } from '../../constants/storageKeys.js'

/**
 * Es primera visita si no hay ninguna clave de Studree salvo el idioma (que se puede guardar
 * antes de entrar a la app). Así quien ya usó Studree en este dispositivo no ve la landing.
 * @param {string[]} keys - Claves presentes en localStorage.
 * @returns {boolean}
 */
export function isFirstVisit(keys) {
  return !keys.some((key) => key.startsWith(STORAGE_KEYS.appPrefix) && key !== STORAGE_KEYS.uiLang)
}
