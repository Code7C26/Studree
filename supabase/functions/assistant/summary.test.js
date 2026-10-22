import test from 'node:test'
import assert from 'node:assert/strict'
import { SUMMARY_SCHEMA, SUMMARY_MAX, validateSummary } from './summary.js'

const section = (over = {}) => ({ heading: 'Célula', body: 'Unidad básica.', ...over })

test('resumen válido: recorta textos y secciones de más', () => {
  const raw = {
    title: 'x'.repeat(200),
    sections: Array.from({ length: 25 }, (_, i) => ({ heading: `T${i}`, body: 'b'.repeat(5000) })),
    key_concepts: [{ term: 'ATP', definition: 'Energía' }],
  }
  const r = validateSummary(raw)
  assert.equal(r.ok, true)
  assert.equal(r.summary.title.length, 120)
  assert.equal(r.summary.sections.length, 20)
  assert.equal(r.summary.sections[0].body.length, 4000)
  assert.deepEqual(r.summary.keyConcepts, [{ term: 'ATP', definition: 'Energía' }])
})

test('falla cerrado: sin secciones, sección vacía, concepto mal armado, no-objeto', () => {
  for (const raw of [
    undefined,
    null,
    [],
    { title: 'a', sections: [], key_concepts: [] },
    { title: 'a', sections: [{ heading: ' ', body: 'b' }], key_concepts: [] },
    { title: 'a', sections: [{ heading: 'h', body: 'b' }], key_concepts: [{ term: 'x' }] },
    { title: '', sections: [{ heading: 'h', body: 'b' }], key_concepts: [] },
    { title: 'a', sections: 'no', key_concepts: [] },
    { title: 'a', sections: [null], key_concepts: [] },
    { title: 'a', sections: [{ heading: 'h', body: 5 }], key_concepts: [] },
    { title: 'a', sections: [section()], key_concepts: 'no' },
  ]) {
    assert.equal(validateSummary(raw).ok, false, JSON.stringify(raw))
  }
})

test('key_concepts ausente se toma como lista vacía y se descartan los de más de 30', () => {
  const none = validateSummary({ title: 'a', sections: [section()] })
  assert.equal(none.ok, true)
  assert.deepEqual(none.summary.keyConcepts, [])
  const many = validateSummary({
    title: 'a',
    sections: [section()],
    key_concepts: Array.from({ length: 40 }, (_, i) => ({ term: `t${i}`, definition: 'd'.repeat(400) })),
  })
  assert.equal(many.summary.keyConcepts.length, 30)
  assert.equal(many.summary.keyConcepts[0].definition.length, SUMMARY_MAX.definition)
})

test('recorta espacios y el esquema usa tipos en mayúsculas', () => {
  const r = validateSummary({ title: '  Hola  ', sections: [{ heading: ' H ', body: ' B ' }], key_concepts: [] })
  assert.deepEqual(r.summary, { title: 'Hola', sections: [{ heading: 'H', body: 'B' }], keyConcepts: [] })
  assert.equal(SUMMARY_SCHEMA.type, 'OBJECT')
  assert.deepEqual(SUMMARY_SCHEMA.required, ['title', 'sections'])
})
