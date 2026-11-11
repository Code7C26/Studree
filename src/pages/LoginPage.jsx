import { useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { ROUTES } from '../constants/routes'
import { useI18n } from '../hooks/useI18n.js'

/**
 * Pantalla de acceso (email + contraseña).
 * Sin sesión, RLS no devuelve ni acepta ningún dato, así que esta pantalla es la
 * puerta de entrada obligatoria a todo el workspace. Ver docs/03-security.md.
 */
export function LoginPage() {
  const { user, isAnonymous, loading, configured, signIn, signUp, linkIdentity } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const { t } = useI18n()

  // `?modo=crear` (cartel de entrada): arranca en "Crear cuenta".
  const [mode, setMode] = useState(/** @type {'signin'|'signup'} */ (params.get('modo') === 'crear' ? 'signup' : 'signin'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <p className="py-16 text-center text-text-muted">{t('common.loading')}</p>
  }

  // El invitado SÍ puede entrar a una cuenta que ya existe (ej. su email "ya tiene cuenta").
  if (user && !isAnonymous) {
    return <Navigate to={location.state?.from ?? ROUTES.home} replace />
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold">{t('auth.login.missingTitle')}</h1>
        <p className="mt-2 text-sm text-text-muted">{t('auth.login.missingBody')}</p>
      </div>
    )
  }

  /** @param {React.FormEvent} event */
  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)

    if (mode === 'signin') {
      const result = await signIn(email, password)
      if (result.error) setError(result.error)
    } else {
      // Un invitado que crea su cuenta conserva lo que cargó: se le agrega email y contraseña
      // (mismo camino que "Guardá tu cuenta" del Perfil) en vez de crear otro usuario.
      const result = isAnonymous ? await linkIdentity(email, password) : await signUp(email, password)
      if (result.error) {
        setError(result.error)
      } else if (result.needsConfirmation) {
        setNotice(t('auth.login.confirmMail', { email }))
      }
    }

    setSubmitting(false)
  }

  const isSignIn = mode === 'signin'

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">
        {isSignIn ? t('auth.login.signinTitle') : t('auth.login.signupTitle')}
        <span className="text-accent">Studree</span>
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {t('auth.login.subtitle')}
      </p>
      {isAnonymous && (
        <p role="note" className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          {t('auth.login.guestNotice')}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          id="email"
          label={t('common.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <TextField
          id="password"
          label={t('common.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
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

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t('common.oneMoment') : isSignIn ? t('auth.login.submitSignin') : t('auth.login.submitSignup')}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(isSignIn ? 'signup' : 'signin')
          setError(null)
          setNotice(null)
        }}
        className="mt-4 w-full text-sm text-text-muted transition-colors hover:text-text"
      >
        {isSignIn ? t('auth.login.switchToSignup') : t('auth.login.switchToSignin')}
      </button>
    </div>
  )
}
