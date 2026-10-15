/**
 * Armazón persistente del workspace. Ver docs/features/navigation-shell.md.
 *
 * A partir de `/carreras`, envuelve todas las vistas y aporta tres piezas
 * siempre disponibles: explorador lateral (Carrera → Materia), barra de tabs
 * (una por MATERIA abierta, como carpetas abiertas — ADR-017) y command
 * palette (`Ctrl+K`). En modo lectura (carpeta) y en el Inicio (`/`) se ocultan
 * explorador y tabs; el explorador arranca cerrado y se recuerda (ADR-018).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Explorer } from '../features/explorer/Explorer'
import { TabBar } from './TabBar'
import { CommandPalette } from '../features/commandPalette/CommandPalette'
import { Drawer } from '../ui/Drawer'
import { useExplorerTree } from '../../hooks/useExplorerTree.js'
import { useHotkeys } from '../../hooks/useHotkeys.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useTrashPurge } from '../../hooks/useTrashPurge.js'
import { useReadingMode } from '../../hooks/useReadingMode.js'
import { readCache, writeCache } from '../../services/cache.service.js'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { ROUTES, careerPath, subjectFolderPath } from '../../constants/routes.js'

/** Breakpoint `md` de Tailwind: desde acá el explorador es un panel fijo (antes, un drawer). */
const DESKTOP_QUERY = '(min-width: 768px)'

/** Evento que emite el buscador del header para abrir la command palette. */
export const OPEN_PALETTE_EVENT = 'studree:open-palette'

/** Busca a qué carrera pertenece una materia, recorriendo el árbol ya cargado. */
function findCareerIdForSubject(careers, subjectId) {
  return careers.find((career) => career.subjects.some((subject) => subject.id === subjectId))?.id
}

/** id → nombre y color de todas las materias del árbol. */
function collectSubjects(careers) {
  const subjects = new Map()
  for (const career of careers) {
    for (const subject of career.subjects) subjects.set(subject.id, { name: subject.name, color: subject.color ?? null })
  }
  return subjects
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation()
  const { user } = useAuth()
  useTrashPurge(user?.id ?? null)
  const { reading } = useReadingMode()
  // El Inicio ocupa la pantalla entera: sin explorador ni tabs (ADR-018).
  const isHome = location.pathname === ROUTES.home
  const showShell = !reading && !isHome
  const { careers, searchIndex, loading, error: treeError, renameEntity } = useExplorerTree()

  // Arranca cerrado (así la carpeta centra las hojas en la pantalla) y se
  // recuerda lo último que eligió el usuario (Ctrl+B o el botón de la TabBar).
  // En el celular siempre arranca cerrado: ahí es un drawer que tapa todo.
  const [explorerOpen, setExplorerOpen] = useState(
    () => readCache(STORAGE_KEYS.uiExplorerOpen, false) === true && window.matchMedia(DESKTOP_QUERY).matches,
  )
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [tabs, setTabs] = useState(() => readCache(STORAGE_KEYS.uiTabs, []))

  useEffect(() => {
    writeCache(STORAGE_KEYS.uiTabs, tabs)
  }, [tabs])

  useEffect(() => {
    writeCache(STORAGE_KEYS.uiExplorerOpen, explorerOpen)
  }, [explorerOpen])

  // El buscador del header vive fuera de este layout: avisa por un evento.
  useEffect(() => {
    const open = () => setPaletteOpen(true)
    window.addEventListener(OPEN_PALETTE_EVENT, open)
    return () => window.removeEventListener(OPEN_PALETTE_EVENT, open)
  }, [])

  // Cada vez que el árbol termina de cargar (incluida la recarga después de
  // borrar o renombrar): se cierran las tabs de materias que ya no existen y se
  // actualizan los nombres y colores. Las tabs viejas de hojas (antes de ADR-017) no son
  // materias, así que también se van. Si el árbol falló, no se toca nada.
  useEffect(() => {
    if (loading || treeError) return
    const subjects = collectSubjects(careers)
    setTabs((current) => {
      const next = current
        .filter((tab) => subjects.has(tab.id))
        .map((tab) => ({ ...tab, title: subjects.get(tab.id).name, color: subjects.get(tab.id).color }))
      const changed =
        next.length !== current.length ||
        next.some((tab, index) => tab.title !== current[index].title || tab.color !== current[index].color)
      return changed ? next : current
    })
  }, [careers, loading, treeError])

  /** Abre una materia en una tab. Si ya está abierta, no duplica. */
  const openTab = useCallback((id, title, color = null) => {
    setTabs((current) => (current.some((tab) => tab.id === id) ? current : [...current, { id, title, color }]))
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
      ...(isHome ? {} : { 'mod+b': () => setExplorerOpen((current) => !current) }),
    }),
    [isHome],
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
      {explorerOpen && showShell && (
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
          <Explorer {...explorerProps} />
        </aside>
      )}

      {/* Mobile: el explorador no tiene panel fijo, se abre como drawer. */}
      <div className="md:hidden">
        <Drawer open={explorerOpen && showShell} onClose={() => setExplorerOpen(false)} title="Explorador">
          <Explorer {...explorerProps} />
        </Drawer>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {showShell && (
          <TabBar
            tabs={tabs}
            activeId={params.subjectId}
            onActivate={(id) => openSubject(id)}
            onClose={closeTab}
            explorerOpen={explorerOpen}
            onToggleExplorer={() => setExplorerOpen((current) => !current)}
          />
        )}
        <main className="lamp relative isolate flex-1 overflow-y-auto px-4 py-6 sm:px-6">
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
