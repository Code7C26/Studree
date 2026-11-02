import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PAPER_HEADING } from './paperTones.js'

/** Luminancia relativa WCAG de un color "#rrggbb". */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

test('los títulos verdes sobre el papel pasan contraste AA (4.5:1)', () => {
  assert.ok(contrast(PAPER_HEADING, '#fbf8ef') >= 4.5, `contraste ${contrast(PAPER_HEADING, '#fbf8ef').toFixed(2)}`)
})

test('ningún componente de la landing usa text-accent-hover (3.1:1 sobre papel)', () => {
  for (const file of ['BroteSection', 'FolderSection', 'ProblemSection', 'PaperSheet']) {
    const source = readFileSync(new URL(`./${file}.jsx`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /text-accent-hover/, file)
  }
})

test('la landing deja que scrollee el documento (no un contenedor interno)', () => {
  const source = readFileSync(new URL('../../pages/LandingPage.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /overflow-y-auto/)
})
