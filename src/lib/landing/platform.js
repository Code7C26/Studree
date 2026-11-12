/**
 * Desde dónde se abre la landing, para mostrar primero cómo instalar Studree en ese
 * dispositivo (sección "Descargá Studree", docs/features/landing.md). Puro: se testea en Node.
 * @param {string} userAgent
 * @param {number} maxTouchPoints - `navigator.maxTouchPoints` (un iPad nuevo dice "Macintosh").
 * @returns {'android'|'ios'|'desktop'}
 */
export function detectPlatform(userAgent, maxTouchPoints) {
  const ua = userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios'
  return 'desktop'
}
