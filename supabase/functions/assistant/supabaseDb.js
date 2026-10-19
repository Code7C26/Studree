// Acceso a datos del asistente (solo lectura), con el cliente de supabase-js
// creado con el JWT del USUARIO: la RLS aplica siempre. Nunca service_role.
//
// Regla: toda consulta a careers|subjects|sheets filtra `deleted_at is null`
// (las herramientas ignoran la papelera). `weak_topics` no tiene `deleted_at`.

const PAGE = 1000
const SEARCH_LIMIT = 8
const WEAK_LIMIT = 50
const AGENDA_DAYS = 60
const AGENDA_LIMIT = 50
const SHEET_COLS = 'id,subject_id,created_at,updated_at'

/** Igual que `escapeLike` de `sheets.service.js`: `%` y `\` pasan a `_` (comodín de un carácter). */
const escapeLike = (text) => text.replace(/[\\%]/g, '_')

function check({ data, error }) {
  if (error) throw new Error(error.message ?? 'Error de base de datos')
  return data
}

/** Trae todas las filas pidiendo de a 1000 (PostgREST corta ahí). */
async function fetchAll(makeQuery) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const page = check(await makeQuery().range(from, from + PAGE - 1)) ?? []
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

/** Suma días a una fecha ISO `YYYY-MM-DD` (en UTC). */
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {any} client cliente de supabase-js con el JWT del usuario
 */
export function createDb(client) {
  return {
    /** Árbol completo SIN `content_md` (liviano). */
    async loadTree() {
      const live = (table, cols) => () =>
        client.from(table).select(cols).is('deleted_at', null).order('id', { ascending: true })
      const [careers, subjects, sheets] = await Promise.all([
        fetchAll(live('careers', 'id,name')),
        fetchAll(live('subjects', 'id,career_id,name')),
        fetchAll(live('sheets', SHEET_COLS)),
      ])
      return { careers, subjects, sheets }
    },

    async getSheet(id) {
      const data = check(
        await client
          .from('sheets')
          .select(`${SHEET_COLS},content_md`)
          .eq('id', id)
          .is('deleted_at', null)
          .maybeSingle(),
      )
      return data ?? null
    },

    async listSheetsBySubject(subjectId) {
      return fetchAll(() =>
        client
          .from('sheets')
          .select(`${SHEET_COLS},content_md`)
          .eq('subject_id', subjectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
      )
    },

    async searchSheets(query, subjectId) {
      const text = String(query ?? '').trim()
      if (!text) return []
      let q = client
        .from('sheets')
        .select('id,subject_id,content_md,subjects!inner(deleted_at)')
        .ilike('content_md', `%${escapeLike(text)}%`)
        .is('deleted_at', null)
        .is('subjects.deleted_at', null)
      if (subjectId) q = q.eq('subject_id', subjectId)
      const rows = check(await q.order('updated_at', { ascending: false }).limit(SEARCH_LIMIT)) ?? []
      return rows.map(({ id, subject_id, content_md }) => ({ id, subject_id, content_md }))
    },

    async listAgenda(todayISO) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayISO))) throw new Error('Fecha inválida')
      const end = addDays(todayISO, AGENDA_DAYS)
      const [dates, tasks] = await Promise.all([
        client
          .from('important_dates')
          .select('title,date')
          .gte('date', todayISO)
          .lte('date', end)
          .order('date', { ascending: true })
          .limit(AGENDA_LIMIT),
        client
          .from('tasks')
          .select('text,due_date')
          .is('done_at', null)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(AGENDA_LIMIT),
      ])
      return { dates: check(dates) ?? [], tasks: check(tasks) ?? [] }
    },

    /**
     * Temas flojos del usuario. `weak_topics` no tiene `deleted_at` (ni se borra en
     * cascada con la papelera): se descartan los de materias en la papelera.
     * `subjectIds` filtra en la base, ANTES del tope (sin lista = todas).
     * @param {string[]} [subjectIds]
     */
    async listWeakTopics(subjectIds) {
      if (Array.isArray(subjectIds) && subjectIds.length === 0) return []
      let q = client
        .from('weak_topics')
        .select('subject_id,sheet_id,topic,misses,subjects!inner(deleted_at)')
        .is('subjects.deleted_at', null)
      if (subjectIds) q = q.in('subject_id', subjectIds)
      const rows = check(await q.order('misses', { ascending: false }).limit(WEAK_LIMIT)) ?? []
      return rows.map(({ subject_id, sheet_id, topic, misses }) => ({ subject_id, sheet_id, topic, misses }))
    },
  }
}
