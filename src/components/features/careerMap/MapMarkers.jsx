/**
 * Nodos fijos del mapa de carrera (no son materias): el de inicio, del que sale una línea a
 * cada año o a cada materia que no depende de otra, y el título de cada columna de año.
 * No se arrastran ni se conectan a mano. Ver docs/features/career-map.md.
 */

import { Handle, Position } from '@xyflow/react'
import { Icon } from '../../ui/Icon'

/** Punto de conexión invisible: React Flow lo necesita para dibujar la línea. */
const HIDDEN_HANDLE = '!h-1 !w-1 !border-none !bg-transparent'

/**
 * @param {{data: {label: string}}} props
 */
export function StartNode({ data }) {
  return (
    <div className="flex h-14 min-w-[160px] max-w-[220px] items-center gap-2 rounded-full border-2 border-accent bg-surface-lit px-4 shadow-md">
      <Icon name="sparkles" size={16} className="shrink-0 text-accent-soft" />
      <span className="truncate font-display text-sm font-bold">{data.label}</span>
      <Handle type="source" position={Position.Right} isConnectable={false} className={HIDDEN_HANDLE} />
    </div>
  )
}

/**
 * @param {{data: {label: string}}} props
 */
export function YearHeaderNode({ data }) {
  return (
    <div className="flex h-9 w-[220px] items-center justify-center rounded-lg border border-border bg-surface/80 text-xs font-semibold uppercase tracking-widest text-text-muted">
      <Handle type="target" position={Position.Left} isConnectable={false} className={HIDDEN_HANDLE} />
      {data.label}
    </div>
  )
}
