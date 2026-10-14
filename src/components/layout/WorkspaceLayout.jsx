/**
 * Armazón persistente del workspace (Fase 7.2). Ver docs/features/navigation-shell.md.
 *
 * A partir de `/carreras`, envuelve todas las vistas y aporta tres piezas
 * siempre disponibles: explorador lateral, barra de tabs y command palette
 * (`Ctrl+K`). El canvas es un modo de exploración más, no el único camino:
 * toda la navegación tiene que poder resolverse solo con explorador + palette
 * (requisito de mobile).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { Explorer } from '../features/explorer/Explorer'
import { TabBar } from './TabBar'
import { CommandPalette } from '../features/commandPalette/CommandPalette'
import { Drawer } from '../ui/Drawer'
import { useExplorerTree } from '../../hooks/useExplorerTree.js'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { readCache, writeCache } from '../../services/cache.service.js'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { ROUTES, careerPath, subjectMapPath, sheetPath } from '../../constants/routes.js'

/** Breakpoint `md` de Tailwind (ver tailwind.config.js): desde acá el explorador va fijo. */
const DESKTOP_QUERY = '(min-width: 768px)'

/** Busca a qué carrera pertenece una materia, recorriendo el árbol ya cargado. */
function findCareerIdForSubject(careers, subjectId) {
  return careers.find((career) => career.subjects.some((subject) => subject.id === subjectId))?.id
}

/** Busca la materia (y su carrera) dueña de una hoja, recorriendo el árbol ya cargado. */
function findAncestryForSheet(careers, sheetId) {
  for (const career of careers) {
    for (const subject of career.subjects) {
      if (subject.sheets.some((sheet) => sheet.id === sheetId)) {
        return { careerId: career.id, subjectId: subject.id }
      }
    }
  }
  return {}
}

/** id → título de todas las hojas del árbol. */
function collectSheetTitles(careers) {
  const titles = new Map()
  for (const career of careers) {
    for (const subject of career.subjects) {
      for (const sheet of subject.sheets) titles.set(sheet.id, sheet.title)
    }
  }
  return titles
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const params = useParams()
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
  // borrar o renombrar): se cierran las tabs de hojas que ya no existen y se
  // actualizan los títulos. Si el árbol falló, no se toca nada.
  useEffect(() => {
    if (loading || treeError) return
    const titles = collectSheetTitles(careers)
    setTabs((current) => {
      const next = current.filter((tab) => titles.has(tab.id)).map((tab) => ({ ...tab, title: titles.get(tab.id) }))
      const changed = next.length !== current.length || next.some((tab, index) => tab.title !== current[index].title)
      return changed ? next : current
    })
  }, [careers, loading, treeError])

  /** Abre una hoja en una tab. Si ya está abierta, no duplica (solo activa). */
  const openTab = useCallback((id, title) => {
    setTabs((current) => (current.some((tab) => tab.id === id) ? current : [...current, { id, title }]))
  }, [])

  const closeTab = useCallback(
    (id) => {
      setTabs((current) => current.filter((tab) => tab.id !== id))
      if (id === params.sheetId) navigate(ROUTES.careers)
    },
    [params.sheetId, navigate],
  )

  const handleOpenSheet = useCallback(
    (sheet) => {
      openTab(sheet.id, sheet.title)
      navigate(sheetPath(sheet.id))
    },
    [openTab, navigate],
  )

  const bindings = useMemo(
    () => ({
      'mod+k': () => setPaletteOpen(true),
      'mod+b': () => setExplorerOpen((current) => !current),
    }),
    [],
  )
  useHotkeys(bindings)

  // Los niveles intermedios (materia/unidad/tema) no tienen ruta propia con
  // careerId en la URL, así que para resaltar/auto-expandir el explorador hay
  // que deducir la ascendencia recorriendo el árbol ya cargado.
  const activeSubjectId =
    params.subjectId ?? (params.sheetId ? findAncestryForSheet(careers, params.sheetId).subjectId : undefined)
  const activeCareerId =
    params.careerId ?? (activeSubjectId ? findCareerIdForSubject(careers, activeSubjectId) : undefined)

  const explorerProps = {
    careers,
    loading,
    onNavigateCareer: (id) => navigate(careerPath(id)),
    onNavigateSubject: (id) => navigate(subjectMapPath(id)),
    onOpenSheet: handleOpenSheet,
    onRenameEntity: renameEntity,
    activeCareerId,
    activeSubjectId,
    activeSheetId: params.sheetId,
  }

  return (
    <div className="flex min-h-0 flex-1">
      {explorerOpen && (
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <Explorer {...explorerProps} />
        </aside>
      )}

      {/* Mobile: el explorador no tiene panel fijo, se abre como drawer (ADR de mobile en navigation-shell.md). */}
      <div className="md:hidden">
        <Drawer open={explorerOpen} onClose={() => setExplorerOpen(false)} title="Explorador">
          <Explorer {...explorerProps} />
        </Drawer>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border px-2 py-1.5 md:hidden">
          <button
            type="button"
            onClick={() => setExplorerOpen(true)}
            className="rounded-lg px-2 py-1 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            ☰ Explorador
          </button>
        </div>
        <TabBar tabs={tabs} activeId={params.sheetId} onActivate={(id) => navigate(sheetPath(id))} onClose={closeTab} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet context={{ openTab }} />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        searchIndex={searchIndex}
        onNavigateSubject={(id) => navigate(subjectMapPath(id))}
        onOpenSheet={handleOpenSheet}
      />
    </div>
  )
}
