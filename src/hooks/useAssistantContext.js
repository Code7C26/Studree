/**
 * Contexto que publica la carpeta para el Brote (materia, hoja activa,
 * selección y cómo aplicar una propuesta). Ver docs/features/assistant.md.
 */

import { useSyncExternalStore } from 'react'
import { assistantBridge } from '../lib/assistant/bridge.js'

const subscribe = (onChange) => assistantBridge.subscribe(onChange)
const getSnapshot = () => assistantBridge.get()

/** @returns {import('../lib/assistant/bridge.js').AssistantContext|null} */
export function useAssistantContext() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
