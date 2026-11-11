import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../ui/Icon'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * "Nueva hoja" partido: el botón crea en blanco; la flecha abre las plantillas.
 * Ver docs/features/sheet-templates.md.
 * @param {Object} props
 * @param {import('../../../types/models.js').SheetTemplate[]} props.templates - Fábrica + propias.
 * @param {() => void} props.onBlank
 * @param {(template: import('../../../types/models.js').SheetTemplate) => void} props.onPick
 * @param {() => void} props.onManage
 */
export function NewSheetButton({ templates, onBlank, onPick, onManage }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const factory = templates.filter((template) => template.factory)
  const own = templates.filter((template) => !template.factory)
  const pick = (template) => {
    setOpen(false)
    onPick(template)
  }

  return (
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        onClick={onBlank}
        className="flex flex-1 items-center justify-center gap-2 rounded-l-md border-2 border-dashed border-border py-4 text-sm text-text-muted transition-colors hover:border-[var(--subject)] hover:text-[var(--subject-light)]"
      >
        <Icon name="plus" /> {t('templates.newBlank')}
      </button>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('templates.newFromTemplate')}
        className="rounded-r-md border-2 border-l-0 border-dashed border-border px-3 text-text-muted transition-colors hover:border-[var(--subject)] hover:text-[var(--subject-light)]"
      >
        <Icon name="chevron-down" />
      </button>

      {open && (
        <div role="menu" className="glass absolute bottom-full right-0 z-20 mb-2 w-64 bg-surface/95 p-1.5 shadow-lg shadow-black/40">
          <p className="px-2 pb-1 pt-1.5 text-xs text-text-muted">{t('templates.menuTemplates')}</p>
          {factory.map((template) => (
            <MenuItem key={template.id} onClick={() => pick(template)}>
              {template.name}
            </MenuItem>
          ))}
          {own.length > 0 && <p className="px-2 pb-1 pt-2 text-xs text-text-muted">{t('templates.menuOwn')}</p>}
          {own.map((template) => (
            <MenuItem key={template.id} onClick={() => pick(template)}>
              {template.name}
            </MenuItem>
          ))}
          <div className="my-1 h-px bg-border" aria-hidden="true" />
          <MenuItem
            onClick={() => {
              setOpen(false)
              onManage()
            }}
          >
            {t('templates.manage')}
          </MenuItem>
        </div>
      )}
    </div>
  )
}

/** @param {{onClick: () => void, children: React.ReactNode}} props */
function MenuItem({ onClick, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm text-text hover:bg-surface-2"
    >
      {children}
    </button>
  )
}
