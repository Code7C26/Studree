import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDb } from './supabaseDb.js'

// Cliente falso: registra cada consulta encadenada y la resuelve con `respond(q)`.
function fakeClient(respond) {
  const queries = []
  const client = {
    from(table) {
      const q = { table, calls: [] }
      queries.push(q)
      const builder = new Proxy(
        {},
        {
          get(_t, method) {
            if (method === 'then') {
              const res = respond(q) ?? { data: [], error: null }
              return (resolve) => resolve(res)
            }
            return (...args) => {
              q.calls.push([method, args])
              return builder
            }
          },
        },
      )
      return builder
    },
  }
  return { client, queries }
}

const has = (q, method, ...args) =>
  q.calls.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args))
const callsOf = (q, method) => q.calls.filter(([m]) => m === method)
const ID = '11111111-1111-4111-8111-111111111111'

test('loadTree: filtra la papelera en cada tabla, no trae content_md y pagina de a 1000', async () => {
  const { client, queries } = fakeClient((q) => {
    if (q.table === 'sheets') {
      const [from] = callsOf(q, 'range')[0][1]
      const n = from === 0 ? 1000 : 3
      return { data: Array.from({ length: n }, (_, i) => ({ id: `h${from + i}` })), error: null }
    }
    return { data: [{ id: 'x' }], error: null }
  })
  const tree = await createDb(client).loadTree()
  assert.equal(tree.sheets.length, 1003)
  assert.deepEqual([...new Set(queries.map((q) => q.table))].sort(), ['careers', 'sheets', 'subjects'])
  for (const q of queries) {
    assert.ok(has(q, 'is', 'deleted_at', null), `falta deleted_at en ${q.table}`)
    assert.ok(callsOf(q, 'range').length >= 1)
  }
  for (const q of queries.filter((x) => x.table === 'sheets')) {
    assert.ok(!callsOf(q, 'select')[0][1][0].includes('content_md'))
  }
  const ranges = queries.filter((q) => q.table === 'sheets').map((q) => callsOf(q, 'range')[0][1])
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]])
})

test('loadTree: página justo de 1000 pide una más y termina al venir vacía', async () => {
  const { client, queries } = fakeClient((q) => {
    if (q.table !== 'sheets') return { data: [], error: null }
    const [from] = callsOf(q, 'range')[0][1]
    return { data: from === 0 ? Array.from({ length: 1000 }, (_, i) => ({ id: `h${i}` })) : [], error: null }
  })
  const tree = await createDb(client).loadTree()
  assert.equal(tree.sheets.length, 1000)
  assert.equal(queries.filter((q) => q.table === 'sheets').length, 2)
})

test('loadTree: un error de la base se propaga', async () => {
  const { client } = fakeClient(() => ({ data: null, error: { message: 'boom' } }))
  await assert.rejects(() => createDb(client).loadTree())
})

test('getSheet: filtra papelera, trae content_md, devuelve null si no existe', async () => {
  const { client, queries } = fakeClient(() => ({ data: { id: ID, content_md: 'hola' }, error: null }))
  const sheet = await createDb(client).getSheet(ID)
  assert.equal(sheet.content_md, 'hola')
  assert.ok(has(queries[0], 'is', 'deleted_at', null))
  assert.ok(has(queries[0], 'eq', 'id', ID))
  assert.ok(callsOf(queries[0], 'select')[0][1][0].includes('content_md'))

  const empty = fakeClient(() => ({ data: null, error: null }))
  assert.equal(await createDb(empty.client).getSheet(ID), null)
})

test('listSheetsBySubject: filtra papelera, por materia, ordena y pagina', async () => {
  const { client, queries } = fakeClient(() => ({ data: [{ id: 'a' }], error: null }))
  const rows = await createDb(client).listSheetsBySubject(ID)
  assert.equal(rows.length, 1)
  const q = queries[0]
  assert.equal(q.table, 'sheets')
  assert.ok(has(q, 'is', 'deleted_at', null))
  assert.ok(has(q, 'eq', 'subject_id', ID))
  assert.ok(has(q, 'order', 'created_at', { ascending: true }))
  assert.ok(callsOf(q, 'range').length >= 1)
})

test('searchSheets: filtra papelera, neutraliza % y barra, tope de 8 y materia opcional', async () => {
  const { client, queries } = fakeClient(() => ({ data: [], error: null }))
  const db = createDb(client)
  const fat = fakeClient(() => ({ data: [{ id: 'a', subject_id: 's', content_md: 'c', subjects: { deleted_at: null } }], error: null }))
  assert.deepEqual(await createDb(fat.client).searchSheets('c'), [{ id: 'a', subject_id: 's', content_md: 'c' }])
  await db.searchSheets('50%_x\\y', ID)
  const q = queries[0]
  assert.ok(has(q, 'is', 'deleted_at', null))
  assert.ok(has(q, 'is', 'subjects.deleted_at', null))
  assert.ok(has(q, 'eq', 'subject_id', ID))
  const [col, pattern] = callsOf(q, 'ilike')[0][1]
  assert.equal(col, 'content_md')
  assert.equal(pattern, '%50__x_y%')
  assert.ok(has(q, 'limit', 8))

  await db.searchSheets('algo')
  assert.ok(!queries[1].calls.some(([m, a]) => m === 'eq' && a[0] === 'subject_id'))
})

test('searchSheets: consulta vacía no pega a la base', async () => {
  const { client, queries } = fakeClient(() => ({ data: [], error: null }))
  assert.deepEqual(await createDb(client).searchSheets('   '), [])
  assert.equal(queries.length, 0)
})

test('listAgenda: próximos 60 días y solo tareas sin hacer', async () => {
  const { client, queries } = fakeClient((q) => ({
    data: q.table === 'important_dates' ? [{ title: 'Parcial', date: '2026-10-25' }] : [{ text: 'TP', due_date: null }],
    error: null,
  }))
  const out = await createDb(client).listAgenda('2026-10-19')
  assert.deepEqual(out.dates, [{ title: 'Parcial', date: '2026-10-25' }])
  assert.deepEqual(out.tasks, [{ text: 'TP', due_date: null }])
  const dates = queries.find((q) => q.table === 'important_dates')
  assert.ok(has(dates, 'gte', 'date', '2026-10-19'))
  assert.ok(has(dates, 'lte', 'date', '2026-12-18'))
  const tasks = queries.find((q) => q.table === 'tasks')
  assert.ok(has(tasks, 'is', 'done_at', null))
})

test('listWeakTopics: sin deleted_at propio, descarta materias en la papelera, por misses desc, tope 50', async () => {
  const row = { subject_id: ID, sheet_id: null, topic: 't', misses: 3, subjects: { deleted_at: null } }
  const { client, queries } = fakeClient(() => ({ data: [row], error: null }))
  const db = createDb(client)
  const rows = await db.listWeakTopics(ID)
  assert.deepEqual(rows, [{ subject_id: ID, sheet_id: null, topic: 't', misses: 3 }])
  const q = queries[0]
  assert.equal(q.table, 'weak_topics')
  assert.ok(!q.calls.some(([m, a]) => m === 'is' && a[0] === 'deleted_at'))
  assert.ok(has(q, 'is', 'subjects.deleted_at', null))
  assert.ok(has(q, 'eq', 'subject_id', ID))
  assert.ok(has(q, 'order', 'misses', { ascending: false }))
  assert.ok(has(q, 'limit', 50))

  await db.listWeakTopics()
  assert.ok(!queries[1].calls.some(([m]) => m === 'eq'))
})
