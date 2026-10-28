import { test } from 'node:test'
import assert from 'node:assert/strict'
import { subjectTreeToMarkdown } from './toSingleMarkdown.js'

test('el .md único describe los adjuntos en vez de linkearlos', () => {
  const md = subjectTreeToMarkdown({
    name: 'Genética',
    sheets: [{ created_at: '2026-10-14T21:30:00Z', content_md: 'Ver ![pizarrón](adjunto:1) y [tp.pdf](adjunto:2)' }],
  })
  assert.match(md, /\[imagen: pizarrón\]/)
  assert.match(md, /\[archivo: tp\.pdf\]/)
  assert.doesNotMatch(md, /adjunto:/)
})

import { allTreeToMarkdown, withAiPreamble } from './toSingleMarkdown.js'

test('en inglés: título, fecha, marcadores de adjuntos y preámbulo', () => {
  const md = allTreeToMarkdown(
    [{ name: 'Bio', subjects: [{ name: 'Genetics', sheets: [{ created_at: '2025-10-14T18:30:00', content_md: 'See ![board](adjunto:1)' }] }] }],
    'en',
  )
  assert.match(md, /^# My notes/)
  assert.match(md, /Tuesday 10\/14\/2025 · 6:30 PM/)
  assert.match(md, /\[image: board\]/)
  const preamble = withAiPreamble('x', 'the subject "Genetics"', 'en')
  assert.match(preamble, /^> Study notes exported from Studree on \d{4}-\d{2}-\d{2} \(the subject "Genetics"\)\./)
  assert.match(preamble, /\[\[Topic\]\]/)
})

test('en castellano el título y el preámbulo no cambian', () => {
  assert.match(allTreeToMarkdown([], 'es'), /^# Mis apuntes/)
  assert.match(
    withAiPreamble('x', 'la materia "Genética"', 'es'),
    /^> Apuntes de estudio exportados de Studree el \d{4}-\d{2}-\d{2} \(la materia "Genética"\)\./,
  )
})
