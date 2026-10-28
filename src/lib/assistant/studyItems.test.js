import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterBySubject, filterLiveStudyItems, subjectOptions } from './studyItems.js'
import { studyPath, studySummaryPath, studyQuizPath } from '../../constants/routes.js'
import { formatSheetDay } from '../format/sheetDate.js'

test('filterLiveStudyItems', () => {
  assert.deepEqual(filterLiveStudyItems([
    { id: 1, subject_id: 's', subject: { deleted_at: null }, career_id: 'c', career: { deleted_at: null } },
    { id: 2, subject_id: 's', subject: { deleted_at: '2026-01-01' }, career_id: null, career: null },
    { id: 3, subject_id: null, subject: null, career_id: 'c', career: { deleted_at: '2026-01-01' } },
    { id: 4, subject_id: 's', subject: null, career_id: null, career: null },
    { id: 5, subject_id: null, subject: null, career_id: null, career: null },
  ]).map((r) => r.id), [1, 5])
})

test('subjectOptions y filterBySubject', () => {
  const rows = [
    { id: 1, subject_id: 'b', subject: { id: 'b', name: 'Zoología' } },
    { id: 2, subject_id: 'a', subject: { id: 'a', name: 'Álgebra' } },
    { id: 3, subject_id: 'b', subject: { id: 'b', name: 'Zoología' } },
    { id: 4, subject_id: null, subject: null },
  ]
  assert.deepEqual(subjectOptions(rows), [{ id: 'a', name: 'Álgebra' }, { id: 'b', name: 'Zoología' }])
  assert.deepEqual(filterBySubject(rows, 'b').map((r) => r.id), [1, 3])
  assert.equal(filterBySubject(rows, null).length, 4)
})

test('rutas de Mi estudio', () => {
  assert.equal(studyPath({ tab: 'examenes', subjectId: 'abc' }), '/estudio?tab=examenes&materia=abc')
  assert.equal(studyPath({}), '/estudio')
  assert.equal(studyPath(), '/estudio')
  assert.equal(studyPath({ subjectId: 'abc' }), '/estudio?materia=abc')
  assert.equal(studySummaryPath('x'), '/estudio/resumenes/x')
  assert.equal(studyQuizPath('y'), '/estudio/examenes/y')
})

test('formatSheetDay', () => {
  assert.equal(formatSheetDay('2026-10-17T12:00:00'), '17/10')
  assert.equal(formatSheetDay('2026-01-05T12:00:00'), '05/01')
})

test('filterOptions junta resúmenes y exámenes y suma la materia de la URL', async () => {
  const { filterOptions } = await import('./studyItems.js')
  const s = [{ subject_id: 'a', subject: { id: 'a', name: 'Álgebra' } }]
  const q = [{ subject_id: 'b', subject: { id: 'b', name: 'Biología' } }]
  assert.deepEqual(filterOptions(s, q, null).map((o) => o.id), ['a', 'b'])
  assert.deepEqual(filterOptions(s, q, 'b').map((o) => o.id), ['a', 'b'])
  assert.deepEqual(filterOptions([], [], 'z'), [{ id: 'z', name: 'Esta materia' }])
})

test('itemTitle: respeta el título y, si falta, usa un respaldo según el alcance', async () => {
  const { itemTitle } = await import('./studyItems.js')
  assert.equal(itemTitle({ title: 'Examen · Bio', scope_type: 'subject' }), 'Examen · Bio')
  assert.equal(itemTitle({ title: null, scope_type: 'subject' }), 'Examen anterior · una materia')
  assert.equal(itemTitle({ title: '  ', scope_type: 'sheet' }), 'Examen anterior · una hoja')
  assert.equal(itemTitle({ title: null, scope_type: 'career' }), 'Examen anterior · toda la carrera')
  assert.equal(itemTitle({ title: null, scope_type: 'all' }), 'Examen anterior · todas mis materias')
  assert.equal(itemTitle({ title: null }), 'Examen anterior')
})

import { itemTitle } from './studyItems.js'

test('itemTitle de un examen anterior sin título, en cada idioma', () => {
  assert.equal(itemTitle({ title: 'Mi examen' }, 'en'), 'Mi examen')
  assert.equal(itemTitle({ scope_type: 'career' }, 'es'), 'Examen anterior · toda la carrera')
  assert.equal(itemTitle({ scope_type: 'career' }, 'en'), 'Previous exam · the whole career')
  assert.equal(itemTitle({}, 'en'), 'Previous exam')
})
