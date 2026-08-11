import { useCallback, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import { useConceptMap } from '../hooks/useConceptMap'
import { getSubject } from '../services/subjects.service'
import { getAllResources } from '../services/resources.service'
import { ConceptMap } from '../components/features/conceptMap/ConceptMap'
import { TopicFormModal } from '../components/features/conceptMap/TopicFormModal'
import { ResourcePanel } from '../components/features/resources/ResourcePanel'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ROUTES, folderPath } from '../constants/routes'

/** Mapa conceptual (estilo Obsidian / híbrido) de una materia, con recursos por tema. */
export function SubjectMapPage() {
  const { subjectId } = useParams()
  const subject = getSubject(subjectId)
  const {
    nodes,
    layout,
    loading,
    progress,
    addTopic,
    toggleComplete,
    moveNode,
    removeTopic,
  } = useConceptMap(subjectId)

  const [formOpen, setFormOpen] = useState(false)
  const [defaultParent, setDefaultParent] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [resourceVersion, setResourceVersion] = useState(0)

  // Cantidad de recursos por nodo (para el badge). Recalcula al cambiar nodos/recursos.
  const resourceCounts = useMemo(() => {
    const all = getAllResources()
    /** @type {Record<string, number>} */
    const counts = {}
    for (const node of nodes) {
      counts[node.id] = all.filter((resource) => resource.nodeId === node.id).length
    }
    return counts
    // resourceVersion fuerza el recálculo cuando cambian los recursos desde el panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, resourceVersion])

  const openAdd = useCallback((parentId = null) => {
    setDefaultParent(parentId)
    setFormOpen(true)
  }, [])

  const handleAddChild = useCallback((parentId) => openAdd(parentId), [openAdd])
  const handleDelete = useCallback((id) => setDeleting(id), [])
  const handleOpenResources = useCallback((node) => setSelectedNode(node), [])
  const handleResourcesChanged = useCallback(
    () => setResourceVersion((version) => version + 1),
    [],
  )

  const handleSubmit = (data) => {
    addTopic(data)
    setFormOpen(false)
  }

  const confirmDelete = () => {
    removeTopic(deleting)
    if (selectedNode?.id === deleting) setSelectedNode(null)
    setDeleting(null)
  }

  if (!subject) {
    return (
      <p className="text-text-muted">
        Materia no encontrada.{' '}
        <Link to={ROUTES.folders} className="text-accent hover:underline">
          Volver a mis carpetas
        </Link>
      </p>
    )
  }

  return (
    <section className="flex h-[calc(100vh-9rem)] flex-col">
      <nav className="mb-2 text-sm text-text-muted">
        <Link to={ROUTES.folders} className="hover:text-text">
          Carpetas
        </Link>
        <span className="px-1">›</span>
        <Link to={folderPath(subject.folderId)} className="hover:text-text">
          Materias
        </Link>
        <span className="px-1">›</span>
        <span className="text-text">{subject.name}</span>
      </nav>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{subject.name}</h1>
          {nodes.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-text-muted">
              {progress}% completado
            </span>
          )}
        </div>
        {nodes.length > 0 && <Button onClick={() => openAdd(null)}>＋ Agregar tema</Button>}
      </div>

      <div className="card flex-1 overflow-hidden p-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            Cargando…
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon="🌱"
              title="Empezá tu árbol de conocimiento"
              message="Agregá el primer tema de esta materia. Después podés colgar subtemas y conectarlos."
              action={<Button onClick={() => openAdd(null)}>＋ Agregar primer tema</Button>}
            />
          </div>
        ) : (
          <ReactFlowProvider>
            <ConceptMap
              nodes={nodes}
              layout={layout}
              resourceCounts={resourceCounts}
              onToggle={toggleComplete}
              onOpenResources={handleOpenResources}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
              onMove={moveNode}
            />
          </ReactFlowProvider>
        )}
      </div>

      <TopicFormModal
        open={formOpen}
        nodes={nodes}
        defaultParentId={defaultParent}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar tema"
        message="¿Seguro que querés eliminar este tema? Se borrarán también sus subtemas y recursos."
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
      <ResourcePanel
        node={selectedNode}
        open={Boolean(selectedNode)}
        onClose={() => setSelectedNode(null)}
        onChanged={handleResourcesChanged}
      />
    </section>
  )
}
