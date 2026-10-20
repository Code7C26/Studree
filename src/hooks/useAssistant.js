/**
 * Estado del Brote: chat, plan, modo, alcance y propuestas.
 * Arma el `AssistantRequest`, llama a `streamAssistant` y pasa cada evento por
 * `reduceEvent`. Ver docs/features/assistant.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { streamAssistant } from '../services/assistant.service.js'
import { getPlan } from '../services/userPlan.service.js'
import { useAssistantContext } from './useAssistantContext.js'
import { assistantBridge } from '../lib/assistant/bridge.js'
import { MAX } from '../../supabase/functions/assistant/config.js'
import {
  initialChat, reduceEvent, addUserMessage, setProposalStatus, finishRequest, setError, setNotice,
} from '../lib/assistant/chatState.js'
import {
  ACTION_LABELS, MAX_MESSAGE, buildHistory, buildScope, lockedActionMessage, resolveScopeType, scopeOptions,
} from '../lib/assistant/requestBuilder.js'

const NO_SCOPE = 'Abrí una materia para preguntarle al Brote (o pasate a Premium para preguntar sobre todas).'
const NO_CONTEXT = 'Abrí la carpeta de la materia para aplicar el cambio.'
const BUSY = 'El Brote todavía está respondiendo: probá cuando termine.'

/**
 * Las propuestas de un pedido con selección llevan esa selección (con su rango),
 * para que la carpeta verifique antes de reemplazar. Lo que diga el servidor
 * sobre la selección se ignora; si el texto se recortó al mandarlo, no se
 * adjunta (el modelo no vio todo lo que reemplazaría).
 * @param {Object} event
 * @param {import('../lib/assistant/bridge.js').Selection|null} selection
 */
function tagProposal(event, selection) {
  if (event?.type !== 'proposal' || !event.proposal || typeof event.proposal !== 'object') return event
  const proposal = { ...event.proposal }
  delete proposal.selection
  if (proposal.kind === 'replace_selection' && selection && selection.text.length <= MAX.selection) {
    proposal.selection = selection
  }
  return { ...event, proposal }
}

/**
 * @typedef {import('../lib/assistant/chatState.js').ChatState} ChatState
 * @typedef {import('../lib/assistant/bridge.js').AssistantContext} AssistantContext
 * @typedef {import('../lib/assistant/requestBuilder.js').ScopeOption} ScopeOption
 * @typedef {import('../lib/assistant/requestBuilder.js').ScopeType} ScopeType
 */

/**
 * @returns {{
 *   state: ChatState,
 *   context: AssistantContext|null,
 *   plan: 'free'|'premium',
 *   mode: 'notes'|'external',
 *   setMode: (mode: 'notes'|'external') => void,
 *   scope: ScopeType|null,
 *   setScope: (scope: ScopeType) => void,
 *   scopeOptions: ScopeOption[],
 *   send: (text: string) => void,
 *   runAction: (action: string, extra?: Object) => void,
 *   stop: () => void,
 *   acceptProposal: (id: string) => void,
 *   rejectProposal: (id: string) => void,
 * }}
 */
export function useAssistant() {
  const context = useAssistantContext()
  const [state, setState] = useState(initialChat)
  const [plan, setPlan] = useState(/** @type {'free'|'premium'} */ ('free'))
  const [mode, setMode] = useState(/** @type {'notes'|'external'} */ ('notes'))
  const [chosenScope, setScope] = useState(/** @type {ScopeType} */ ('subject'))
  /** @type {React.MutableRefObject<AbortController|null>} */
  const controllerRef = useRef(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Ante un error se queda en 'free': el servidor decide igual.
  useEffect(() => {
    let alive = true
    getPlan().then(({ data }) => {
      if (alive) setPlan(data)
    })
    return () => {
      alive = false
    }
  }, [])

  // Al desmontar se corta lo que esté en curso (el servidor deja de generar).
  useEffect(() => () => controllerRef.current?.abort(), [])

  const options = useMemo(() => scopeOptions(context, plan), [context, plan])
  const scope = resolveScopeType(chosenScope, options)

  const start = useCallback(
    /**
     * @param {Object} fields  Campos del pedido además de history/mode/scope.
     * @param {string} visibleText  Lo que se muestra como mensaje del usuario.
     * @param {import('../lib/assistant/bridge.js').Selection|null} [selection]  Selección completa de un atajo.
     */
    async (fields, visibleText, selection = null) => {
      if (controllerRef.current) {
        setState((s) => setNotice(s, BUSY))
        return
      }
      const scopeValue = buildScope(scope, context)
      if (!scopeValue) {
        setState((s) => setNotice(s, NO_SCOPE))
        return
      }
      const request = {
        message: '',
        ...fields,
        history: buildHistory(stateRef.current.messages),
        mode,
        scope: scopeValue,
      }
      const controller = new AbortController()
      controllerRef.current = controller
      setState((s) => addUserMessage(s, visibleText))
      const { error } = await streamAssistant({
        request,
        signal: controller.signal,
        onEvent: (event) => setState((s) => reduceEvent(s, tagProposal(event, selection))),
      })
      if (controllerRef.current === controller) controllerRef.current = null
      if (controller.signal.aborted) {
        setState((s) => finishRequest(s))
        return
      }
      setState((s) => finishRequest(s, error))
    },
    [scope, context, mode],
  )

  const send = useCallback(
    (text) => {
      const message = String(text ?? '').trim().slice(0, MAX_MESSAGE)
      if (!message) return
      start({ action: 'chat', message }, message)
    },
    [start],
  )

  const runAction = useCallback(
    (action, extra = {}) => {
      const locked = lockedActionMessage(action, plan)
      if (locked) {
        setState((s) => setNotice(s, locked))
        return
      }
      const { label, ...fields } = extra ?? {}
      const visible = label ?? ACTION_LABELS[action] ?? fields.message ?? action
      start({ ...fields, action }, visible)
    },
    [plan, start],
  )

  // Atajos sobre el texto: la carpeta encola el pedido en el puente (y el host
  // abre el panel). Se toma acá, al montar o al recibir el aviso, y va por la
  // misma conversación. El `setTimeout` evita que el doble montaje de
  // StrictMode lo arranque y lo corte enseguida.
  const runQueuedRef = useRef(/** @type {() => void} */ (() => {}))
  runQueuedRef.current = () => {
    const item = assistantBridge.takeRequest()
    if (!item) return
    start(item.request, item.label, item.selection ?? null)
  }
  useEffect(() => {
    let timer = window.setTimeout(() => runQueuedRef.current(), 0)
    const off = assistantBridge.onRequest(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => runQueuedRef.current(), 0)
    })
    return () => {
      window.clearTimeout(timer)
      off()
    }
  }, [])

  const stop = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  const acceptProposal = useCallback(
    (id) => {
      const proposal = stateRef.current.proposals.find((p) => p.id === id)
      if (!proposal || proposal.status !== 'pending') return
      if (!context) {
        setState((s) => setError(setProposalStatus(s, id, 'failed'), NO_CONTEXT))
        return
      }
      let result
      try {
        result = context.apply(proposal)
      } catch (error) {
        console.error('[assistant] apply lanzó un error:', error)
        result = { ok: false, error: 'No se pudo aplicar el cambio.' }
      }
      if (result?.ok) {
        setState((s) => setProposalStatus(s, id, 'applied'))
      } else {
        const message = result && 'error' in result ? result.error : 'No se pudo aplicar el cambio.'
        setState((s) => setError(setProposalStatus(s, id, 'failed'), message))
      }
    },
    [context],
  )

  const rejectProposal = useCallback((id) => {
    setState((s) => setProposalStatus(s, id, 'rejected'))
  }, [])

  return {
    state,
    context,
    plan,
    mode,
    setMode,
    scope,
    setScope,
    scopeOptions: options,
    send,
    runAction,
    stop,
    acceptProposal,
    rejectProposal,
  }
}
