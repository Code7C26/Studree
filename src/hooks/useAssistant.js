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
  saveAttempt, listWeakTopics, applyWeakTopicUpdates, resolveQuizSources,
} from '../services/quizResults.service.js'
import { gradeClosed, summarize, openAnswers, mergeResults } from '../lib/assistant/quizScore.js'
import { planWeakTopicUpdates, attachSubjects } from '../lib/assistant/weakTopics.js'
import { createQuizSession, startSubmit, finishSubmit } from '../lib/assistant/quizSession.js'
import {
  initialChat, reduceEvent, addUserMessage, setProposalStatus, finishRequest, setError, setNotice,
} from '../lib/assistant/chatState.js'
import {
  ACTION_LABELS, MAX_MESSAGE, buildHistory, buildScope, lockedActionMessage, resolveScopeType, scopeOptions,
} from '../lib/assistant/requestBuilder.js'

const NO_SCOPE = 'Abrí una materia para preguntarle al Brote (o pasate a Premium para preguntar sobre todas).'
const NO_CONTEXT = 'Abrí la carpeta de la materia para aplicar el cambio.'
const BUSY = 'El Brote todavía está respondiendo: probá cuando termine.'
const GRADE_LABEL = 'Corregí mis respuestas de desarrollo'
const GRADE_FAILED = 'No se pudieron corregir las respuestas de desarrollo.'
const QUIZ_ACTIONS = ['quiz', 'weak_review']

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
 *   quizSession: QuizSession|null,
 *   submitQuiz: (given: Record<string, number|boolean|string>) => Promise<QuizOutcome|null>,
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
  const [quizSession, setQuizSession] = useState(/** @type {QuizSession|null} */ (null))
  /** Copia sincrónica de la sesión: el guard de "una sola vez" no puede esperar al render. */
  const quizRef = useRef(/** @type {QuizSession|null} */ (null))
  const putQuiz = useCallback((/** @type {QuizSession|null} */ next) => {
    quizRef.current = next
    setQuizSession(next)
  }, [])
  /** Alcance del pedido de prueba en curso (se asocia al evento `quiz`). */
  const pendingQuizRef = useRef(/** @type {Pick<QuizSession, 'scope'|'scopeSubjectId'|'isReview'>|null} */ (null))

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
     * @param {{type: ScopeType, id?: string}|null} [scopeOverride]  Alcance fijo (la corrección usa el de la prueba).
     * @returns {Promise<{error: string|null, grades: Array<Object>|null}>}
     */
    async (fields, visibleText, selection = null, scopeOverride = null) => {
      if (controllerRef.current) {
        setState((s) => setNotice(s, BUSY))
        return { error: BUSY, grades: null }
      }
      const scopeValue = scopeOverride ?? buildScope(scope, context)
      if (!scopeValue) {
        setState((s) => setNotice(s, NO_SCOPE))
        return { error: NO_SCOPE, grades: null }
      }
      if (QUIZ_ACTIONS.includes(fields.action)) {
        let scopeSubjectId = null
        if (scopeValue.type === 'subject') scopeSubjectId = scopeValue.id ?? null
        else if (scopeValue.type === 'sheet') scopeSubjectId = context?.subject?.id ?? null
        pendingQuizRef.current = { scope: scopeValue, scopeSubjectId, isReview: fields.action === 'weak_review' }
      } else if (fields.action !== 'quiz_grade') {
        pendingQuizRef.current = null
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
      /** @type {Array<Object>|null} */
      let grades = null
      /** @type {string|null} */
      let streamError = null
      const { error } = await streamAssistant({
        request,
        signal: controller.signal,
        onEvent: (event) => {
          if (event?.type === 'grades' && Array.isArray(event.grades)) grades = event.grades
          if (event?.type === 'error') streamError = typeof event.message === 'string' && event.message ? event.message : GRADE_FAILED
          const meta = pendingQuizRef.current
          if (event?.type === 'quiz' && Array.isArray(event.questions) && meta) {
            putQuiz(createQuizSession(quizRef.current, meta, event.questions))
          }
          setState((s) => reduceEvent(s, tagProposal(event, selection)))
        },
      })
      if (controllerRef.current === controller) controllerRef.current = null
      if (controller.signal.aborted) {
        setState((s) => finishRequest(s))
        return { error: 'Cortaste la respuesta.', grades: null }
      }
      setState((s) => finishRequest(s, error))
      return { error: error ?? streamError, grades }
    },
    [scope, context, mode, putQuiz],
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

  /**
   * Guarda el intento y los temas flojos de una prueba ya corregida. Solo
   * escribe temas de preguntas cuya materia se resolvió a una viva del alcance
   * (`attachSubjects`); el resto se saltea.
   * @param {QuizSession} session
   * @param {import('../lib/assistant/quizScore.js').QuizResult[]} results
   * @param {{total: number, correct: number}} score
   * @returns {Promise<Pick<QuizOutcome, 'sheets'|'saveError'|'savedTopics'>>}
   */
  const saveQuizOutcome = useCallback(async (session, results, score) => {
    const sources = await resolveQuizSources({
      sheetIds: session.questions.map((q) => q.sheetId).filter(Boolean),
      subjectIds: session.scopeSubjectId ? [session.scopeSubjectId] : [],
    })
    const sheets = sources.data?.sheets ?? {}
    if (score.total === 0) return { sheets, saveError: null, savedTopics: false }
    const attempt = await saveAttempt({ scope: session.scope, ...score })
    if (sources.error) return { sheets, saveError: attempt.error ?? sources.error, savedTopics: false }

    const where = attachSubjects(session.questions, {
      scope: session.scope, scopeSubjectId: session.scopeSubjectId, sheets, subjects: sources.data.subjects,
    })
    const byId = new Map(session.questions.map((q) => [q.id, q]))
    const topicResults = results
      .filter((r) => typeof r.correct === 'boolean' && where[r.id])
      .map((r) => ({ ...where[r.id], topic: byId.get(r.id)?.topic ?? '', correct: /** @type {boolean} */ (r.correct) }))
    if (topicResults.length === 0) return { sheets, saveError: attempt.error, savedTopics: false }

    const existing = await listWeakTopics([...new Set(topicResults.map((r) => r.subject_id))])
    if (existing.error) return { sheets, saveError: attempt.error ?? existing.error, savedTopics: false }
    const plan = planWeakTopicUpdates({ existing: existing.data, results: topicResults, isReview: session.isReview })
    if (plan.upserts.length === 0 && plan.deletes.length === 0) return { sheets, saveError: attempt.error, savedTopics: false }
    const applied = await applyWeakTopicUpdates(plan)
    return { sheets, saveError: attempt.error ?? applied.error, savedTopics: !applied.error }
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
      const session = startSubmit(quizRef.current, given)
      if (!session) return null
      putQuiz(session)
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
      const score = summarize(results)
      const saved = await saveQuizOutcome(session, results, score)
      /** @type {QuizOutcome} */
      const outcome = { results, score, gradeError, ...saved }
      putQuiz(finishSubmit(quizRef.current, session.key, outcome))
      return outcome
    },
    [start, saveQuizOutcome, putQuiz],
  )

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
    quizSession,
    submitQuiz,
  }
}
