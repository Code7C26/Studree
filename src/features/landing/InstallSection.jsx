import { Link } from 'react-router-dom'
import { getLandingCopy } from './landingCopy.js'
import { useI18n } from '../../hooks/useI18n.js'
import { usePwaInstall } from '../../hooks/usePwaInstall.js'
import { rememberEntryChoice } from '../../hooks/useFirstVisit.js'
import { ROUTES } from '../../constants/routes.js'
import { Icon } from '../../components/ui/Icon.jsx'

/**
 * @param {Object} props
 * @param {string} props.icon
 * @param {string} props.title
 * @param {string} props.text
 * @param {boolean} props.highlight - Es el dispositivo desde el que se abrió la landing.
 * @param {React.ReactNode} props.children
 */
function InstallCard({ icon, title, text, highlight, children }) {
  return (
    <article
      className={`flex flex-col rounded-2xl border p-6 ${highlight ? 'border-accent/50 bg-surface-lit' : 'border-border bg-surface'}`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent-soft">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{text}</p>
      <div className="mt-auto pt-5">{children}</div>
    </article>
  )
}

/**
 * "Descargá Studree": instalarlo en la compu o en Android sin tiendas (PWA), los pasos para
 * iPhone y "Probar como invitado" en la web. Ver docs/features/landing.md.
 */
export function InstallSection() {
  const { lang } = useI18n()
  const { install: COPY } = getLandingCopy(lang)
  const { platform, canInstall, installed, install } = usePwaInstall()

  /** Botón de instalar si el navegador lo ofrece en este dispositivo; si no, los pasos. */
  const action = (target, button, howTo) => {
    if (installed && platform === target) {
      return (
        <p className="inline-flex items-center gap-1.5 text-sm text-accent-soft">
          <Icon name="check" size={14} />
          {COPY.installed}
        </p>
      )
    }
    if (button && canInstall && platform === target) {
      return (
        <button type="button" onClick={install} className="btn-accent inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm">
          <Icon name="download" size={16} />
          {button}
        </button>
      )
    }
    return <p className="text-xs leading-relaxed text-text-muted">{howTo}</p>
  }

  return (
    <section id="descargar" aria-labelledby="descargar-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 lg:py-24">
      <h2 id="descargar-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {COPY.title}
      </h2>
      <p className="mt-4 max-w-[60ch] text-text-muted">{COPY.intro}</p>

      <div className="mt-8 flex flex-col items-start gap-2">
        <Link
          to={ROUTES.home}
          onClick={() => rememberEntryChoice('guest')}
          className="inline-flex items-center gap-2 rounded-full border border-accent/60 px-6 py-3 text-sm font-medium text-accent-soft transition-colors hover:bg-accent/10"
        >
          {COPY.guestCta}
          <Icon name="chevron-right" size={16} />
        </Link>
        <p className="text-xs text-text-muted">{COPY.guestHelp}</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <InstallCard icon="monitor" title={COPY.desktop.title} text={COPY.desktop.text} highlight={platform === 'desktop'}>
          {action('desktop', COPY.desktop.button, COPY.desktop.howTo)}
        </InstallCard>
        <InstallCard icon="smartphone" title={COPY.android.title} text={COPY.android.text} highlight={platform === 'android'}>
          {action('android', COPY.android.button, COPY.android.howTo)}
        </InstallCard>
        <InstallCard icon="smartphone" title={COPY.ios.title} text={COPY.ios.text} highlight={platform === 'ios'}>
          {action('ios', null, COPY.ios.howTo)}
        </InstallCard>
      </div>
    </section>
  )
}
