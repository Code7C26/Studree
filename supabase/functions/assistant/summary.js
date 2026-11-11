// Resumen estructurado: esquema de salida para Gemini y validación de lo que
// devuelve el modelo. Funciones puras, mismo criterio que `quiz.js`.
//
// El JSON del modelo NO es confiable: cualquier elemento mal armado rechaza el
// resumen entero (falla cerrado). Lo único que se "arregla" es el largo: los
// textos se recortan y las secciones/conceptos de más se descartan.

/** Largos máximos del resumen. */
export const SUMMARY_MAX = {
  title: 120,
  sections: 20,
  heading: 200,
  body: 4000,
  concepts: 30,
  term: 100,
  definition: 300,
}

/** Esquema del resumen (formato `responseSchema` de generateContent). */
export const SUMMARY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: 'Título corto del resumen' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          heading: { type: 'STRING', description: 'Título de la sección (un tema)' },
          body: { type: 'STRING', description: 'Desarrollo en Markdown liviano: párrafos cortos, listas con "- " y **negrita**' },
        },
        required: ['heading', 'body'],
      },
    },
    key_concepts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          term: { type: 'STRING', description: 'Concepto clave' },
          definition: { type: 'STRING', description: 'Definición de una línea' },
        },
        required: ['term', 'definition'],
      },
    },
  },
  required: ['title', 'sections'],
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
/** Texto no vacío recortado a `max`, o null si no es texto o está vacío. */
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const fail = (error) => ({ ok: false, error })

/**
 * Valida el resumen que devolvió el modelo.
 * @param {unknown} raw
 * @returns {{ok: true, summary: {title: string, sections: Array<{heading: string, body: string}>, keyConcepts: Array<{term: string, definition: string}>}} | {ok: false, error: string}}
 */
export function validateSummary(raw) {
  if (!isObject(raw)) return fail('El resumen no es un objeto.')
  const title = text(raw.title, SUMMARY_MAX.title)
  if (!title) return fail('El resumen no tiene título.')
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) return fail('El resumen no tiene secciones.')
  const sections = []
  for (const [i, s] of raw.sections.slice(0, SUMMARY_MAX.sections).entries()) {
    const heading = isObject(s) ? text(s.heading, SUMMARY_MAX.heading) : null
    const body = isObject(s) ? text(s.body, SUMMARY_MAX.body) : null
    if (!heading || !body) return fail(`La sección ${i + 1} está mal armada.`)
    sections.push({ heading, body })
  }
  const rawConcepts = raw.key_concepts ?? []
  if (!Array.isArray(rawConcepts)) return fail('Los conceptos clave están mal armados.')
  const keyConcepts = []
  for (const [i, c] of rawConcepts.slice(0, SUMMARY_MAX.concepts).entries()) {
    const term = isObject(c) ? text(c.term, SUMMARY_MAX.term) : null
    const definition = isObject(c) ? text(c.definition, SUMMARY_MAX.definition) : null
    if (!term || !definition) return fail(`El concepto clave ${i + 1} está mal armado.`)
    keyConcepts.push({ term, definition })
  }
  return { ok: true, summary: { title, sections, keyConcepts } }
}
