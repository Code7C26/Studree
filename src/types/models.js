/**
 * Typedefs JSDoc del modelo de datos de Studree.
 * Fuente de verdad documentada en docs/DB_SCHEMA.md y en
 * supabase/migrations/0001_init.sql (ADR-010).
 * Este archivo no exporta código: solo define tipos reutilizables vía JSDoc.
 *
 * Jerarquía: Career → Subject → Unit → Topic → Sheet
 *            Subject ←→ Prerequisite (correlativas entre materias)
 *
 * Nota: los campos usan snake_case porque son las columnas tal cual llegan de
 * Postgres; no se renombran para evitar una capa de mapeo innecesaria.
 */

/**
 * Carrera o curso (la raíz del árbol).
 * @typedef {Object} Career
 * @property {string} id         - UUID.
 * @property {string} user_id    - Dueño (lo pone Postgres con `default auth.uid()`).
 * @property {string} name       - Nombre de la carrera.
 * @property {string} color      - Color (hex de la paleta, ver constants/palette.js).
 * @property {string} created_at - Timestamp ISO.
 * @property {string} updated_at - Timestamp ISO.
 */

/**
 * Materia (el "tronco"). Puede tener correlativas con otras materias.
 * @typedef {Object} Subject
 * @property {string} id          - UUID.
 * @property {string} career_id   - Carrera a la que pertenece.
 * @property {string} user_id     - Dueño.
 * @property {string} name        - Nombre de la materia.
 * @property {string} color       - Color (hex de la paleta).
 * @property {SubjectStatus} status - Estado DECLARADO por el usuario.
 * @property {number} position    - Orden dentro de la carrera (NO es coordenada).
 * @property {string} created_at  - Timestamp ISO.
 * @property {string} updated_at  - Timestamp ISO.
 */

/**
 * Estado que el usuario declara para una materia.
 * OJO: `bloqueada` NO está acá porque es un valor DERIVADO de las correlativas,
 * no se persiste. Ver `src/lib/graph/subjectStatus.js` y docs/DB_SCHEMA.md.
 * @typedef {'pendiente'|'cursando'|'aprobada'} SubjectStatus
 */

/**
 * Estado efectivo de una materia, ya calculado (incluye `bloqueada`).
 * @typedef {'pendiente'|'cursando'|'aprobada'|'bloqueada'} EffectiveStatus
 */

/**
 * Correlativa: arista dirigida entre dos materias.
 * Semántica: la materia `subject_id` REQUIERE que `requires_id` esté aprobada.
 * El conjunto de correlativas debe formar un DAG (ADR-009).
 * @typedef {Object} Prerequisite
 * @property {string} id          - UUID.
 * @property {string} user_id     - Dueño.
 * @property {string} subject_id  - La materia condicionada.
 * @property {string} requires_id - La materia requerida.
 * @property {PrerequisiteKind} kind - Si condiciona cursar o rendir.
 */

/**
 * Tipo de correlativa (son requisitos distintos en la facultad).
 * - `cursar`: debe estar aprobada para poder CURSAR la materia. Es la única que
 *   participa del cálculo de `bloqueada`.
 * - `rendir`: debe estar aprobada para poder RENDIR EL FINAL de la materia.
 * @typedef {'cursar'|'rendir'} PrerequisiteKind
 */

/**
 * Unidad de una materia (primer nivel del canvas de materia).
 * @typedef {Object} Unit
 * @property {string} id         - UUID.
 * @property {string} subject_id - Materia a la que pertenece.
 * @property {string} user_id    - Dueño.
 * @property {string} name       - Nombre de la unidad.
 * @property {number} position   - Orden dentro de la materia.
 * @property {string} created_at - Timestamp ISO.
 */

/**
 * Tema de una unidad (segundo nivel del canvas; el canvas corta acá).
 * @typedef {Object} Topic
 * @property {string} id         - UUID.
 * @property {string} unit_id    - Unidad a la que pertenece.
 * @property {string} user_id    - Dueño.
 * @property {string} name       - Nombre del tema.
 * @property {number} position   - Orden dentro de la unidad.
 * @property {string} created_at - Timestamp ISO.
 */

/**
 * Hoja: el documento de apuntes. Es la unidad mínima de contenido.
 * @typedef {Object} Sheet
 * @property {string} id         - UUID.
 * @property {string} topic_id   - Tema al que pertenece.
 * @property {string} user_id    - Dueño.
 * @property {string} title      - Título de la hoja.
 * @property {string} content_md - Contenido en MARKDOWN (fuente de verdad, ADR-011).
 * @property {number} position   - Orden dentro del tema.
 * @property {string} created_at - Timestamp ISO.
 * @property {string} updated_at - Timestamp ISO.
 */

/**
 * Resultado normalizado de cualquier operación de un service.
 * Los services NO propagan el error crudo de supabase-js: lo traducen a string
 * para que la UI no dependa de la forma de error del proveedor (ver API_DOCS.md).
 * @template T
 * @typedef {Object} ServiceResult
 * @property {T|null} data
 * @property {string|null} error - Mensaje listo para mostrar, o null si salió bien.
 */

/**
 * Estado de sincronización que los hooks exponen a la UI (ADR-007).
 * @typedef {'idle'|'saving'|'saved'|'error'} SyncStatus
 */

export {}
