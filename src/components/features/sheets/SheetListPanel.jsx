/**
 * Panel lateral con las hojas de un tema. Ver docs/features/subject-map.md.
 * Reutiliza `Drawer` (ya existía) y `useSheets` (ya existía) — no hay pieza nueva de datos acá.
 */

import { useState } from 'react'
import { Drawer } from '../../ui/Drawer'
import { SheetListItem } from './SheetListItem'
import { Button } from '../../ui/Button'
import { TextField } from '../../ui/TextField'
import { EmptyState } from '../../ui/EmptyState'
import { useSheets } from '../../../hooks/useSheets.js'

/**
 * @param {Object} props
 * @param {{id: string, name: string}|null} props.topic - null = panel cerrado.
 * @param {() => void} props.onClose
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 */
export function SheetListPanel({ topic, onClose, onOpenSheet }) {
  return (
    <Drawer open={topic != null} onClose={onClose} title={topic ? `Hojas de ${topic.name}` : ''}>
      {/* Se monta solo con un tema elegido: así `useSheets` no pide datos de un id vacío. */}
      {topic && <SheetListPanelContent topic={topic} onOpenSheet={onOpenSheet} />}
    </Drawer>
  )
}

/** @param {{topic: {id: string, name: string}, onOpenSheet: (sheet: {id: string, title: string}) => void}} props */
function SheetListPanelContent({ topic, onOpenSheet }) {
  const { sheets, loading, error, createSheet, deleteSheet } = useSheets(topic.id)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  /** @param {React.FormEvent} event */
  async function handleCreate(event) {
    event.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    const sheet = await createSheet({ title })
    setCreating(false)
    if (sheet) {
      setTitle('')
      onOpenSheet(sheet) // "Nueva hoja" abre directo en el editor (ver subject-map.md).
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          id="new-sheet-title"
          label="Nueva hoja"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Resumen clase 1"
          className="flex-1"
        />
        <Button type="submit" disabled={creating || !title.trim()}>
          {creating ? 'Creando…' : 'Agregar'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="mt-4 text-center text-sm text-text-muted">Cargando…</p>}

      {!loading && sheets.length === 0 && (
        <div className="mt-4">
          <EmptyState icon="📝" title="Sin hojas" message="Creá la primera hoja de este tema." />
        </div>
      )}

      {sheets.length > 0 && (
        <ul className="mt-4 space-y-1">
          {sheets.map((sheet) => (
            <SheetListItem
              key={sheet.id}
              sheet={sheet}
              onOpen={() => onOpenSheet(sheet)}
              onDelete={() => deleteSheet(sheet.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
