import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { isFirstVisit } from '../lib/landing/firstVisit.js'
import { listStoredKeys, writeCache } from '../services/cache.service.js'

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
