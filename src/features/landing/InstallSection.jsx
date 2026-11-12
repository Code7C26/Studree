import { useState } from 'react'
import { getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { usePwaInstall } from '../../hooks/usePwaInstall.js'
import { Icon } from '../../components/ui/Icon.jsx'

/**
 * Una tarjeta de descarga: siempre con su botón. Si el navegador ofrece instalar en este
 * dispositivo, instala; si no (Firefox, ya instalada, otro dispositivo), muestra los pasos.
 * @param {Object} props
 * @param {'desktop'|'android'|'ios'} props.target
 * @param {string} props.icon
 * @param {{title: string, text: string, button: string, howTo: string}} props.copy
 * @param {string} props.installedLabel
 * @param {ReturnType<typeof usePwaInstall>} props.pwa
 */
function InstallCard({ target, icon, copy, installedLabel, pwa }) {
  const [showSteps, setShowSteps] = useState(false)
  const here = pwa.platform === target

  async function handleClick() {
    if (here && pwa.canInstall) {
      const accepted = await pwa.install()
      if (accepted) return
    }
    setShowSteps(true)
  }

  return (
    <article className={`flex flex-col rounded-2xl border p-6 ${here ? 'border-accent/50 bg-surface-lit' : 'border-border bg-surface'}`}>
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent-soft">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{copy.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{copy.text}</p>
      <div className="mt-auto pt-5">
        {here && pwa.installed ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-accent-soft">
            <Icon name="check" size={14} />
            {installedLabel}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            aria-expanded={showSteps}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
              here ? 'btn-accent' : 'border border-accent/60 text-accent-soft hover:bg-accent/10'
            }`}
          >
            <Icon name="download" size={16} />
            {copy.button}
          </button>
        )}
        {showSteps && <p className="mt-3 text-xs leading-relaxed text-text-muted">{copy.howTo}</p>}
      </div>
    </article>
  )
}

/**
 * "Usalo donde estudies": descargar Studree en la compu, en Android sin Play Store o en iPhone
 * (es la PWA: el navegador la instala como app). Ver docs/features/landing.md.
 */
export function InstallSection() {
  const { lang } = useI18n()
  const { install: COPY } = getLandingCopy(lang)
  const pwa = usePwaInstall()

  return (
    <section id="descargar" aria-labelledby="descargar-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="descargar-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {COPY.title}
      </h2>
      <p className="mt-4 max-w-[60ch] text-text-muted">{COPY.intro}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <InstallCard target="desktop" icon="monitor" copy={COPY.desktop} installedLabel={COPY.installed} pwa={pwa} />
        <InstallCard target="android" icon="smartphone" copy={COPY.android} installedLabel={COPY.installed} pwa={pwa} />
        <InstallCard target="ios" icon="smartphone" copy={COPY.ios} installedLabel={COPY.installed} pwa={pwa} />
      </div>
    </section>
  )
}
