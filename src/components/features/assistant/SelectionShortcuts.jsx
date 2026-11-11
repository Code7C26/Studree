import { useCallback, useEffect, useRef, useState } from 'react'
import { SHORTCUTS, shortcutName } from '../../../lib/assistant/shortcuts.js'
import { Icon } from '../../ui/Icon'
import { useI18n } from '../../../hooks/useI18n.js'

/** Separación (px) entre la barra y el texto seleccionado / los bordes de la ventana. */
const GAP = 8
/** Alto aproximado de la barra hasta que se mide. */
const FALLBACK_HEIGHT = 36

const BUTTON =
  'rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:text-text'

/**
 * Barra flotante con los atajos del Brote junto al texto seleccionado del
 * editor activo (sin extensión de TipTap: se ubica con `view.coordsAtPos`).
 * Va arriba de la selección y, si no entra, abajo: nunca tapa el texto.
 * Teclado: con texto seleccionado, Alt+Enter lleva el foco a la barra;
 * ← → se mueven entre atajos; Esc vuelve al editor sin perder la selección.
 * Ver docs/features/assistant.md.
 * @param {Object} props
 * @param {import('@tiptap/react').Editor|null} props.editor  Editor con foco (o el último que lo tuvo).
 * @param {boolean} [props.hidden=false]  Modo lectura: no se muestra.
 * @param {(id: string) => void} props.onPick
 */
export function SelectionShortcuts({ editor, hidden = false, onPick }) {
  const { t } = useI18n()
  const [position, setPosition] = useState(/** @type {{top: number, left: number}|null} */ (null))
  const barRef = useRef(/** @type {HTMLDivElement|null} */ (null))

  const update = useCallback(() => {
    if (hidden || !editor || editor.isDestroyed) {
      setPosition(null)
      return
    }
    const { from, to, empty } = editor.state.selection
    const inBar = barRef.current?.contains(document.activeElement) ?? false
    if (empty || (!editor.isFocused && !inBar) || !editor.state.doc.textBetween(from, to, '\n').trim()) {
      setPosition(null)
      return
    }
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)
    // La selección quedó fuera de la pantalla (se scrolleó): la barra no flota sola.
    if (end.bottom < 0 || start.top > window.innerHeight) {
      setPosition(null)
      return
    }
    const height = barRef.current?.offsetHeight || FALLBACK_HEIGHT
    const width = barRef.current?.offsetWidth || 0
    const above = start.top - height - GAP
    const top = above >= GAP ? above : end.bottom + GAP
    const left = Math.max(GAP, Math.min(start.left, window.innerWidth - width - GAP))
    setPosition({ top, left })
  }, [editor, hidden])

  useEffect(() => {
    update()
    if (!editor || editor.isDestroyed || hidden) return undefined
    const onBlur = ({ event }) => {
      // Si el foco pasó a la barra, sigue a la vista.
      if (barRef.current?.contains(/** @type {Node|null} */ (event?.relatedTarget ?? null))) return
      setPosition(null)
    }
    /** Alt+Enter con texto seleccionado: el foco va al primer atajo. */
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !event.altKey || editor.state.selection.empty) return
      const first = barRef.current?.querySelector('button')
      if (!first) return
      event.preventDefault()
      event.stopPropagation()
      first.focus()
    }
    const dom = editor.view.dom
    editor.on('selectionUpdate', update)
    editor.on('update', update)
    editor.on('focus', update)
    editor.on('blur', onBlur)
    dom.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('update', update)
      editor.off('focus', update)
      editor.off('blur', onBlur)
      dom.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [editor, hidden, update])

  // Primera vez visible: se mide la barra y se reubica (para no salirse de la ventana).
  const visible = position != null
  useEffect(() => {
    if (visible) update()
  }, [visible, update])

  if (!position) return null

  /** @param {React.KeyboardEvent<HTMLDivElement>} event */
  const onToolbarKeyDown = (event) => {
    const buttons = Array.from(barRef.current?.querySelectorAll('button') ?? [])
    const index = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement))
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      buttons[(index + step + buttons.length) % buttons.length]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      editor?.commands.focus()
    }
  }

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={t('assistant.shortcuts.toolbar')}
      onKeyDown={onToolbarKeyDown}
      onBlur={(event) => {
        // El foco salió de la barra a otro lado que no es el editor: se esconde.
        const next = /** @type {Node|null} */ (event.relatedTarget)
        if (!barRef.current?.contains(next) && !editor?.view.dom.contains(next)) setPosition(null)
      }}
      style={{ top: position.top, left: position.left }}
      className="glass fixed z-20 flex items-center gap-0.5 bg-surface/95 px-1.5 py-1 shadow-lg shadow-black/30"
    >
      <Icon name="sparkles" size={14} className="mx-1 text-accent-soft" />
      {SHORTCUTS.map((shortcut, index) => (
        <button
          key={shortcut.id}
          type="button"
          tabIndex={index === 0 ? 0 : -1}
          // Que el click no le saque el foco (ni la selección) al editor.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(shortcut.id)}
          className={BUTTON}
        >
          {shortcutName(shortcut.id)}
        </button>
      ))}
    </div>
  )
}
