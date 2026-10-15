/**
 * Armazón persistente del workspace. Ver docs/features/navigation-shell.md.
 *
 * A partir de `/carreras`, envuelve todas las vistas y aporta tres piezas
 * siempre disponibles: explorador lateral (Carrera → Materia), barra de tabs
 * (una por MATERIA abierta, como carpetas abiertas — ADR-017) y command
 * palette (`Ctrl+K`). En modo lectura (carpeta) se ocultan explorador y tabs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Explorer } from '../features/explorer/Explorer'
import { TabBar } from './TabBar'
import { CommandPalette } from '../features/commandPalette/CommandPalette'
import { Drawer } from '../ui/Drawer'
import { useExplorerTree } from '../../hooks/useExplorerTree.js'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { useReadingMode } from '../../hooks/useReadingMode.js'
import { readCache, writeCache } from '../../services/cache.service.js'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { ROUTES, careerPath, subjectFolderPath } from '../../constants/routes.js'

/** Breakpoint `md` de Tailwind (ver tailwind.config.js): desde acá el explorador va fijo. */
const DESKTOP_QUERY = '(min-width: 768px)'

/** Busca a qué carrera pertenece una materia, recorriendo el árbol ya cargado. */
function findCareerIdForSubject(careers, subjectId) {
  return careers.find((career) => career.subjects.some((subject) => subject.id === subjectId))?.id
}

/** id → nombre de todas las materias del árbol. */
function collectSubjectNames(careers) {
  const names = new Map()
  for (const career of careers) {
    for (const subject of career.subjects) names.set(subject.id, subject.name)
  }
  return names
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const params = useParams()
  const { reading } = useReadingMode()
  const { careers, searchIndex, loading, error: treeError, renameEntity } = useExplorerTree()

  // En desktop el explorador arranca visible (panel fijo); en mobile arranca
  // colapsado (se abre como drawer), porque ahí es el único reemplazo real
  // del canvas para navegar (ver docs/features/navigation-shell.md).
  const [explorerOpen, setExplorerOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [tabs, setTabs] = useState(() => readCache(STORAGE_KEYS.uiTabs, []))

  useEffect(() => {
    writeCache(STORAGE_KEYS.uiTabs, tabs)
  }, [tabs])

  // Cada vez que el árbol termina de cargar (incluida la recarga después de
  // borrar o renombrar): se cierran las tabs de materias que ya no existen y se
  // actualizan los nombres. Las tabs viejas de hojas (antes de ADR-017) no son
  // materias, así que también se van. Si el árbol falló, no se toca nada.
  useEffect(() => {
    if (loading || treeError) return
    const names = collectSubjectNames(careers)
    setTabs((current) => {
      const next = current.filter((tab) => names.has(tab.id)).map((tab) => ({ ...tab, title: names.get(tab.id) }))
      const changed = next.length !== current.length || next.some((tab, index) => tab.title !== current[index].title)
      return changed ? next : current
    })
  }, [careers, loading, treeError])

  /** Abre una materia en una tab. Si ya está abierta, no duplica. */
  const openTab = useCallback((id, title) => {
    setTabs((current) => (current.some((tab) => tab.id === id) ? current : [...current, { id, title }]))
  }, [])

  const closeTab = useCallback(
    (id) => {
      setTabs((current) => current.filter((tab) => tab.id !== id))
      if (id === params.subjectId) navigate(ROUTES.careers)
    },
    [params.subjectId, navigate],
  )

  /** @param {string} subjectId @param {string} [sheetId] */
  const openSubject = useCallback((subjectId, sheetId) => navigate(subjectFolderPath(subjectId, sheetId)), [navigate])

  const bindings = useMemo(
    () => ({
      'mod+k': () => setPaletteOpen(true),
      'mod+b': () => setExplorerOpen((current) => !current),
    }),
    [],
  )
  useHotkeys(bindings, !reading)

  const activeSubjectId = params.subjectId
  const activeCareerId = params.careerId ?? (activeSubjectId ? findCareerIdForSubject(careers, activeSubjectId) : undefined)

  const explorerProps = {
    careers,
    loading,
    onNavigateCareer: (id) => navigate(careerPath(id)),
    onNavigateSubject: (id) => openSubject(id),
    onRenameEntity: renameEntity,
    activeCareerId,
    activeSubjectId,
  }

  return (
    <div className="flex min-h-0 flex-1">
      {explorerOpen && !reading && (
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <Explorer {...explorerProps} />
        </aside>
      )}

      {/* Mobile: el explorador no tiene panel fijo, se abre como drawer. */}
      <div className="md:hidden">
        <Drawer open={explorerOpen && !reading} onClose={() => setExplorerOpen(false)} title="Explorador">
          <Explorer {...explorerProps} />
        </Drawer>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!reading && (
          <>
            <div className="flex items-center border-b border-border px-2 py-1.5 md:hidden">
              <button
                type="button"
                onClick={() => setExplorerOpen(true)}
                className="rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                ☰ Explorador
              </button>
            </div>
            <TabBar tabs={tabs} activeId={params.subjectId} onActivate={(id) => openSubject(id)} onClose={closeTab} />
          </>
        )}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet context={{ openTab }} />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        searchIndex={searchIndex}
        onOpenSubject={openSubject}
      />
    </div>
  )
}
