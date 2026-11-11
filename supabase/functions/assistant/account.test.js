import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAccount } from './account.js'

// Cliente falso: registra cada consulta encadenada y la resuelve con `respond(q)`.
function fakeClient(respond, { user = { id: 'u1' }, authError = null } = {}) {
  const queries = []
  const auth = { calls: [] }
  const client = {
    auth: {
      async getUser(jwt) {
        auth.calls.push(jwt)
        return { data: { user: authError ? null : user }, error: authError }
      },
    },
    from(table) {
      const q = { table, calls: [] }
      queries.push(q)
      const builder = new Proxy(
        {},
        {
          get(_t, method) {
            if (method === 'then') {
              const res = respond(q) ?? { data: null, error: null }
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
  return { client, queries, auth }
}

const has = (q, method, ...args) => q.calls.some(([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args))
const silent = { logError: () => {} }

test('getUser: devuelve {id} con un JWT válido y null si auth falla o no hay usuario', async () => {
  const ok = fakeClient(() => null)
  assert.deepEqual(await createAccount(ok.client, silent).getUser('jwt'), { id: 'u1' })
  assert.deepEqual(ok.auth.calls, ['jwt'])
  const bad = fakeClient(() => null, { authError: { message: 'invalid' } })
  assert.equal(await createAccount(bad.client, silent).getUser('jwt'), null)
  const none = fakeClient(() => null, { user: null })
  assert.equal(await createAccount(none.client, silent).getUser('jwt'), null)
})

test('getPlanRow: lee user_plans del usuario; sin fila → null; error → lanza', async () => {
  const { client, queries } = fakeClient(() => ({ data: { plan: 'premium' }, error: null }))
  assert.deepEqual(await createAccount(client, silent).getPlanRow('u1'), { plan: 'premium' })
  assert.equal(queries[0].table, 'user_plans')
  assert.ok(has(queries[0], 'eq', 'user_id', 'u1'))
  assert.ok(has(queries[0], 'maybeSingle'))
  const empty = fakeClient(() => ({ data: null, error: null }))
  assert.equal(await createAccount(empty.client, silent).getPlanRow('u1'), null)
  const broken = fakeClient(() => ({ data: null, error: { message: 'x' } }))
  await assert.rejects(createAccount(broken.client, silent).getPlanRow('u1'))
})

test('countUsage: una consulta head/count por clave, con acciones, desde y external', async () => {
  const { client, queries } = fakeClient((q) => ({ data: null, count: has(q, 'eq', 'external', true) ? 2 : 7, error: null }))
  const requests = [
    { key: 'chat', actions: ['chat', 'shortcut'], external: false, since: '2026-10-19T00:00:00.000Z' },
    { key: 'external', actions: ['chat', 'quiz'], external: true, since: '2026-10-19T00:00:00.000Z' },
  ]
  const counts = await createAccount(client, silent).countUsage(requests, 'u1')
  assert.deepEqual(counts, { chat: 7, external: 2 })
  assert.equal(queries.length, 2)
  for (const q of queries) {
    assert.equal(q.table, 'ai_usage')
    assert.ok(has(q, 'select', 'id', { count: 'exact', head: true }))
    assert.ok(has(q, 'eq', 'user_id', 'u1'))
    assert.ok(has(q, 'gte', 'created_at', '2026-10-19T00:00:00.000Z'))
  }
  assert.ok(has(queries[0], 'in', 'action', ['chat', 'shortcut']))
  assert.ok(!has(queries[0], 'eq', 'external', true))
  assert.ok(has(queries[1], 'eq', 'external', true))
})

test('countUsage: una consulta con error o sin count deja la clave FALTANTE (no 0) y lo registra', async () => {
  const logs = []
  const { client } = fakeClient((q) =>
    has(q, 'eq', 'external', true) ? { data: null, count: null, error: { message: 'x' } } : { data: null, count: null, error: null },
  )
  const counts = await createAccount(client, { logError: (...a) => logs.push(a) }).countUsage(
    [
      { key: 'chat', actions: ['chat'], external: false, since: 's' },
      { key: 'external', actions: ['chat'], external: true, since: 's' },
    ],
    'u1',
  )
  assert.deepEqual(counts, {})
  assert.equal(logs.length, 2)
})

test('recordUsage: inserta action y external (user_id lo pone la base); error → lanza', async () => {
  const { client, queries } = fakeClient(() => ({ data: null, error: null }))
  await createAccount(client, silent).recordUsage({ action: 'quiz', external: true })
  assert.equal(queries[0].table, 'ai_usage')
  assert.ok(has(queries[0], 'insert', { action: 'quiz', external: true }))
  const broken = fakeClient(() => ({ data: null, error: { message: 'x' } }))
  await assert.rejects(createAccount(broken.client, silent).recordUsage({ action: 'chat', external: false }))
})
