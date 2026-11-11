import { useI18n } from '../../hooks/useI18n.js'

/** Cada idioma se muestra en su propio idioma: estas etiquetas NO se traducen. */
const OPTIONS = [
  { value: 'es', label: 'Castellano' },
  { value: 'en', label: 'English' },
]

/**
 * Selector de idioma de la interfaz (Fase 18): dos botones tipo radio.
 * @param {Object} props
 * @param {string} [props.className]
 */
export function LanguageSelector({ className = '' }) {
  const { t, lang, setLang } = useI18n()

  return (
    <div role="radiogroup" aria-label={t('profile.language.label')} className={`flex gap-2 ${className}`}>
      {OPTIONS.map((option) => {
        const selected = option.value === lang
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={option.value}
            onClick={() => setLang(option.value)}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              selected
                ? 'border-accent bg-accent text-bg'
                : 'border-border bg-transparent text-text hover:bg-surface-2'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
