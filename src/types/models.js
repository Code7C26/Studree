/**
 * Typedefs JSDoc del modelo de datos de Studree.
 * Fuente de verdad documentada en docs/DB_SCHEMA.md.
 * Este archivo no exporta código: solo define tipos reutilizables vía JSDoc.
 */

/**
 * Materia (el "tronco" de un árbol de conocimiento).
 * @typedef {Object} Subject
 * @property {string} id        - Identificador único.
 * @property {string} name      - Nombre de la materia.
 * @property {string} [color]   - Color del árbol (default: acento verde).
 * @property {number} createdAt - Timestamp de creación.
 * @property {number} updatedAt - Timestamp de última modificación.
 */

/**
 * Nodo del árbol (una "rama" / tema o una "hoja" / contenedor de recurso).
 * @typedef {Object} TreeNode
 * @property {string} id                     - Identificador único.
 * @property {string} subjectId              - Materia a la que pertenece.
 * @property {string|null} parentId          - Nodo padre (null = raíz/tronco).
 * @property {string} label                  - Texto visible del nodo.
 * @property {'branch'|'leaf'} type          - Rama (tema) u hoja (recurso).
 * @property {{x:number, y:number}} position - Posición en el lienzo (React Flow).
 * @property {number} createdAt              - Timestamp de creación.
 */

/**
 * Recurso (el contenido de una "hoja": apunte, archivo, enlace o video).
 * @typedef {Object} Resource
 * @property {string} id                          - Identificador único.
 * @property {string} nodeId                       - Nodo al que pertenece.
 * @property {'note'|'file'|'link'|'video'} type  - Tipo de recurso.
 * @property {string} title                        - Título del recurso.
 * @property {string} content                      - Texto (note) o URL (link/video/file).
 * @property {number} createdAt                    - Timestamp de creación.
 */

/**
 * Preferencias del usuario.
 * @typedef {Object} Settings
 * @property {'dark'|'light'} theme - Tema (default: 'dark').
 */

export {}
