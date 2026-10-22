/**
 * Estado del Brote: chat, plan, modo, alcance y propuestas.
 * Arma el `AssistantRequest`, llama a `streamAssistant` y pasa cada evento por
 * `reduceEvent`. Ver docs/features/assistant.md.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { streamAssistant } from '../services/assistant.service.js'
import { getPlan } from '../services/userPlan.service.js'
import { saveSummary } from '../services/study.service.js'
import { useAssistantContext } from './useAssistantContext.js'
import { assistantBridge } from '../lib/assistant/bridge.js'
import { MAX } from '../../supabase/functions/assistant/config.js'
import {
  saveAttempt, listWeakTopics, applyWeakTopicUpdates, resolveQuizSources,
} from '../services/quizResults.service.js'
import { gradeClosed, summarize, openAnswers, mergeResults } from '../lib/assistant/quizScore.js'
import { planWeakTopicUpdates, attachSubjects } from '../lib/assistant/weakTopics.js'
import {
  createQuizSession, startSubmit, finishSubmit, failedOutcome, blocksNewQuiz, discardQuiz, QUIZ_ACTIONS, QUIZ_OPEN_REASON,
  canRetrySave, withSavedAttempt,
} from '../lib/assistant/quizSession.js'
import {
  initialChat, reduceEvent, addUserMessage, setProposalStatus, finishRequest, setError, setNotice, appendExchange,
} from '../lib/assistant/chatState.js'
import {
  createInline, reduceInline, addInlineAnswer, inlineHistory, inlineView,
} from '../lib/assistant/inlineAnswer.js'
import { buildQuizRecord, quizTitle } from '../lib/assistant/quizRecord.js'
import { requestMeta } from '../lib/assistant/requestMeta.js'
import {
  createSummarySession, finishSummarySave, canRetrySummarySave, startSummaryRetry, summaryRowFor, SUMMARY_SAVE_FAILED,
} from '../lib/assistant/summarySession.js'
import { createRequestSlot } from '../lib/assistant/requestSlot.js'
import {
  ACTION_LABELS, MAX_MESSAGE, actionScope, blockReason, buildHistory, buildScope, lockedActionMessage, requestMode,
  resolveScopeType, scopeOptions,
} from '../lib/assistant/requestBuilder.js'

const NO_SCOPE = 'Abrí una materia para preguntarle al Brote (o pasate a Premium para preguntar sobre todas).'
const NO_CONTEXT = 'Abrí la carpeta de la materia para aplicar el cambio.'
const BUSY = 'El Brote todavía está respondiendo: probá cuando termine.'
/** Aviso de la tarjeta de un atajo cuando el que está respondiendo es el chat. */
const INLINE_BUSY = 'El Brote está respondiendo en el chat: probá cuando termine.'
const CANCELLED = 'Cortaste la respuesta.'
const APPLY_FAILED = 'No se pudo aplicar el cambio.'
const GRADE_LABEL = 'Corregí mis respuestas de desarrollo'
const GRADE_FAILED = 'No se pudieron corregir las respuestas de desarrollo.'
const TOPICS_NOT_UPDATED = 'Guardé el examen, pero no pude actualizar tus temas flojos.'
const SUBMIT_FAILED = 'Algo falló al corregir o guardar la prueba. Probá de nuevo más tarde.'
const NO_SUBJECT = 'Abrí una materia para detectar sus huecos.'
/** Aviso de cada motivo de `blockReason`. */
const BLOCK_NOTICES = { busy: BUSY, no_scope: NO_SCOPE, quiz_open: QUIZ_OPEN_REASON }

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
 * Aplica una propuesta en la carpeta abierta (`context.apply`). Sin carpeta, o
 * si `apply` falla o lanza, devuelve el motivo.
 * @param {import('../lib/assistant/bridge.js').AssistantContext|null} context
 * @param {import('../lib/assistant/chatState.js').Proposal} proposal
 * @returns {{ok: true, sheetCreatedAt?: string}|{ok: false, error: string}}
 */
function applyInFolder(context, proposal) {
  if (!context) return { ok: false, error: NO_CONTEXT }
  let result
  try {
    result = context.apply(proposal)
  } catch (error) {
    console.error('[assistant] apply lanzó un error:', error)
    return { ok: false, error: APPLY_FAILED }
  }
  if (result?.ok) return result
  return { ok: false, error: result && 'error' in result ? result.error : APPLY_FAILED }
}

/**
 * @typedef {import('../lib/assistant/summarySession.js').SummarySession} SummarySession
 * @typedef {import('../lib/assistant/chatState.js').ChatState} ChatState
 * @typedef {import('../lib/assistant/inlineAnswer.js').InlineState} InlineState
 * @typedef {import('../lib/assistant/bridge.js').InlineCommand} InlineCommand
 * @typedef {import('../lib/assistant/bridge.js').QueuedRequest} QueuedRequest
 * @typedef {import('../lib/assistant/bridge.js').AssistantContext} AssistantContext
 * @typedef {import('../lib/assistant/requestBuilder.js').ScopeOption} ScopeOption
 * @typedef {import('../lib/assistant/requestBuilder.js').ScopeType} ScopeType
 */

/**
 * Prueba en curso: las preguntas, con qué alcance se pidió (para corregir y
 * guardar con ese alcance aunque el usuario se haya movido de carpeta) y su
 * estado `open` → `grading` → `done` (se corrige y guarda una sola vez).
 * @typedef {import('../lib/assistant/quizSession.js').QuizSession} QuizSession
 */

/**
 * Resultado de terminar una prueba.
 * @typedef {Object} QuizOutcome
 * @property {import('../lib/assistant/quizScore.js').QuizResult[]} results
 * @property {{total: number, correct: number}} score
 * @property {Record<string, {subject_id: string, created_at: string}>} sheets  Hojas vivas de la prueba (fecha y link).
 * @property {string|null} gradeError  No se pudieron corregir las de desarrollo (p. ej. tope agotado).
 * @property {string|null} saveError  No se pudo guardar el intento o los temas flojos.
 * @property {boolean} savedTopics  Se actualizaron temas flojos.
 * @property {string|null} attemptId  Id de la fila de `quiz_attempts` (null si no se guardó).
 * @property {import('../lib/assistant/quizRecord.js').QuizDetail} record  Registro completo del examen.
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
 *   send: (text: string) => boolean,
 *   runAction: (action: string, extra?: Object) => void,
 *   stop: () => void,
 *   acceptProposal: (id: string) => void,
 *   rejectProposal: (id: string) => void,
 *   quizSession: QuizSession|null,
 *   submitQuiz: (given: Record<string, number|boolean|string>) => Promise<QuizOutcome|null>,
 *   discardOpenQuiz: () => void,
 *   retryQuizSave: () => Promise<void>,
 *   summaryDoc: SummarySession|null,
 *   retrySummarySave: () => Promise<void>,
 *   summaryPending: boolean,
 *   inlineBusy: boolean,
 * }}
 */
export function useAssistant() {
  const context = useAssistantContext()
  const [state, setState] = useState(initialChat)
  const [plan, setPlan] = useState(/** @type {'free'|'premium'} */ ('free'))
  const [mode, setMode] = useState(/** @type {'notes'|'external'} */ ('notes'))
  const [chosenScope, setScope] = useState(/** @type {ScopeType} */ ('subject'))
  /** Un solo pedido a la vez en todo el Brote (un `AbortController` con dueño: chat o tarjeta). */
  const [slot] = useState(createRequestSlot)
  const stateRef = useRef(state)
  /** Conversación "inline": la tarjeta del atajo (una a la vez). Se publica en el puente. */
  const [inline, setInlineState] = useState(/** @type {InlineState|null} */ (null))
  /** Copia sincrónica de la tarjeta para los comandos (como `stateRef`). */
  const inlineRef = useRef(/** @type {InlineState|null} */ (null))
  /** Id de la última tarjeta: los eventos de un pedido cortado traen otro. */
  const inlineSeqRef = useRef(0)
  const putInline = useCallback((/** @type {InlineState|null} */ next) => {
    inlineRef.current = next
    setInlineState(next)
  }, [])
  const [quizSession, setQuizSession] = useState(/** @type {QuizSession|null} */ (null))
  /** Copia sincrónica de la sesión: el guard de "una sola vez" no puede esperar al render. */
  const quizRef = useRef(/** @type {QuizSession|null} */ (null))
  /** Última `key` usada: una prueba nueva después de descartar no puede repetirla (el panel la usa para mostrarla). */
  const lastQuizKeyRef = useRef(0)
  const putQuiz = useCallback((/** @type {QuizSession|null} */ next) => {
    quizRef.current = next
    if (next) lastQuizKeyRef.current = next.key
    setQuizSession(next)
  }, [])
  /** Alcance del pedido de prueba en curso (se asocia al evento `quiz`). */
  const pendingQuizRef = useRef(/** @type {Pick<QuizSession, 'scope'|'scopeSubjectId'|'isReview'|'title'|'careerId'>|null} */ (null))

  /** Un reintento de guardado a la vez (un doble click no puede duplicar la fila). */
  const retryingRef = useRef(false)

  const [summaryDoc, setSummaryDoc] = useState(/** @type {SummarySession|null} */ (null))
  /** Copia sincrónica del resumen (guard del reintento) y la fila a guardar, con la `key` a la que pertenece. */
  const summaryRef = useRef(/** @type {SummarySession|null} */ (null))
  const summaryRowRef = useRef(/** @type {{key: number, row: Object}|null} */ (null))
  const lastSummaryKeyRef = useRef(0)
  const retryingSummaryRef = useRef(false)
  /** Hay un pedido de resumen en curso (antes de que llegue el resumen). */
  const [summaryRequesting, setSummaryRequesting] = useState(false)
  const putSummary = useCallback((/** @type {SummarySession|null} */ next) => {
    summaryRef.current = next
    setSummaryDoc(next)
  }, [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // La carpeta dibuja la tarjeta con lo que se publica acá, en cada cambio.
  useEffect(() => {
    inlineRef.current = inline
    assistantBridge.setInline(inlineView(inline))
  }, [inline])
  // Sin motor no hay tarjeta (su pedido lo corta el efecto de desmontar de abajo).
  useEffect(() => () => assistantBridge.setInline(null), [])

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
  useEffect(() => () => {
    slot.abort()
  }, [slot])

  const options = useMemo(() => scopeOptions(context, plan), [context, plan])
  const scope = resolveScopeType(chosenScope, options)

  /**
   * Guarda la fila del resumen (una inserción por llamada) y anota el resultado
   * en la sesión de esa `key`. Nunca lanza: un error queda en la sesión.
   * @param {number} key
   * @param {Object} row
   */
  const persistSummary = useCallback(async (key, row) => {
    let id = null
    let error = null
    try {
      const res = await saveSummary(/** @type {any} */ (row))
      id = res.data?.id ?? null
      error = res.error
    } catch (err) {
      console.error('[assistant] falló el guardado del resumen:', err)
      error = SUMMARY_SAVE_FAILED
    }
    putSummary(finishSummarySave(summaryRef.current, key, { id, error: id ? null : error ?? SUMMARY_SAVE_FAILED }))
  }, [putSummary])

  /**
   * Resumen recién llegado: lo muestra en `saving` y lo guarda UNA vez.
   * @param {Object} payload  `SummaryPayload` del evento `summary`.
   * @param {import('../lib/assistant/summarySession.js').SummaryMeta} meta
   */
  const saveNewSummary = useCallback(async (payload, meta) => {
    const key = lastSummaryKeyRef.current + 1
    lastSummaryKeyRef.current = key
    const data = /** @type {import('../lib/assistant/summaryDoc.js').SummaryPayload} */ (payload)
    summaryRowRef.current = { key, row: summaryRowFor(data, meta) }
    putSummary(createSummarySession(key, data, meta, new Date().toISOString()))
    await persistSummary(key, summaryRowRef.current.row)
  }, [putSummary, persistSummary])

  /**
   * Reintenta guardar el resumen cuyo guardado falló. Solo desde `error` y sin
   * fila (`canRetrySummarySave`): reintentar nunca inserta dos veces.
   * @returns {Promise<void>}
   */
  const retrySummarySave = useCallback(async () => {
    const session = summaryRef.current
    const pending = summaryRowRef.current
    if (!session || !pending || pending.key !== session.key || !canRetrySummarySave(session) || retryingSummaryRef.current) return
    retryingSummaryRef.current = true
    try {
      putSummary(startSummaryRetry(session))
      await persistSummary(session.key, pending.row)
    } finally {
      retryingSummaryRef.current = false
    }
  }, [putSummary, persistSummary])

  const run = useCallback(
    /**
     * Manda un pedido y pasa sus eventos al chat o a la tarjeta del atajo.
     * Para la tarjeta no se toca el chat, ni la prueba, ni `pendingQuizRef`, y
     * el historial lo arma quien llama (`[]` en el primer pedido del atajo).
     * @param {Object} input
     * @param {Object} input.fields  Campos del pedido además de history/mode/scope.
     * @param {string} [input.visibleText]  Lo que se muestra como mensaje del usuario (solo chat).
     * @param {import('../lib/assistant/bridge.js').Selection|null} [input.selection]  Selección completa de un atajo.
     * @param {{type: ScopeType, id?: string}|null} [input.scopeOverride]  Alcance fijo (la corrección usa el de la prueba).
     * @param {'chat'|{inlineId: number}} [input.target]
     * @param {Array<{role: 'user'|'model', text: string}>} [input.history]  Solo para la tarjeta.
     * @returns {Promise<{error: string|null, grades: Array<Object>|null}>}
     */
    async ({ fields, visibleText = '', selection = null, scopeOverride = null, target = 'chat', history = [] }) => {
      const inlineId = target === 'chat' ? null : target.inlineId
      const scopeValue = scopeOverride ?? buildScope(scope, context)
      /** Datos del pedido de resumen (se toman acá: al llegar ya pudo cambiar la carpeta). */
      let summaryMeta = null
      /** @type {Object|null} */
      let summaryPayload = null
      if (inlineId === null) {
        const blocked = blockReason({
          running: slot.running(), scopeValue, action: fields.action, quizOpen: blocksNewQuiz(quizRef.current),
        })
        if (blocked) {
          const notice = BLOCK_NOTICES[blocked]
          setState((s) => setNotice(s, notice))
          return { error: notice, grades: null }
        }
        if (QUIZ_ACTIONS.includes(fields.action)) {
          let scopeSubjectId = null
          if (scopeValue.type === 'subject') scopeSubjectId = scopeValue.id ?? null
          else if (scopeValue.type === 'sheet') scopeSubjectId = context?.subject?.id ?? null
          const isReview = fields.action === 'weak_review'
          const meta = requestMeta(scopeValue, context)
          pendingQuizRef.current = {
            scope: scopeValue,
            scopeSubjectId,
            isReview,
            title: quizTitle({ isReview, scopeType: scopeValue.type, subjectName: meta.subjectName }),
            careerId: meta.careerId,
          }
        } else if (fields.action !== 'quiz_grade') {
          pendingQuizRef.current = null
        }
        if (fields.action === 'summary') {
          summaryMeta = requestMeta(scopeValue, context)
        }
      } else if (slot.running()) {
        // Quien llama ya cortó la tarjeta anterior o avisó: nunca se pisa un pedido en curso.
        return { error: BUSY, grades: null }
      }
      const request = {
        message: '',
        ...fields,
        history: inlineId === null ? buildHistory(stateRef.current.messages) : history,
        // Ruling R: la corrección nunca gasta el cupo externo.
        mode: requestMode(fields.action, mode),
        scope: scopeValue,
      }
      const controller = slot.claim(inlineId === null ? 'chat' : 'inline')
      if (inlineId === null) setState((s) => addUserMessage(s, visibleText))
      if (summaryMeta) setSummaryRequesting(true)
      /** @type {Array<Object>|null} */
      let grades = null
      /** @type {string|null} */
      let streamError = null
      const { error } = await streamAssistant({
        request,
        signal: controller.signal,
        onEvent: (event) => {
          if (inlineId !== null) {
            // Solo la tarjeta: si ya es otra (o se cerró), `reduceInline` lo ignora.
            setInlineState((i) => reduceInline(i, inlineId, tagProposal(event, selection)))
            return
          }
          if (event?.type === 'grades' && Array.isArray(event.grades)) grades = event.grades
          const sm = event?.type === 'summary' ? event.summary : null
          if (summaryMeta && sm && typeof sm === 'object' && typeof sm.title === 'string' && Array.isArray(sm.sections)) summaryPayload = sm
          if (event?.type === 'error') streamError = typeof event.message === 'string' && event.message ? event.message : GRADE_FAILED
          const meta = pendingQuizRef.current
          if (event?.type === 'quiz' && Array.isArray(event.questions) && meta) {
            putQuiz(createQuizSession(quizRef.current ?? { key: lastQuizKeyRef.current }, meta, event.questions))
          }
          setState((s) => reduceEvent(s, tagProposal(event, selection)))
        },
      })
      // Solo lo suelta si sigue siendo suyo (un atajo nuevo pudo haberlo reemplazado).
      slot.release(controller)
      if (summaryMeta) {
        // Un resumen que llegó ya gastó cupo: se guarda aunque después se haya cortado la respuesta.
        if (summaryPayload) await saveNewSummary(summaryPayload, summaryMeta)
        setSummaryRequesting(false)
      }
      if (inlineId !== null) {
        const message = controller.signal.aborted ? null : error
        setInlineState((i) => (i?.id === inlineId ? { ...i, chat: finishRequest(i.chat, message) } : i))
        return { error: controller.signal.aborted ? CANCELLED : error, grades: null }
      }
      if (controller.signal.aborted) {
        setState((s) => finishRequest(s))
        return { error: CANCELLED, grades: null }
      }
      setState((s) => finishRequest(s, error))
      return { error: error ?? streamError, grades }
    },
    [scope, context, mode, putQuiz, slot, saveNewSummary],
  )

  const start = useCallback(
    /**
     * Pedido por el chat (mensajes, chips, corrección de la prueba y atajos sin `target: 'inline'`).
     * @param {Object} fields  Campos del pedido además de history/mode/scope.
     * @param {string} visibleText  Lo que se muestra como mensaje del usuario.
     * @param {import('../lib/assistant/bridge.js').Selection|null} [selection]  Selección completa de un atajo.
     * @param {{type: ScopeType, id?: string}|null} [scopeOverride]  Alcance fijo (la corrección usa el de la prueba).
     * @returns {Promise<{error: string|null, grades: Array<Object>|null}>}
     */
    (fields, visibleText, selection = null, scopeOverride = null) => run({ fields, visibleText, selection, scopeOverride }),
    [run],
  )

  const send = useCallback(
    /**
     * Manda un mensaje de chat. Devuelve `false` si no se mandó (ocupado o sin
     * alcance): el panel conserva el borrador para no perder lo escrito.
     * @param {string} text
     * @returns {boolean}
     */
    (text) => {
      const message = String(text ?? '').trim().slice(0, MAX_MESSAGE)
      if (!message) return false
      const blocked = blockReason({
        running: slot.running(), scopeValue: buildScope(scope, context), action: 'chat', quizOpen: false,
      })
      if (blocked) {
        setState((s) => setNotice(s, BLOCK_NOTICES[blocked]))
        return false
      }
      start({ action: 'chat', message }, message)
      return true
    },
    [start, scope, context, slot],
  )

  const runAction = useCallback(
    (action, extra = {}) => {
      const locked = lockedActionMessage(action, plan)
      if (locked) {
        setState((s) => setNotice(s, locked))
        return
      }
      // Huecos y conexiones tienen su propio alcance (no el del panel).
      const fixed = actionScope(action, context)
      if (fixed === null) {
        setState((s) => setNotice(s, NO_SUBJECT))
        return
      }
      const { label, ...fields } = extra ?? {}
      const visible = label ?? ACTION_LABELS[action] ?? fields.message ?? action
      start({ ...fields, action }, visible, null, fixed ?? null)
    },
    [plan, context, start],
  )

  /**
   * Corta el pedido de la tarjeta si es el que está en curso (el del chat no se
   * toca). Se suelta ya: la limpieza del `run` cortado solo suelta lo suyo y
   * `reduceInline` descarta sus eventos tardíos.
   */
  const abortInline = () => {
    slot.abort('inline', { free: true })
  }

  /** Cierra la tarjeta (y corta su pedido si estaba respondiendo). */
  const dropInline = () => {
    abortInline()
    putInline(null)
  }

  /** Aviso en la tarjeta `id` sin tocar lo demás. */
  const noticeInline = (/** @type {number} */ id, /** @type {string} */ notice) => {
    setInlineState((i) => (i?.id === id ? { ...i, chat: setNotice(i.chat, notice) } : i))
  }

  /**
   * Atajo que responde en la tarjeta: corta y reemplaza a la anterior. Si el que
   * responde es el chat, la tarjeta se crea con el aviso y sin pedido.
   * @param {QueuedRequest} item
   */
  const runInline = (item) => {
    abortInline()
    inlineSeqRef.current += 1
    const id = inlineSeqRef.current
    const scopeValue = buildScope(scope, context)
    const created = createInline(id, item, { mode, scope: scopeValue })
    const blocked = blockReason({
      running: slot.running(), scopeValue, action: item.request?.action ?? 'shortcut', quizOpen: false,
    })
    if (blocked) {
      const notice = blocked === 'busy' ? INLINE_BUSY : BLOCK_NOTICES[blocked]
      putInline({ ...created, chat: setNotice(finishRequest(created.chat), notice) })
      return
    }
    putInline(created)
    // El pedido del atajo no manda el historial del chat (spec § 3).
    run({ fields: item.request, selection: item.selection ?? null, scopeOverride: scopeValue, target: { inlineId: id }, history: [] })
  }

  // Atajos sobre el texto: la carpeta encola el pedido en el puente. Con
  // `target: 'inline'` responde la tarjeta (el host solo carga el panel); si
  // no, el host abre el panel y va por la misma conversación. Se toma acá, al
  // montar o al recibir el aviso. El `setTimeout` evita que el doble montaje
  // de StrictMode lo arranque y lo corte enseguida.
  const runQueuedRef = useRef(/** @type {() => void} */ (() => {}))
  runQueuedRef.current = () => {
    const item = assistantBridge.takeRequest()
    if (!item) return
    if (item.target === 'inline') runInline(item)
    else start(item.request, item.label, item.selection ?? null)
  }

  // Comandos de la tarjeta (la carpeta los manda por el puente).
  const inlineCommandRef = useRef(/** @type {(cmd: InlineCommand) => void} */ (() => {}))
  inlineCommandRef.current = (cmd) => {
    const current = inlineRef.current
    if (!current || !cmd) return
    switch (cmd.type) {
      case 'close':
      case 'discard':
        dropInline()
        return
      case 'accept': {
        const proposal = current.chat.proposals.find((p) => p.id === cmd.proposalId)
        if (!proposal || proposal.status !== 'pending') return
        const result = applyInFolder(context, proposal)
        if (result.ok) {
          dropInline()
          return
        }
        const message = /** @type {{error: string}} */ (result).error
        setInlineState((i) =>
          i?.id === current.id ? { ...i, chat: setError(setProposalStatus(i.chat, proposal.id, 'failed'), message) } : i,
        )
        return
      }
      case 'continue': {
        if (current.chat.busy) return
        // Con el chat respondiendo, el intercambio no se mete en medio de su respuesta.
        if (slot.running()) {
          noticeInline(current.id, INLINE_BUSY)
          return
        }
        // Solo si hubo intercambio: un aviso o un error sin respuesta no se pasa al chat.
        if (current.chat.messages.length > 1) {
          setState((s) => appendExchange(s, { messages: current.chat.messages, proposals: current.chat.proposals }))
        }
        putInline(null)
        assistantBridge.requestOpen()
        return
      }
      case 'answer': {
        const message = String(cmd.text ?? '').trim().slice(0, MAX_MESSAGE)
        if (!message || !inlineView(current)?.canAnswer) return
        if (slot.running()) {
          // Un doble envío encuentra su propio pedido en curso: no avisa nada.
          if (slot.owner() === 'chat') noticeInline(current.id, INLINE_BUSY)
          return
        }
        const history = inlineHistory(current)
        putInline(addInlineAnswer(current, message))
        run({
          fields: { action: 'chat', message },
          selection: current.selection,
          scopeOverride: current.scope,
          target: { inlineId: current.id },
          history,
        })
      }
    }
  }
  useEffect(() => assistantBridge.onInlineCommand((cmd) => inlineCommandRef.current(cmd)), [])
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

  /**
   * Guarda el intento y los temas flojos de una prueba ya corregida. Solo
   * escribe temas de preguntas cuya materia se resolvió a una viva del alcance
   * (`attachSubjects`); el resto se saltea.
   * @param {QuizSession} session
   * @param {import('../lib/assistant/quizScore.js').QuizResult[]} results
   * @param {{total: number, correct: number}} score
   * @returns {Promise<Pick<QuizOutcome, 'sheets'|'saveError'|'savedTopics'|'attemptId'|'record'>>}
   */
  const saveQuizOutcome = useCallback(async (session, results, score) => {
    const sources = await resolveQuizSources({
      sheetIds: session.questions.map((q) => q.sheetId).filter(Boolean),
      subjectIds: session.scopeSubjectId ? [session.scopeSubjectId] : [],
    })
    const sheets = sources.data?.sheets ?? {}
    const record = buildQuizRecord(session, { results, sheets })
    if (score.total === 0) return { sheets, record, attemptId: null, saveError: null, savedTopics: false }
    const attempt = await saveAttempt({
      scope: session.scope,
      ...score,
      subjectId: session.scopeSubjectId,
      careerId: session.careerId,
      title: session.title,
      detail: record,
    })
    const attemptId = attempt.data?.id ?? null
    // Con el intento ya guardado, un fallo posterior es solo de los temas flojos.
    const laterError = (error) => attempt.error ?? (error ? (attemptId ? TOPICS_NOT_UPDATED : error) : null)
    if (sources.error) return { sheets, record, attemptId, saveError: laterError(sources.error), savedTopics: false }

    const where = attachSubjects(session.questions, {
      scope: session.scope, scopeSubjectId: session.scopeSubjectId, sheets, subjects: sources.data.subjects,
    })
    const byId = new Map(session.questions.map((q) => [q.id, q]))
    const topicResults = results
      .filter((r) => typeof r.correct === 'boolean' && where[r.id])
      .map((r) => ({ ...where[r.id], topic: byId.get(r.id)?.topic ?? '', correct: /** @type {boolean} */ (r.correct) }))
    if (topicResults.length === 0) return { sheets, record, attemptId, saveError: attempt.error, savedTopics: false }

    const existing = await listWeakTopics([...new Set(topicResults.map((r) => r.subject_id))])
    if (existing.error) return { sheets, record, attemptId, saveError: laterError(existing.error), savedTopics: false }
    const plan = planWeakTopicUpdates({ existing: existing.data, results: topicResults, isReview: session.isReview })
    if (plan.upserts.length === 0 && plan.deletes.length === 0) return { sheets, record, attemptId, saveError: attempt.error, savedTopics: false }
    const applied = await applyWeakTopicUpdates(plan)
    return { sheets, record, attemptId, saveError: laterError(applied.error), savedTopics: !applied.error }
  }, [])

  const submitQuiz = useCallback(
    /**
     * Corrige la prueba en curso (cerradas acá; las de desarrollo con
     * `quiz_grade`, con el alcance de la prueba) y guarda el intento y los
     * temas flojos. Si la corrección de las abiertas falla (p. ej. tope
     * agotado), el error se muestra y las cerradas quedan corregidas igual.
     * Una prueba se envía UNA vez (`startSubmit`): un segundo envío devuelve
     * `null` sin corregir ni guardar. El resultado queda en la sesión (`done`).
     * @param {Record<string, number|boolean|string>} given
     * @returns {Promise<QuizOutcome|null>}
     */
    async (given) => {
      // Hay un pedido en curso (p. ej. una tarjeta respondiendo): no se corrige encima.
      if (slot.running()) return null
      const session = startSubmit(quizRef.current, given)
      if (!session) return null
      putQuiz(session)
      /** @type {{results: import('../lib/assistant/quizScore.js').QuizResult[], score: {total: number, correct: number}, gradeError: string|null}|null} */
      let graded = null
      /** @type {QuizOutcome} */
      let outcome
      try {
        const closed = gradeClosed(session.questions, given)
        const answers = openAnswers(session.questions, given)
        let grades = null
        let gradeError = null
        if (answers.length) {
          const res = await start({ action: 'quiz_grade', answers }, GRADE_LABEL, null, session.scope)
          grades = res.grades
          gradeError = res.grades ? null : res.error ?? GRADE_FAILED
        }
        const results = mergeResults(session.questions, given, closed, grades)
        graded = { results, score: summarize(results), gradeError }
        const saved = await saveQuizOutcome(session, graded.results, graded.score)
        outcome = { ...graded, ...saved }
      } catch (error) {
        // Un error inesperado no puede dejar la prueba trabada en `grading`.
        console.error('[assistant] falló el envío de la prueba:', error)
        outcome = failedOutcome(graded, SUBMIT_FAILED)
      } finally {
        putQuiz(finishSubmit(quizRef.current, session.key, outcome ?? failedOutcome(graded, SUBMIT_FAILED)))
      }
      return outcome
    },
    [start, saveQuizOutcome, putQuiz, slot],
  )

  /**
   * Reintenta guardar el intento de una prueba terminada cuyo guardado falló.
   * Solo si todavía no hay fila (`attemptId`): reintentar no duplica.
   * @returns {Promise<void>}
   */
  const retryQuizSave = useCallback(async () => {
    const session = quizRef.current
    if (!session || !canRetrySave(session) || retryingRef.current) return
    retryingRef.current = true
    try {
      const { outcome } = session
      const attempt = await saveAttempt({
        scope: session.scope,
        ...outcome.score,
        subjectId: session.scopeSubjectId,
        careerId: session.careerId,
        title: session.title,
        detail: outcome.record,
      })
      putQuiz(withSavedAttempt(quizRef.current, session.key, { attemptId: attempt.data?.id ?? null, error: attempt.error ?? SUBMIT_FAILED }))
    } finally {
      retryingRef.current = false
    }
  }, [putQuiz])

  /** "Descartar prueba": la saca del panel sin red (una que se está corrigiendo no se descarta). */
  const discardOpenQuiz = useCallback(() => {
    putQuiz(discardQuiz(quizRef.current))
  }, [putQuiz])

  // "Detener" es del chat: la tarjeta se corta con su ✕.
  const stop = useCallback(() => {
    slot.abort('chat')
  }, [slot])

  const acceptProposal = useCallback(
    (id) => {
      const proposal = stateRef.current.proposals.find((p) => p.id === id)
      if (!proposal || proposal.status !== 'pending') return
      const result = applyInFolder(context, proposal)
      if (result.ok) {
        setState((s) => setProposalStatus(s, id, 'applied', { sheetCreatedAt: result.sheetCreatedAt }))
      } else {
        const message = /** @type {{error: string}} */ (result).error
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
    quizSession,
    submitQuiz,
    discardOpenQuiz,
    retryQuizSave,
    summaryDoc,
    retrySummarySave,
    summaryPending: summaryRequesting || summaryDoc?.status === 'saving',
    // La tarjeta de un atajo está respondiendo: la prueba no se puede corregir mientras tanto.
    inlineBusy: Boolean(inline?.chat.busy),
  }
}
