// Config del asistente (el Brote). Único lugar con números y nombres de topes:
// el servidor y el cliente leen de acá; no se hardcodea nada en otro lado.
//
// ⚠️ Los valores de LIMITS son PROVISORIOS: los define el equipo antes de salir.

/** Acciones registradas en `ai_usage.action` ('quiz_grade' desde la migración 0008). */
export const ACTIONS = [
  'chat',
  'shortcut',
  'summary',
  'quiz',
  'weak_review',
  'study_plan',
  'gaps',
  'connections',
  'quiz_grade',
]

/** Balde de tope de cada acción (`null` = no consume cupo). */
export const BUCKET_OF = {
  chat: 'chat',
  shortcut: 'chat',
  summary: 'summary',
  quiz: 'quiz',
  weak_review: 'quiz',
  study_plan: 'extras',
  gaps: 'extras',
  connections: 'extras',
  // La corrección también llama a Gemini: tiene su propio balde (Ruling L).
  quiz_grade: 'grade',
}

/** Topes por plan y balde: `{period, max}` o `null` = sin tope. PROVISORIOS. */
export const LIMITS = {
  free: {
    chat: { period: 'day', max: 20 },
    summary: { period: 'month', max: 3 },
    quiz: { period: 'month', max: 3 },
    // Ruling P: free usa `gaps` dentro de este tope; `study_plan` y
    // `connections` siguen bloqueados por FEATURES.
    extras: { period: 'month', max: 3 },
    grade: { period: 'day', max: 10 },
    external: { period: 'day', max: 5 },
  },
  premium: {
    chat: { period: 'day', max: 200 },
    summary: null,
    quiz: null,
    extras: null,
    grade: { period: 'day', max: 100 },
    external: { period: 'day', max: 100 },
  },
}

/** Funciones habilitadas por plan. */
export const FEATURES = {
  free: { allScope: false, weakReview: false, studyPlan: false, connections: false },
  premium: { allScope: true, weakReview: true, studyPlan: true, connections: true },
}

/** Máximos de entrada/salida (caracteres o cantidades). */
export const MAX = {
  message: 4000,
  history: 20,
  selection: 6000,
  quizQuestions: 15,
  mapChars: 24000,
  sheetChars: 12000,
  proposalChars: 8000,
  /** Cuerpo del pedido HTTP (15 respuestas de prueba × 3 textos de 4000 entran holgados). */
  bodyChars: 256000,
  /** Contenido total de hojas que se le pasa al modelo para armar una prueba. */
  quizSourceChars: 30000,
  /** Materias que se recorren como máximo para juntar hojas de una prueba. */
  quizSourceSubjects: 8,
}

/** Prueba por defecto si el pedido no trae `quiz`. */
export const QUIZ_DEFAULTS = { count: 5, types: ['mcq', 'tf', 'open'] }

/** Tiempo máximo de cada llamada a Gemini (ms); también se corta si el cliente se desconecta. */
export const GEMINI_TIMEOUT_MS = 60000

/**
 * Plazo total de un pedido (ms), sumando todos los pasos con herramientas.
 * Supabase corta la función cerca de los 150 s de reloj: sin este plazo, 6
 * pasos × GEMINI_TIMEOUT_MS podían pasarse y el stream moría sin aviso.
 */
export const REQUEST_DEADLINE_MS = 120000
