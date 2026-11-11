/**
 * Purga de la papelera: borra lo que lleva más de 30 días, UNA vez por sesión
 * y en segundo plano (sin servidor, decisión T3 del spec de la Fase 13). Si el
 * usuario no entra en meses, lo vencido espera: no se ve, solo ocupa espacio.
 */

import { useEffect } from 'react'
import { trashService } from '../services/trash.service.js'
import { TRASH_DAYS } from '../lib/trash/trashItems.js'

/** Usuarios ya purgados en esta pestaña. */
const purgedUsers = new Set()

/** @param {string|null} userId */
export function useTrashPurge(userId) {
  useEffect(() => {
    if (!userId || purgedUsers.has(userId)) return
    purgedUsers.add(userId)
    trashService.purgeExpired(TRASH_DAYS).then(({ data, error }) => {
      if (error) console.warn('[papelera] No se pudo vaciar lo vencido:', error)
      else if (data > 0) console.info(`[papelera] ${data} elemento(s) vencido(s) borrado(s).`)
    })
  }, [userId])
}
