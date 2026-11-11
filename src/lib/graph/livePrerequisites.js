/**
 * Correlativas que unen dos materias VISIBLES. Una materia en la papelera no se
 * borra de verdad, así que sus correlativas siguen en la base: si no se
 * filtran, el canvas dibujaría una arista colgada y la materia que depende de
 * ella figuraría "bloqueada" por algo que el usuario ya no ve.
 *
 * @param {import('../../types/models.js').Prerequisite[]} prerequisites
 * @param {Array<{id: string}>} subjects - Materias vivas.
 * @returns {import('../../types/models.js').Prerequisite[]}
 */
export function livePrerequisites(prerequisites, subjects) {
  const ids = new Set(subjects.map((subject) => subject.id))
  return prerequisites.filter((p) => ids.has(p.subject_id) && ids.has(p.requires_id))
}
