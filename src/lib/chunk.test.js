import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunk, listInChunks } from './chunk.js'

test('chunk parte una lista en tramos del tamaño pedido', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.deepEqual(chunk([], 3), [])
  assert.deepEqual(chunk([1, 2], 5), [[1, 2]])
})

test('listInChunks junta los resultados de cada tramo en orden', async () => {
  const calls = []
  const result = await listInChunks([1, 2, 3, 4, 5], 2, async (ids) => {
    calls.push(ids)
    return { data: ids.map((id) => ({ id })), error: null }
  })
  assert.deepEqual(calls, [[1, 2], [3, 4], [5]])
  assert.deepEqual(result, { data: [1, 2, 3, 4, 5].map((id) => ({ id })), error: null })
})

test('listInChunks corta en el primer error', async () => {
  let calls = 0
  const result = await listInChunks([1, 2, 3], 1, async () => {
    calls += 1
    return calls === 2 ? { data: [], error: 'falló' } : { data: [{}], error: null }
  })
  assert.deepEqual(result, { data: [], error: 'falló' })
  assert.equal(calls, 2)
})

test('listInChunks sin ids no consulta', async () => {
  const result = await listInChunks([], 100, async () => assert.fail('no debería consultar'))
  assert.deepEqual(result, { data: [], error: null })
})
