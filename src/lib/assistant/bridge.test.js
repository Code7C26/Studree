import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBridge } from './bridge.js'

const ctx = { subject: { id: 's', name: 'Bio' }, career: null, sheetId: null, getSelection: () => null, apply: () => ({ ok: true }) }

test('get devuelve lo último seteado y set(null) limpia', () => {
  const b = createBridge()
  assert.equal(b.get(), null)
  b.set(ctx)
  assert.equal(b.get(), ctx)
  b.set(null)
  assert.equal(b.get(), null)
})

test('subscribe notifica en cada set y deja de hacerlo al desuscribir', () => {
  const b = createBridge()
  const seen = []
  const off = b.subscribe((c) => seen.push(c))
  b.set(ctx)
  b.set(null)
  off()
  b.set(ctx)
  assert.deepEqual(seen, [ctx, null])
})

test('un suscriptor que tira error no corta a los demás', () => {
  const b = createBridge()
  let n = 0
  b.subscribe(() => { throw new Error('x') })
  b.subscribe(() => { n++ })
  b.set(ctx)
  assert.equal(n, 1)
})

test('request deja un pedido pendiente que se toma una sola vez y avisa a onRequest', () => {
  const b = createBridge()
  const seen = []
  const off = b.onRequest(() => seen.push('aviso'))
  assert.equal(b.takeRequest(), null)
  const item = { request: { action: 'shortcut', message: 'm' }, label: 'Explicar', selection: null }
  b.request(item)
  assert.deepEqual(seen, ['aviso'])
  assert.equal(b.takeRequest(), item)
  assert.equal(b.takeRequest(), null)
  off()
  b.request(item)
  assert.equal(seen.length, 1)
})

test('un pedido nuevo reemplaza al pendiente y un listener roto no corta a los demás', () => {
  const b = createBridge()
  let n = 0
  b.onRequest(() => { throw new Error('x') })
  b.onRequest(() => { n++ })
  b.request({ request: { action: 'shortcut', message: 'a' }, label: 'a', selection: null })
  b.request({ request: { action: 'shortcut', message: 'b' }, label: 'b', selection: null })
  assert.equal(n, 2)
  assert.equal(b.takeRequest().label, 'b')
})

test('bridge: onRequest recibe el item; takePendingApply solo devuelve si coincide la materia', () => {
  const b = createBridge()
  const seen = []
  b.onRequest((item) => seen.push(item))
  const item = { request: { action: 'shortcut', message: 'm' }, label: 'Completar: «x»', selection: null, target: 'inline' }
  b.request(item)
  assert.deepEqual(seen, [item])

  const proposal = { id: 'summary-1', kind: 'new_sheet', subjectId: 's1', markdown: '# R', source: 'notes', status: 'pending' }
  assert.equal(b.takePendingApply('s1'), null)
  b.setPendingApply({ subjectId: 's1', proposal })
  assert.equal(b.takePendingApply('otra'), null) // otra materia: no la saca
  assert.equal(b.takePendingApply('s1'), proposal)
  assert.equal(b.takePendingApply('s1'), null) // se toma una sola vez
  b.setPendingApply({ subjectId: 's1', proposal })
  b.setPendingApply(null)
  assert.equal(b.takePendingApply('s1'), null)
})

test('bridge: sendInline llega a onInlineCommand; requestOpen a onOpenRequest', () => {
  const b = createBridge()
  const commands = []
  const offCmd = b.onInlineCommand((cmd) => commands.push(cmd))
  b.sendInline({ type: 'accept', proposalId: 'p1' })
  b.sendInline({ type: 'close' })
  offCmd()
  b.sendInline({ type: 'discard' })
  assert.deepEqual(commands, [{ type: 'accept', proposalId: 'p1' }, { type: 'close' }])

  let opens = 0
  const offOpen = b.onOpenRequest(() => { opens++ })
  b.requestOpen()
  offOpen()
  b.requestOpen()
  assert.equal(opens, 1)
})

test('bridge: setInline publica la vista de la tarjeta y avisa a subscribeInline', () => {
  const b = createBridge()
  const seen = []
  assert.equal(b.getInline(), null)
  const off = b.subscribeInline((view) => seen.push(view))
  const view = { id: 1, label: 'Explicar', replies: [], busy: true, status: null, error: null, notice: null, proposal: null, external: false, canAnswer: false }
  b.setInline(view)
  assert.equal(b.getInline(), view)
  b.setInline(null)
  assert.equal(b.getInline(), null)
  off()
  b.setInline(view)
  assert.deepEqual(seen, [view, null])
})

test('clearRequest descarta el pedido pendiente sin avisar (la carpeta se desmontó)', () => {
  const b = createBridge()
  let n = 0
  b.onRequest(() => { n++ })
  b.request({ request: { action: 'shortcut', message: 'a' }, label: 'a', selection: null })
  b.clearRequest()
  assert.equal(n, 1)
  assert.equal(b.takeRequest(), null)
})
