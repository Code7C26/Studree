import { useNavigate } from 'react-router-dom'
import { ROUTES, signupPath } from '../../constants/routes'
import { useEntryChoice } from '../../hooks/useFirstVisit.js'
import { useI18n } from '../../hooks/useI18n.js'
import { Brote } from '../features/assistant/Brote.jsx'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** El cartel no se cierra con Escape ni tocando afuera: hay que elegir. */
const noop = () => {}

/**
 * Cartel de entrada: la primera vez que se entra a la app como invitado, elegir entre crear la
 * cuenta o seguir como invitado (o entrar a una cuenta que ya existe). No manda al Inicio de una.
 * Ver docs/features/landing.md.
 */
export function EntryChoiceDialog() {
  const { show, choose } = useEntryChoice()
  const navigate = useNavigate()
  const { t } = useI18n()

  if (!show) return null

  return (
    <Modal open onClose={noop} title={t('auth.entry.title')}>
      <div className="flex flex-col items-center text-center">
        <Brote size={64} state="happy" />
        <p className="mt-3 text-sm text-text-muted">{t('auth.entry.text')}</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button
          onClick={() => {
            choose('signup')
            navigate(signupPath())
          }}
          className="w-full"
        >
          {t('auth.entry.signup')}
        </Button>
        <Button variant="ghost" onClick={() => choose('guest')} className="w-full">
          {t('auth.entry.guest')}
        </Button>
        <p className="mt-1 text-center text-xs text-text-muted">{t('auth.entry.guestHelp')}</p>
      </div>

      <button
        type="button"
        onClick={() => {
          choose('signin')
          navigate(ROUTES.login)
        }}
        className="mt-4 w-full text-sm text-accent hover:underline"
      >
        {t('auth.entry.signin')}
      </button>
    </Modal>
  )
}
