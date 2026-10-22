/**
 * Tarjeta del atajo para la carpeta: lee la vista que publica el motor del
 * Brote (`useAssistant`) en `assistantBridge` y le manda los comandos.
 * Ver docs/features/assistant.md.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { assistantBridge } from '../lib/assistant/bridge.js'

const subscribe = (onChange) => assistantBridge.subscribeInline(onChange)
const getSnapshot = () => assistantBridge.getInline()

/**
 * @returns {{
 *   view: import('../lib/assistant/inlineAnswer.js').InlineView|null,
 *   close: () => void,
 *   accept: (proposalId: string) => void,
 *   discard: () => void,
 *   continueInChat: () => void,
 *   answer: (text: string) => void,
 * }}
 */
export function useInlineAnswer() {
  const view = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const close = useCallback(() => assistantBridge.sendInline({ type: 'close' }), [])
  const accept = useCallback((proposalId) => assistantBridge.sendInline({ type: 'accept', proposalId }), [])
  const discard = useCallback(() => assistantBridge.sendInline({ type: 'discard' }), [])
  const continueInChat = useCallback(() => assistantBridge.sendInline({ type: 'continue' }), [])
  const answer = useCallback((text) => assistantBridge.sendInline({ type: 'answer', text }), [])
  return { view, close, accept, discard, continueInChat, answer }
}
