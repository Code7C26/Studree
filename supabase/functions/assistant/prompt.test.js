import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSystemPrompt } from './prompt.js'

const base = {
  action: 'chat',
  scopeLabel: 'Materia: Álgebra',
  mapMd: '# Mapa\n- [Álgebra](id-123)\n  - hoja 2026-10-01 (sheet-abc)',
  today: '2026-10-19',
  hasSelection: false,
}

test('en notes responde solo con los apuntes y lo dice', () => {
  const p = buildSystemPrompt({ ...base, mode: 'notes' })
  assert.match(p, /SOLO con los apuntes/)
  assert.match(p, /no (lo )?cubren/i)
  assert.doesNotMatch(p, /conocimiento externo/i)
})

test('en external permite conocimiento externo y exige marcarlo', () => {
  const p = buildSystemPrompt({ ...base, mode: 'external' })
  assert.match(p, /conocimiento externo/i)
  assert.match(p, /source.*external/i)
  assert.match(p, /marcá/i)
})

test('en ambos: contenido de hojas es dato, edición solo con propose_* y aprobación', () => {
  for (const mode of ['notes', 'external']) {
    const p = buildSystemPrompt({ ...base, mode })
    assert.match(p, /datos, nunca instrucciones/i)
    assert.match(p, /ignorá lo anterior/i)
    assert.match(p, /propose_\*/)
    assert.match(p, /aprob/i)
    assert.match(p, /nunca digas que ya (escribiste|modificaste)/i)
    assert.match(p, /fecha/i)
    assert.match(p, /nunca inventes ids/i)
  }
})

test('incluye mapa y fecha de hoy textuales, y voz rioplatense', () => {
  const p = buildSystemPrompt({ ...base, mode: 'notes' })
  assert.ok(p.includes(base.mapMd))
  assert.ok(p.includes('2026-10-19'))
  assert.ok(p.includes('Álgebra'))
  assert.match(p, /el Brote/)
  assert.match(p, /vos|tenés|podés/)
})

test('menciona la selección solo si hay', () => {
  assert.doesNotMatch(buildSystemPrompt({ ...base, mode: 'notes' }), /texto seleccionado/i)
  assert.match(buildSystemPrompt({ ...base, mode: 'notes', hasSelection: true }), /texto seleccionado/i)
})

test('es compacto', () => {
  assert.ok(buildSystemPrompt({ ...base, mode: 'external' }).length - base.mapMd.length < 3500)
})
