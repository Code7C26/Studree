import { useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from '../../hooks/useAuth.js'
import { supabase, isSupabaseConfigured } from '../../services/supabase.client.js'
import { clearAllCache } from '../../services/cache.service.js'
import { translateAuthError } from '../../services/authErrors.js'
import { ROUTES } from '../../constants/routes'

/**
 * A dónde vuelve el link del mail de confirmación: al mismo sitio desde el que se pidió
 * (studree.vercel.app o localhost), no a la "Site URL" fija de Supabase. Supabase solo lo
 * respeta si la URL está en Authentication → URL Configuration → Redirect URLs.
 * @param {string} path
 * @returns {string}
 */
function confirmRedirect(path) {
  return `${window.location.origin}${path}`
}

/**
 * Provee la sesión a toda la app.
 *
 * Se eligió email + contraseña (no magic link) porque en desarrollo el SMTP por
 * defecto de Supabase está limitado a pocos mails por hora, lo que haría muy
 * incómodo entrar y salir mientras se programa. Cambiar a magic link más
 * adelante solo toca este archivo y LoginPage.
 *
 * @param {{children: React.ReactNode}} props
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  /** Último usuario con sesión en este navegador, para detectar cambios de cuenta. */
  const lastUserIdRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return undefined
    }

    /**
     * Si no hay sesión, se intenta una ANÓNIMA antes de mandar al login.
     *
     * Una sesión anónima es una sesión real: `auth.uid()` devuelve un ID válido y
     * el rol es `authenticated`, así que las políticas RLS existentes funcionan
     * sin cambiarles nada. El usuario entra sin email ni contraseña.
     *
     * Si el proyecto tiene desactivado "Anonymous sign-ins", esto falla en
     * silencio y se cae al login normal: no rompe nada.
     */
    async function bootstrap() {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setSession(data.session)
        setLoading(false)
        return
      }

      const { data: anon, error } = await supabase.auth.signInAnonymously()

      if (error) {
        console.info(
          '[auth] Sesión anónima no disponible (activala en Supabase → Authentication → ' +
            'Providers → Anonymous sign-ins). Se usa el login con email.',
        )
      }

      setSession(anon?.session ?? null)
      setLoading(false)
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Entrar con OTRA cuenta sin pasar por "Salir" (ej. de invitado a una
      // cuenta existente): lo que quedó en cache/tabs es del usuario anterior.
      const nextUserId = nextSession?.user?.id ?? null
      if (lastUserIdRef.current && nextUserId && nextUserId !== lastUserIdRef.current) clearAllCache()
      if (nextUserId) lastUserIdRef.current = nextUserId
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,

      /**
       * Sesión sin email (anónima). Importa para la UI: cerrar sesión siendo
       * anónimo deja los datos inaccesibles PARA SIEMPRE, porque no hay ninguna
       * credencial con la que volver a entrar a ese usuario.
       */
      isAnonymous: session?.user?.is_anonymous === true,

      /**
       * Inicia sesión con email y contraseña.
       * @param {string} email
       * @param {string} password
       */
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: translateAuthError(error) }
      },

      /**
       * Crea una cuenta nueva.
       * @param {string} email
       * @param {string} password
       */
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: confirmRedirect(ROUTES.home) },
        })
        return {
          error: translateAuthError(error),
          // Si Supabase no devuelve sesión, la cuenta quedó pendiente de confirmar.
          needsConfirmation: !error && !data.session,
        }
      },

      /** Cierra sesión y limpia la cache local (no puede quedar visible para otro usuario). */
      async signOut() {
        await supabase.auth.signOut()
        clearAllCache()
      },

      /**
       * Convierte la sesión anónima actual en una cuenta permanente (email +
       * contraseña), sin perder los datos ya creados: la fila sigue siendo la
       * misma en `auth.users`, solo deja de ser anónima. Es la respuesta a lo
       * que advierte `isAnonymous`: sin esto, cerrar sesión pierde los datos
       * para siempre porque no hay credencial con la que volver a entrar.
       * @param {string} email
       * @param {string} password
       */
      async linkIdentity(email, password) {
        const { data, error } = await supabase.auth.updateUser(
          { email, password },
          { emailRedirectTo: confirmRedirect(ROUTES.profile) },
        )
        return {
          error: translateAuthError(error),
          // Con confirmación de email activada, el email nuevo queda pendiente
          // en `new_email` hasta que el usuario abre el link del mail.
          needsConfirmation: !error && Boolean(data.user?.new_email),
        }
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
