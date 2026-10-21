import { LandingNav } from '../features/landing/LandingNav'
import { HeroSection } from '../features/landing/HeroSection'

/**
 * Landing pública de Studree (visible en "/" sin sesión). Ver docs/features/landing.md.
 * Solo compone los bloques de `features/landing/`; no lee ni escribe datos.
 */
export function LandingPage() {
  return (
    // El layout de la app no la envuelve: scrollea por sí sola (body y #root tienen height:100%).
    <div className="h-full overflow-y-auto bg-bg text-text">
      <LandingNav />
      <main>
        <HeroSection />
      </main>
    </div>
  )
}
