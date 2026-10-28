import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useExplorerTree } from '../hooks/useExplorerTree.js'
import { useI18n } from '../hooks/useI18n.js'
import { Button } from '../components/ui/Button'
import { LanguageSelector } from '../components/ui/LanguageSelector.jsx'
import { TextField } from '../components/ui/TextField'

/**
 * Cuenta totales de contenido a partir del árbol de `useExplorerTree`.
 * @param {Array} careers
 */
function countContent(careers) {
  let subjects = 0
  let sheets = 0

  for (const career of careers) {
    subjects += career.subjects.length
    for (const subject of career.subjects) {
      sheets += subject.sheetCount
    }
  }

  return { careers: careers.length, subjects, sheets }
}

/**
 * Perfil del usuario: cuenta actual + resumen de contenido cargado.
 * Ver docs/features/profile.md.
 */
export function ProfilePage() {
  const { user, isAnonymous, signOut, linkIdentity } = useAuth()
  const { careers, loading: loadingTree } = useExplorerTree()
  const { t } = useI18n()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [linking, setLinking] = useState(false)

  const counts = countContent(careers)

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
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
      <p className="mt-2 text-text-muted">{t('profile.subtitle')}</p>

      <div className="card mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted">{t('profile.account')}</h2>

        {isAnonymous ? (
          <p className="text-sm text-text">
            {t('profile.guestBefore')} <span className="font-medium text-accent">{t('profile.guestWord')}</span>{' '}
            {t('profile.guestAfter')}
          </p>
        ) : (
          <p className="text-sm text-text">{user?.email}</p>
        )}

        {isAnonymous && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {t('profile.guestWarning')}
          </p>
        )}

        {!isAnonymous && (
          <Button variant="ghost" onClick={signOut} className="w-full">
            {t('profile.signOut')}
          </Button>
        )}
      </div>

      {isAnonymous && (
        <div className="card mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-muted">{t('profile.linkTitle')}</h2>
          <p className="text-xs text-text-muted">
            {t('profile.linkHelp')}
          </p>

          <form onSubmit={handleLink} className="space-y-3">
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

            <Button type="submit" disabled={linking} className="w-full">
              {linking ? t('common.oneMoment') : t('common.save')}
            </Button>
          </form>
        </div>
      )}

      <div className="card mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted">{t('profile.language.title')}</h2>
        <p className="text-xs text-text-muted">{t('profile.language.help')}</p>
        <LanguageSelector />
      </div>

      <div className="card mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted">{t('profile.content')}</h2>

        {loadingTree ? (
          <p className="text-sm text-text-muted">{t('profile.counting')}</p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-text-muted">{t('profile.careers')}</dt>
              <dd className="text-xl font-bold text-accent">{counts.careers}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">{t('profile.subjects')}</dt>
              <dd className="text-xl font-bold text-accent">{counts.subjects}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">{t('profile.sheets')}</dt>
              <dd className="text-xl font-bold text-accent">{counts.sheets}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
