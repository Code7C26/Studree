/**
 * Panel lateral: buscador local + árbol Carrera → Materia (ADR-017).
 * Ver docs/features/navigation-shell.md.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExplorerTree } from './ExplorerTree'
import { EmptyState } from '../../ui/EmptyState'
import { Icon } from '../../ui/Icon'
import { readCache, writeCache } from '../../../services/cache.service.js'
import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { ROUTES } from '../../../constants/routes.js'
import { useI18n } from '../../../hooks/useI18n.js'

/** Niveles hijos en orden, para el filtro recursivo por nombre. */
const CHILD_LEVELS = [{ key: 'subjects', nameField: 'name' }]

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
 * @param {(type: 'career'|'subject', id: string, name: string, node: Object) => Promise<string|null>} props.onRenameEntity
 * @param {string} [props.activeCareerId]
 * @param {string} [props.activeSubjectId]
 */
export function Explorer({
  careers,
  loading,
  onNavigateCareer,
  onNavigateSubject,
  onRenameEntity,
  activeCareerId,
  activeSubjectId,
}) {
  const { t } = useI18n()
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
          placeholder={t('shell.explorer.filterPlaceholder')}
          aria-label={t('shell.explorer.filterLabel')}
          className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {loading && careers.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">{t('common.loading')}</p>
        )}

        {!loading && careers.length === 0 && (
          <div className="px-1 py-4">
            <EmptyState icon="🎓" title={t('shell.explorer.noCareersTitle')} message={t('shell.explorer.noCareersMessage')} />
          </div>
        )}

        {visibleCareers.length === 0 && careers.length > 0 && normalizedQuery && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">{t('shell.explorer.noResults', { query })}</p>
        )}

        {visibleCareers.length > 0 && (
          <ExplorerTree
            careers={visibleCareers}
            expandedKeys={normalizedQuery ? ALWAYS_EXPANDED : expandedKeys}
            onToggle={toggle}
            onNavigateCareer={onNavigateCareer}
            onNavigateSubject={onNavigateSubject}
            onRenameEntity={onRenameEntity}
            activeCareerId={activeCareerId}
            activeSubjectId={activeSubjectId}
          />
        )}
      </div>

      <div className="border-t border-border p-1.5">
        <Link
          to={ROUTES.trash}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <Icon name="trash" /> {t('shell.explorer.trash')}
        </Link>
      </div>
    </div>
  )
}
