/**
 * Cálculo del estado EFECTIVO de las materias (ver docs/features/career-map.md).
 *
 * `bloqueada` no se guarda en la base a propósito: es una función de las
 * correlativas y del estado de las demás materias. Persistirlo quedaría
 * desincronizado apenas el usuario aprueba una materia, y habría que recalcular
 * media carrera en cada UPDATE.
 *
 * Regla: una materia está bloqueada si le falta aprobar alguna correlativa de
 * tipo 'cursar'. Las de tipo 'rendir' condicionan el final, no la cursada, así
 * que NO bloquean.
 */

import { SUBJECT_STATUS, BLOCKED_STATUS } from '../../constants/subjectStatus.js'
import { PREREQUISITE_KINDS } from '../../constants/prerequisiteKinds.js'
import { getLang, tIn } from '../i18n/index.js'

/**
 * Información derivada de una materia.
 * @typedef {Object} SubjectState
 * @property {import('../../types/models.js').EffectiveStatus} status - Estado efectivo.
 * @property {boolean} blocked - Si le falta alguna correlativa para cursar.
 * @property {import('../../types/models.js').Subject[]} missingToEnroll - Materias que le faltan aprobar para cursar.
 * @property {import('../../types/models.js').Subject[]} missingToPass - Materias que le faltan aprobar para rendir el final.
 */

/**
 * Calcula el estado efectivo de cada materia de una carrera.
 *
 * @param {import('../../types/models.js').Subject[]} subjects
 * @param {import('../../types/models.js').Prerequisite[]} prerequisites
 * @returns {Map<string, SubjectState>} id de materia → estado derivado.
 */
export function computeSubjectStates(subjects, prerequisites) {
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

  /** @type {Map<string, SubjectState>} */
  const states = new Map()
  for (const subject of subjects) {
    states.set(subject.id, {
      status: subject.status,
      blocked: false,
      missingToEnroll: [],
      missingToPass: [],
    })
  }

  for (const prerequisite of prerequisites) {
    const state = states.get(prerequisite.subject_id)
    const required = subjectsById.get(prerequisite.requires_id)

    // Una correlativa puede apuntar a una materia de otra carrera (o borrada):
    // si no está en la lista, no se puede evaluar y se ignora.
    if (!state || !required) continue
    if (required.status === SUBJECT_STATUS.aprobada) continue

    if (prerequisite.kind === PREREQUISITE_KINDS.cursar) {
      state.missingToEnroll.push(required)
    } else if (prerequisite.kind === PREREQUISITE_KINDS.rendir) {
      state.missingToPass.push(required)
    }
    // 'relacion' solo une dos materias: no es requisito y no bloquea nada.
  }

  for (const [id, state] of states) {
    const declared = subjectsById.get(id).status
    state.blocked = state.missingToEnroll.length > 0

    // Lo que el usuario declara manda: si ya la aprobó o la está cursando, no se
    // la marca como bloqueada aunque falte una correlativa (puede haber rendido
    // libre, tener una equivalencia o una excepción de la facultad).
    const isDeclared =
      declared === SUBJECT_STATUS.aprobada || declared === SUBJECT_STATUS.cursando

    state.status = !isDeclared && state.blocked ? BLOCKED_STATUS : declared
  }

  return states
}

/**
 * Texto que explica por qué una materia está bloqueada.
 * Un candado sin decir qué falta no es accionable.
 * @param {SubjectState} state
 * @param {string} [lang]
 * @returns {string|null} null si no está bloqueada.
 */
export function describeBlockReason(state, lang = getLang()) {
  if (!state.blocked || state.missingToEnroll.length === 0) return null
  const names = state.missingToEnroll.map((subject) => subject.name).join(', ')
  return tIn(lang, 'careerMap.blockReason', { names })
}

/**
 * Progreso de una carrera: cuántas materias están aprobadas.
 * @param {import('../../types/models.js').Subject[]} subjects
 * @returns {{approved: number, total: number, percent: number}}
 */
export function computeCareerProgress(subjects) {
  const total = subjects.length
  const approved = subjects.filter((s) => s.status === SUBJECT_STATUS.aprobada).length
  return {
    approved,
    total,
    percent: total === 0 ? 0 : Math.round((approved / total) * 100),
  }
}
