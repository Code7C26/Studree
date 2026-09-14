/**
 * Carga una entidad puntual por id, usando el `get(id)` que ya expone
 * cualquier service armado con `createCrudService` (ver services/crudService.js).
 *
 * Extraído porque `CareerMapPage` y `SubjectMapPage` repetían línea por línea
 * el mismo patrón para traer la carrera/materia dueña de la página (mismo
 * `useState` + `useEffect` + guarda de `cancelled`).
 */

import { useEffect, useState } from 'react'

/**
 * @template T
 * @param {{get: (id: string) => Promise<import('../types/models.js').ServiceResult<T>>}} service
 * @param {string} id
 * @param {string} notFoundMessage - Mensaje si `get` no devuelve datos ni error propio.
 * @returns {{entity: T|null, error: string|null}}
 */
export function useEntityById(service, id, notFoundMessage) {
  const [entity, setEntity] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setEntity(null)
    setError(null)

    service.get(id).then(({ data, error: getError }) => {
      if (cancelled) return
      setEntity(data)
      setError(data ? null : (getError ?? notFoundMessage))
    })

    return () => {
      cancelled = true
    }
  }, [service, id, notFoundMessage])

  return { entity, error }
}
