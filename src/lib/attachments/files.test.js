import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storageSafeName, formatBytes } from './files.js'

test('storageSafeName saca tildes y caracteres que Storage no acepta', () => {
  assert.equal(storageSafeName('foto pizarrón (2).jpg'), 'foto pizarron (2).jpg')
  assert.equal(storageSafeName('tp#1?¿final!.pdf'), 'tp_1_final!.pdf')
  assert.equal(storageSafeName('   '), 'archivo')
  assert.equal(storageSafeName('a'.repeat(300) + '.png').length <= 120, true)
  assert.match(storageSafeName('a'.repeat(300) + '.png'), /\.png$/)
})

test('formatBytes legible en castellano', () => {
  assert.equal(formatBytes(850), '850 B')
  assert.equal(formatBytes(12 * 1024), '12 KB')
  assert.equal(formatBytes(3.4 * 1024 * 1024), '3,4 MB')
})
