import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX } from './config.js'
import { buildMapMarkdown } from './careerMap.js'

const NOTA = '(mapa recortado: pedí una materia en particular)'
const when = new Date(2026, 9, 14, 18, 5) // hora local
const iso = when.toISOString()

const careers = [{ id: 'c1', name: 'Ingeniería', deleted_at: null }]
const subjects = [
  { id: 's1', career_id: 'c1', name: 'Análisis', deleted_at: null },
  { id: 's2', career_id: 'c1', name: 'Álgebra', deleted_at: null },
]
const sheets = [
  { id: 'h1', subject_id: 's1', created_at: iso, content_md: '# Límites\n## Derivadas', deleted_at: null },
  { id: 'h2', subject_id: 's2', created_at: iso, content_md: '# Matrices', deleted_at: null },
]

test('arma carrera, materia y hoja con fecha local y temas', () => {
  const md = buildMapMarkdown({ careers, subjects, sheets })
  assert.match(md, /Ingeniería/)
  assert.match(md, /Análisis/)
  assert.ok(md.includes('- hoja h1 · 14/10/26 18:05 · temas: Límites; Derivadas'))
  assert.ok(md.includes('- hoja h2 · 14/10/26 18:05 · temas: Matrices'))
})

test('ignora carrera, materia y hoja con deleted_at', () => {
  const del = '2026-10-15T00:00:00Z'
  const md = buildMapMarkdown({
    careers: [...careers, { id: 'c2', name: 'Borrada', deleted_at: del }],
    subjects: [
      ...subjects,
      { id: 's3', career_id: 'c1', name: 'MatBorrada', deleted_at: del },
      { id: 's4', career_id: 'c2', name: 'DeBorrada', deleted_at: null },
    ],
    sheets: [
      ...sheets,
      { id: 'h3', subject_id: 's1', created_at: iso, content_md: '# X', deleted_at: del },
      { id: 'h4', subject_id: 's3', created_at: iso, content_md: '# Y', deleted_at: null },
      { id: 'h5', subject_id: 's4', created_at: iso, content_md: '# Z', deleted_at: null },
    ],
  })
  for (const nope of ['Borrada', 'MatBorrada', 'DeBorrada', 'hoja h3', 'hoja h4', 'hoja h5']) {
    assert.ok(!md.includes(nope), nope)
  }
  assert.ok(md.includes('hoja h1'))
})

test('onlySubjectId deja solo esa materia (y su carrera)', () => {
  const md = buildMapMarkdown({ careers, subjects, sheets, onlySubjectId: 's2' })
  assert.ok(md.includes('Ingeniería'))
  assert.ok(md.includes('Álgebra'))
  assert.ok(!md.includes('Análisis'))
  assert.ok(md.includes('hoja h2'))
  assert.ok(!md.includes('hoja h1'))
})

test('sin filas → Todavía no hay apuntes.', () => {
  assert.equal(buildMapMarkdown({ careers: [], subjects: [], sheets: [] }), 'Todavía no hay apuntes.')
  assert.equal(buildMapMarkdown({ careers, subjects, sheets: [] }), 'Todavía no hay apuntes.')
  assert.equal(buildMapMarkdown({ careers, subjects, sheets, onlySubjectId: 'inexistente' }), 'Todavía no hay apuntes.')
})

test('hoja sin temas ni contenido no rompe', () => {
  const md = buildMapMarkdown({
    careers,
    subjects,
    sheets: [
      { id: 'h9', subject_id: 's1', created_at: iso, content_md: null, deleted_at: null },
      { id: 'h8', subject_id: 's1', created_at: iso, content_md: 'solo texto', deleted_at: null },
    ],
  })
  assert.ok(md.includes('- hoja h9 · 14/10/26 18:05 · temas: (sin temas)'))
  assert.ok(md.includes('hoja h8'))
})

test('hojas en orden cronológico dentro de la materia', () => {
  const a = new Date(2026, 0, 1, 9, 0).toISOString()
  const b = new Date(2026, 5, 1, 9, 0).toISOString()
  const md = buildMapMarkdown({
    careers,
    subjects,
    sheets: [
      { id: 'tarde', subject_id: 's1', created_at: b, content_md: '# T', deleted_at: null },
      { id: 'temprano', subject_id: 's1', created_at: a, content_md: '# T', deleted_at: null },
    ],
  })
  assert.ok(md.indexOf('hoja temprano') < md.indexOf('hoja tarde'))
})

test('con 2000 hojas recorta a ≤ mapChars + 120 y termina con la nota', () => {
  const many = Array.from({ length: 2000 }, (_, i) => ({
    id: `h${i}`,
    subject_id: 's1',
    created_at: iso,
    content_md: `# Tema ${i}\n## Sub ${i}`,
    deleted_at: null,
  }))
  const md = buildMapMarkdown({ careers, subjects, sheets: many })
  assert.ok(md.length <= MAX.mapChars + 120, String(md.length))
  assert.ok(md.endsWith(NOTA))
})

test('mapa que entra justo no se recorta', () => {
  const md = buildMapMarkdown({ careers, subjects, sheets })
  assert.ok(!md.includes(NOTA))
})
