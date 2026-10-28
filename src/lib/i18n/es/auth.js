/** Acceso: pantalla de login y errores de Supabase Auth. */
export default {
  login: {
    signinTitle: 'Entrar a ',
    signupTitle: 'Crear cuenta en ',
    subtitle: 'Tus carreras y apuntes quedan guardados en tu cuenta.',
    submitSignin: 'Entrar',
    submitSignup: 'Crear cuenta',
    switchToSignup: '¿No tenés cuenta? Crear una',
    switchToSignin: '¿Ya tenés cuenta? Entrar',
    confirmMail: 'Te mandamos un mail a {email} para confirmar la cuenta.',
    missingTitle: 'Falta configurar Supabase',
    missingBody:
      'Completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local (ver .env.example) y reiniciá el servidor de desarrollo.',
  },
  errors: {
    invalidCredentials: 'Email o contraseña incorrectos.',
    emailNotConfirmed:
      'Falta confirmar el email. Revisá tu casilla (o desactivá la confirmación en Supabase → Authentication → Providers).',
    alreadyRegistered: 'Ese email ya tiene cuenta. Iniciá sesión.',
    passwordShort: 'La contraseña debe tener al menos 6 caracteres.',
    rateLimit: 'Demasiados intentos. Esperá un momento.',
    network: 'No hay conexión. Revisá tu internet e intentá de nuevo.',
    generic: 'No se pudo completar la operación.',
  },
}
