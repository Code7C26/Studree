/**
 * Typedefs JSDoc del modelo de datos de Studree.
 * Fuente de verdad documentada en docs/DB_SCHEMA.md y en
 * supabase/migrations/0001_init.sql (ADR-010).
 * Este archivo no exporta código: solo define tipos reutilizables vía JSDoc.
 *
 * Jerarquía (ADR-014): Career → Subject → Sheet
 *            Subject ←→ Prerequisite (correlativas entre materias)
 * Las hojas de una materia se ven como una carpeta continua (ADR-017).
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
 * @property {string|null} [deleted_at] - Papelera (0006): NULL = vivo.
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
 * @property {string|null} [deleted_at] - Papelera (0006): NULL = vivo.
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
 * Hoja: una página de la carpeta de una materia (ADR-017). No tiene título: se
 * identifica por su fecha de creación. Los temas son los headings `#` de su
 * contenido.
 * @typedef {Object} Sheet
 * @property {string} id          - UUID (en la carpeta, `local:…` mientras no se guardó).
 * @property {string} subject_id  - Materia a la que pertenece.
 * @property {string} [user_id]   - Dueño.
 * @property {string|null} [title] - LEGADO: siempre null desde la migración 0004.
 * @property {string} content_md  - Contenido en MARKDOWN (fuente de verdad, ADR-011).
 * @property {number} [position]  - LEGADO: el orden es por `created_at`.
 * @property {string} created_at  - Timestamp ISO: define el orden y lo que se muestra.
 * @property {string|null} updated_at - Timestamp ISO. Solo cambia con el contenido.
 * @property {string|null} [deleted_at] - Papelera (0006): NULL = vivo.
 */

/**
 * Elemento de primer nivel de la papelera (`list_trash`, migración 0006).
 * @typedef {Object} TrashItem
 * @property {'career'|'subject'|'sheet'} kind
 * @property {string} id
 * @property {string} deleted_at
 * @property {string} label - Nombre (carrera/materia) o primeros 300 caracteres del Markdown (hoja).
 * @property {string|null} sheet_created_at - Solo hojas.
 * @property {string|null} career_name - Materias y hojas.
 * @property {string|null} subject_name - Solo hojas.
 * @property {number} subjects_count
 * @property {number} sheets_count
 * @property {number} attachments_count
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
 * Adjunto de una hoja (migración 0006).
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} sheet_id
 * @property {string} name - Nombre original (con tildes).
 * @property {string} mime_type
 * @property {number} size_bytes
 * @property {string} storage_path - `<user_id>/<id>/<nombre seguro>` en el bucket `attachments`.
 * @property {string} created_at
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
