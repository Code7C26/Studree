import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import { DEMO_CARD_LAST4, PREMIUM_PRICE } from '../constants/plans.js'
import { usePlan } from '../hooks/usePlan.js'
import { useI18n } from '../hooks/useI18n.js'
import { getLandingCopy } from '../features/landing/landingCopy.js'
import { formatPrice } from '../lib/format/price.js'
import { Brote } from '../components/features/assistant/Brote.jsx'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon.jsx'
import { Modal } from '../components/ui/Modal'

/**
 * Checkout simulado: resumen, medio de pago de prueba (sin campos de tarjeta) y el resultado.
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => Promise<{error: string|null}>} props.onPay
 */
function CheckoutDialog({ open, onClose, onPay }) {
  const { t, lang } = useI18n()
  const [step, setStep] = useState(/** @type {'review'|'processing'|'done'} */ ('review'))
  const [error, setError] = useState(/** @type {string|null} */ (null))
  const price = formatPrice(PREMIUM_PRICE.amount, PREMIUM_PRICE.currency, lang)

  function close() {
    if (step === 'processing') return
    setStep('review')
    setError(null)
    onClose()
  }

  async function pay() {
    setError(null)
    setStep('processing')
    const result = await onPay()
    if (result.error) {
      setError(result.error)
      setStep('review')
    } else {
      setStep('done')
    }
  }

  if (step === 'done') {
    return (
      <Modal open={open} onClose={close}>
        <div className="flex flex-col items-center text-center">
          <Brote size={72} state="happy" />
          <h2 className="mt-3 font-display text-2xl font-extrabold">{t('plans.checkout.doneTitle')}</h2>
          <p className="mt-2 text-sm text-text-muted">{t('plans.checkout.doneText')}</p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="ghost" onClick={close}>
              {t('plans.checkout.close')}
            </Button>
            <Link
              to={ROUTES.home}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
            >
              {t('plans.checkout.goApp')}
              <Icon name="chevron-right" size={14} />
            </Link>
          </div>
        </div>
      </Modal>
    )
  }

  const processing = step === 'processing'

  return (
    <Modal open={open} onClose={close} title={t('plans.checkout.title')}>
      <dl className="space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-text">{t('plans.checkout.item')}</dt>
          <dd className="tabular-nums text-text">{price}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <dt className="font-medium text-text">{t('plans.checkout.total')}</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums">{price}</dd>
        </div>
      </dl>

      <p className="mt-5 text-xs font-medium uppercase tracking-widest text-text-muted">{t('plans.checkout.method')}</p>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
        <Icon name="credit-card" size={18} />
        <span className="font-mono">{t('plans.checkout.card', { last4: DEMO_CARD_LAST4 })}</span>
      </div>

      <p role="note" className="mt-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
        {t('plans.checkout.notice')}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={close} disabled={processing}>
          {t('common.cancel')}
        </Button>
        <Button onClick={pay} disabled={processing} aria-live="polite">
          {processing
            ? t('plans.checkout.processing')
            : error
              ? t('plans.checkout.retry')
              : t('plans.checkout.pay', { price })}
        </Button>
      </div>
    </Modal>
  )
}

/**
 * @param {Object} props
 * @param {string[]} props.items
 * @param {boolean} [props.accent]
 */
function Features({ items, accent = false }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <span className={accent ? 'mt-0.5 text-accent-soft' : 'mt-0.5 text-text-muted'}>
            <Icon name="check" size={16} />
          </span>
          <span className={accent ? 'text-text' : 'text-text-muted'}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Planes (Fase 17): Gratis y Premium, con el checkout simulado. Ver docs/features/plans.md.
 */
export function PlansPage() {
  const { plan, isAnonymous, upgrade, downgrade } = usePlan()
  const { t, lang } = useI18n()
  const { plans: copy } = getLandingCopy(lang)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [confirmDowngrade, setConfirmDowngrade] = useState(false)
  const [downgradeError, setDowngradeError] = useState(/** @type {string|null} */ (null))

  const isPremium = plan === 'premium'
  const currentBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent-soft">
      <Icon name="check" size={12} />
      {t('plans.current')}
    </span>
  )

  async function handleDowngrade() {
    setConfirmDowngrade(false)
    setDowngradeError(null)
    const result = await downgrade()
    if (result.error) setDowngradeError(result.error)
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="glass lamp relative isolate mb-3 overflow-hidden p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-soft">{t('plans.eyebrow')}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{t('plans.title')}</h1>
        <p className="mt-3 max-w-[60ch] text-text-muted">{t('plans.intro')}</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Gratis */}
        <article className="glass flex flex-col p-6" aria-labelledby="plan-free">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-free" className="text-lg font-semibold">
              {t('plans.free')}
            </h2>
            {plan === 'free' && currentBadge}
          </div>
          <p className="mt-3">
            <span className="font-display text-4xl font-extrabold tabular-nums">
              {formatPrice(0, PREMIUM_PRICE.currency, lang)}
            </span>{' '}
            <span className="text-sm text-text-muted">{t('plans.forever')}</span>
          </p>
          <Features items={copy.free} />
          <div className="mt-auto pt-6">
            {isPremium && (
              <Button variant="ghost" onClick={() => setConfirmDowngrade(true)} className="w-full">
                {t('plans.downgrade')}
              </Button>
            )}
            {downgradeError && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {downgradeError}
              </p>
            )}
          </div>
        </article>

        {/* Premium */}
        <article className="glass lamp relative isolate flex flex-col border-accent/50 p-6" aria-labelledby="plan-premium">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-premium" className="flex items-center gap-2 text-lg font-semibold text-accent-soft">
              <Icon name="sparkles" size={18} />
              {t('plans.premium')}
            </h2>
            {isPremium ? (
              currentBadge
            ) : (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-bg">{t('plans.recommended')}</span>
            )}
          </div>
          <p className="mt-3">
            <span className="font-display text-4xl font-extrabold tabular-nums">
              {formatPrice(PREMIUM_PRICE.amount, PREMIUM_PRICE.currency, lang)}
            </span>{' '}
            <span className="text-sm text-text-muted">{t('plans.perMonth')}</span>
          </p>
          <Features items={copy.premium} accent />
          <div className="mt-auto pt-6">
            {plan === 'free' && !isAnonymous && (
              <Button onClick={() => setCheckoutOpen(true)} className="w-full">
                {t('plans.upgrade')}
              </Button>
            )}
            {plan === 'free' && isAnonymous && (
              <Link
                to={ROUTES.profile}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-accent/50 px-4 py-2 text-sm font-medium text-accent-soft transition-colors hover:bg-accent/10"
              >
                <Icon name="lock" size={14} />
                {t('plans.guestCta')}
              </Link>
            )}
          </div>
        </article>
      </div>

      <p className="mt-4 text-center text-xs text-text-muted">{t('plans.demoNote')}</p>

      <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onPay={upgrade} />
      <ConfirmDialog
        open={confirmDowngrade}
        title={t('plans.downgradeConfirm.title')}
        message={t('plans.downgradeConfirm.message')}
        confirmLabel={t('plans.downgrade')}
        onConfirm={handleDowngrade}
        onCancel={() => setConfirmDowngrade(false)}
      />
    </section>
  )
}
