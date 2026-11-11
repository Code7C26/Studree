import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EditorState } from '@tiptap/pm/state'
import { Schema } from '@tiptap/pm/model'
import { blockEndPos, createBroteAnchorPlugin, getBroteAnchor, setBroteAnchor } from './broteAnchor.js'

// `@tiptap/pm` no exporta `schema-basic`: alcanza con un esquema mínimo de párrafos.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', toDOM: () => ['p', 0] },
    text: {},
  },
})

const p = (text) => schema.node('paragraph', null, text ? [schema.text(text)] : [])
/** doc p("uno"), p("dos"): el primer párrafo va de 0 a 5 y el segundo de 5 a 10. */
const twoParagraphs = () => schema.node('doc', null, [p('uno'), p('dos')])

/** Estado con el plugin y el ancla puesta en `pos` (como `setBroteAnchor`). */
function anchoredState(pos, onRemoved = () => {}) {
  const plugin = createBroteAnchorPlugin({ onRemoved })
  const state = EditorState.create({ doc: twoParagraphs(), plugins: [plugin] })
  const dom = { slot: true }
  return { plugin, dom, state: state.apply(state.tr.setMeta(plugin, { pos, dom })) }
}

test('blockEndPos: después del párrafo que contiene la posición', () => {
  const doc = twoParagraphs()
  assert.equal(blockEndPos(doc, 2), 5)
  assert.equal(blockEndPos(doc, 4), 5)
  assert.equal(blockEndPos(doc, 7), 10)
})

test('blockEndPos: entre bloques (profundidad 0) devuelve la misma posición', () => {
  assert.equal(blockEndPos(twoParagraphs(), 5), 5)
  assert.equal(blockEndPos(twoParagraphs(), 0), 0)
})

test('el ancla arranca vacía y se fija con el meta', () => {
  const plugin = createBroteAnchorPlugin({ onRemoved: () => {} })
  const state = EditorState.create({ doc: twoParagraphs(), plugins: [plugin] })
  assert.equal(plugin.getState(state), null)
  const { plugin: anchored, state: next, dom } = anchoredState(5)
  assert.deepEqual(anchored.getState(next), { pos: 5, dom })
})

test('el ancla sigue al texto cuando se escribe antes', () => {
  const { plugin, state, dom } = anchoredState(5)
  const next = state.apply(state.tr.insertText('xx', 1))
  assert.deepEqual(plugin.getState(next), { pos: 7, dom })
})

test('borrar el párrafo de arriba cierra el ancla y avisa', () => {
  let removed = 0
  const { plugin, state } = anchoredState(5, () => {
    removed += 1
  })
  const next = state.apply(state.tr.delete(0, 5))
  assert.equal(plugin.getState(next), null)
  assert.equal(removed, 1)
  // Ya cerrada, otro cambio no vuelve a avisar.
  const later = next.apply(next.tr.insertText('a', 1))
  assert.equal(plugin.getState(later), null)
  assert.equal(removed, 1)
})

test('escribir dentro del párrafo no cierra el ancla', () => {
  let removed = 0
  const { plugin, state, dom } = anchoredState(5, () => {
    removed += 1
  })
  const next = state.apply(state.tr.insertText('a', 2))
  assert.deepEqual(plugin.getState(next), { pos: 6, dom })
  assert.equal(removed, 0)
})

test('borrar el párrafo de abajo no cierra el ancla', () => {
  let removed = 0
  const { plugin, state, dom } = anchoredState(5, () => {
    removed += 1
  })
  const next = state.apply(state.tr.delete(5, 10))
  assert.deepEqual(plugin.getState(next), { pos: 5, dom })
  assert.equal(removed, 0)
})

test('el meta null borra el ancla sin avisar', () => {
  let removed = 0
  const { plugin, state } = anchoredState(5, () => {
    removed += 1
  })
  const next = state.apply(state.tr.setMeta(plugin, null))
  assert.equal(plugin.getState(next), null)
  assert.equal(removed, 0)
})

test('una posición fuera del documento se acota al final', () => {
  const { plugin, state } = anchoredState(99)
  assert.equal(plugin.getState(state).pos, state.doc.content.size)
})

test('la decoración es un widget con la clave brote-inline en la posición del ancla', () => {
  const { plugin, state, dom } = anchoredState(5)
  const found = plugin.props.decorations(state).find()
  assert.equal(found.length, 1)
  assert.equal(found[0].from, 5)
  assert.equal(found[0].spec.key, 'brote-inline')
  assert.equal(found[0].spec.side, -1)
  assert.equal(found[0].spec.ignoreSelection, true)
  assert.equal(found[0].spec.stopEvent(), true)
  assert.equal(found[0].type.toDOM(), dom)
})

/** Editor falso: estado real con el plugin y un `dispatch` que lo aplica y anota el meta. */
function fakeEditor() {
  const plugin = createBroteAnchorPlugin({ onRemoved: () => {} })
  const metas = []
  const editor = {
    isDestroyed: false,
    state: EditorState.create({ doc: twoParagraphs(), plugins: [plugin] }),
    view: {
      dispatch(tr) {
        metas.push(tr.getMeta(plugin))
        editor.state = editor.state.apply(tr)
      },
    },
  }
  return { editor, metas }
}

test('setBroteAnchor / getBroteAnchor ponen, leen y sacan el ancla', () => {
  const { editor } = fakeEditor()
  assert.equal(getBroteAnchor(editor), null)
  setBroteAnchor(editor, { pos: 5, dom: { a: 1 } })
  assert.deepEqual(getBroteAnchor(editor), { pos: 5 })
  setBroteAnchor(editor, null)
  assert.equal(getBroteAnchor(editor), null)
})

test('setBroteAnchor con otro nodo saca primero el anterior (ProseMirror reutilizaría el widget por la key)', () => {
  const { editor, metas } = fakeEditor()
  const first = { a: 1 }
  const second = { b: 2 }
  setBroteAnchor(editor, { pos: 5, dom: first })
  setBroteAnchor(editor, { pos: 5, dom: second })
  assert.deepEqual(metas, [{ pos: 5, dom: first }, null, { pos: 5, dom: second }])
  // Con el mismo nodo (solo se mueve) alcanza una transacción.
  setBroteAnchor(editor, { pos: 10, dom: second })
  assert.deepEqual(metas.at(-1), { pos: 10, dom: second })
  assert.equal(metas.length, 4)
})

test('setBroteAnchor y getBroteAnchor no hacen nada con un editor destruido o sin editor', () => {
  const { editor, metas } = fakeEditor()
  editor.isDestroyed = true
  setBroteAnchor(editor, { pos: 5, dom: {} })
  setBroteAnchor(null, { pos: 5, dom: {} })
  assert.equal(metas.length, 0)
  assert.equal(getBroteAnchor(editor), null)
  assert.equal(getBroteAnchor(null), null)
})

test('sin ancla no hay decoraciones', () => {
  const plugin = createBroteAnchorPlugin({ onRemoved: () => {} })
  const state = EditorState.create({ doc: twoParagraphs(), plugins: [plugin] })
  assert.equal(plugin.props.decorations(state).find().length, 0)
})
