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

export const PROBLEM = {
  title: 'Una IA que no conoce tu materia te responde cualquier cosa',
  question: '¿Qué me falta de la mitocondria para el parcial?',
  generic: {
    label: 'Un chat cualquiera',
    answer:
      'La mitocondria es la central energética de la célula. Produce ATP y tiene doble membrana. Te recomiendo repasar la respiración celular.',
  },
  brote: {
    label: 'El Brote, con tus hojas',
    answer:
      'En tu hoja explicás el ATP y las crestas, pero falta la cadena de transporte de electrones, donde se produce la mayor parte del ATP. ¿La sumo a tu hoja?',
    source: 'Fuente: Biología celular, hoja del 12 de marzo',
  },
  sheet: {
    date: '12 de marzo, 18:40',
    title: '# Mitocondria',
    lines: [
      'La mitocondria produce ATP en la respiración celular.',
      'Tiene doble membrana y ADN propio.',
      'Las crestas aumentan la superficie.',
    ],
  },
}

export const STEPS = {
  title: 'Cómo funciona',
  items: [
    {
      title: 'Escribís tus hojas',
      text: 'Cada materia es una carpeta de hojas fechadas, ordenadas en Carrera, Materia y Hoja. Escribís como siempre.',
    },
    {
      title: 'Todo queda ordenado y es tuyo',
      text: 'Un índice de temas por materia y todo exportable a Markdown cuando quieras.',
    },
    {
      title: 'El Brote las lee y estudia con vos',
      text: 'Responde con tus apuntes, te toma examen y completa lo que falta, siempre con tu permiso.',
    },
  ],
}
