import test from 'node:test'
import assert from 'node:assert/strict'
import { handleRequest } from './handler.js'
import { GeminiError } from './gemini.js'
import { LIMITS } from './config.js'

const C1 = 'c1111111-1111-4111-8111-111111111111'
const S1 = 'a1111111-1111-4111-8111-111111111111'
const S2 = 'a2222222-2222-4222-8222-222222222222'
const H1 = 'b1111111-1111-4111-8111-111111111111'
const H_TRASH = 'b9999999-9999-4999-8999-999999999999'

const SHEET = { id: H1, subject_id: S1, created_at: '2026-10-01T10:00:00Z', content_md: '# Matrices\nUna matriz es un arreglo.' }
const TREE = {
  careers: [{ id: C1, name: 'Ingeniería' }],
  subjects: [
    { id: S1, career_id: C1, name: 'Álgebra' },
    { id: S2, career_id: C1, name: 'Análisis' },
  ],
  sheets: [{ id: H1, subject_id: S1, created_at: SHEET.created_at }],
}

const textReply = (text = 'Hola') => ({ text, calls: [], modelParts: [{ text }], finishReason: 'STOP', truncated: false })

/** Dependencias falsas; `gemini` es una lista de respuestas (o errores) en orden. */
function makeDeps({ plan = 'free', counts, tree = TREE, gemini = [textReply()], weak = [], extraSheets = [], env, ...over } = {}) {
  const calls = { gemini: [], record: [], count: [], getSheet: [], weak: [], logs: [] }
  const queue = [...gemini]
  const db = {
    loadTree: async () => structuredClone(tree),
    getSheet: async (id) => {
      calls.getSheet.push(id)
      return id === H1 ? { ...SHEET } : null
    },
    listSheetsBySubject: async (id) => [{ ...SHEET }, ...extraSheets].filter((s) => s.subject_id === id),
    searchSheets: async () => [],
    listAgenda: async () => ({ dates: [], tasks: [] }),
    listWeakTopics: async (subjectId) => {
      calls.weak.push(subjectId)
      return weak
    },
  }
  const deps = {
    getUser: async (jwt) => (jwt === 'tok' ? { id: 'u1' } : null),
    getPlanRow: async () => ({ plan }),
    countUsage: async (requests, userId) => {
      calls.count.push({ requests, userId })
      return counts ?? Object.fromEntries(requests.map((r) => [r.key, 0]))
    },
    recordUsage: async (x) => {
      calls.record.push(x)
    },
    makeDb: () => db,
    callGemini: async (args) => {
      calls.gemini.push(args)
      const next = queue.length > 1 ? queue.shift() : queue[0]
      if (next instanceof Error) throw next
      if (next.text && !args.body.generationConfig) args.onText(next.text)
      return structuredClone(next)
    },
    now: () => new Date('2026-10-19T12:00:00Z'),
    env: env ?? { model: 'gemini-test', hasApiKey: true },
    logError: (...a) => calls.logs.push(a),
    ...over,
  }
  return { deps, calls, db }
}

const post = (body, { token = 'tok', signal } = {}) =>
  new Request('http://localhost/functions/v1/assistant', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal,
  })

async function events(res) {
  const raw = await res.text()
  assert.ok(raw.endsWith('\n\n'), 'el stream termina en un evento completo')
  return raw
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      assert.ok(block.startsWith('data: '), `bloque SSE inválido: ${block}`)
      return JSON.parse(block.slice(6))
    })
}

const chat = (over = {}) => ({ action: 'chat', message: '¿Qué es una matriz?', scope: { type: 'subject', id: S1 }, ...over })
const systemOf = (args) => args.body.systemInstruction.parts[0].text
const lastUserText = (args) => args.body.contents.at(-1).parts.map((p) => p.text ?? '').join('')

test('OPTIONS → 204 con CORS para los headers del navegador', async () => {
  const { deps } = makeDeps()
  const res = await handleRequest(new Request('http://localhost/x', { method: 'OPTIONS' }), deps)
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const allowed = res.headers.get('access-control-allow-headers')
  for (const h of ['authorization', 'apikey', 'content-type', 'x-client-info']) assert.match(allowed, new RegExp(h))
  assert.match(res.headers.get('access-control-allow-methods'), /POST/)
})

test('método distinto de POST → 405', async () => {
  const { deps, calls } = makeDeps()
  const res = await handleRequest(new Request('http://localhost/x', { method: 'GET' }), deps)
  assert.equal(res.status, 405)
  assert.equal(calls.gemini.length, 0)
})

test('sin Authorization → 401 y Gemini no se llama', async () => {
  const { deps, calls } = makeDeps()
  const res = await handleRequest(post(chat(), { token: null }), deps)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const body = await res.json()
  assert.equal(body.code, 'auth')
  assert.equal(typeof body.message, 'string')
  assert.equal(calls.gemini.length, 0)
  assert.equal(calls.count.length, 0)
})

test('JWT inválido → 401', async () => {
  const { deps, calls } = makeDeps()
  const res = await handleRequest(post(chat(), { token: 'otro' }), deps)
  assert.equal(res.status, 401)
  assert.equal(calls.gemini.length, 0)
})

test('getUser que lanza → 401 y se registra el error', async () => {
  const { deps, calls } = makeDeps({
    getUser: async () => {
      throw new Error('red')
    },
  })
  const res = await handleRequest(post(chat()), deps)
  assert.equal(res.status, 401)
  assert.equal(calls.logs.length, 1)
})

test('JSON roto o pedido inválido → 400 con code invalid', async () => {
  const { deps, calls } = makeDeps()
  for (const body of ['{no', { action: 'volar', scope: { type: 'all' } }, chat({ message: '' })]) {
    const res = await handleRequest(post(body), deps)
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.code, 'invalid')
    assert.equal(typeof json.error, 'string')
  }
  assert.equal(calls.gemini.length, 0)
})

test('función sin GEMINI_MODEL o sin clave → 503 y Gemini no se llama', async () => {
  for (const env of [{ model: '', hasApiKey: true }, { model: 'm', hasApiKey: false }]) {
    const { deps, calls } = makeDeps({ env })
    const res = await handleRequest(post(chat()), deps)
    assert.equal(res.status, 503)
    assert.equal((await res.json()).code, 'config')
    assert.equal(calls.gemini.length, 0)
  }
})

test('free con counts.chat en el tope → 429 quota; ni Gemini ni recordUsage', async () => {
  const { deps, calls } = makeDeps({ counts: { chat: LIMITS.free.chat.max } })
  const res = await handleRequest(post(chat()), deps)
  assert.equal(res.status, 429)
  const body = await res.json()
  assert.equal(body.code, 'quota')
  assert.equal(typeof body.message, 'string')
  assert.equal(typeof body.error, 'string')
  assert.equal(calls.gemini.length, 0)
  assert.equal(calls.record.length, 0)
  assert.equal(calls.count[0].userId, 'u1')
  assert.deepEqual(calls.count[0].requests.map((r) => r.key), ['chat'])
})

test('conteo faltante o countUsage que lanza → 429 (falla cerrado)', async () => {
  const { deps, calls } = makeDeps({ counts: {} })
  assert.equal((await handleRequest(post(chat()), deps)).status, 429)
  const failing = makeDeps({
    countUsage: async () => {
      throw new Error('db caída')
    },
  })
  assert.equal((await handleRequest(post(chat()), failing.deps)).status, 429)
  assert.equal(failing.calls.logs.length, 1)
  assert.equal(calls.gemini.length + failing.calls.gemini.length, 0)
})

test('external pasa el mismo external a requiredCounts y decideAccess: tope externo → 429', async () => {
  const { deps, calls } = makeDeps({ counts: { chat: 0, external: LIMITS.free.external.max } })
  const res = await handleRequest(post(chat({ mode: 'external' })), deps)
  assert.equal(res.status, 429)
  assert.deepEqual(calls.count[0].requests.map((r) => r.key), ['chat', 'external'])
  assert.equal(calls.gemini.length, 0)
})

test('free pidiendo scope all → 403 feature', async () => {
  const { deps, calls } = makeDeps()
  const res = await handleRequest(post(chat({ scope: { type: 'all' } })), deps)
  assert.equal(res.status, 403)
  assert.equal((await res.json()).code, 'feature')
  assert.equal(calls.gemini.length, 0)
})

test('getPlanRow que lanza → 500 server (no se adivina el plan)', async () => {
  const { deps, calls } = makeDeps({
    getPlanRow: async () => {
      throw new Error('x')
    },
  })
  const res = await handleRequest(post(chat()), deps)
  assert.equal(res.status, 500)
  assert.equal((await res.json()).code, 'server')
  assert.equal(calls.gemini.length, 0)
})

test('éxito de chat: text, usage y done al final; recordUsage una vez', async () => {
  const { deps, calls } = makeDeps({ counts: { chat: 3 } })
  const res = await handleRequest(post(chat()), deps)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/event-stream/)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  const evs = await events(res)
  assert.deepEqual(evs.filter((e) => e.type === 'text'), [{ type: 'text', delta: 'Hola' }])
  const usage = evs.find((e) => e.type === 'usage')
  assert.deepEqual(usage, { type: 'usage', action: 'chat', bucket: 'chat', used: 4, max: LIMITS.free.chat.max, period: 'day' })
  assert.deepEqual(evs.at(-1), { type: 'done' })
  assert.deepEqual(calls.record, [{ action: 'chat', external: false }])
  const [args] = calls.gemini
  assert.ok(args.body.tools?.length, 'el chat lleva herramientas')
  assert.ok(args.signal instanceof AbortSignal)
  assert.match(lastUserText(args), /Qué es una matriz/)
  assert.match(systemOf(args), /Álgebra/)
})

test('modo external → recordUsage con external:true y uso externo en el evento', async () => {
  const { deps, calls } = makeDeps()
  const evs = await events(await handleRequest(post(chat({ mode: 'external' })), deps))
  assert.deepEqual(calls.record, [{ action: 'chat', external: true }])
  const usage = evs.find((e) => e.type === 'usage')
  assert.deepEqual(usage.external, { used: 1, max: LIMITS.free.external.max, period: 'day' })
  assert.match(systemOf(calls.gemini[0]), /conocimiento externo/i)
})

test('GeminiError upstream → evento error, stream válido, sin uso ni done, sin filtrar el mensaje crudo', async () => {
  const { deps, calls } = makeDeps({ gemini: [new GeminiError('upstream', 500, 'SECRETO del proveedor')] })
  const res = await handleRequest(post(chat()), deps)
  assert.equal(res.status, 200)
  const evs = await events(res)
  const err = evs.find((e) => e.type === 'error')
  assert.equal(err.code, 'upstream')
  assert.equal(typeof err.message, 'string')
  assert.ok(!JSON.stringify(evs).includes('SECRETO'))
  assert.ok(!evs.some((e) => e.type === 'done' || e.type === 'usage'))
  assert.equal(calls.record.length, 0)
})

test('error inesperado dentro del stream → error server, se registra y no se descuenta', async () => {
  const { deps, calls } = makeDeps({ gemini: [new TypeError('bug interno')] })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.equal(evs.at(-1).type, 'error')
  assert.equal(evs.at(-1).code, 'server')
  assert.ok(!JSON.stringify(evs).includes('bug interno'))
  assert.equal(calls.record.length, 0)
  assert.equal(calls.logs.length, 1)
})

test('desconexión del cliente: la señal a Gemini se aborta; aborted → error sin uso', async () => {
  const ctrl = new AbortController()
  let seen
  const { deps, calls } = makeDeps({
    callGemini: async (args) => {
      seen = args.signal
      ctrl.abort()
      throw new GeminiError('aborted')
    },
  })
  const evs = await events(await handleRequest(post(chat(), { signal: ctrl.signal }), deps))
  assert.equal(seen.aborted, true)
  assert.deepEqual(evs.map((e) => [e.type, e.code]), [['error', 'aborted']])
  assert.equal(calls.record.length, 0)
})

test('respuesta truncada o cortada por seguridad: termina en done con el aviso', async () => {
  const { deps } = makeDeps({ gemini: [{ ...textReply('parcial'), truncated: true, finishReason: 'SAFETY' }] })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.deepEqual(evs.at(-1), { type: 'done', truncated: true, finishReason: 'SAFETY' })
})

test('el texto de cada paso con herramientas llega como eventos text', async () => {
  const { deps } = makeDeps({
    gemini: [
      { text: 'Busco… ', calls: [{ name: 'read_sheet', args: { sheet_id: H1 } }], modelParts: [], finishReason: 'STOP', truncated: false },
      textReply('Listo.'),
    ],
  })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.deepEqual(
    evs.filter((e) => e.type === 'text').map((e) => e.delta),
    ['Busco… ', 'Listo.'],
  )
  assert.ok(evs.some((e) => e.type === 'tool' && e.name === 'read_sheet'))
})

test('cuenta sin apuntes: el prompt dice "Todavía no hay apuntes." y responde igual', async () => {
  const { deps, calls } = makeDeps({ plan: 'premium', tree: { careers: [], subjects: [], sheets: [] } })
  const evs = await events(await handleRequest(post(chat({ scope: { type: 'all' } })), deps))
  assert.ok(systemOf(calls.gemini[0]).includes('Todavía no hay apuntes.'))
  assert.equal(evs.at(-1).type, 'done')
})

test('free con scope sheet: resuelve la materia de la hoja y solo esa queda permitida', async () => {
  const { deps, calls } = makeDeps({
    gemini: [
      {
        text: '',
        calls: [
          { name: 'list_subject_topics', args: { subject_id: S1 } },
          { name: 'list_subject_topics', args: { subject_id: S2 } },
        ],
        modelParts: [],
        finishReason: 'STOP',
        truncated: false,
      },
      textReply('fin'),
    ],
  })
  await events(await handleRequest(post(chat({ scope: { type: 'sheet', id: H1 } })), deps))
  assert.ok(calls.getSheet.includes(H1))
  const responses = calls.gemini[1].body.contents.at(-1).parts.map((p) => p.functionResponse.response)
  assert.ok(Array.isArray(responses[0].sheets), 'la materia de la hoja está permitida')
  assert.equal(responses[1].error, 'fuera del alcance')
})

test('premium con scope subject: todas las materias vivas quedan permitidas', async () => {
  const { deps, calls } = makeDeps({
    plan: 'premium',
    gemini: [
      { text: '', calls: [{ name: 'list_subject_topics', args: { subject_id: S2 } }], modelParts: [], finishReason: 'STOP', truncated: false },
      textReply('fin'),
    ],
  })
  await events(await handleRequest(post(chat()), deps))
  const [resp] = calls.gemini[1].body.contents.at(-1).parts.map((p) => p.functionResponse.response)
  assert.deepEqual(resp, { sheets: [] })
})

test('scope con hoja inexistente o en la papelera / materia ajena → 400 not_found, sin Gemini', async () => {
  for (const scope of [
    { type: 'sheet', id: H_TRASH },
    { type: 'subject', id: 'a9999999-9999-4999-8999-999999999999' },
  ]) {
    const { deps, calls } = makeDeps()
    const res = await handleRequest(post(chat({ scope })), deps)
    assert.equal(res.status, 400)
    assert.equal((await res.json()).code, 'not_found')
    assert.equal(calls.gemini.length, 0)
  }
})

test('quiz con JSON inválido del modelo → evento error, sin uso descontado', async () => {
  for (const text of ['{no es json', JSON.stringify({ questions: [{ type: 'tf', prompt: 'x', answer_bool: 'sí', explanation: 'e', topic: 't' }] })]) {
    const { deps, calls } = makeDeps({ gemini: [textReply(text)] })
    const evs = await events(await handleRequest(post({ action: 'quiz', scope: { type: 'subject', id: S1 } }), deps))
    assert.equal(evs.at(-1).type, 'error')
    assert.equal(evs.at(-1).code, 'invalid_output')
    assert.ok(!evs.some((e) => e.type === 'quiz' || e.type === 'text'))
    assert.equal(calls.record.length, 0)
  }
})

test('quiz válido: JSON estructurado sin herramientas, con las hojas como datos; evento quiz y uso', async () => {
  const out = { questions: [{ type: 'tf', prompt: '¿Una matriz es un arreglo?', answer_bool: true, explanation: 'Sí.', topic: 'Matrices', sheet_id: H1 }] }
  const { deps, calls } = makeDeps({ gemini: [textReply(JSON.stringify(out))] })
  const evs = await events(
    await handleRequest(post({ action: 'quiz', scope: { type: 'subject', id: S1 }, quiz: { count: 3, types: ['tf'] } }), deps),
  )
  const [args] = calls.gemini
  assert.equal(args.body.tools, undefined)
  assert.equal(args.body.generationConfig.responseMimeType, 'application/json')
  assert.ok(args.body.generationConfig.responseSchema)
  assert.match(lastUserText(args), /Una matriz es un arreglo/)
  assert.match(lastUserText(args), /3/)
  const quiz = evs.find((e) => e.type === 'quiz')
  assert.deepEqual(quiz.questions[0], {
    id: 'q1',
    type: 'tf',
    prompt: '¿Una matriz es un arreglo?',
    answer: true,
    explanation: 'Sí.',
    topic: 'Matrices',
    sheetId: H1,
  })
  assert.ok(!evs.some((e) => e.type === 'text'), 'el JSON crudo no se manda como texto')
  assert.deepEqual(calls.record, [{ action: 'quiz', external: false }])
  assert.equal(evs.at(-1).type, 'done')
})

test('quiz sin apuntes en el alcance → error no_notes sin llamar a Gemini', async () => {
  const { deps, calls } = makeDeps()
  const evs = await events(await handleRequest(post({ action: 'quiz', scope: { type: 'subject', id: S2 } }), deps))
  assert.equal(evs.at(-1).code, 'no_notes')
  assert.equal(calls.gemini.length, 0)
  assert.equal(calls.record.length, 0)
})

test('weak_review (premium): lee los temas flojos y los pasa al prompt', async () => {
  const weak = [{ subject_id: S1, sheet_id: H1, topic: 'Determinantes', misses: 2 }]
  const out = { questions: [{ type: 'tf', prompt: 'p', answer_bool: true, explanation: 'e', topic: 'Determinantes' }] }
  const { deps, calls } = makeDeps({ plan: 'premium', weak, gemini: [textReply(JSON.stringify(out))] })
  const evs = await events(await handleRequest(post({ action: 'weak_review', scope: { type: 'subject', id: S1 } }), deps))
  assert.deepEqual(calls.weak, [[S1]])
  assert.match(systemOf(calls.gemini[0]), /Determinantes/)
  assert.ok(evs.some((e) => e.type === 'quiz'))
  assert.deepEqual(calls.record, [{ action: 'weak_review', external: false }])
})

test('weak_review con alcance sheet: usa las hojas de la materia que tienen esos temas, no solo la elegida', async () => {
  const H2 = 'b2222222-2222-4222-8222-222222222222'
  const H3 = 'b3333333-3333-4333-8333-333333333333'
  const extraSheets = [
    { id: H2, subject_id: S1, created_at: '2026-10-05T10:00:00Z', content_md: '# Determinantes\nRegla de Sarrus.' },
    { id: H3, subject_id: S1, created_at: '2026-10-06T10:00:00Z', content_md: '# Vectores\nNada que ver.' },
  ]
  const weak = [{ subject_id: S1, sheet_id: null, topic: 'Determinantes', misses: 1 }]
  const out = { questions: [{ type: 'tf', prompt: 'p', answer_bool: true, explanation: 'e', topic: 'Determinantes', sheet_id: H2 }] }
  const { deps, calls } = makeDeps({ plan: 'premium', weak, extraSheets, gemini: [textReply(JSON.stringify(out))] })
  const evs = await events(await handleRequest(post({ action: 'weak_review', scope: { type: 'sheet', id: H1 } }), deps))
  const user = lastUserText(calls.gemini[0])
  assert.match(user, /Regla de Sarrus/)
  assert.ok(user.indexOf('Regla de Sarrus') < (user.indexOf('Nada que ver') === -1 ? Infinity : user.indexOf('Nada que ver')), 'primero las hojas con el tema')
  assert.equal(evs.find((e) => e.type === 'quiz').questions[0].sheetId, H2)
})

test('weak_review con alcance all: pide los temas de las materias del alcance (filtra en la base)', async () => {
  const weak = [{ subject_id: S2, sheet_id: null, topic: 'Límites', misses: 4 }]
  const extraSheets = [{ id: 'b4444444-4444-4444-8444-444444444444', subject_id: S2, created_at: '2026-10-07T10:00:00Z', content_md: '# Límites\nx' }]
  const out = { questions: [{ type: 'tf', prompt: 'p', answer_bool: true, explanation: 'e', topic: 'Límites' }] }
  const { deps, calls } = makeDeps({ plan: 'premium', weak, extraSheets, gemini: [textReply(JSON.stringify(out))] })
  await events(await handleRequest(post({ action: 'weak_review', scope: { type: 'all' } }), deps))
  assert.deepEqual(calls.weak, [[S1, S2]])
})

test('weak_review sin temas flojos → error no_weak_topics sin Gemini', async () => {
  const { deps, calls } = makeDeps({ plan: 'premium' })
  const evs = await events(await handleRequest(post({ action: 'weak_review', scope: { type: 'all' } }), deps))
  assert.equal(evs.at(-1).code, 'no_weak_topics')
  assert.equal(calls.gemini.length, 0)
})

test('weak_review de un free → 403 feature', async () => {
  const { deps } = makeDeps()
  const res = await handleRequest(post({ action: 'weak_review', scope: { type: 'subject', id: S1 } }), deps)
  assert.equal(res.status, 403)
})

const gradeBody = {
  action: 'quiz_grade',
  scope: { type: 'subject', id: S1 },
  answers: [{ id: 'q2', question: 'Definí matriz', expected: 'Arreglo', given: 'Un arreglo de números' }],
}

test('quiz_grade: evento grades y descuenta de su balde grade', async () => {
  const out = { grades: [{ id: 'q2', correct: true, feedback: 'Bien.' }] }
  const { deps, calls } = makeDeps({ counts: { grade: 2 }, gemini: [textReply(JSON.stringify(out))] })
  const evs = await events(await handleRequest(post(gradeBody), deps))
  assert.deepEqual(evs.find((e) => e.type === 'grades').grades, out.grades)
  assert.deepEqual(calls.count[0].requests.map((r) => r.key), ['grade'])
  assert.deepEqual(calls.record, [{ action: 'quiz_grade', external: false }])
  assert.deepEqual(evs.find((e) => e.type === 'usage'), {
    type: 'usage',
    action: 'quiz_grade',
    bucket: 'grade',
    used: 3,
    max: LIMITS.free.grade.max,
    period: 'day',
  })
  assert.equal(evs.at(-1).type, 'done')
  assert.equal(calls.gemini[0].body.generationConfig.responseMimeType, 'application/json')
})

test('quiz_grade con el tope diario agotado → 429 sin Gemini', async () => {
  const { deps, calls } = makeDeps({ counts: { grade: LIMITS.free.grade.max } })
  const res = await handleRequest(post(gradeBody), deps)
  assert.equal(res.status, 429)
  assert.equal((await res.json()).code, 'quota')
  assert.equal(calls.gemini.length, 0)
  assert.equal(calls.record.length, 0)
})

test('Ruling K: termina en steps después de emitir texto → descuenta uso una vez', async () => {
  const looping = { text: 'Sigo buscando… ', calls: [{ name: 'read_sheet', args: { sheet_id: H1 } }], modelParts: [], finishReason: 'STOP', truncated: false }
  const { deps, calls } = makeDeps({ gemini: [looping] })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.ok(evs.some((e) => e.type === 'error' && e.code === 'steps'))
  assert.ok(evs.some((e) => e.type === 'text'))
  assert.deepEqual(calls.record, [{ action: 'chat', external: false }])
  assert.ok(evs.some((e) => e.type === 'usage'))
  assert.ok(!evs.some((e) => e.type === 'done'))
})

test('Ruling K: steps sin ningún evento útil → no descuenta', async () => {
  const silentLoop = { text: '', calls: [{ name: 'read_sheet', args: { sheet_id: H1 } }], modelParts: [], finishReason: 'STOP', truncated: false }
  const { deps, calls } = makeDeps({ gemini: [silentLoop] })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.equal(evs.at(-1).code, 'steps')
  assert.equal(calls.record.length, 0)
})

test('Ruling K: error de Gemini después de emitir texto → no descuenta', async () => {
  const first = { text: 'Empiezo… ', calls: [{ name: 'read_sheet', args: { sheet_id: H1 } }], modelParts: [], finishReason: 'STOP', truncated: false }
  const { deps, calls } = makeDeps({ gemini: [first, new GeminiError('upstream', 503)] })
  const evs = await events(await handleRequest(post(chat()), deps))
  assert.equal(evs.at(-1).code, 'upstream')
  assert.equal(calls.record.length, 0)
})

test('los errores de Gemini se loguean con kind y status, sin el mensaje crudo', async () => {
  const { deps, calls } = makeDeps({ gemini: [new GeminiError('blocked', 400, 'SECRETO del proveedor')] })
  await events(await handleRequest(post(chat()), deps))
  assert.equal(calls.logs.length, 1)
  const logged = JSON.stringify(calls.logs[0])
  assert.match(logged, /blocked/)
  assert.match(logged, /400/)
  assert.ok(!logged.includes('SECRETO'))
})

test('quiz_grade al que le falta una nota → error invalid_output', async () => {
  const { deps } = makeDeps({ gemini: [textReply(JSON.stringify({ grades: [] }))] })
  const body = { action: 'quiz_grade', scope: { type: 'subject', id: S1 }, answers: [{ id: 'q1', question: 'a', expected: 'b', given: 'c' }] }
  const evs = await events(await handleRequest(post(body), deps))
  assert.equal(evs.at(-1).code, 'invalid_output')
})

test('summary: usa herramientas y descuenta del balde summary', async () => {
  const { deps, calls } = makeDeps()
  const evs = await events(await handleRequest(post({ action: 'summary', scope: { type: 'subject', id: S1 } }), deps))
  assert.ok(calls.gemini[0].body.tools?.length)
  assert.match(lastUserText(calls.gemini[0]), /resum/i)
  assert.deepEqual(calls.record, [{ action: 'summary', external: false }])
  assert.equal(evs.find((e) => e.type === 'usage').bucket, 'summary')
})

test('el historial se reenvía como turnos user/model, sin turnos model iniciales', async () => {
  const { deps, calls } = makeDeps()
  const history = [
    { role: 'model', text: '¡Hola! Soy el Brote.' },
    { role: 'user', text: 'Hola' },
    { role: 'model', text: '¿En qué te ayudo?' },
  ]
  await events(await handleRequest(post(chat({ history })), deps))
  const roles = calls.gemini[0].body.contents.map((c) => c.role)
  assert.deepEqual(roles, ['user', 'model', 'user'])
})

test('connections de un free → 403 feature (aun en su materia), sin conteos ni Gemini', async () => {
  for (const scope of [{ type: 'career', id: C1 }, { type: 'subject', id: S1 }]) {
    const { deps, calls } = makeDeps()
    const res = await handleRequest(post({ action: 'connections', scope }), deps)
    assert.equal(res.status, 403)
    const body = await res.json()
    assert.equal(body.code, 'feature')
    assert.match(body.message, /Premium/)
    assert.equal(calls.gemini.length, 0)
  }
})

test('connections premium con alcance carrera: herramientas, pedido de conexiones y uso sin tope', async () => {
  const { deps, calls } = makeDeps({ plan: 'premium' })
  const evs = await events(await handleRequest(post({ action: 'connections', scope: { type: 'career', id: C1 } }), deps))
  assert.ok(calls.gemini[0].body.tools?.length)
  assert.match(lastUserText(calls.gemini[0]), /search_notes/)
  assert.match(systemOf(calls.gemini[0]), /Análisis/)
  assert.deepEqual(calls.record, [{ action: 'connections', external: false }])
  assert.equal(evs.find((e) => e.type === 'usage').bucket, 'extras')
  assert.equal(evs.at(-1).type, 'done')
})

test('gaps de un free en su materia: descuenta del balde extras', async () => {
  const { deps, calls } = makeDeps({ counts: { extras: 1 } })
  const evs = await events(await handleRequest(post({ action: 'gaps', scope: { type: 'subject', id: S1 } }), deps))
  assert.deepEqual(calls.count[0].requests.map((r) => r.key), ['extras'])
  assert.deepEqual(calls.count[0].requests[0].actions.sort(), ['connections', 'gaps', 'study_plan'])
  assert.ok(calls.gemini[0].body.tools?.length, 'gaps usa las herramientas de siempre')
  assert.match(lastUserText(calls.gemini[0]), /nunca se desarrollan/i)
  assert.deepEqual(calls.record, [{ action: 'gaps', external: false }])
  assert.deepEqual(evs.find((e) => e.type === 'usage'), {
    type: 'usage',
    action: 'gaps',
    bucket: 'extras',
    used: 2,
    max: LIMITS.free.extras.max,
    period: 'month',
  })
  assert.equal(evs.at(-1).type, 'done')
})

test('gaps de un free con el tope extras agotado → 429 sin Gemini', async () => {
  const { deps, calls } = makeDeps({ counts: { extras: LIMITS.free.extras.max } })
  const res = await handleRequest(post({ action: 'gaps', scope: { type: 'subject', id: S1 } }), deps)
  assert.equal(res.status, 429)
  assert.equal((await res.json()).code, 'quota')
  assert.equal(calls.gemini.length, 0)
  assert.equal(calls.record.length, 0)
})
