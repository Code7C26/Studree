import { ROUTES } from '../../constants/routes.js'

/**
 * "Empezar gratis" entra directo a la app: AuthProvider abre una sesión de invitado y la cuenta
 * con email se agrega después desde el Perfil (el login rebota a quien ya tiene sesión).
 */
export const START_PATH = ROUTES.home

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
