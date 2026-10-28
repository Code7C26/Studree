import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { createI18n } from './core.js'
import es from './es/index.js'
import en from './en/index.js'

/** `<html lang>` acompaña al idioma activo (accesibilidad). */
function applyHtmlLang(lang) {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}

/** El idioma es una preferencia del dispositivo: localStorage, nunca Supabase. */
const storage = {
  get() {
    try {
      return localStorage.getItem(STORAGE_KEYS.uiLang)
    } catch {
      return null
    }
  },
  set(lang) {
    try {
      localStorage.setItem(STORAGE_KEYS.uiLang, lang)
    } catch {
      // sin storage (modo privado, cuota): el idioma vale solo para esta sesión
    }
  },
}

const instance = createI18n({
  dictionaries: { es, en },
  storage,
  browserLang: () => (typeof navigator === 'undefined' ? undefined : navigator.language),
  onChange: applyHtmlLang,
})

applyHtmlLang(instance.getLang())

export const { t, getLang, setLang, subscribe, LANGS } = instance
