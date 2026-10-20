import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyProposalToEditor, CHANGED_MESSAGE } from './editorApply.js'

/** Editor falso: un texto plano donde la posición es el índice + 1. */
function fakeEditor(text, { ok = true } = {}) {
  const calls = []
  const editor = {
    isDestroyed: false,
    state: {
      doc: {
        content: { size: text.length + 2 },
        textBetween: (from, to) => text.slice(from - 1, to - 1),
      },
    },
    chain() {
      const steps = []
      const chain = {
        insertContentAt(range, content) {
          steps.push({ range, content })
          return chain
        },
        run() {
          calls.push(...steps)
          return ok
        },
      }
      return chain
    },
  }
  return { editor, calls }
}

const proposal = (over) => ({ id: 'p1', kind: 'append', sheetId: 'sh1', markdown: '## Nuevo', source: 'notes', status: 'pending', ...over })

test('append inserta el Markdown al final del documento', () => {
  const { editor, calls } = fakeEditor('hola')
  assert.deepEqual(applyProposalToEditor(editor, proposal(), null), { ok: true })
  assert.deepEqual(calls, [{ range: 6, content: '## Nuevo' }])
})

test('append externo lleva la marca de origen', () => {
  const { editor, calls } = fakeEditor('hola')
  applyProposalToEditor(editor, proposal({ source: 'external' }), null)
  assert.match(calls[0].content, /^> Agregado por el Brote/)
})

test('replace_selection reemplaza el rango si el texto sigue igual', () => {
  const { editor, calls } = fakeEditor('la mitocondria es')
  const selection = { sheetId: 'sh1', from: 4, to: 15, text: 'mitocondria' }
  const result = applyProposalToEditor(editor, proposal({ kind: 'replace_selection', markdown: 'célula' }), selection)
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(calls, [{ range: { from: 4, to: 15 }, content: 'célula' }])
})

test('replace_selection falla sin tocar nada si el texto cambió', () => {
  const { editor, calls } = fakeEditor('la mitocondrias es')
  const selection = { sheetId: 'sh1', from: 4, to: 15, text: 'mitocondria' }
  const changed = { ...selection, text: 'otra cosa!!' }
  const result = applyProposalToEditor(editor, proposal({ kind: 'replace_selection' }), changed)
  assert.deepEqual(result, { ok: false, error: CHANGED_MESSAGE })
  assert.equal(CHANGED_MESSAGE, 'La hoja cambió; volvé a seleccionar el texto.')
  assert.equal(calls.length, 0)
})

test('replace_selection falla sin selección, con otra hoja o con un rango fuera del documento', () => {
  const { editor, calls } = fakeEditor('abc')
  const p = proposal({ kind: 'replace_selection' })
  assert.equal(applyProposalToEditor(editor, p, null).ok, false)
  assert.equal(applyProposalToEditor(editor, p, { sheetId: 'otra', from: 1, to: 3, text: 'ab' }).ok, false)
  assert.equal(applyProposalToEditor(editor, p, { sheetId: 'sh1', from: 1, to: 99, text: 'abc' }).ok, false)
  assert.equal(calls.length, 0)
})

test('editor ausente o destruido, kind no aplicable o comando fallido => ok:false', () => {
  assert.equal(applyProposalToEditor(null, proposal(), null).ok, false)
  const { editor } = fakeEditor('x')
  editor.isDestroyed = true
  assert.equal(applyProposalToEditor(editor, proposal(), null).ok, false)
  assert.equal(applyProposalToEditor(fakeEditor('x').editor, proposal({ kind: 'new_sheet' }), null).ok, false)
  assert.equal(applyProposalToEditor(fakeEditor('x', { ok: false }).editor, proposal(), null).ok, false)
})
