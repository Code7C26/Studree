import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanSourceTree } from './scanSpanish.js'

/**
 * Trinquete contra el castellano suelto (Fase 18, ver docs/features/i18n.md).
 *
 * `PENDING` lista las áreas que todavía NO migraron al diccionario. Cada tarea del plan borra
 * de acá los prefijos que migra; al terminar la Fase 18 queda vacío. Hay dos fallas posibles:
 *  - un archivo FUERA de PENDING con castellano visible → se coló texto sin traducir;
 *  - un prefijo de PENDING sin ningún castellano → ya migró, hay que borrarlo de la lista.
 */
export const PENDING = [
  'src/components/features/assistant/',
  'src/components/features/study/',
  'src/hooks/',
  'src/lib/assistant/',
  'src/pages/',
  'src/services/',
]

const hits = scanSourceTree('src')
const isPending = (file) => PENDING.some((prefix) => file.startsWith(prefix))

test('no hay castellano visible fuera de las áreas pendientes', () => {
  const leaks = hits
    .filter((hit) => !isPending(hit.file))
    .map((hit) => `${hit.file}:${hit.line}  "${hit.text}"`)
  assert.deepEqual(leaks, [], `Texto en castellano sin pasar por t():\n${leaks.slice(0, 40).join('\n')}`)
})

test('cada prefijo de PENDING todavía tiene castellano (si no, hay que borrarlo)', () => {
  const stale = PENDING.filter((prefix) => !hits.some((hit) => hit.file.startsWith(prefix)))
  assert.deepEqual(stale, [], `Estos prefijos ya están limpios, borrarlos de PENDING: ${stale.join(', ')}`)
})
