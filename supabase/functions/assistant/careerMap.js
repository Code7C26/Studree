// Mapa de carrera en Markdown para el asistente: carreras > materias > hojas
// (con sus temas). Es el "índice" que se le pasa a la IA para que elija qué
// hojas leer. Función pura: recibe las filas ya leídas de la base.

import { MAX } from './config.js'
import { extractTopics } from './topics.js'

const EMPTY = 'Todavía no hay apuntes.'
const CUT_NOTE = '(mapa recortado: pedí una materia en particular)'
const NAME_MAX = 120
const TOPICS_MAX = 300

const pad = (n) => String(n).padStart(2, '0')

/** Fecha local `DD/MM/AA HH:mm` (las hojas no tienen título: se identifican por fecha). */
function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'sin fecha'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${pad(d.getFullYear() % 100)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/**
 * @param {{
 *   careers: Array<{id: string, name: string, deleted_at?: string | null}>,
 *   subjects: Array<{id: string, career_id: string, name: string, deleted_at?: string | null}>,
 *   sheets: Array<{id: string, subject_id: string, created_at: string, content_md?: string | null, deleted_at?: string | null}>,
 *   onlySubjectId?: string,
 * }} input
 * @returns {string}
 */
export function buildMapMarkdown({ careers, subjects, sheets, onlySubjectId }) {
  const liveCareers = careers.filter((c) => !c.deleted_at)
  const careerIds = new Set(liveCareers.map((c) => c.id))
  const liveSubjects = subjects.filter(
    (s) => !s.deleted_at && careerIds.has(s.career_id) && (!onlySubjectId || s.id === onlySubjectId),
  )

  const sheetsOf = new Map()
  for (const sheet of sheets) {
    if (sheet.deleted_at) continue
    if (!sheetsOf.has(sheet.subject_id)) sheetsOf.set(sheet.subject_id, [])
    sheetsOf.get(sheet.subject_id).push(sheet)
  }

  const lines = []
  for (const career of liveCareers) {
    const careerLines = []
    for (const subject of liveSubjects.filter((s) => s.career_id === career.id)) {
      const own = (sheetsOf.get(subject.id) ?? []).sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
      if (own.length === 0) continue
      careerLines.push(`## ${clip(subject.name, NAME_MAX)} (materia ${subject.id})`)
      for (const sheet of own) {
        const topics = extractTopics(sheet.content_md)
        const list = topics.length ? clip(topics.join('; '), TOPICS_MAX) : '(sin temas)'
        careerLines.push(`- hoja ${sheet.id} · ${formatDate(sheet.created_at)} · temas: ${list}`)
      }
    }
    if (careerLines.length === 0) continue
    lines.push(`# ${clip(career.name, NAME_MAX)}`, ...careerLines)
  }

  if (lines.length === 0) return EMPTY

  // Se corta por líneas enteras para no dejar una hoja a medias.
  let out = ''
  for (const line of lines) {
    const next = out ? `${out}\n${line}` : line
    if (next.length > MAX.mapChars) return `${out}\n${CUT_NOTE}`
    out = next
  }
  return out
}
