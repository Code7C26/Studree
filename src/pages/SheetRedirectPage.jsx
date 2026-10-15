import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSheetLocation } from '../hooks/useSheetLocation.js'
import { EmptyState } from '../components/ui/EmptyState'
import { subjectFolderPath } from '../constants/routes'

/**
 * `/hojas/:sheetId` ya no es una pantalla (ADR-017): las hojas viven dentro de
 * la carpeta de su materia. Esta ruta queda para links viejos (tabs guardadas,
 * marcadores) y redirige a `/materias/:subjectId?hoja=:sheetId`.
 */
export function SheetRedirectPage() {
  const { sheetId } = useParams()
  const navigate = useNavigate()
  const { location, error } = useSheetLocation(sheetId)

  useEffect(() => {
    if (location) navigate(subjectFolderPath(location.subjectId, location.sheetId), { replace: true })
  }, [location, navigate])

  if (error) return <EmptyState title="Hoja no encontrada" message={error} />
  return <p className="mt-8 text-center text-text-muted">Abriendo…</p>
}
