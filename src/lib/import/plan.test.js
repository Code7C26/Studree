import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildImportPlan, markDuplicates, summarizePlan, describeSummary, IMPORT_FALLBACK_NAME } from './plan.js'

const now = new Date('2026-10-20T12:00:00Z')
const md = (path, text = '# Hola', lastModified = null) => ({ path, text, lastModified })
const plan = (mdEntries, extra = {}) =>
  buildImportPlan({ mdEntries, filePaths: [], target: { mode: 'careers' }, existingCareers: [], now, ...extra })

test('export de "todo": Studree/Carrera/Materia', () => {
  const { groups } = plan([md('Studree/Bio/Genética/2026-10-14 18-30.md')])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].careerName, 'Bio')
  assert.equal(groups[0].subjectName, 'Genética')
})

test('export de una carrera: Carrera/Materia', () => {
  const { groups } = plan([md('Bio/Genética/a.md'), md('Bio/Física/b.md')])
  assert.deepEqual(groups.map((g) => `${g.careerName}/${g.subjectName}`).sort(), ['Bio/Física', 'Bio/Genética'])
})

test('export de una materia: la carrera sale del frontmatter', () => {
  const { groups } = plan([md('Genética/a.md', '---\ncarrera: "Bio"\nmateria: "Genética"\n---\n# x')])
  assert.equal(groups[0].careerName, 'Bio')
  assert.equal(groups[0].subjectName, 'Genética')
  assert.equal(groups[0].sheets[0].content_md, '# x')
})

test('un .md suelto va a Importado/Importado', () => {
  const { groups } = plan([md('clase.md')])
  assert.equal(groups[0].careerName, IMPORT_FALLBACK_NAME)
  assert.equal(groups[0].subjectName, IMPORT_FALLBACK_NAME)
})

test('reusa carrera y materia existentes sin distinguir mayúsculas ni espacios', () => {
  const existingCareers = [{ id: 'c1', name: 'Bio', subjects: [{ id: 's1', name: 'Genética' }] }]
  const { groups } = plan([md('bio/ genética /a.md'), md('Bio/Nueva/b.md')], { existingCareers })
  const genetica = groups.find((g) => g.subjectName.trim().toLowerCase() === 'genética')
  assert.equal(genetica.careerId, 'c1')
  assert.equal(genetica.subjectId, 's1')
  const nueva = groups.find((g) => g.subjectName === 'Nueva')
  assert.equal(nueva.careerId, 'c1')
  assert.equal(nueva.subjectId, null)
})

test('modo materia: todo va a la materia elegida', () => {
  const { groups } = buildImportPlan({
    mdEntries: [md('a/b/c.md'), md('d.md')],
    filePaths: [],
    target: { mode: 'subject', subjectId: 's9', subjectName: 'Química' },
    existingCareers: [],
    now,
  })
  assert.equal(groups.length, 1)
  assert.equal(groups[0].subjectId, 's9')
  assert.equal(groups[0].sheets.length, 2)
})

test('vacíos, ocultos y archivos sin referencia van a skipped', () => {
  const result = buildImportPlan({
    mdEntries: [md('Bio/G/vacia.md', '---\nmateria: "G"\n---\n  \n'), md('.obsidian/x.md'), md('__MACOSX/Bio/._a.md')],
    filePaths: ['Bio/G/suelto.pdf', '.DS_Store'],
    target: { mode: 'careers' },
    existingCareers: [],
    now,
  })
  assert.equal(result.groups.length, 0)
  assert.deepEqual(result.skipped.map((s) => s.path).sort(), ['Bio/G/suelto.pdf', 'Bio/G/vacia.md'])
})

test('las imágenes referenciadas no van a skipped y quedan en media', () => {
  const result = buildImportPlan({
    mdEntries: [md('Bio/G/a.md', '![f](adjuntos/f.png)')],
    filePaths: ['Bio/G/adjuntos/f.png'],
    target: { mode: 'careers' },
    existingCareers: [],
    now,
  })
  assert.equal(result.skipped.length, 0)
  assert.equal(result.groups[0].sheets[0].media[0].zipPath, 'Bio/G/adjuntos/f.png')
})

test('markDuplicates: misma fecha (al minuto) y mismo contenido, en la base o repetido en el zip', () => {
  const base = buildImportPlan({
    mdEntries: [
      md('Bio/G/2026-10-14 18-30.md', '# Igual'),
      md('Bio/G/2026-10-14 18-30 (2).md', '# Igual'),
      md('Bio/G/2026-10-15 09-00.md', '# Otra'),
    ],
    filePaths: [],
    target: { mode: 'careers' },
    existingCareers: [{ id: 'c1', name: 'Bio', subjects: [{ id: 's1', name: 'G' }] }],
    now,
  })
  const existing = new Map([['s1', [{ created_at: new Date(2026, 9, 15, 9, 0, 30).toISOString(), content_md: '# Otra\n' }]]])
  const marked = markDuplicates(base, existing)
  assert.deepEqual(marked.groups[0].sheets.map((s) => s.duplicate), [false, true, true])
})

test('summarizePlan y describeSummary', () => {
  const p = buildImportPlan({
    mdEntries: [md('Bio/G/a.md', '![f](f.png)'), md('Bio/H/b.md')],
    filePaths: ['Bio/G/f.png'],
    target: { mode: 'careers' },
    existingCareers: [],
    now,
  })
  const summary = summarizePlan(p)
  assert.deepEqual(summary, { newCareers: 1, newSubjects: 2, sheets: 2, duplicates: 0, media: 1, skipped: 0 })
  assert.equal(describeSummary(summary), 'Se van a crear 1 carrera, 2 materias, 2 hojas y 1 adjunto.')
  assert.equal(
    describeSummary({ newCareers: 0, newSubjects: 0, sheets: 3, duplicates: 2, media: 0, skipped: 0 }),
    'Se van a crear 3 hojas. 2 hojas ya existen y se saltean.',
  )
})
