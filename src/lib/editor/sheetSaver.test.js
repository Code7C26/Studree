import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSheetSaver } from './sheetSaver.js'

function setup(sheetOverrides = {}, { creates = new Map() } = {}) {
  const calls = { create: [], save: [], remove: [] }
  const store = new Map()
  const service = {
    async create(values) {
      calls.create.push(values)
      return { data: { id: 'real-1', subject_id: values.subject_id, content_md: values.content_md, updated_at: 't1', created_at: 't0' }, error: null }
    },
    async saveContent(id, md) {
      calls.save.push([id, md])
      return { data: { id, updated_at: 't2' }, error: null }
    },
    async remove(id) {
      calls.remove.push(id)
      return { data: true, error: null }
    },
  }
  const cache = {
    key: (collection, parent) => `${collection}:${parent ?? ''}`,
    read: (key, fallback) => (store.has(key) ? structuredClone(store.get(key)) : fallback),
    write: (key, value) => store.set(key, structuredClone(value)),
    clear: (key) => store.delete(key),
  }
  const created = []
  const saver = createSheetSaver({
    sheet: { id: 'local:abc', subject_id: 's1', content_md: '', created_at: 't0', updated_at: null, ...sheetOverrides },
    service,
    cache,
    onCreated: (localId, row) => created.push([localId, row.id]),
    onStatus: () => {},
    setTimer: () => 0,
    clearTimer: () => {},
    creates,
  })
  return { saver, calls, created }
}

test('ensureCreated crea una hoja local aunque esté vacía y devuelve el id real', async () => {
  const { saver, calls, created } = setup()
  saver.start()
  assert.equal(await saver.ensureCreated(), 'real-1')
  assert.deepEqual(calls.create, [{ subject_id: 's1', content_md: '' }])
  assert.deepEqual(created, [['local:abc', 'real-1']])
})

test('ensureCreated dos veces crea una sola hoja', async () => {
  const { saver, calls } = setup()
  saver.start()
  const [a, b] = await Promise.all([saver.ensureCreated(), saver.ensureCreated()])
  assert.equal(a, 'real-1')
  assert.equal(b, 'real-1')
  assert.equal(calls.create.length, 1)
})

test('ensureCreated usa lo que ya se escribió', async () => {
  const { saver, calls } = setup()
  saver.start()
  saver.update('# Hola')
  await saver.ensureCreated()
  assert.deepEqual(calls.create, [{ subject_id: 's1', content_md: '# Hola' }])
})

test('ensureCreated después de cancelar no crea nada', async () => {
  const { saver, calls } = setup()
  saver.start()
  saver.cancel()
  assert.equal(await saver.ensureCreated(), null)
  assert.equal(calls.create.length, 0)
})

test('ensureCreated en una hoja real no crea', async () => {
  const { saver, calls } = setup({ id: 'real-9', updated_at: 't0' })
  saver.start()
  assert.equal(await saver.ensureCreated(), 'real-9')
  assert.equal(calls.create.length, 0)
})

test('createNow: una hoja de plantilla se crea al empezar', async () => {
  const { saver, calls } = setup({ content_md: '# Clase', createNow: true })
  assert.equal(saver.start(), '# Clase')
  await saver.flush()
  assert.deepEqual(calls.create, [{ subject_id: 's1', content_md: '# Clase' }])
})

test('sin createNow, una hoja local con contenido espera a que se edite (como antes)', async () => {
  const { saver, calls } = setup({ content_md: '# Borrador restaurado' })
  saver.start()
  await saver.flush()
  assert.equal(calls.create.length, 0)
})

test('start no crea nada por sí solo: el create de la plantilla sale del primer flush (efecto)', async () => {
  const { saver, calls } = setup({ content_md: '# Clase', createNow: true })
  saver.start()
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(calls.create.length, 0)
  await saver.flush()
  assert.equal(calls.create.length, 1)
})

test('dos savers de la misma hoja local (StrictMode / remontaje) crean UNA sola fila', async () => {
  const creates = new Map()
  const sheet = { content_md: '# Clase', createNow: true }
  const first = setup(sheet, { creates })
  const second = setup(sheet, { creates })
  first.saver.start()
  second.saver.start()
  await Promise.all([first.saver.flush(), second.saver.flush()])
  assert.equal(first.calls.create.length + second.calls.create.length, 1)
  // Los dos quedan apuntando a la fila real (y avisan onCreated).
  assert.deepEqual(first.created, [['local:abc', 'real-1']])
  assert.deepEqual(second.created, [['local:abc', 'real-1']])
  assert.equal(await second.saver.ensureCreated(), 'real-1')
})

test('ensureCreated desde dos savers de la misma hoja local crea una sola fila', async () => {
  const creates = new Map()
  const first = setup({}, { creates })
  const second = setup({}, { creates })
  const [a, b] = await Promise.all([first.saver.ensureCreated(), second.saver.ensureCreated()])
  assert.equal(a, 'real-1')
  assert.equal(b, 'real-1')
  assert.equal(first.calls.create.length + second.calls.create.length, 1)
})

test('lo escrito en el segundo saver después de adoptar la fila se guarda en ella', async () => {
  const creates = new Map()
  const first = setup({ content_md: '# Clase', createNow: true }, { creates })
  const second = setup({ content_md: '# Clase', createNow: true }, { creates })
  first.saver.start()
  await first.saver.flush()
  second.saver.start()
  second.saver.update('# Clase más')
  await second.saver.flush()
  assert.equal(second.calls.create.length, 0)
  assert.deepEqual(second.calls.save, [['real-1', '# Clase más']])
})
