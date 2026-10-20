import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { readCache, writeCache } from '../../../services/cache.service.js'
import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { Brote } from './Brote'

/** El panel (hook, chat y servicios) va en un chunk aparte: el principal casi no crece. */
const AssistantPanel = lazy(() => import('./AssistantPanel').then((module) => ({ default: module.AssistantPanel })))

/** Desde `sm` el panel es lateral; antes ocupa toda la pantalla (no se reabre solo). */
const PANEL_QUERY = '(min-width: 640px)'
/** Tras este rato sin uso y con el panel cerrado, el Brote se duerme. */
const SLEEP_MS = 5 * 60 * 1000

/**
 * El Brote flotante abajo a la derecha y su panel. Se monta en AppLayout solo
 * con sesión y fuera del modo lectura. Ver docs/features/assistant.md.
 */
export function AssistantHost() {
  const [open, setOpen] = useState(
    () => readCache(STORAGE_KEYS.uiAssistantOpen, false) === true && window.matchMedia(PANEL_QUERY).matches,
  )
  const [loaded, setLoaded] = useState(open)
  const [mood, setMood] = useState(/** @type {import('./Brote').BroteState} */ ('idle'))
  const [asleep, setAsleep] = useState(false)
  const [editing, setEditing] = useState(false)
  const buttonRef = useRef(/** @type {HTMLButtonElement|null} */ (null))

  useEffect(() => {
    writeCache(STORAGE_KEYS.uiAssistantOpen, open)
  }, [open])

  useEffect(() => {
    setAsleep(false)
    if (open || mood !== 'idle') return undefined
    const timer = window.setTimeout(() => setAsleep(true), SLEEP_MS)
    return () => window.clearTimeout(timer)
  }, [open, mood])

  // Mientras se escribe en una hoja, el Brote se achica y se aclara para no tapar el texto.
  useEffect(() => {
    const onFocusIn = (event) => setEditing(Boolean(event.target?.closest?.('.ProseMirror')))
    const onFocusOut = (event) => {
      if (!event.relatedTarget) setEditing(false)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Abrir el Brote"
        aria-expanded={open}
        aria-controls={loaded ? 'brote-panel' : undefined}
        title="El Brote, tu asistente"
        onClick={() => {
          setLoaded(true)
          setOpen((current) => !current)
        }}
        className={`fixed bottom-4 right-4 z-30 rounded-full transition-[opacity,transform] hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none sm:bottom-6 sm:right-6 ${
          editing && !open ? 'scale-75 opacity-40' : ''
        }`}
      >
        <Brote state={asleep ? 'sleeping' : mood} size={56} className="drop-shadow-lg" />
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <AssistantPanel open={open} onClose={close} onMood={setMood} />
        </Suspense>
      )}
    </>
  )
}
