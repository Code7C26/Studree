// Cuotas y acceso por plan del asistente. Funciones puras (sin red ni base).
import { BUCKET_OF, LIMITS, FEATURES } from './config.js'

/** Inicio (UTC) del período en curso. */
export function periodStart(period, now) {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  if (period === 'month') return new Date(Date.UTC(y, m, 1))
  if (period === 'day') return new Date(Date.UTC(y, m, now.getUTCDate()))
  throw new Error(`Período desconocido: ${period}`)
}

/** Plan efectivo: cualquier cosa que no sea 'premium' cuenta como 'free'. */
export function planOf(row) {
  return row && row.plan === 'premium' ? 'premium' : 'free'
}

/**
 * Qué conteos hay que consultar en `ai_usage` antes de responder.
 * Vacío si el plan no tiene tope para la acción.
 */
export function requiredCounts({ plan, action, external, now }) {
  const limits = LIMITS[plan] || LIMITS.free
  const out = []
  const bucket = BUCKET_OF[action]
  if (bucket && limits[bucket]) {
    out.push({
      key: bucket,
      actions: Object.keys(BUCKET_OF).filter((a) => BUCKET_OF[a] === bucket),
      external: false,
      since: periodStart(limits[bucket].period, now).toISOString(),
    })
  }
  if (bucket && external && limits.external) {
    out.push({
      key: 'external',
      actions: Object.keys(BUCKET_OF).filter((a) => BUCKET_OF[a] !== null),
      external: true,
      since: periodStart(limits.external.period, now).toISOString(),
    })
  }
  return out
}

const FEATURE_OF_ACTION = {
  weak_review: 'weakReview',
  study_plan: 'studyPlan',
  connections: 'connections',
}

const FEATURE_MESSAGES = {
  allScope: 'Preguntar sobre toda la carrera o todas tus materias es parte de Premium.',
  weakReview: 'El repaso de temas flojos es parte de Premium.',
  studyPlan: 'El plan de estudio es parte de Premium.',
  connections: 'Las conexiones entre temas son parte de Premium.',
}

const QUOTA_MESSAGES = {
  chat: 'Llegaste al tope de preguntas de hoy. Probá mañana o pasate a Premium.',
  summary: 'Llegaste al tope de resúmenes de este mes. Probá el mes que viene o pasate a Premium.',
  quiz: 'Llegaste al tope de pruebas de este mes. Probá el mes que viene o pasate a Premium.',
  extras: 'Esta función extra es parte de Premium.',
  external: 'Llegaste al tope de consultas con búsqueda externa de hoy. Probá mañana o pasate a Premium.',
}

const UNVERIFIED = 'No pudimos verificar tu uso. Probá de nuevo.'

/**
 * Decide si se puede atender el pedido. Falla CERRADO: si el plan tiene tope y
 * falta el conteo, se deniega.
 *
 * Acople: el llamador debe pasar `counts` con TODAS las claves que devuelve
 * `requiredCounts` y el mismo `external` con el que llamó a `requiredCounts`.
 */
export function decideAccess({ plan, action, scope, counts, external = false }) {
  const features = FEATURES[plan] || FEATURES.free
  const limits = LIMITS[plan] || LIMITS.free
  const used = counts || {}

  const feature = FEATURE_OF_ACTION[action]
  if (feature && !features[feature]) {
    return { allowed: false, code: 'feature', message: FEATURE_MESSAGES[feature] }
  }
  if (scope && (scope.type === 'all' || scope.type === 'career') && !features.allScope) {
    return { allowed: false, code: 'feature', message: FEATURE_MESSAGES.allScope }
  }

  const bucket = BUCKET_OF[action]
  if (!bucket) return { allowed: true }
  const keys = [bucket]
  if (external === true) keys.push('external')
  for (const key of keys) {
    const limit = limits[key]
    if (!limit) continue
    if (!Number.isFinite(used[key])) {
      return { allowed: false, code: 'quota', message: UNVERIFIED }
    }
    if (used[key] >= limit.max) {
      return { allowed: false, code: 'quota', message: QUOTA_MESSAGES[key] }
    }
  }
  return { allowed: true }
}
