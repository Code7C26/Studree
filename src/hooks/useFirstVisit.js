import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { isFirstVisit, needsEntryChoice } from '../lib/landing/firstVisit.js'
import { listStoredKeys, readCache, writeCache } from '../services/cache.service.js'
import { useAuth } from './useAuth.js'

/**
 * `true` si hay que mandar a la landing: es la primera visita del dispositivo y se entra por
 * la raíz. Los links directos (una materia, un link compartido) no se desvían.
 * Ver docs/features/landing.md.
 * @returns {boolean}
 */
export function useFirstVisitRedirect() {
  const { pathname } = useLocation()
  return pathname === ROUTES.home && isFirstVisit(listStoredKeys())
}

/** Marca la landing como vista al abrirla: "Empezar gratis" ya lleva al Inicio. */
export function useMarkLandingSeen() {
  useEffect(() => {
    writeCache(STORAGE_KEYS.uiLandingSeen, true)
  }, [])
}

/**
 * Cartel de entrada: "Crear cuenta" o "Entrar como invitado" la primera vez que se entra a la
 * app como invitado (docs/features/landing.md). La elección (cualquiera) se recuerda en el
 * dispositivo, así no reaparece mientras se espera el mail de confirmación.
 * @returns {{show: boolean, choose: (kind: 'guest'|'signup'|'signin') => void}}
 */
export function useEntryChoice() {
  const { user, isAnonymous } = useAuth()
  const [choiceMade, setChoiceMade] = useState(() => readCache(STORAGE_KEYS.uiEntryChoice, null) !== null)

  const choose = useCallback((kind) => {
    writeCache(STORAGE_KEYS.uiEntryChoice, kind)
    setChoiceMade(true)
  }, [])

  return { show: Boolean(user) && needsEntryChoice({ isAnonymous, choiceMade }), choose }
}

/**
 * Guarda la elección del cartel de entrada sin pasar por el cartel: "Probar como invitado" de la
 * landing entra directo a la app (docs/features/landing.md).
 * @param {'guest'|'signup'|'signin'} kind
 */
export function rememberEntryChoice(kind) {
  writeCache(STORAGE_KEYS.uiEntryChoice, kind)
}
