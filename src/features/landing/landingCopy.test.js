import { test } from 'node:test'
import assert from 'node:assert/strict'
import { START_PATH, getLandingCopy } from './landingCopy.js'

/** Recorre todas las cadenas del copy (objetos y arrays anidados). */
function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, out))
  return out
}

/** Las reglas de contenido valen para los dos idiomas; lo que depende de las palabras se define por idioma. */
const WORDS = {
  es: {
    users: /\d+\s*(usuarios|estudiantes|alumnos)/i,
    fakeProof: /testimonio|universidad de/i,
    neverWrites: /nunca escribe/i,
    deletesNothing: /no borra nada/i,
    quizzes: /pruebas/i,
    oneSheet: /de una hoja/i,
    summaries: /res[uú]menes/i,
  },
  en: {
    users: /\d+\s*(users|students|learners)/i,
    fakeProof: /testimonial|university of/i,
    neverWrites: /never writes/i,
    deletesNothing: /deletes nothing|does not change anything/i,
    quizzes: /quizzes/i,
    oneSheet: /one sheet/i,
    summaries: /summaries/i,
  },
}

test('"Empezar gratis" entra a la app por "/"', () => {
  assert.equal(START_PATH, '/')
})

test('los dos idiomas tienen el mismo copy: mismas cantidades de textos', () => {
  assert.equal(collectStrings(getLandingCopy('es')).length, collectStrings(getLandingCopy('en')).length)
  assert.ok(collectStrings(getLandingCopy('en')).length > 30)
})

for (const lang of ['es', 'en']) {
  const copy = getLandingCopy(lang)
  const strings = collectStrings(copy)
  const words = WORDS[lang]

  test(`[${lang}] los textos no usan emojis`, () => {
    for (const text of strings) assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, text)
  })

  test(`[${lang}] los textos no fijan precios, porcentajes ni monedas`, () => {
    for (const text of strings) assert.doesNotMatch(text, /\$|USD|ARS|€|%|\bpesos?\b|\bd[oó]lares?\b|\bdollars?\b/i, text)
  })

  test(`[${lang}] los textos no inventan cifras de usuarios ni testimonios`, () => {
    for (const text of strings) {
      assert.doesNotMatch(text, words.users, text)
      assert.doesNotMatch(text, words.fakeProof, text)
    }
  })

  test(`[${lang}] la landing no promete que el Brote escriba solo`, () => {
    assert.ok(copy.brote.guarantees.some((text) => words.neverWrites.test(text)))
  })

  test(`[${lang}] la landing no dice que el Brote "no borra nada" (al aceptar puede reemplazar texto)`, () => {
    for (const text of strings) assert.doesNotMatch(text, words.deletesNothing, text)
  })

  test(`[${lang}] en Gratis solo las pruebas son "de una hoja"; los resúmenes no`, () => {
    assert.ok(copy.plans.free.some((text) => words.quizzes.test(text) && words.oneSheet.test(text)))
    assert.ok(copy.plans.free.every((text) => !(words.summaries.test(text) && words.oneSheet.test(text))))
  })

  test(`[${lang}] los planes tienen las dos columnas con contenido`, () => {
    assert.ok(copy.plans.free.length >= 4)
    assert.ok(copy.plans.premium.length >= 4)
  })
}
