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

export const BROTE = {
  title: 'El Brote trabaja con lo que vos sabés',
  intro: 'Vive en toda la app, conoce los apuntes de tu carrera y actúa sobre tus hojas.',
  capabilities: [
    { title: 'Responde con tus hojas', text: 'Y te dice de cuál sacó cada dato.' },
    { title: 'Refuta y completa un tema', text: 'Marca lo que falta o está flojo y propone el texto.' },
    { title: 'Resume una materia', text: 'Y si querés, guarda el resumen como una hoja nueva.' },
    { title: 'Te toma examen', text: 'Opción múltiple, verdadero o falso y desarrollo, con la corrección explicada.' },
    { title: 'Arma tu plan de estudio', text: 'Usa las fechas importantes de tu Inicio para decirte qué repasar y cuándo.' },
  ],
  demo: {
    label: 'Ejemplo de una propuesta del Brote',
    date: '12 de marzo, 18:40',
    heading: '# Mitocondria',
    kept: 'La mitocondria produce ATP en la respiración celular.',
    proposed: 'La cadena de transporte de electrones, en la membrana interna, genera la mayor parte del ATP.',
    actions: ['Aceptar', 'Rechazar', 'Ver cambios'],
  },
  guarantees: [
    'Propone, vos aceptás: el Brote nunca escribe en tus hojas sin tu permiso.',
    'Dos modos: solo con tus apuntes, o con conocimiento externo, que queda marcado en tu hoja.',
  ],
}

export const FOLDER = {
  title: 'La base de todo: tu carpeta',
  intro: 'Para que la IA tenga de dónde leer, tus apuntes viven ordenados.',
  sheets: {
    title: 'Hojas fechadas, con índice de temas',
    text: 'Cada materia muestra todas sus hojas seguidas, como una carpeta. Los temas son los títulos que escribís, y con [[Tema]] saltás a cualquiera.',
    date: '3 de abril, 10:15',
    topics: ['Mitocondria', 'Ribosomas', 'Membrana celular'],
  },
  map: {
    title: 'Mapa de correlativas',
    text: 'Ves qué materias abren cuáles y en qué estado está cada una.',
    nodes: ['Química', 'Biología', 'Genética'],
  },
  home: {
    title: 'Un Inicio que te ordena la semana',
    text: 'Calendario con fechas importantes, tareas con fecha límite y notas rápidas.',
  },
}

export const OWNERSHIP = {
  title: 'Tu conocimiento es tuyo',
  text: 'Exportás todas tus hojas a un único archivo Markdown, o a un .zip con una hoja por archivo. Con "Copiar para IA" lo pegás en cualquier asistente y le das de una vez todo lo que sabés.',
  fileName: 'mi-carrera.md',
  sample: ['# Biología celular', '', '## Mitocondria', 'La mitocondria produce ATP en la respiración celular.', '', '## Ribosomas', 'Sintetizan proteínas.'],
  points: [
    'Cada cuenta ve solo lo suyo: los datos están separados por usuario.',
    'La clave de la IA vive en el servidor y nunca llega a tu navegador.',
    'El Brote no borra nada de lo que escribiste.',
  ],
}

export const PLANS = {
  title: 'Gratis y Premium',
  intro: 'Los apuntes son tuyos en los dos planes. Lo que cambia es cuánto trabaja el Brote con ellos.',
  freeLabel: 'Gratis',
  premiumLabel: 'Premium',
  free: [
    'Carreras, materias, hojas, Inicio y exportar: todo.',
    'Preguntas y atajos en el texto, con un tope diario.',
    'Resúmenes y pruebas tipo examen: pocos por mes, de una hoja.',
    'El Brote lee la materia que tenés abierta.',
    'Conocimiento externo limitado.',
  ],
  premium: [
    'Todo lo de Gratis.',
    'Un tope diario mucho mayor para preguntas y atajos.',
    'Resúmenes y pruebas sin límite, de materias enteras.',
    'El Brote lee toda tu carrera.',
    'Repaso de errores y plan de estudio.',
    'Conocimiento externo completo.',
  ],
}

export const CLOSING = {
  title: 'Empezá a hacer crecer tu árbol',
  text: 'Escribí tu primera hoja hoy. El Brote se encarga del resto.',
}

export const FOOTER = {
  tagline: 'Tu conocimiento, clonado en una IA que te ayuda a llegar más lejos.',
}
