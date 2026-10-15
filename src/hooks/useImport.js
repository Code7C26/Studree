/**
 * Importar `.md`/`.zip` (ver docs/features/import.md): leer los archivos,
 * armar el plan con su resumen, ejecutarlo con progreso y dejar el informe.
 */

import { useCallback, useRef, useState } from 'react'
import { careersService } from '../services/careers.service.js'
import { subjectsService } from '../services/subjects.service.js'
import { sheetsService } from '../services/sheets.service.js'
import { importService } from '../services/import.service.js'
import { buildImportPlan, markDuplicates, summarizePlan, describeSummary } from '../lib/import/plan.js'

/**
 * Lee los archivos elegidos: `.md` sueltos y el contenido de los `.zip`.
 * @param {File[]} files
 */
async function readEntries(files) {
  const mdEntries = []
  const filePaths = []
  /** @type {Map<string, () => Promise<Blob>>} */
  const readers = new Map()
  let JSZip = null

  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      // Dinámico, como en el export: jszip no va en el bundle inicial.
      JSZip = JSZip ?? (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue
        // Los .zip hechos en Windows pueden traer `\`: el plan usa siempre `/`.
        const path = entry.name.replace(/\\/g, '/')
        if (/\.md$/i.test(path)) {
          mdEntries.push({ path, text: await entry.async('string'), lastModified: entry.date ?? null })
        } else {
          filePaths.push(path)
          readers.set(path, () => entry.async('blob'))
        }
      }
    } else if (/\.md$/i.test(file.name)) {
      mdEntries.push({ path: file.name, text: await file.text(), lastModified: new Date(file.lastModified) })
    } else {
      filePaths.push(file.name)
      readers.set(file.name, async () => file)
    }
  }
  return { mdEntries, filePaths, readers }
}

/** Carreras vivas con sus materias, para reusar las que ya existen. */
async function loadExistingCareers() {
  const [{ data: careers, error: careersError }, { data: subjects, error: subjectsError }] = await Promise.all([
    careersService.list(),
    subjectsService.list(),
  ])
  if (careersError || subjectsError) throw new Error(careersError ?? subjectsError)
  return careers.map((career) => ({
    id: career.id,
    name: career.name,
    subjects: subjects.filter((subject) => subject.career_id === career.id).map(({ id, name }) => ({ id, name })),
  }))
}

/**
 * @param {{mode: 'subject', subjectId: string, subjectName: string}|{mode: 'careers'}} target
 */
export function useImport(target) {
  const [phase, setPhase] = useState('idle')
  const [summary, setSummary] = useState(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const planRef = useRef(null)
  const readersRef = useRef(new Map())

  const reset = useCallback(() => {
    setPhase('idle')
    setSummary(null)
    setProgress({ done: 0, total: 0 })
    setReport(null)
    setError(null)
    planRef.current = null
    readersRef.current = new Map()
  }, [])

  /** @param {File[]} files */
  const prepare = useCallback(
    async (files) => {
      setError(null)
      setPhase('reading')
      try {
        const { mdEntries, filePaths, readers } = await readEntries(files)
        const existingCareers = target.mode === 'careers' ? await loadExistingCareers() : []
        const plan = buildImportPlan({ mdEntries, filePaths, target, existingCareers })
        const subjectIds = plan.groups.map((group) => group.subjectId).filter(Boolean)
        const { data: existing, error: existingError } = await sheetsService.listByParents(subjectIds, 'subject_id, created_at, content_md')
        if (existingError) throw new Error(existingError)
        const bySubject = new Map()
        for (const sheet of existing) bySubject.set(sheet.subject_id, [...(bySubject.get(sheet.subject_id) ?? []), sheet])
        planRef.current = markDuplicates(plan, bySubject)
        readersRef.current = readers
        setSummary(summarizePlan(planRef.current))
        setPhase('ready')
      } catch (err) {
        setError(err?.message ?? 'No se pudieron leer los archivos.')
        setPhase('idle')
      }
    },
    [target],
  )

  const run = useCallback(async () => {
    if (!planRef.current) return
    setError(null)
    setPhase('importing')
    try {
      const result = await importService.executePlan(planRef.current, {
        readFile: async (path) => {
          const read = readersRef.current.get(path)
          return read ? read() : null
        },
        onProgress: (done, total) => setProgress({ done, total }),
      })
      setReport({ ...result, failures: [...result.failures, ...planRef.current.skipped] })
      setPhase('done')
    } catch (err) {
      // Nunca dejar el diálogo trabado en "importando".
      setError(err?.message ?? 'Falló la importación.')
      setPhase('idle')
    }
  }, [])

  return { phase, summary, summaryText: summary ? describeSummary(summary) : '', progress, report, error, prepare, run, reset }
}
