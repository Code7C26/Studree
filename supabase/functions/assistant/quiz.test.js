import test from 'node:test'
import assert from 'node:assert/strict'
import { QUIZ_SCHEMA, GRADES_SCHEMA, TEXT_MAX, validateQuiz, validateGrades } from './quiz.js'

const H1 = '11111111-1111-4111-8111-111111111111'
const H2 = '22222222-2222-4222-8222-222222222222'

const mcq = (over = {}) => ({
  type: 'mcq',
  prompt: '¿Cuánto es 2+2?',
  options: ['3', '4', '5'],
  answer_index: 1,
  explanation: 'Suma básica.',
  topic: 'Sumas',
  sheet_id: H1,
  ...over,
})
const tf = (over = {}) => ({ type: 'tf', prompt: 'La Tierra es plana.', answer_bool: false, explanation: 'No.', topic: 'Geo', ...over })
const open = (over = {}) => ({
  type: 'open',
  prompt: 'Definí matriz.',
  answer_text: 'Un arreglo rectangular de números.',
  explanation: 'Definición.',
  topic: 'Matrices',
  ...over,
})

test('esquemas en el formato de generateContent (tipos en MAYÚSCULAS)', () => {
  assert.equal(QUIZ_SCHEMA.type, 'OBJECT')
  assert.equal(QUIZ_SCHEMA.properties.questions.type, 'ARRAY')
  assert.equal(QUIZ_SCHEMA.properties.questions.items.properties.answer_index.type, 'INTEGER')
  assert.equal(QUIZ_SCHEMA.properties.questions.items.properties.answer_bool.type, 'BOOLEAN')
  assert.equal(GRADES_SCHEMA.properties.grades.items.properties.correct.type, 'BOOLEAN')
})

test('el esquema obliga a mandar los campos de respuesta (Gemini omite los opcionales)', () => {
  const { required } = QUIZ_SCHEMA.properties.questions.items
  for (const field of ['options', 'answer_index', 'answer_bool', 'answer_text']) {
    assert.ok(required.includes(field), `${field} tiene que ser obligatorio`)
  }
})

test('los campos de relleno de otros tipos no rompen la pregunta', () => {
  const r = validateQuiz(
    { questions: [tf({ options: [], answer_index: 0, answer_text: '' }), open({ options: [], answer_index: 0, answer_bool: false })] },
    { count: 5 },
  )
  assert.equal(r.ok, true)
  assert.deepEqual(r.questions.map((q) => q.answer), [tf().answer_bool, open().answer_text])
})

test('prueba válida: normaliza answer, asigna ids q1..qn y conserva la hoja', () => {
  const r = validateQuiz({ questions: [mcq(), tf(), open()] }, { count: 5 })
  assert.equal(r.ok, true)
  assert.deepEqual(
    r.questions.map((q) => [q.id, q.type, q.answer]),
    [
      ['q1', 'mcq', 1],
      ['q2', 'tf', false],
      ['q3', 'open', 'Un arreglo rectangular de números.'],
    ],
  )
  assert.deepEqual(r.questions[0].options, ['3', '4', '5'])
  assert.equal(r.questions[0].sheetId, H1)
  assert.equal(r.questions[1].options, undefined)
  assert.equal(r.questions[1].sheetId, undefined)
})

test('mcq con 2 opciones → error', () => {
  const r = validateQuiz({ questions: [mcq({ options: ['a', 'b'], answer_index: 0 })] }, { count: 5 })
  assert.equal(r.ok, false)
  assert.equal(typeof r.error, 'string')
})

test('mcq con 6 opciones → error', () => {
  const r = validateQuiz({ questions: [mcq({ options: ['a', 'b', 'c', 'd', 'e', 'f'] })] }, { count: 5 })
  assert.equal(r.ok, false)
})

test('mcq con answer fuera de rango, negativo o no entero → error', () => {
  for (const answer_index of [3, -1, 1.5, '1', undefined]) {
    const r = validateQuiz({ questions: [mcq({ answer_index })] }, { count: 5 })
    assert.equal(r.ok, false, `answer_index ${answer_index}`)
  }
})

test('mcq con una opción vacía → error', () => {
  assert.equal(validateQuiz({ questions: [mcq({ options: ['a', ' ', 'c'] })] }, { count: 5 }).ok, false)
})

test('tf con answer no booleano → error', () => {
  for (const answer_bool of ['true', 1, null, undefined]) {
    assert.equal(validateQuiz({ questions: [tf({ answer_bool })] }, { count: 5 }).ok, false)
  }
})

test('abierta sin respuesta de referencia → error', () => {
  assert.equal(validateQuiz({ questions: [open({ answer_text: undefined })] }, { count: 5 }).ok, false)
  assert.equal(validateQuiz({ questions: [open({ answer_text: '   ' })] }, { count: 5 }).ok, false)
})

test('tipo desconocido, sin enunciado o sin explicación → error', () => {
  for (const q of [mcq({ type: 'essay' }), mcq({ prompt: '' }), open({ explanation: 7 })]) {
    assert.equal(validateQuiz({ questions: [q] }, { count: 5 }).ok, false)
  }
})

test('sin tema (hojas sin títulos #) → tema "General", no se rechaza la prueba', () => {
  const r = validateQuiz({ questions: [tf({ topic: '' }), mcq({ topic: ' ' }), open({ topic: undefined })] }, { count: 5 })
  assert.equal(r.ok, true)
  assert.deepEqual(r.questions.map((q) => q.topic), ['General', 'General', 'General'])
})

test('estructura inválida o sin preguntas → error', () => {
  for (const json of [null, 'x', [], {}, { questions: 'x' }, { questions: [] }, { questions: [null] }]) {
    assert.equal(validateQuiz(json, { count: 5 }).ok, false)
  }
})

test('más de count preguntas → se recorta a count', () => {
  const r = validateQuiz({ questions: [mcq(), tf(), open(), tf(), mcq()] }, { count: 2 })
  assert.equal(r.ok, true)
  assert.deepEqual(r.questions.map((q) => q.type), ['mcq', 'tf'])
})

test('los textos largos se recortan', () => {
  const long = 'x'.repeat(20_000)
  const r = validateQuiz(
    { questions: [mcq({ prompt: long, options: [long, 'b', 'c'], explanation: long, topic: long }), open({ answer_text: long })] },
    { count: 5 },
  )
  assert.equal(r.ok, true)
  const [q, o] = r.questions
  assert.equal(q.prompt.length, TEXT_MAX.prompt)
  assert.equal(q.options[0].length, TEXT_MAX.option)
  assert.equal(q.explanation.length, TEXT_MAX.explanation)
  assert.equal(q.topic.length, TEXT_MAX.topic)
  assert.ok(TEXT_MAX.topic <= 200, 'weak_topics.topic admite hasta 200')
  assert.equal(o.answer.length, TEXT_MAX.answer)
})

test('sheetId: se descarta si no es de las hojas dadas o no es un uuid', () => {
  const r = validateQuiz(
    { questions: [mcq({ sheet_id: H2 }), tf({ sheet_id: 'inventado' }), open({ sheet_id: H1 })] },
    { count: 5, sheetIds: new Set([H1]) },
  )
  assert.equal(r.ok, true)
  assert.deepEqual(r.questions.map((q) => q.sheetId), [undefined, undefined, H1])
})

test('validateGrades: válido, en el orden de openIds, ignora ids de más', () => {
  const r = validateGrades(
    {
      grades: [
        { id: 'q3', correct: false, feedback: 'Falta la definición.' },
        { id: 'qX', correct: true, feedback: 'no pedida' },
        { id: 'q1', correct: true, feedback: 'Bien.' },
      ],
    },
    ['q1', 'q3'],
  )
  assert.equal(r.ok, true)
  assert.deepEqual(r.grades, [
    { id: 'q1', correct: true, feedback: 'Bien.' },
    { id: 'q3', correct: false, feedback: 'Falta la definición.' },
  ])
})

test('validateGrades: falla si falta una abierta', () => {
  const r = validateGrades({ grades: [{ id: 'q1', correct: true, feedback: 'ok' }] }, ['q1', 'q2'])
  assert.equal(r.ok, false)
  assert.equal(typeof r.error, 'string')
})

test('validateGrades: correct no booleano, feedback no texto o estructura rota → error', () => {
  assert.equal(validateGrades({ grades: [{ id: 'q1', correct: 'sí', feedback: 'ok' }] }, ['q1']).ok, false)
  assert.equal(validateGrades({ grades: [{ id: 'q1', correct: true, feedback: 3 }] }, ['q1']).ok, false)
  assert.equal(validateGrades(null, ['q1']).ok, false)
  assert.equal(validateGrades({ grades: 'x' }, ['q1']).ok, false)
})

test('validateGrades: recorta el feedback largo', () => {
  const r = validateGrades({ grades: [{ id: 'q1', correct: true, feedback: 'y'.repeat(20_000) }] }, ['q1'])
  assert.equal(r.ok, true)
  assert.equal(r.grades[0].feedback.length, TEXT_MAX.feedback)
})
