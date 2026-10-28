import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSubjectStates, describeBlockReason } from './subjectStatus.js'

const subject = (id, name, status = 'pendiente') => ({ id, name, status })
const prerequisite = (subjectId, requiresId, kind = 'cursar') => ({ subject_id: subjectId, requires_id: requiresId, kind })

test('describeBlockReason nombra lo que falta aprobar, en cada idioma', () => {
  const subjects = [subject('a', 'Álgebra'), subject('b', 'Análisis II'), subject('c', 'Física')]
  const states = computeSubjectStates(subjects, [prerequisite('c', 'a'), prerequisite('c', 'b')])
  const state = states.get('c')
  assert.equal(describeBlockReason(state, 'es'), 'Bloqueada — falta aprobar: Álgebra, Análisis II')
  assert.equal(describeBlockReason(state, 'en'), 'Blocked — still to pass: Álgebra, Análisis II')
  assert.equal(describeBlockReason(states.get('a'), 'en'), null)
})

test('una correlativa aprobada no bloquea y las de rendir tampoco', () => {
  const subjects = [subject('a', 'A', 'aprobada'), subject('b', 'B'), subject('c', 'C')]
  const states = computeSubjectStates(subjects, [prerequisite('c', 'a'), prerequisite('c', 'b', 'rendir')])
  assert.equal(states.get('c').blocked, false)
})
