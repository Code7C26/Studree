import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useExplorerTree } from '../hooks/useExplorerTree.js'
import { Button } from '../components/ui/Button'
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
      for (const unit of subject.units) {
        for (const topic of unit.topics) {
          sheets += topic.sheets.length
        }
      }
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
      setNotice(`Te mandamos un mail a ${email} para confirmar la cuenta. Hasta que lo confirmes, seguís entrando como invitado.`)
    } else {
      setNotice('Listo, tu cuenta ya tiene email y contraseña.')
      setEmail('')
      setPassword('')
    }

    setLinking(false)
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <p className="mt-2 text-text-muted">Tu cuenta y el contenido que tenés cargado.</p>

      <div className="card mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted">Cuenta</h2>

        {isAnonymous ? (
          <p className="text-sm text-text">
            Entraste como <span className="font-medium text-accent">invitado</span> (sesión
            anónima), sin email ni contraseña.
          </p>
        ) : (
          <p className="text-sm text-text">{user?.email}</p>
        )}

        {isAnonymous && (
          <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            Si cerrás sesión sin agregar un email y contraseña, no vas a poder volver a
            entrar a esta cuenta y perdés todo lo que cargaste.
          </p>
        )}

        {!isAnonymous && (
          <Button variant="ghost" onClick={signOut} className="w-full">
            Salir
          </Button>
        )}
      </div>

      {isAnonymous && (
        <div className="card mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-muted">Agregar email y contraseña</h2>
          <p className="text-xs text-text-muted">
            Convertí tu cuenta de invitado en una cuenta normal sin perder nada de lo que ya
            cargaste.
          </p>

          <form onSubmit={handleLink} className="space-y-3">
            <TextField
              id="link-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <TextField
              id="link-password"
              label="Contraseña"
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
              {linking ? 'Un momento…' : 'Guardar'}
            </Button>
          </form>
        </div>
      )}

      <div className="card mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted">Contenido cargado</h2>

        {loadingTree ? (
          <p className="text-sm text-text-muted">Contando…</p>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-text-muted">Carreras</dt>
              <dd className="text-xl font-bold text-accent">{counts.careers}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Materias</dt>
              <dd className="text-xl font-bold text-accent">{counts.subjects}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">Hojas</dt>
              <dd className="text-xl font-bold text-accent">{counts.sheets}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
