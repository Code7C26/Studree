// Config del asistente (el Brote). Único lugar con números y nombres de topes:
// el servidor y el cliente leen de acá; no se hardcodea nada en otro lado.
//
// ⚠️ Los valores de LIMITS son PROVISORIOS: los define el equipo antes de salir.

/** Acciones registradas en `ai_usage.action` (+ 'quiz_grade', que no se cuenta). */
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
  quiz_grade: null,
}

/** Topes por plan y balde: `{period, max}` o `null` = sin tope. PROVISORIOS. */
export const LIMITS = {
  free: {
    chat: { period: 'day', max: 20 },
    summary: { period: 'month', max: 3 },
    quiz: { period: 'month', max: 3 },
    extras: { period: 'month', max: 0 },
    external: { period: 'day', max: 5 },
  },
  premium: {
    chat: { period: 'day', max: 200 },
    summary: null,
    quiz: null,
    extras: null,
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
}
