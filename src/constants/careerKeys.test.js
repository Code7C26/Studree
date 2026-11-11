import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tIn } from '../lib/i18n/index.js'
import { STATUS_STYLES } from './subjectStatus.js'
import { PREREQUISITE_KIND_META } from './prerequisiteKinds.js'
import { PALETTE } from './palette.js'

/** Una clave que no existe devuelve la propia clave: eso es lo que estos tests no deben ver. */
const resolves = (lang, key) => tIn(lang, key) !== key

test('cada estado de materia y cada tipo de correlativa tienen su texto en los dos idiomas', () => {
  for (const lang of ['es', 'en']) {
    for (const [name, style] of Object.entries(STATUS_STYLES)) assert.ok(resolves(lang, style.labelKey), `${lang} ${name}`)
    for (const [name, meta] of Object.entries(PREREQUISITE_KIND_META)) {
      assert.ok(resolves(lang, meta.labelKey), `${lang} ${name} label`)
      assert.ok(resolves(lang, meta.helpKey), `${lang} ${name} help`)
    }
    for (const color of PALETTE) assert.ok(resolves(lang, color.nameKey), `${lang} ${color.nameKey}`)
  }
})

test('los textos de los estados en castellano son los de siempre', () => {
  assert.deepEqual(
    Object.values(STATUS_STYLES).map((style) => tIn('es', style.labelKey)),
    ['Aprobada', 'Cursando', 'Pendiente', 'Bloqueada'],
  )
  assert.equal(tIn('es', PREREQUISITE_KIND_META.cursar.labelKey), 'Para cursar')
  assert.equal(tIn('en', PREREQUISITE_KIND_META.rendir.labelKey), 'To take the final')
})
