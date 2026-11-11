import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { useProfile } from '../hooks/useProfile.js'
import { useI18n } from '../hooks/useI18n.js'
import { Brote } from '../components/features/assistant/Brote.jsx'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon.jsx'
import { LanguageSelector } from '../components/ui/LanguageSelector.jsx'
import { TextField } from '../components/ui/TextField'
import { formatMonthTitle } from '../lib/home/dates.js'
import { initialOf, shortId } from '../lib/profile/profileStats.js'

/** Cuántas carreras muestra la tarjeta "Tus carreras". */
const TOP_CAREERS = 6

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'accent'|'warn'|'neutral'|'solid'} [props.tone]
 */
function Chip({ children, tone = 'neutral' }) {
  const tones = {
    accent: 'border-accent/40 text-accent-soft',
    warn: 'border-warn/40 text-warn',
    neutral: 'border-white/[0.08] text-text-muted',
    solid: 'border-accent bg-accent text-bg',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

/**
 * @param {Object} props
 * @param {string} props.icon - Nombre de `Icon`.
 * @param {string} props.label
 * @param {number|null} props.value - `null` mientras carga.
 */
function Metric({ icon, label, value }) {
  return (
    <div className="glass flex items-center gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-soft">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <p className="font-display text-4xl font-extrabold leading-none tabular-nums">{value ?? '—'}</p>
        <p className="mt-1 text-sm text-text-muted">{label}</p>
      </div>
    </div>
  )
}

/**
 * Perfil: tarjeta de identidad, métricas, tus carreras, cuenta y preferencias, en la misma
 * grilla de vidrio que el Inicio (ADR-018). Ver docs/features/profile.md.
 */
export function ProfilePage() {
  const { user, isAnonymous, signOut, linkIdentity, stats, loadingStats, plan } = useProfile()
  const { t, lang } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [linking, setLinking] = useState(false)

  const created = user?.created_at ? new Date(user.created_at) : null
  const since = created ? formatMonthTitle(created.getFullYear(), created.getMonth(), lang) : null

  /** @param {React.FormEvent} event */
  async function handleLink(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setLinking(true)

    const result = await linkIdentity(email, password)

    if (result.error) {
      setError(result.error)
    } else if (result.needsConfirmation) {
      setNotice(t('profile.linkConfirm', { email }))
    } else {
      setNotice(t('profile.linkDone'))
      setEmail('')
      setPassword('')
    }

    setLinking(false)
  }

  return (
    <section className="mx-auto max-w-5xl">
      {/* Tarjeta de identidad, bajo la luz de la lámpara. */}
      <header className="glass lamp relative isolate mb-3 overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {isAnonymous ? (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-surface-2 ring-2 ring-accent/50">
              <Brote size={56} state="happy" />
            </span>
          ) : (
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-accent/15 font-display text-3xl font-extrabold text-accent-soft ring-2 ring-accent/50">
              {initialOf(user?.email)}
            </span>
          )}

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-soft">{t('profile.title')}</p>
            <h1 className="mt-1 truncate font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {isAnonymous ? t('profile.guestName') : user?.email}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {isAnonymous ? (
                <Chip tone="warn">
                  <Icon name="lock" size={12} />
                  {t('profile.badgeGuest')}
                </Chip>
              ) : (
                <Chip tone="accent">
                  <Icon name="check" size={12} />
                  {t('profile.badgeAccount')}
                </Chip>
              )}
              {plan && (
                <Link to={ROUTES.plans} className="rounded-full transition-opacity hover:opacity-80">
                  <Chip tone={plan === 'premium' ? 'solid' : 'neutral'}>
                    <Icon name="sparkles" size={12} />
                    {plan === 'premium' ? t('profile.planPremium') : t('profile.planFree')}
                  </Chip>
                </Link>
              )}
              {since && <Chip>{t('profile.memberSince', { date: lang === 'en' ? since : since.toLowerCase() })}</Chip>}
            </div>
            {user?.id && (
              <p className="mt-3 font-mono text-xs text-text-muted">{t('profile.idLine', { id: shortId(user.id) })}</p>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric icon="book-open" label={t('profile.careers')} value={loadingStats ? null : stats.careers} />
        <Metric icon="template" label={t('profile.subjects')} value={loadingStats ? null : stats.subjects} />
        <Metric icon="file-text" label={t('profile.sheets')} value={loadingStats ? null : stats.sheets} />

        {/* Cuenta: para el invitado es la tarjeta protagonista (guardar la cuenta). */}
        <section className="glass p-5 md:col-span-2" aria-labelledby="profile-account">
          {isAnonymous ? (
            <>
              <h2 id="profile-account" className="flex items-center gap-2 text-sm font-medium text-text-muted">
                <Icon name="lock" size={14} />
                {t('profile.linkTitle')}
              </h2>
              <p className="mt-1 text-sm text-text">{t('profile.linkHelp')}</p>
              <p role="alert" className="mt-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                {t('profile.guestWarning')}
              </p>

              <form onSubmit={handleLink} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    id="link-email"
                    label={t('common.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <TextField
                    id="link-password"
                    label={t('common.password')}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
                    {notice}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" disabled={linking} className="w-full sm:w-auto">
                    {linking ? t('common.oneMoment') : t('common.save')}
                  </Button>
                  <Link to={ROUTES.login} className="text-center text-sm text-accent hover:underline">
                    {t('profile.haveAccount')}
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 id="profile-account" className="flex items-center gap-2 text-sm font-medium text-text-muted">
                <Icon name="check" size={14} />
                {t('profile.account')}
              </h2>
              <p className="mt-2 truncate text-lg font-medium text-text">{user?.email}</p>
              <p className="text-sm text-text-muted">{t('profile.accountHelp')}</p>
              <Button variant="ghost" onClick={signOut} className="mt-4">
                {t('profile.signOut')}
              </Button>
            </>
          )}
        </section>

        <section className="glass flex flex-col p-5" aria-labelledby="profile-prefs">
          <h2 id="profile-prefs" className="text-sm font-medium text-text-muted">
            {t('profile.preferences')}
          </h2>
          <p className="mt-3 text-sm font-medium text-text">{t('profile.language.title')}</p>
          <p className="mb-2 text-xs text-text-muted">{t('profile.language.help')}</p>
          <LanguageSelector />
          <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-sm">
            <Link to={ROUTES.plans} className="inline-flex items-center gap-1.5 text-accent hover:underline">
              {t('profile.plansLink')}
              <Icon name="chevron-right" size={14} />
            </Link>
            <Link to={ROUTES.welcome} className="inline-flex items-center gap-1.5 text-accent hover:underline">
              {t('profile.aboutLink')}
              <Icon name="chevron-right" size={14} />
            </Link>
          </div>
        </section>

        {/* Tus carreras: una barra por carrera, en su color, con sus hojas. */}
        <section className="glass p-5 md:col-span-3" aria-labelledby="profile-careers">
          <h2 id="profile-careers" className="text-sm font-medium text-text-muted">
            {t('profile.byCareer')}
          </h2>
          {loadingStats ? (
            <p className="mt-3 text-sm text-text-muted">{t('profile.counting')}</p>
          ) : stats.byCareer.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">{t('profile.byCareerEmpty')}</p>
          ) : (
            <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {stats.byCareer.slice(0, TOP_CAREERS).map((career) => (
                <li key={career.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: career.color }} aria-hidden="true" />
                      <span className="truncate font-medium text-text">{career.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-text-muted">
                      {t('profile.subjectsCount', { count: career.subjects })} · {t('profile.sheetsCount', { count: career.sheets })}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${career.sheets > 0 ? Math.max(4, career.share * 100) : 0}%`,
                        backgroundColor: career.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
