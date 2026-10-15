/**
 * Overlay `Ctrl+K`: busca materias por nombre (fuzzy hecho a mano) y texto
 * DENTRO de las hojas. La búsqueda de contenido corre en el SERVIDOR
 * (`sheetsService.searchContent`, desde 3 letras y con debounce); cada
 * resultado muestra la materia, la fecha de la hoja y el fragmento, y abre la
 * carpeta en esa hoja (ADR-017). Ver docs/features/navigation-shell.md.
 */

import { useEffect, useMemo, useState } from 'react'
import { buildContentSnippet } from '../../../lib/search/snippet.js'
import { sheetsService } from '../../../services/sheets.service.js'
import { formatSheetDate } from '../../../lib/format/sheetDate.js'

const ICONS = { subject: '📚', sheet: '📝' }

/** Coincidencia por contenido: siempre peor rankeada que cualquier match por nombre. */
const CONTENT_MATCH_SCORE = 4
/** Desde cuántas letras se busca dentro del contenido (menos es ruido y carga al servidor). */
const CONTENT_MIN_LENGTH = 3
const CONTENT_DEBOUNCE_MS = 250
const MAX_RESULTS = 30

/** @param {string} text @param {string} query */
function fuzzyMatch(text, query) {
  if (!query) return true
  let cursor = 0
  for (const char of query) {
    cursor = text.indexOf(char, cursor)
    if (cursor === -1) return false
    cursor += 1
  }
  return true
}

/** Menor es mejor: exacto < empieza con < contiene < subsecuencia suelta. */
function score(text, query) {
  if (text === query) return 0
  if (text.startsWith(query)) return 1
  if (text.includes(query)) return 2
  return 3
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('../../../hooks/useExplorerTree.js').SearchEntry[]} props.searchIndex
 * @param {(subjectId: string, sheetId?: string) => void} props.onOpenSubject - Abre la carpeta (en una hoja, si viene).
 */
export function CommandPalette({ open, onClose, searchIndex, onOpenSubject }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  /** Hojas cuyo contenido contiene el texto (respuesta del servidor). */
  const [contentHits, setContentHits] = useState([])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setContentHits([])
    }
  }, [open])

  // Búsqueda por contenido en el servidor, con debounce. `cancelled` descarta
  // respuestas viejas que lleguen tarde (el usuario siguió escribiendo).
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < CONTENT_MIN_LENGTH) {
      setContentHits([])
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const { data } = await sheetsService.searchContent(q)
      if (!cancelled) setContentHits(data ?? [])
    }, CONTENT_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    const matches = searchIndex
      .filter((entry) => fuzzyMatch(entry.name.toLowerCase(), q))
      .map((entry) => ({ entry, rank: score(entry.name.toLowerCase(), q), snippet: null }))
    matches.sort((a, b) => a.rank - b.rank)

    // Coincidencias dentro de las hojas: se muestran con la materia y la fecha de la hoja.
    const subjectsById = new Map(searchIndex.map((entry) => [entry.id, entry]))
    for (const hit of contentHits) {
      const subject = subjectsById.get(hit.subject_id)
      const snippet = subject ? buildContentSnippet(hit.content_md, q) : null
      if (!snippet) continue
      matches.push({
        entry: { ...subject, type: 'sheet', id: hit.id, date: formatSheetDate(hit.created_at) },
        rank: CONTENT_MATCH_SCORE,
        snippet,
      })
    }

    return matches.slice(0, MAX_RESULTS)
  }, [searchIndex, query, contentHits])

  if (!open) return null

  /** @param {import('../../../hooks/useExplorerTree.js').SearchEntry} entry */
  function select(entry) {
    if (entry.type === 'sheet') onOpenSubject(entry.subjectId, entry.id)
    else onOpenSubject(entry.subjectId)
    onClose()
  }

  /** @param {React.KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((current) => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && results[selected]) {
      event.preventDefault()
      select(results[selected].entry)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar una materia o un texto dentro de tus hojas…"
          aria-label="Buscar"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-text outline-none placeholder:text-text-muted"
        />

        <ul className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-text-muted">Sin resultados.</li>
          )}
          {results.map(({ entry, snippet }, index) => (
            <li key={`${entry.type}:${entry.id}`}>
              <button
                type="button"
                onClick={() => select(entry)}
                onMouseEnter={() => setSelected(index)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  index === selected ? 'bg-accent/15 text-accent' : 'text-text hover:bg-surface-2'
                }`}
              >
                <span className="flex w-full items-center gap-2">
                  <span aria-hidden="true">{ICONS[entry.type]}</span>
                  <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                  {entry.date && <span className="shrink-0 text-xs text-text-muted">{entry.date}</span>}
                  {!snippet && entry.path.length > 0 && (
                    <span className="shrink-0 truncate text-xs text-text-muted">{entry.path.join(' › ')}</span>
                  )}
                </span>
                {snippet && <span className="truncate pl-6 text-xs text-text-muted">{snippet}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
