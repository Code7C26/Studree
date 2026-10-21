import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { ROUTES } from '../constants/routes'

/**
 * Pantalla de acceso (email + contraseña).
 * Sin sesión, RLS no devuelve ni acepta ningún dato, así que esta pantalla es la
 * puerta de entrada obligatoria a todo el workspace. Ver docs/03-security.md.
 */
export function LoginPage() {
  const { user, loading, configured, signIn, signUp } = useAuth()
  const location = useLocation()

  // `?modo=registro` (CTA de la landing) abre directo en "Crear cuenta".
  const [mode, setMode] = useState(
    /** @type {'signin'|'signup'} */ (new URLSearchParams(location.search).get('modo') === 'registro' ? 'signup' : 'signin'),
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <p className="py-16 text-center text-text-muted">Cargando…</p>
  }

  if (user) {
    return <Navigate to={location.state?.from ?? ROUTES.home} replace />
  }

  if (!configured) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-text-muted">
          Completá <code className="text-text">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-text">VITE_SUPABASE_ANON_KEY</code> en{' '}
          <code className="text-text">.env.local</code> (ver{' '}
          <code className="text-text">.env.example</code>) y reiniciá el servidor de
          desarrollo.
        </p>
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
      const result = await signUp(email, password)
      if (result.error) {
        setError(result.error)
      } else if (result.needsConfirmation) {
        setNotice(`Te mandamos un mail a ${email} para confirmar la cuenta.`)
      }
    }

    setSubmitting(false)
  }

  const isSignIn = mode === 'signin'

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">
        {isSignIn ? 'Entrar a ' : 'Crear cuenta en '}
        <span className="text-accent">Studree</span>
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Tus carreras y apuntes quedan guardados en tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <TextField
          id="password"
          label="Contraseña"
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
          {submitting ? 'Un momento…' : isSignIn ? 'Entrar' : 'Crear cuenta'}
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
        {isSignIn ? '¿No tenés cuenta? Crear una' : '¿Ya tenés cuenta? Entrar'}
      </button>
    </div>
  )
}
