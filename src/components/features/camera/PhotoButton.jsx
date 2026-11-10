/**
 * Botón "Foto" de la Carpeta: solo existe en celular (Fase 16). La cámara la
 * abre el input del padre con `capture="environment"`; este componente solo
 * decide si se ve. Ver docs/features/photo-notes.md.
 */

import { Icon } from '../../ui/Icon'
import { useIsMobile } from '../../../hooks/useIsMobile.js'
import { useI18n } from '../../../hooks/useI18n.js'

/**
 * @param {{ onClick: () => void, disabled?: boolean, className?: string }} props
 */
export function PhotoButton({ onClick, disabled = false, className = '' }) {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  if (!isMobile) return null

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={t('camera.title')}
      className={className}
    >
      <Icon name="camera" /> {t('camera.button')}
    </button>
  )
}
