/** Access: login screen and Supabase Auth errors. */
export default {
  login: {
    signinTitle: 'Sign in to ',
    signupTitle: 'Create an account on ',
    subtitle: 'Your careers and notes are saved to your account.',
    submitSignin: 'Sign in',
    submitSignup: 'Create account',
    switchToSignup: "Don't have an account? Create one",
    switchToSignin: 'Already have an account? Sign in',
    confirmMail: 'We sent an email to {email} to confirm your account.',
    guestNotice:
      "You're a guest. If you sign in to another account, what you loaded as a guest doesn't move to it. To keep it, save your account from your Profile.",
    missingTitle: 'Supabase is not configured',
    missingBody:
      'Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example) and restart the dev server.',
  },
  errors: {
    invalidCredentials: 'Wrong email or password.',
    emailNotConfirmed:
      'Your email is not confirmed yet. Check your inbox (or turn off confirmation in Supabase → Authentication → Providers).',
    alreadyRegistered: 'That email already has an account. Sign in.',
    passwordShort: 'The password must be at least 6 characters long.',
    rateLimit: 'Too many attempts. Wait a moment.',
    network: 'No connection. Check your internet and try again.',
    generic: 'The operation could not be completed.',
  },
}
