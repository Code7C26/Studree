import { ROUTES } from '../../constants/routes.js'

/** Ruta del registro: el login abre directo en "Crear cuenta" (LoginPage, `?modo=registro`). */
export const SIGNUP_PATH = `${ROUTES.login}?modo=registro`

export const HERO = {
  title: ['El conocimiento', 'no se guarda.', 'Crece.'],
  subtitle:
    'Cada apunte es una hoja de tu árbol. Y ahora hay alguien que lo cuida con vos: una IA que conoce toda tu carrera.',
  cta: 'Empezar gratis',
  secondary: 'Ver cómo funciona',
  treeLabel: 'Árbol de materias: Anatomía, Química y Biología, con el Brote en la raíz',
  subjects: ['Anatomía', 'Química', 'Biología'],
}

export const NAV_LINKS = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'El Brote', href: '#brote' },
  { label: 'Planes', href: '#planes' },
]

export const NAV_LOGIN = 'Entrar'
