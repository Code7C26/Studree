import { PALETTE } from '../../constants/palette'
import { useI18n } from '../../hooks/useI18n.js'

/**
 * Selector de color de la paleta del proyecto.
 * @param {Object} props
 * @param {string} props.value
 * @param {(color: string) => void} props.onChange
 */
export function ColorPicker({ value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
            value === color.value ? 'border-text' : 'border-transparent'
          }`}
          style={{ backgroundColor: color.value }}
          title={t(color.nameKey)}
          aria-label={t('common.colorLabel', { name: t(color.nameKey) })}
        />
      ))}
    </div>
  )
}
