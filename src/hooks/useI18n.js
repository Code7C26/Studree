import { useSyncExternalStore } from 'react'
import { LANGS, getLang, setLang, subscribe, t } from '../lib/i18n/index.js'

/**
 * Idioma activo y traductor para componentes y hooks (Fase 18, ver docs/features/i18n.md).
 * Se suscribe al idioma: al cambiarlo, el componente vuelve a pintar. `lib/` y `services/`
 * usan `t` directo desde `lib/i18n/index.js`.
 *
 * @returns {{t: (key: string, values?: Record<string, string|number>) => string, lang: 'es'|'en', setLang: (lang: string) => void, LANGS: readonly string[]}}
 */
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return { t, lang, setLang, LANGS }
}
