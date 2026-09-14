/**
 * Contexto y hook de sesión (Supabase Auth).
 *
 * El *provider* vive aparte, en `components/layout/AuthProvider.jsx`: si el
 * contexto y el componente compartieran archivo, Fast Refresh dejaría de
 * funcionar para ese módulo (regla `react-refresh/only-export-components`).
 *
 * Auth no es opcional acá: las políticas RLS son `for all to authenticated` y
 * filtran por `auth.uid()`, así que sin sesión toda consulta devuelve vacío y
 * todo INSERT falla. Ver docs/03-security.md.
 */

import { createContext, useContext } from 'react'

/** @type {React.Context<null|Object>} */
export const AuthContext = createContext(null)

/**
 * Accede a la sesión actual.
 * @returns {{
 *   session: Object|null,
 *   user: Object|null,
 *   loading: boolean,
 *   configured: boolean,
 *   isAnonymous: boolean,
 *   signIn: (email: string, password: string) => Promise<{error: string|null}>,
 *   signUp: (email: string, password: string) => Promise<{error: string|null, needsConfirmation: boolean}>,
 *   signOut: () => Promise<void>
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return context
}
