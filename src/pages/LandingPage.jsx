import { LandingNav } from '../features/landing/LandingNav'
import { HeroSection } from '../features/landing/HeroSection'
import { ProblemSection } from '../features/landing/ProblemSection'
import { HowItWorksSection } from '../features/landing/HowItWorksSection'
import { BroteSection } from '../features/landing/BroteSection'
import { FolderSection } from '../features/landing/FolderSection'
import { OwnershipSection } from '../features/landing/OwnershipSection'
import { PlansSection } from '../features/landing/PlansSection'
import { InstallSection } from '../features/landing/InstallSection'
import { ClosingSection } from '../features/landing/ClosingSection'
import { LandingFooter } from '../features/landing/LandingFooter'
import { useMarkLandingSeen } from '../hooks/useFirstVisit.js'

/**
 * Landing pública de Studree (pública, en /bienvenida). Ver docs/features/landing.md.
 * Compone los bloques de `features/landing/`; no lee ni escribe datos del usuario. Solo marca
 * en el dispositivo que ya se vio, para que `/` deje de traer acá.
 */
export function LandingPage() {
  useMarkLandingSeen()
  return (
    // El layout de la app no la envuelve; scrollea el documento (así funcionan Espacio y RePág).
    <div className="min-h-full bg-bg text-text">
      <LandingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <BroteSection />
        <FolderSection />
        <OwnershipSection />
        <PlansSection />
        <InstallSection />
        <ClosingSection />
      </main>
      <LandingFooter />
    </div>
  )
}
