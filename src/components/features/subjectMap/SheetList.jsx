/**
 * Vista "Lista" del canvas de materia: las hojas ordenadas por última edición.
 * Es el camino rápido cuando la materia tiene muchas hojas (y en mobile, donde
 * arrastrar nodos no funciona bien). Ver docs/features/subject-map.md.
 */

import { useMemo } from 'react'
import { SheetListItem } from '../sheets/SheetListItem'
import { EmptyState } from '../../ui/EmptyState'

/**
 * @param {Object} props
 * @param {import('../../../types/models.js').Sheet[]} props.sheets
 * @param {(sheet: import('../../../types/models.js').Sheet) => void} props.onOpenSheet
 * @param {(sheet: import('../../../types/models.js').Sheet) => void} props.onDeleteSheet
 */
export function SheetList({ sheets, onOpenSheet, onDeleteSheet }) {
  const sorted = useMemo(
    () =>
      [...sheets].sort((a, b) =>
        (b.updated_at ?? b.created_at ?? '').localeCompare(a.updated_at ?? a.created_at ?? ''),
      ),
    [sheets],
  )

  if (sheets.length === 0) {
    return <EmptyState icon="📝" title="Sin hojas" message="Creá la primera hoja de esta materia con ＋ Hoja." />
  }

  return (
    <ul className="space-y-1 rounded-xl border border-border bg-surface p-2">
      {sorted.map((sheet) => (
        <SheetListItem
          key={sheet.id}
          sheet={sheet}
          onOpen={() => onOpenSheet(sheet)}
          onDelete={() => onDeleteSheet(sheet)}
        />
      ))}
    </ul>
  )
}
