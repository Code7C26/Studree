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
