/**
 * Panel lateral: buscador local + árbol de los 5 niveles.
 * Ver docs/features/navigation-shell.md.
 */

import { useEffect, useMemo, useState } from 'react'
import { ExplorerTree } from './ExplorerTree'
import { EmptyState } from '../../ui/EmptyState'
import { readCache, writeCache } from '../../../services/cache.service.js'
import { STORAGE_KEYS } from '../../../constants/storageKeys.js'

/** Niveles hijos en orden, para el filtro recursivo por nombre. */
const CHILD_LEVELS = [
  { key: 'subjects', nameField: 'name' },
  { key: 'units', nameField: 'name' },
  { key: 'topics', nameField: 'name' },
  { key: 'sheets', nameField: 'title' },
]

/**
 * Un nodo entra al resultado si su nombre matchea, o si matchea alguno de sus
 * descendientes. Si matchea el propio nodo, se muestra el subárbol completo
 * (no solo lo que matcheó adentro); si no, se muestra solo lo que matcheó.
 */
function filterNode(node, nameField, levelIndex, query) {
  const name = (node[nameField] ?? '').toLowerCase()
  if (name.includes(query)) return node

  if (levelIndex >= CHILD_LEVELS.length) return null

  const { key: childKey, nameField: childNameField } = CHILD_LEVELS[levelIndex]
  const children = node[childKey] ?? []
  const filteredChildren = children
    .map((child) => filterNode(child, childNameField, levelIndex + 1, query))
    .filter(Boolean)

  if (filteredChildren.length === 0) return null
  return { ...node, [childKey]: filteredChildren }
}

/** Un `Set` falso que siempre dice que sí: expande todo mientras se busca. */
const ALWAYS_EXPANDED = { has: () => true }

/**
 * @param {Object} props
 * @param {Array<Object>} props.careers
 * @param {boolean} props.loading
 * @param {(careerId: string) => void} props.onNavigateCareer
 * @param {(subjectId: string) => void} props.onNavigateSubject
 * @param {(sheet: {id: string, title: string}) => void} props.onOpenSheet
 * @param {(type: 'career'|'subject'|'unit'|'topic'|'sheet', id: string, name: string, node: Object) => void} props.onRenameEntity
 * @param {string} [props.activeCareerId]
 * @param {string} [props.activeSubjectId]
 * @param {string} [props.activeSheetId]
 */
export function Explorer({
  careers,
  loading,
  onNavigateCareer,
  onNavigateSubject,
  onOpenSheet,
  onRenameEntity,
  activeCareerId,
  activeSubjectId,
  activeSheetId,
}) {
  const [query, setQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState(
    () => new Set(readCache(STORAGE_KEYS.uiExplorer, [])),
  )

  useEffect(() => {
    writeCache(STORAGE_KEYS.uiExplorer, [...expandedKeys])
  }, [expandedKeys])

  // El nodo de la ruta actual queda auto-expandido (ver navigation-shell.md).
  useEffect(() => {
    if (!activeCareerId) return
    setExpandedKeys((current) => {
      const next = new Set(current)
      next.add(`career:${activeCareerId}`)
      if (activeSubjectId) next.add(`subject:${activeSubjectId}`)
      return next
    })
  }, [activeCareerId, activeSubjectId])

  /** @param {string} key @param {boolean} [forceOpen] */
  function toggle(key, forceOpen = false) {
    setExpandedKeys((current) => {
      const next = new Set(current)
      if (forceOpen) next.add(key)
      else if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleCareers = useMemo(() => {
    if (!normalizedQuery) return careers
    return careers
      .map((career) => filterNode(career, 'name', 0, normalizedQuery))
      .filter(Boolean)
  }, [careers, normalizedQuery])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar…"
          aria-label="Filtrar el explorador"
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && careers.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">Cargando…</p>
        )}

        {!loading && careers.length === 0 && (
          <div className="px-1 py-4">
            <EmptyState icon="🎓" title="Sin carreras" message="Creá una desde “Mis carreras”." />
          </div>
        )}

        {visibleCareers.length === 0 && careers.length > 0 && normalizedQuery && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">Sin resultados para “{query}”.</p>
        )}

        {visibleCareers.length > 0 && (
          <ExplorerTree
            careers={visibleCareers}
            expandedKeys={normalizedQuery ? ALWAYS_EXPANDED : expandedKeys}
            onToggle={toggle}
            onNavigateCareer={onNavigateCareer}
            onNavigateSubject={onNavigateSubject}
            onOpenSheet={onOpenSheet}
            onRenameEntity={onRenameEntity}
            activeCareerId={activeCareerId}
            activeSubjectId={activeSubjectId}
            activeSheetId={activeSheetId}
          />
        )}
      </div>
    </div>
  )
}
