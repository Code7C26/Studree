/**
 * Árbol completo del workspace: Carrera → Materia → Hoja (ADR-014).
 * Ver docs/features/navigation-shell.md.
 *
 * Se carga entero de una vez (no de a un nivel por click): para uso de estudio
 * personal el volumen de filas es chico, y así el mismo árbol le sirve tanto
 * al explorador (jerárquico) como al command palette (búsqueda plana), sin
 * pedirle datos a Supabase cada vez que se abre uno u otro.
 */

import { useCallback, useEffect, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService, SHEET_SUMMARY_COLUMNS } from '../services/sheets.service.js'
import { onDataChanged } from '../services/dataEvents.js'

/** Service correcto por nivel, para el rename desde el explorador. */
const SERVICES_BY_TYPE = {
  career: careersService,
  subject: subjectsService,
  sheet: sheetsService,
}

/** Columna de FK al padre por nivel (`null` para carrera: no tiene padre). */
const PARENT_FIELD_BY_TYPE = {
  career: null,
  subject: 'career_id',
  sheet: 'subject_id',
}

/**
 * @typedef {Object} SearchEntry
 * @property {'subject'|'sheet'} type
 * @property {string} id
 * @property {string} name
 * @property {string[]} path - Nombres de los ancestros, del más alto al más cercano.
 * @property {string} careerId
 * @property {string} subjectId
 */

/** Agrupa filas por su columna de FK al padre. */
function groupBy(rows, field) {
  const groups = new Map()
  for (const row of rows ?? []) {
    if (!groups.has(row[field])) groups.set(row[field], [])
    groups.get(row[field]).push(row)
  }
  return groups
}

/**
 * @returns {{
 *   careers: Array<Object>,
 *   searchIndex: SearchEntry[],
 *   loading: boolean,
 *   error: string|null,
 *   reload: () => void,
 *   renameEntity: (type: 'career'|'subject'|'sheet', id: string, name: string, node: Object) => Promise<string|null>,
 * }}
 */
export function useExplorerTree() {
  const [careers, setCareers] = useState([])
  const [searchIndex, setSearchIndex] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    // 3 consultas en total, una por nivel (RLS ya filtra por usuario; cada
    // una pagina, así que no se corta en 1000 filas). Las hojas vienen SIN
    // `content_md`: la búsqueda por contenido la hace el servidor
    // (sheetsService.searchContent), no hace falta bajar todos los apuntes.
    const [careersResult, subjectsResult, sheetsResult] = await Promise.all([
      careersService.list(),
      subjectsService.list(),
      sheetsService.list(undefined, undefined, { columns: SHEET_SUMMARY_COLUMNS }),
    ])

    if (careersResult.error) {
      setError(careersResult.error)
      setCareers([])
      setSearchIndex([])
      setLoading(false)
      return
    }

    const subjectsByCareer = groupBy(subjectsResult.data, 'career_id')
    const sheetsBySubject = groupBy(sheetsResult.data, 'subject_id')

    const index = []
    const tree = (careersResult.data ?? []).map((career) => ({
      ...career,
      subjects: (subjectsByCareer.get(career.id) ?? []).map((subject) => {
        const base = { careerId: career.id, subjectId: subject.id }
        index.push({ type: 'subject', id: subject.id, name: subject.name, path: [career.name], ...base })

        const sheets = sheetsBySubject.get(subject.id) ?? []
        for (const sheet of sheets) {
          index.push({ type: 'sheet', id: sheet.id, name: sheet.title, path: [career.name, subject.name], ...base })
        }
        return { ...subject, sheets }
      }),
    }))

    setCareers(tree)
    setSearchIndex(index)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Se re-arma cuando cualquier pantalla crea / renombra / borra algo
  // (services/dataEvents.js). Con debounce: crear una materia con su
  // correlativa, o borrar varias cosas seguidas, dispara una sola recarga.
  useEffect(() => {
    let timer = null
    const unsubscribe = onDataChanged(() => {
      clearTimeout(timer)
      timer = setTimeout(load, 300)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [load])

  /**
   * Renombra una carrera, materia u hoja desde el explorador.
   * Las hojas usan `title`, el resto usa `name` (ver docs/DB_SCHEMA.md).
   *
   * @param {'career'|'subject'|'sheet'} type
   * @param {string} id
   * @param {string} name
   * @param {Object} node - El nodo del árbol (de ahí sale el `parentId`, sin recorrerlo de nuevo).
   * @returns {Promise<string|null>} Mensaje de error, o `null` si salió bien.
   */
  const renameEntity = useCallback(
    async (type, id, name, node) => {
      const trimmed = name.trim()
      if (!trimmed) return 'El nombre no puede estar vacío.'

      const service = SERVICES_BY_TYPE[type]
      const parentField = PARENT_FIELD_BY_TYPE[type]
      const parentId = parentField ? node[parentField] : undefined
      const values = type === 'sheet' ? { title: trimmed } : { name: trimmed }

      const { error: renameError } = await service.update(id, values, parentId)
      if (renameError) return renameError

      await load()
      return null
    },
    [load],
  )

  return { careers, searchIndex, loading, error, reload: load, renameEntity }
}
