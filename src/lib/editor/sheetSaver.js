/**
 * Guardado de UNA hoja de la carpeta, sin React (ADR-017). Ver
 * docs/features/sheet-editor.md. `useSheetAutosave` es un envoltorio fino de
 * esto; vive acá, con el service y la cache INYECTADOS, para poder probar cada
 * caso en Node.
 *
 * Reglas:
 * - Hoja REAL: borrador `{ content, baseUpdatedAt }` en `studree:cache:sheet:<id>`
 *   en cada cambio; al abrir solo gana si el servidor no cambió (`resolveDraft`).
 * - Hoja LOCAL (`local:…`, todavía no está en Supabase): su borrador va en
 *   `studree:cache:sheet-local:<subjectId>` → `{ [localId]: {content, created_at} }`,
 *   para que lo escrito sin conexión sobreviva a cerrar la pestaña. El primer
 *   guardado con contenido no vacío la CREA.
 * - Debounce de 800 ms; los guardados van en FILA (nunca dos a la vez).
 * - `ensureCreated()`: crea YA una hoja local aunque esté vacía (un adjunto cuelga de una hoja real).
 *   `createNow` (plantillas): la hoja local se crea al empezar.
 * - `cancel()` (antes de borrar): descarta lo pendiente y el borrador. Si un
 *   `create` ya estaba en vuelo, cuando vuelve se BORRA la fila creada en vez
 *   de avisar `onCreated` — si no, la hoja "borrada" reaparecería.
 */

import { isLocalSheet, resolveDraft } from './folderSheets.js'

const AUTOSAVE_DELAY_MS = 800

/**
 * @typedef {Object} SaverCache
 * @property {(collection: string, parentId?: string) => string} key
 * @property {(key: string, fallback: any) => any} read
 * @property {(key: string, value: any) => void} write
 * @property {(key: string) => void} clear
 */

/**
 * Clave del borrador de las hojas locales de una materia.
 * @param {SaverCache} cache
 * @param {string} subjectId
 */
export function localDraftKey(cache, subjectId) {
  return cache.key('sheet-local', subjectId)
}

/**
 * @param {Object} params
 * @param {{id: string, subject_id: string, content_md: string, created_at: string, updated_at?: string|null, createNow?: boolean}} params.sheet
 * @param {{create: Function, saveContent: Function, remove: Function}} params.service - Contrato de sheets.service.js.
 * @param {SaverCache} params.cache
 * @param {(localId: string, created: Object) => void} params.onCreated
 * @param {(status: 'idle'|'saving'|'saved'|'error', error: string|null) => void} params.onStatus
 * @param {number} [params.delayMs]
 * @param {typeof setTimeout} [params.setTimer]
 * @param {typeof clearTimeout} [params.clearTimer]
 */
export function createSheetSaver({
  sheet,
  service,
  cache,
  onCreated,
  onStatus,
  delayMs = AUTOSAVE_DELAY_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const subjectId = sheet.subject_id
  const localId = isLocalSheet(sheet) ? sheet.id : null
  let id = localId ? null : sheet.id
  let base = sheet.updated_at ?? null
  let pending = null
  let timer = null
  let queue = Promise.resolve()
  let cancelled = false

  const draftKey = () => (id ? cache.key('sheet', id) : null)

  function writeLocalDraft(content) {
    const key = localDraftKey(cache, subjectId)
    cache.write(key, { ...cache.read(key, {}), [localId]: { content, created_at: sheet.created_at } })
  }

  function clearLocalDraft() {
    const key = localDraftKey(cache, subjectId)
    const drafts = cache.read(key, {})
    if (!(localId in drafts)) return
    delete drafts[localId]
    if (Object.keys(drafts).length === 0) cache.clear(key)
    else cache.write(key, drafts)
  }

  /** Crea la fila de una hoja local con `markdown`. */
  async function createRow(markdown) {
    onStatus('saving', null)
    const { data, error } = await service.create({ subject_id: subjectId, content_md: markdown })
    if (error) {
      pending = pending ?? markdown // se reintenta en el próximo cambio; el borrador local queda
      onStatus('error', error)
      return
    }
    if (cancelled) {
      // Se borró mientras se creaba: la fila no puede quedar viva.
      await service.remove(data.id, subjectId)
      return
    }
    id = data.id
    base = data.updated_at
    clearLocalDraft()
    // Lo escrito mientras volvía el create pasa a ser borrador de la hoja real.
    if (pending != null) cache.write(cache.key('sheet', id), { content: pending, baseUpdatedAt: base })
    onCreated(localId, data)
    onStatus('saved', null)
  }

  async function runFlush() {
    const markdown = pending
    if (markdown == null || cancelled) return
    pending = null

    // Hoja local: se crea recién con contenido (vacía → no se guarda nada).
    if (!id) {
      if (!markdown.trim()) return
      await createRow(markdown)
      return
    }

    onStatus('saving', null)
    const { data, error } = await service.saveContent(id, markdown)
    if (error) {
      onStatus('error', error) // lo pendiente sigue en el borrador local
      return
    }
    base = data.updated_at
    const key = draftKey()
    const draft = cache.read(key, null)
    if (draft?.content === markdown) cache.clear(key)
    else if (draft) cache.write(key, { ...draft, baseUpdatedAt: base })
    onStatus('saved', null)
  }

  return {
    /**
     * Contenido con el que arranca el editor (decide sobre el borrador local).
     * Si hay que reenviar un borrador, lo deja pendiente y lo manda.
     * @returns {string}
     */
    start() {
      if (localId) {
        const content = sheet.content_md ?? ''
        // Plantilla: ya tiene contenido, se guarda de entrada.
        if (sheet.createNow && content.trim()) {
          writeLocalDraft(content)
          pending = content
          this.flush()
        }
        return content
      }
      const decision = resolveDraft(cache.read(cache.key('sheet', id), null), sheet)
      if (decision.clearDraft) cache.clear(cache.key('sheet', id))
      if (decision.resend) {
        pending = decision.content
        this.flush()
      }
      return decision.content
    },

    /** @param {string} markdown */
    update(markdown) {
      if (cancelled) return
      if (id) cache.write(draftKey(), { content: markdown, baseUpdatedAt: base })
      else writeLocalDraft(markdown)
      pending = markdown
      if (timer) clearTimer(timer)
      timer = setTimer(() => this.flush(), delayMs)
    },

    /** Manda YA lo pendiente, en fila detrás de cualquier guardado en curso. */
    flush() {
      if (timer) clearTimer(timer)
      timer = null
      queue = queue.then(runFlush)
      return queue
    },

    /**
     * Devuelve el id REAL de la hoja, creándola si todavía es local (aunque
     * esté vacía). Lo usan los adjuntos: un archivo cuelga de una hoja que
     * exista en Supabase. Va en la misma fila que los guardados: nunca crea dos.
     * @returns {Promise<string|null>} null si se canceló o falló el create.
     */
    async ensureCreated() {
      if (cancelled) return null
      if (id) return id
      if (timer) clearTimer(timer)
      timer = null
      queue = queue.then(async () => {
        if (id || cancelled) return
        const markdown = pending ?? sheet.content_md ?? ''
        pending = null
        await createRow(markdown)
      })
      await queue
      return id
    },

    /** Antes de borrar la hoja: descarta lo pendiente, el borrador y cualquier create en vuelo. */
    cancel() {
      cancelled = true
      if (timer) clearTimer(timer)
      timer = null
      pending = null
      if (id) cache.clear(draftKey())
      else clearLocalDraft()
    },
  }
}
