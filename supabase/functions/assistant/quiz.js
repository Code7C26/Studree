// Pruebas tipo examen: esquemas de salida estructurada para Gemini y
// validación de lo que devuelve el modelo. Funciones puras.
//
// El JSON del modelo NO es confiable: se valida pregunta por pregunta y, si una
// está mal armada, se rechaza la prueba entera (falla cerrado). Lo único que se
// "arregla" es el largo: los textos se recortan y las preguntas de más se
// descartan. Los ids los pone el servidor (q1..qn), no el modelo.
//
// Gemini (responseSchema) no admite uniones de tipos, por eso la respuesta
// viene en tres campos (answer_index | answer_bool | answer_text) y acá se
// normaliza a un único `answer`.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TYPES = ['mcq', 'tf', 'open']
const MCQ_MIN = 3
const MCQ_MAX = 5

/** Largo máximo de cada texto de la prueba (`topic` ≤ 200 por `weak_topics.topic`). */
export const TEXT_MAX = {
  prompt: 1000,
  option: 300,
  explanation: 1500,
  topic: 200,
  answer: 2000,
  feedback: 1500,
}

/** Esquema de la prueba (formato `responseSchema` de generateContent). */
export const QUIZ_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: TYPES, description: 'mcq = opción múltiple, tf = verdadero/falso, open = desarrollo' },
          prompt: { type: 'STRING', description: 'Enunciado de la pregunta' },
          options: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Solo mcq: de 3 a 5 opciones' },
          answer_index: { type: 'INTEGER', description: 'Solo mcq: índice (desde 0) de la opción correcta' },
          answer_bool: { type: 'BOOLEAN', description: 'Solo tf: si la afirmación es verdadera' },
          answer_text: { type: 'STRING', description: 'Solo open: respuesta de referencia' },
          explanation: { type: 'STRING', description: 'Por qué la respuesta es esa' },
          topic: { type: 'STRING', description: 'Tema (heading) de la hoja de origen' },
          sheet_id: { type: 'STRING', description: 'id de la hoja de origen' },
        },
        required: ['type', 'prompt', 'explanation', 'topic'],
      },
    },
  },
  required: ['questions'],
}

/** Esquema de la corrección de las preguntas de desarrollo. */
export const GRADES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    grades: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          correct: { type: 'BOOLEAN' },
          feedback: { type: 'STRING', description: 'Devolución breve, con lo que faltó o sobró' },
        },
        required: ['id', 'correct', 'feedback'],
      },
    },
  },
  required: ['grades'],
}

/**
 * @typedef {Object} Question
 * @property {string} id
 * @property {'mcq'|'tf'|'open'} type
 * @property {string} prompt
 * @property {string[]} [options]
 * @property {number|boolean|string} answer
 * @property {string} explanation
 * @property {string} [sheetId]
 * @property {string} topic
 */

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
/** Texto no vacío recortado a `max`, o null si no es texto o está vacío. */
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const fail = (error) => ({ ok: false, error })

/** Normaliza una pregunta o devuelve el motivo del rechazo. */
function normalizeQuestion(raw, index, sheetIds) {
  const n = index + 1
  if (!isObject(raw)) return { error: `La pregunta ${n} no es un objeto.` }
  if (!TYPES.includes(raw.type)) return { error: `La pregunta ${n} tiene un tipo inválido.` }
  const prompt = text(raw.prompt, TEXT_MAX.prompt)
  const explanation = text(raw.explanation, TEXT_MAX.explanation)
  const topic = text(raw.topic, TEXT_MAX.topic)
  if (!prompt || !explanation || !topic) return { error: `A la pregunta ${n} le falta enunciado, explicación o tema.` }

  /** @type {Question} */
  const q = { id: `q${n}`, type: raw.type, prompt }
  if (raw.type === 'mcq') {
    const { options } = raw
    if (!Array.isArray(options) || options.length < MCQ_MIN || options.length > MCQ_MAX) {
      return { error: `La pregunta ${n} tiene que tener de ${MCQ_MIN} a ${MCQ_MAX} opciones.` }
    }
    const clean = options.map((o) => text(o, TEXT_MAX.option))
    if (clean.some((o) => o === null)) return { error: `La pregunta ${n} tiene una opción vacía.` }
    const i = raw.answer_index
    if (!Number.isInteger(i) || i < 0 || i >= clean.length) return { error: `La pregunta ${n} tiene la respuesta fuera de rango.` }
    q.options = clean
    q.answer = i
  } else if (raw.type === 'tf') {
    if (typeof raw.answer_bool !== 'boolean') return { error: `La pregunta ${n} no dice si es verdadera o falsa.` }
    q.answer = raw.answer_bool
  } else {
    const answer = text(raw.answer_text, TEXT_MAX.answer)
    if (!answer) return { error: `La pregunta ${n} no trae respuesta de referencia.` }
    q.answer = answer
  }
  q.explanation = explanation
  q.topic = topic
  const sheetOk = typeof raw.sheet_id === 'string' && UUID.test(raw.sheet_id) && (!sheetIds || sheetIds.has(raw.sheet_id))
  if (sheetOk) q.sheetId = raw.sheet_id
  return { question: q }
}

/**
 * Valida la prueba que devolvió el modelo.
 * @param {unknown} json
 * @param {{count: number, sheetIds?: Set<string>}} opts `sheetIds`: hojas que se le dieron al modelo (las demás se descartan).
 * @returns {{ok: true, questions: Question[]} | {ok: false, error: string}}
 */
export function validateQuiz(json, { count, sheetIds }) {
  if (!isObject(json) || !Array.isArray(json.questions)) return fail('La prueba no tiene preguntas.')
  const raw = json.questions.slice(0, Math.max(0, count))
  if (raw.length === 0) return fail('La prueba no tiene preguntas.')
  const questions = []
  for (let i = 0; i < raw.length; i++) {
    const { question, error } = normalizeQuestion(raw[i], i, sheetIds)
    if (error) return fail(error)
    questions.push(question)
  }
  return { ok: true, questions }
}

/**
 * Valida la corrección de las preguntas de desarrollo: tienen que estar todas.
 * Devuelve las notas en el orden de `openIds` e ignora ids que no se pidieron.
 * @param {unknown} json
 * @param {string[]} openIds
 * @returns {{ok: true, grades: Array<{id: string, correct: boolean, feedback: string}>} | {ok: false, error: string}}
 */
export function validateGrades(json, openIds) {
  if (!isObject(json) || !Array.isArray(json.grades)) return fail('La corrección no tiene notas.')
  const byId = new Map()
  for (const g of json.grades) {
    if (!isObject(g) || typeof g.id !== 'string' || byId.has(g.id)) continue
    byId.set(g.id, g)
  }
  const grades = []
  for (const id of openIds) {
    const g = byId.get(id)
    if (!g) return fail(`Falta la corrección de la pregunta ${id}.`)
    if (typeof g.correct !== 'boolean' || typeof g.feedback !== 'string') {
      return fail(`La corrección de la pregunta ${id} está mal armada.`)
    }
    grades.push({ id, correct: g.correct, feedback: g.feedback.trim().slice(0, TEXT_MAX.feedback) })
  }
  return { ok: true, grades }
}
