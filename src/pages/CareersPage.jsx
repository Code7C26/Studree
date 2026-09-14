import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCareers } from '../hooks/useCareers'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { EmptyState } from '../components/ui/EmptyState'
import { careerPath } from '../constants/routes'

/**
 * Workspace: panel de inicio con las carreras del usuario.
 * Versión base de la Fase 7.1 — el explorador lateral, las tabs y el command
 * palette llegan en la Fase 7.2 (ver docs/features/navigation-shell.md).
 */
export function CareersPage() {
  const { careers, loading, error, createCareer, deleteCareer } = useCareers()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  /** @param {React.FormEvent} event */
  async function handleCreate(event) {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const failure = await createCareer({ name })
    if (!failure) setName('')
    setCreating(false)
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis carreras</h1>
          <p className="text-sm text-text-muted">Elegí una para ver sus materias.</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <TextField
          id="career-name"
          label="Nueva carrera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Licenciatura en Biología"
          className="flex-1"
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creando…' : 'Agregar'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="mt-8 text-center text-text-muted">Cargando…</p>}

      {!loading && careers.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="Todavía no tenés carreras"
            message="Creá tu primera carrera para empezar a organizar tus materias."
          />
        </div>
      )}

      {careers.length > 0 && (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <li
              key={career.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <Link to={careerPath(career.id)} className="flex flex-1 items-center gap-3">
                <span
                  className="h-8 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: career.color }}
                  aria-hidden="true"
                />
                <span className="font-medium">{career.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => deleteCareer(career.id)}
                aria-label={`Eliminar ${career.name}`}
                className="p-1.5 text-text-muted transition-colors hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
