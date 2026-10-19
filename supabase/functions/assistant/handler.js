// Handler HTTP del asistente (el Brote). Toda la lógica de la Edge Function
// vive acá, con las dependencias inyectadas (`deps`) para poder testearla en
// Node sin red: `index.js` solo arma las dependencias reales.
//
// Orden (falla cerrado en cada paso): CORS → método → JWT (401) → config (503)
// → pedido (400) → plan → conteos de uso → decideAccess (403/429) → alcance
// (400) → stream SSE. Gemini NUNCA se llama si algo de lo anterior falla.
//
// Seguridad: la base se consulta con el JWT del usuario (RLS; nunca
// service_role). El contenido de las hojas va como DATOS (herramientas o
// bloques JSON marcados), nunca como instrucciones. El asistente nunca
// escribe: solo emite propuestas. Los errores del proveedor no se reenvían
// crudos: el cliente recibe un código y un mensaje propio.
//
// Uso: `recordUsage` se llama SOLO si la acción terminó bien (sin error de
// Gemini, sin salida inválida, sin agotar pasos) y nunca para `quiz_grade`
// (no tiene balde).

import { BUCKET_OF, LIMITS, MAX, QUIZ_DEFAULTS, GEMINI_TIMEOUT_MS } from './config.js'
import { planOf, requiredCounts, decideAccess } from './quota.js'
import { validateRequest } from './request.js'
import { buildMapMarkdown } from './careerMap.js'
import { TOOL_DECLARATIONS, createToolRunner } from './tools.js'
import { buildSystemPrompt, actionInstruction, formatDataBlock } from './prompt.js'
import { buildGeminiRequest, GeminiError } from './gemini.js'
import { runConversation } from './loop.js'
import { QUIZ_SCHEMA, GRADES_SCHEMA, validateQuiz, validateGrades } from './quiz.js'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const NAME_MAX = 120
/** Hojas de temas flojos que se leen como máximo para un repaso. */
const WEAK_SHEETS_MAX = 10
const QUIZ_ACTIONS = ['quiz', 'weak_review']
const WITH_HISTORY = ['chat', 'shortcut']

/** Mensajes de las respuestas JSON (antes del stream). */
const HTTP_MESSAGES = {
  method: 'Método no permitido.',
  auth: 'Tu sesión expiró. Volvé a entrar.',
  config: 'El asistente todavía no está configurado.',
  body: 'El pedido no es JSON válido o es demasiado grande.',
  not_found: 'No encontramos esa hoja o materia (puede estar en la papelera).',
  server: 'No se pudo hablar con el Brote. Probá de nuevo.',
}

/** Mensajes de los eventos `error` del stream. */
const STREAM_ERRORS = {
  upstream: 'El Brote no pudo responder ahora. Probá de nuevo en un rato.',
  blocked: 'El modelo no quiso responder eso. Probá decirlo de otra forma.',
  empty: 'El Brote no devolvió nada. Probá de nuevo.',
  aborted: 'Se cortó la respuesta (tardó demasiado o se cerró la conexión).',
  invalid_output: 'La respuesta del modelo vino mal armada. Probá de nuevo.',
  steps: 'El Brote dio demasiadas vueltas sin llegar a una respuesta. Probá con algo más concreto.',
  no_notes: 'No hay apuntes en este alcance para armar una prueba.',
  no_weak_topics: 'Todavía no tenés temas flojos para repasar: hacé una prueba primero.',
  server: 'No se pudo hablar con el Brote. Probá de nuevo.',
}

/**
 * @typedef {Object} Deps
 * @property {(jwt: string) => Promise<{id: string}|null>} getUser
 * @property {(userId: string) => Promise<{plan?: string}|null>} getPlanRow
 * @property {(requests: ReturnType<typeof requiredCounts>, userId: string) => Promise<Record<string, number>>} countUsage
 * @property {(u: {action: string, external: boolean}) => Promise<void>} recordUsage
 * @property {(jwt: string) => any} makeDb
 * @property {(args: {body: object, onText: (t: string) => void, signal: AbortSignal}) => Promise<{text: string, calls: object[], modelParts: object[], finishReason: string|null, truncated: boolean}>} callGemini
 * @property {() => Date} now
 * @property {{model?: string, hasApiKey?: boolean}} env
 * @property {(...args: any[]) => void} [logError]
 */

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  })
const errorResponse = (status, code, message) => json(status, { error: message, code, message })

function bearer(header) {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '')
  return m ? m[1] : null
}

const clipName = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
const day = (iso) => String(iso ?? '').slice(0, 10)

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/**
 * Resuelve el alcance contra el árbol vivo del usuario. null = no existe (o
 * está en la papelera). `allowedSubjectIds` nunca es null: premium → todas
 * las materias vivas; free → solo las del alcance.
 */
async function resolveScope({ db, scope, plan }) {
  const tree = await db.loadTree()
  const careerById = new Map(tree.careers.map((c) => [c.id, c]))
  const subjects = tree.subjects.filter((s) => careerById.has(s.career_id))
  const subjectById = new Map(subjects.map((s) => [s.id, s]))

  let scopeSubjectIds
  let scopeLabel
  let mapMd
  let sheet = null
  if (scope.type === 'sheet' || scope.type === 'subject') {
    if (scope.type === 'sheet') {
      sheet = await db.getSheet(scope.id)
      if (!sheet) return null
    }
    const subject = subjectById.get(sheet ? sheet.subject_id : scope.id)
    if (!subject) return null
    scopeSubjectIds = [subject.id]
    scopeLabel = sheet
      ? `la hoja del ${day(sheet.created_at)} de la materia ${clipName(subject.name)}`
      : `la materia ${clipName(subject.name)}`
    mapMd = buildMapMarkdown({ ...tree, onlySubjectId: subject.id })
  } else if (scope.type === 'career') {
    const career = careerById.get(scope.id)
    if (!career) return null
    scopeSubjectIds = subjects.filter((s) => s.career_id === career.id).map((s) => s.id)
    scopeLabel = `la carrera ${clipName(career.name)}`
    mapMd = buildMapMarkdown({ ...tree, careers: [career] })
  } else {
    scopeSubjectIds = subjects.map((s) => s.id)
    scopeLabel = 'todas tus materias'
    mapMd = buildMapMarkdown(tree)
  }
  const allowedSubjectIds = plan === 'premium' ? subjects.map((s) => s.id) : scopeSubjectIds
  return { scopeSubjectIds, allowedSubjectIds, scopeLabel, mapMd, sheet }
}

/**
 * Junta contenido de hojas del alcance para una prueba, con tope total y
 * repartido entre materias. Primero las hojas de los temas flojos.
 */
async function gatherSources({ db, ctx, weakTopics }) {
  const inScope = new Set(ctx.scopeSubjectIds)
  const out = []
  const seen = new Set()
  let used = 0
  const full = () => used >= MAX.quizSourceChars

  /** Agrega una hoja con, como mucho, `room` caracteres; devuelve cuántos usó. */
  const add = (sheet, room) => {
    if (!sheet || seen.has(sheet.id) || !inScope.has(sheet.subject_id)) return 0
    const max = Math.min(MAX.sheetChars, MAX.quizSourceChars - used, room)
    const content = String(sheet.content_md ?? '').slice(0, Math.max(0, max))
    if (!content.trim()) return 0
    seen.add(sheet.id)
    used += content.length
    out.push({ sheet_id: sheet.id, date: day(sheet.created_at), content_md: content })
    return content.length
  }

  if (ctx.sheet) {
    add(ctx.sheet, Infinity)
    return out
  }
  const weakSheetIds = [...new Set(weakTopics.map((w) => w.sheet_id).filter(Boolean))].slice(0, WEAK_SHEETS_MAX)
  for (const id of weakSheetIds) {
    if (full()) break
    add(await db.getSheet(id), Infinity)
  }
  const order = [...new Set([...weakTopics.map((w) => w.subject_id), ...ctx.scopeSubjectIds])]
    .filter((id) => inScope.has(id))
    .slice(0, MAX.quizSourceSubjects)
  const share = Math.ceil(MAX.quizSourceChars / Math.max(1, order.length))
  for (const subjectId of order) {
    if (full()) break
    let subjectUsed = 0
    // Las más recientes primero (vienen en orden cronológico).
    const rows = await db.listSheetsBySubject(subjectId)
    for (let i = rows.length - 1; i >= 0 && !full() && subjectUsed < share; i--) {
      subjectUsed += add(rows[i], share - subjectUsed)
    }
  }
  return out
}

/** Historial como turnos de Gemini; se descartan los turnos `model` iniciales. */
function historyContents(history) {
  const start = history.findIndex((t) => t.role === 'user')
  if (start === -1) return []
  return history.slice(start).map((t) => ({ role: t.role, parts: [{ text: t.text }] }))
}

function usageEvent({ plan, action, counts, external }) {
  const limits = LIMITS[plan] || LIMITS.free
  const bucket = BUCKET_OF[action]
  const lim = limits[bucket]
  const next = (key) => (Number.isFinite(counts[key]) ? counts[key] + 1 : null)
  const event = { type: 'usage', action, bucket, used: next(bucket), max: lim?.max ?? null, period: lim?.period ?? null }
  if (external && limits.external) {
    event.external = { used: next('external'), max: limits.external.max, period: limits.external.period }
  }
  return event
}

/** Respuesta SSE: cada evento es `data: <json>\n\n`. `run` recibe `emit` y una señal que se aborta si el cliente corta. */
function sseResponse(reqSignal, run, logError) {
  const encoder = new TextEncoder()
  const cancel = new AbortController()
  const signal = reqSignal ? AbortSignal.any([cancel.signal, reqSignal]) : cancel.signal
  let closed = false
  const stream = new ReadableStream({
    start(controller) {
      const emit = (event) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }
      run(emit, signal)
        .catch((error) => logError('[assistant] error no atrapado en el stream', error))
        .finally(() => {
          if (closed) return
          closed = true
          try {
            controller.close()
          } catch {
            // ya cerrado
          }
        })
    },
    cancel() {
      closed = true
      cancel.abort()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  })
}

/**
 * Ejecuta la acción y emite sus eventos. Devuelve true si terminó bien.
 * Los errores de Gemini se propagan (los atrapa `runAction`).
 */
async function perform({ request, ctx, db, callModel, emit, emitError, now, logError }) {
  const { action, mode, message, selection } = request
  const today = now.toISOString().slice(0, 10)
  const userTurn = (text) => ({ role: 'user', parts: [{ text }] })
  const join = (...parts) => parts.filter(Boolean).join('\n\n')

  if (action === 'quiz_grade') {
    const systemPrompt = buildSystemPrompt({
      action,
      mode,
      scopeLabel: 'corrección de una prueba',
      mapMd: 'No hace falta para esta acción.',
      today,
      hasSelection: false,
    })
    const text = join(actionInstruction(action, { scopeLabel: '' }), formatDataBlock('Respuestas', request.answers))
    const res = await callModel(buildGeminiRequest({ systemPrompt, contents: [userTurn(text)], json: { schema: GRADES_SCHEMA } }), null)
    const checked = validateGrades(parseJson(res.text), request.answers.map((a) => a.id))
    if (!checked.ok) {
      logError('[assistant] corrección inválida del modelo', checked.error)
      emitError('invalid_output')
      return false
    }
    emit({ type: 'grades', grades: checked.grades })
    return true
  }

  if (QUIZ_ACTIONS.includes(action)) {
    const quiz = request.quiz ?? QUIZ_DEFAULTS
    let weakTopics = []
    if (action === 'weak_review') {
      const narrow = request.scope.type === 'sheet' || request.scope.type === 'subject'
      const rows = await db.listWeakTopics(narrow ? ctx.scopeSubjectIds[0] : undefined)
      const inScope = new Set(ctx.scopeSubjectIds)
      weakTopics = rows.filter((w) => inScope.has(w.subject_id))
      if (!weakTopics.length) {
        emitError('no_weak_topics')
        return false
      }
    }
    const sources = await gatherSources({ db, ctx, weakTopics })
    if (!sources.length) {
      emitError('no_notes')
      return false
    }
    const systemPrompt = buildSystemPrompt({ action, mode, scopeLabel: ctx.scopeLabel, mapMd: ctx.mapMd, today, hasSelection: false, weakTopics })
    const text = join(
      actionInstruction(action, { scopeLabel: ctx.scopeLabel, quiz }),
      message.trim() && `Pedido del usuario: ${message.trim()}`,
      formatDataBlock('Hojas', sources),
    )
    const res = await callModel(buildGeminiRequest({ systemPrompt, contents: [userTurn(text)], json: { schema: QUIZ_SCHEMA } }), null)
    const checked = validateQuiz(parseJson(res.text), { count: quiz.count, sheetIds: new Set(sources.map((s) => s.sheet_id)) })
    if (!checked.ok) {
      logError('[assistant] prueba inválida del modelo', checked.error)
      emitError('invalid_output')
      return false
    }
    emit({ type: 'quiz', questions: checked.questions })
    return true
  }

  // Acciones conversacionales: chat, shortcut, summary, study_plan, gaps, connections.
  const systemPrompt = buildSystemPrompt({ action, mode, scopeLabel: ctx.scopeLabel, mapMd: ctx.mapMd, today, hasSelection: !!selection })
  const instruction = actionInstruction(action, { scopeLabel: ctx.scopeLabel })
  const text = join(
    instruction,
    message.trim() && (instruction ? `Pedido del usuario: ${message.trim()}` : message),
    selection && formatDataBlock('Texto seleccionado', selection.text),
  )
  const history = WITH_HISTORY.includes(action) ? historyContents(request.history) : []
  const runner = createToolRunner({ db, mode, allowedSubjectIds: ctx.allowedSubjectIds, selection, now, logError })
  let failed = false
  await runConversation({
    callModel: (contents) =>
      callModel(buildGeminiRequest({ systemPrompt, contents, tools: TOOL_DECLARATIONS }), (delta) => emit({ type: 'text', delta })),
    runTool: runner.run,
    contents: [...history, userTurn(text)],
    emit: (event) => {
      if (event.type === 'error') {
        failed = true
        emitError(event.code)
        return
      }
      emit(event)
    },
  })
  return !failed
}

/**
 * @param {Request} req
 * @param {Deps} deps
 * @returns {Promise<Response>}
 */
export async function handleRequest(req, deps) {
  const logError = deps.logError ?? ((...args) => console.error(...args))

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return errorResponse(405, 'method', HTTP_MESSAGES.method)

  const jwt = bearer(req.headers.get('authorization'))
  if (!jwt) return errorResponse(401, 'auth', HTTP_MESSAGES.auth)
  let user = null
  try {
    user = await deps.getUser(jwt)
  } catch (error) {
    logError('[assistant] no se pudo verificar el JWT', error)
  }
  if (!user?.id) return errorResponse(401, 'auth', HTTP_MESSAGES.auth)

  if (!deps.env?.model || !deps.env?.hasApiKey) {
    logError('[assistant] falta configurar GEMINI_MODEL o GEMINI_API_KEY')
    return errorResponse(503, 'config', HTTP_MESSAGES.config)
  }

  if (Number(req.headers.get('content-length')) > MAX.bodyChars) return errorResponse(400, 'invalid', HTTP_MESSAGES.body)
  let body
  try {
    const raw = await req.text()
    if (raw.length > MAX.bodyChars) return errorResponse(400, 'invalid', HTTP_MESSAGES.body)
    body = JSON.parse(raw)
  } catch {
    return errorResponse(400, 'invalid', HTTP_MESSAGES.body)
  }
  const parsed = validateRequest(body)
  if (!parsed.ok) return errorResponse(400, 'invalid', parsed.error)
  const request = parsed.value
  const { action, scope } = request
  const external = request.mode === 'external'
  const now = deps.now()

  let plan
  try {
    plan = planOf(await deps.getPlanRow(user.id))
  } catch (error) {
    logError('[assistant] no se pudo leer el plan', error)
    return errorResponse(500, 'server', HTTP_MESSAGES.server)
  }

  // Ruling F: el mismo `external` para requiredCounts y decideAccess, y solo
  // los conteos pedidos (uno faltante → decideAccess deniega).
  const countRequests = requiredCounts({ plan, action, external, now })
  const counts = {}
  if (countRequests.length) {
    try {
      const got = (await deps.countUsage(countRequests, user.id)) ?? {}
      for (const r of countRequests) if (Number.isFinite(got[r.key])) counts[r.key] = got[r.key]
    } catch (error) {
      logError('[assistant] no se pudo contar el uso', error)
    }
  }
  const decision = decideAccess({ plan, action, scope, counts, external })
  if (!decision.allowed) {
    return errorResponse(decision.code === 'feature' ? 403 : 429, decision.code, decision.message)
  }

  const db = deps.makeDb(jwt)
  let ctx = null
  if (action !== 'quiz_grade') {
    try {
      ctx = await resolveScope({ db, scope, plan })
    } catch (error) {
      logError('[assistant] no se pudo leer el árbol', error)
      return errorResponse(500, 'server', HTTP_MESSAGES.server)
    }
    if (!ctx) return errorResponse(400, 'not_found', HTTP_MESSAGES.not_found)
  }

  return sseResponse(
    req.signal,
    async (emit, signal) => {
      const emitError = (code) => emit({ type: 'error', code, message: STREAM_ERRORS[code] ?? STREAM_ERRORS.server })
      const meta = { truncated: false, finishReason: null }
      // Cada llamada se corta por tiempo o si el cliente se desconecta.
      const callModel = async (body, onText) => {
        const res = await deps.callGemini({
          body,
          onText: onText ?? (() => {}),
          signal: AbortSignal.any([signal, AbortSignal.timeout(GEMINI_TIMEOUT_MS)]),
        })
        if (res.truncated) meta.truncated = true
        meta.finishReason = res.finishReason ?? null
        return res
      }

      let ok
      try {
        ok = await perform({ request, ctx, db, callModel, emit, emitError, now, logError })
      } catch (error) {
        if (error instanceof GeminiError && STREAM_ERRORS[error.kind]) {
          emitError(error.kind)
        } else {
          logError('[assistant] falló la acción', action, error)
          emitError('server')
        }
        return
      }
      if (!ok) return

      if (BUCKET_OF[action]) {
        try {
          await deps.recordUsage({ action, external })
          emit(usageEvent({ plan, action, counts, external }))
        } catch (error) {
          logError('[assistant] no se pudo registrar el uso', error)
        }
      }
      const done = { type: 'done' }
      if (meta.truncated) done.truncated = true
      if (meta.finishReason && meta.finishReason !== 'STOP') done.finishReason = meta.finishReason
      emit(done)
    },
    logError,
  )
}
