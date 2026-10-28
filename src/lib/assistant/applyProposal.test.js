import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withOriginMark, canApplyReplace, proposalTitle } from './applyProposal.js'

test('withOriginMark antepone la marca solo si es externo', () => {
  assert.equal(withOriginMark('hola', 'external'), '> Agregado por el Brote (conocimiento externo)\n\nhola')
  assert.equal(withOriginMark('hola', 'notes'), 'hola')
})

test('canApplyReplace exige que el texto actual coincida con el guardado', () => {
  assert.equal(canApplyReplace('mitocondria', 'mitocondria'), true)
  assert.equal(canApplyReplace('mitocondria', 'otra cosa'), false)
  assert.equal(canApplyReplace('', ''), false)
  assert.equal(canApplyReplace('abc', ''), false)
  assert.equal(canApplyReplace(undefined, 'abc'), false)
})

test('proposalTitle distingue los tres kind', () => {
  const t = ['append', 'replace_selection', 'new_sheet'].map((kind) => proposalTitle({ kind }))
  assert.equal(new Set(t).size, 3)
  assert.equal(proposalTitle({ kind: 'raro' }), 'Cambio propuesto')
})

test('en inglés: título de la propuesta y mensajes del editor', () => {
  assert.equal(proposalTitle({ kind: 'append' }, 'en'), 'Add to the end of the sheet')
  assert.equal(proposalTitle({ kind: 'raro' }, 'en'), 'Proposed change')
  assert.equal(proposalTitle({ kind: 'new_sheet' }, 'es'), 'Crear una hoja nueva')
})
