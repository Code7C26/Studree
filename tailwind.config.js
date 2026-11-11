/**
 * Design system de Studree (fuente de verdad — Mandamiento VII).
 * Modo oscuro principal + acento verde. NO inventar colores fuera de este config.
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Acento verde — color de marca (crecimiento / aprendizaje)
        accent: {
          DEFAULT: '#22c55e',
          hover: '#16a34a',
          soft: '#4ade80',
        },
        // Superficies del modo oscuro (grises oscuros)
        bg: '#0d1117', // fondo principal
        surface: '#161b22', // tarjetas / paneles
        'surface-2': '#21262d', // paneles elevados
        'surface-lit': '#14201a', // superficie bajo la lámpara (bloque protagonista, ADR-018)
        border: '#30363d', // bordes
        text: {
          DEFAULT: '#e6edf3', // texto principal
          muted: '#8b949e', // texto secundario
        },
        // Papel de la carpeta (ADR-017, ADR-018): papel crema con renglones,
        // como una hoja de carpeta real sobre el escritorio oscuro.
        paper: {
          DEFAULT: '#fbf8ef', // hoja
          line: '#ebe5d5', // renglones
          border: '#e3dcc9', // bordes / separadores sobre el papel
        },
        ink: {
          DEFAULT: '#2b2620', // texto sobre el papel (tinta cálida)
          muted: '#7a6f5a', // fecha y texto secundario sobre el papel
        },
        // Notas rápidas del Inicio (post-it).
        postit: {
          DEFAULT: '#fff3a8',
          ink: '#3b3415',
        },
        // Advertencia / estado intermedio (materia "cursando", resaltado de búsqueda).
        warn: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        // Títulos, saludo, números grandes y marca (ADR-018).
        display: ['Bricolage Grotesque', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
