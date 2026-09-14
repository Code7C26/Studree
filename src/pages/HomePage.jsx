import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { Button } from '../components/ui/Button'

/** Página de inicio: bienvenida + acceso a las carpetas. */
export function HomePage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">
        Bienvenido a <span className="text-accent">Studree</span>
      </h1>
      <p className="mt-2 text-text-muted">
        El conocimiento no se guarda en carpetas, crece como un árbol.
      </p>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold">Empezá a organizar</h2>
        <p className="mt-1 text-sm text-text-muted">
          Creá una carrera y, dentro, tus materias con sus correlativas. Cada materia se
          divide en unidades, temas y hojas de apuntes.
        </p>
        <Link to={ROUTES.careers} className="mt-4 inline-block">
          <Button>Ir a mis carreras</Button>
        </Link>
      </div>
    </section>
  )
}
