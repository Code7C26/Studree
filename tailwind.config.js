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
        border: '#30363d', // bordes
        text: {
          DEFAULT: '#e6edf3', // texto principal
          muted: '#8b949e', // texto secundario
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
