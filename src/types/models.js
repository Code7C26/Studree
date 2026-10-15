/**
 * Typedefs JSDoc del modelo de datos de Studree.
 * Fuente de verdad documentada en docs/DB_SCHEMA.md y en
 * supabase/migrations/0001_init.sql (ADR-010).
 * Este archivo no exporta código: solo define tipos reutilizables vía JSDoc.
 *
 * Jerarquía (ADR-014): Career → Subject → Sheet
 *            Subject ←→ Prerequisite (correlativas entre materias)
 *            Sheet   ←→ SheetLink    (`[[links]]` entre hojas, ADR-015)
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
 * @property {boolean} uses_prerequisites - false = curso / organizador sin correlativas (ADR-013).
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
 * @property {number|null} [pos_x] - Posición manual en el canvas de carrera (ADR-012).
 * @property {number|null} [pos_y]
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
 * Hoja: el documento de apuntes. Es la unidad mínima de contenido y el nodo
 * del canvas de materia (ADR-014).
 * @typedef {Object} Sheet
 * @property {string} id          - UUID.
 * @property {string} subject_id  - Materia a la que pertenece.
 * @property {string} user_id     - Dueño.
 * @property {string} title       - Título, único por materia (sin distinguir mayúsculas).
 * @property {string} content_md  - Contenido en MARKDOWN (fuente de verdad, ADR-011).
 *   Puede no venir si la consulta usó `SHEET_SUMMARY_COLUMNS`.
 * @property {number} position    - Orden dentro de la materia (NO es coordenada).
 * @property {number|null} pos_x  - Posición manual en el canvas (ADR-012); null = auto-layout.
 * @property {number|null} pos_y
 * @property {string|null} [topic_id] - LEGADO (modelo de 5 niveles). No se usa.
 * @property {string} created_at  - Timestamp ISO.
 * @property {string} updated_at  - Timestamp ISO. Solo cambia con el título o el contenido.
 */

/**
 * Link entre hojas: la hoja `source_id` contiene `[[título de target]]`.
 * Es un ÍNDICE derivado del Markdown por la base (trigger, ADR-015): el
 * cliente nunca lo escribe directo.
 * @typedef {Object} SheetLink
 * @property {string} id
 * @property {string} source_id - Hoja que escribe el `[[link]]`.
 * @property {string} target_id - Hoja enlazada.
 */

/**
 * Fecha importante del Inicio (migración 0005).
 * @typedef {Object} ImportantDate
 * @property {string} id
 * @property {string} title
 * @property {string} date - `YYYY-MM-DD` (día local, sin hora).
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Tarea del Inicio (migración 0005).
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} text
 * @property {string|null} due_date - `YYYY-MM-DD` o null.
 * @property {string|null} done_at - null = pendiente.
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Nota rápida del Inicio (migración 0005).
 * @typedef {Object} QuickNote
 * @property {string} id
 * @property {string} body
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * Última hoja editada, ya reducida para "Seguí donde dejaste".
 * @typedef {Object} LastSheet
 * @property {string} id
 * @property {string} subject_id
 * @property {string} updated_at
 * @property {string} subject_name
 * @property {string|null} subject_color
 * @property {string} preview - Primer renglón con texto ('' si la hoja está vacía).
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
