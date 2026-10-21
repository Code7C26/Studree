import { LandingNav } from '../features/landing/LandingNav'
import { HeroSection } from '../features/landing/HeroSection'
import { ProblemSection } from '../features/landing/ProblemSection'
import { HowItWorksSection } from '../features/landing/HowItWorksSection'
import { BroteSection } from '../features/landing/BroteSection'
import { FolderSection } from '../features/landing/FolderSection'
import { OwnershipSection } from '../features/landing/OwnershipSection'
import { PlansSection } from '../features/landing/PlansSection'
import { ClosingSection } from '../features/landing/ClosingSection'
import { LandingFooter } from '../features/landing/LandingFooter'

/**
 * Landing pública de Studree (pública, en /bienvenida). Ver docs/features/landing.md.
 * Solo compone los bloques de `features/landing/`; no lee ni escribe datos.
 */
export function LandingPage() {
  return (
    // El layout de la app no la envuelve: scrollea por sí sola (body y #root tienen height:100%).
    <div className="h-full overflow-y-auto bg-bg text-text">
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <BroteSection />
        <FolderSection />
        <OwnershipSection />
        <PlansSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </div>
  )
}
