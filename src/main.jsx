import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './components/layout/AuthProvider.jsx'
import { listenForInstallPrompt } from './hooks/usePwaInstall.js'
import './index.css'

// PWA (Fase 16): el service worker solo en producción; en dev estorbaría con HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[sw] No se pudo registrar el service worker:', error) // i18n-ignore: log de desarrollo
    })
  })
}

// "Instalar Studree" (landing): el navegador ofrece instalar una sola vez, quizás antes de la landing.
listenForInstallPrompt()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
