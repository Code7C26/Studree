import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LOCAL_SHEET_PREFIX,
  nextFolderSheets,
  orderFolderSheets,
  restoreLocalSheets,
} from './folderSheets.js'

const saved = (id, created_at) => ({ id, created_at, content_md: `md-${id}` })

test('orderFolderSheets: guardadas por fecha, locales al final', () => {
  const local = { id: `${LOCAL_SHEET_PREFIX}x`, created_at: '2026-11-01T00:00:00Z', content_md: '' }
  const out = orderFolderSheets([saved('b', '2026-10-02T00:00:00Z'), local, saved('a', '2026-10-01T00:00:00Z')])
  assert.deepEqual(out.map((sheet) => sheet.id), ['a', 'b', `${LOCAL_SHEET_PREFIX}x`])
})

test('nextFolderSheets: error conserva lo que hay en pantalla (lectura sin señal)', () => {
  const current = [saved('a', '2026-10-01T00:00:00Z')]
  assert.equal(nextFolderSheets(current, null, 'sin red', new Map()), current)
})

test('nextFolderSheets: pinta la cache y conserva keys y contenido vivo', () => {
  const live = new Map([['a', 'escrito ahora']])
  const out = nextFolderSheets([], [saved('a', '2026-10-01T00:00:00Z')], null, live)
  assert.equal(out.length, 1)
  assert.equal(out[0].key, 'a')
  assert.equal(out[0].content_md, 'escrito ahora')
})

test('nextFolderSheets: conserva las hojas locales al recargar', () => {
  const local = { id: `${LOCAL_SHEET_PREFIX}x`, key: `${LOCAL_SHEET_PREFIX}x`, created_at: '2026-11-01T00:00:00Z', content_md: 'borrador' }
  const out = nextFolderSheets([local], [saved('a', '2026-10-01T00:00:00Z')], null, new Map())
  assert.deepEqual(out.map((sheet) => sheet.id), ['a', `${LOCAL_SHEET_PREFIX}x`])
})

test('restoreLocalSheets: solo borradores con texto', () => {
  const out = restoreLocalSheets(
    {
      [`${LOCAL_SHEET_PREFIX}a`]: { content: 'texto', created_at: '2026-11-01T00:00:00Z' },
      [`${LOCAL_SHEET_PREFIX}b`]: { content: '   ', created_at: '2026-11-01T00:00:00Z' },
      sinprefijo: { content: 'texto', created_at: '2026-11-01T00:00:00Z' },
    },
    's1',
  )
  assert.equal(out.length, 1)
  assert.equal(out[0].id, `${LOCAL_SHEET_PREFIX}a`)
  assert.equal(out[0].subject_id, 's1')
})
