# Feature: Planes y pago simulado (Fase 17)

> **Estado:** ✅ Implementado (2026-11-11)
> **Archivos clave:** `src/pages/PlansPage.jsx`, `src/hooks/usePlan.js`,
> `src/services/userPlan.service.js`, `src/constants/plans.js`, `src/lib/format/price.js`,
> `supabase/migrations/0013_simulated_checkout.sql`
> **Dependencias nuevas:** ninguna

---

## Descripción

Pantalla `/planes` con Gratis y Premium, y un **checkout simulado** para la demo: el usuario
"paga" Premium con una tarjeta de prueba y su plan cambia de verdad en `user_plans`, así el
Brote le habilita todo (los topes y funciones por plan los decide el servidor,
`supabase/functions/assistant/config.js`). No hay procesador de pagos ni se cobra nada.

## Decisiones

- **Precio:** Premium **ARS 4.999 por mes** (decisión del equipo, 2026-11-11). Vive en una sola
  constante, `constants/plans.js` (`PREMIUM_PRICE`); se muestra con `formatPrice` (`lib/format/price.js`,
  `Intl.NumberFormat`, con test). La landing sigue sin precios (`docs/features/landing.md`): solo
  linkea a `/planes`.
- **Sin datos de tarjeta.** El checkout no tiene campos de tarjeta: muestra un medio de pago de
  prueba fijo (•••• 4242) y un aviso de que es simulado. Así nadie escribe una tarjeta real en un
  formulario que no la necesita, y no hay datos de pago que proteger.
- **El plan se cambia con una RPC, no con una política de escritura.** `user_plans` sigue sin
  política de `insert`/`update`: el cliente llama `simulate_plan_change(p_plan)`
  (`security definer`, revisada en `docs/03-security.md`), que solo escribe la fila de
  `auth.uid()`, valida `p_plan` y **rechaza invitados** (sesión anónima): para pasar a Premium
  hay que guardar la cuenta primero (Perfil).
- **Volver a Gratis** usa la misma RPC (`'free'`), con confirmación: sirve para mostrar los dos
  estados en la demo.
- **"Procesando el pago…"** dura al menos `CHECKOUT_DELAY_MS` (1,2 s) para que se lea como un
  pago; la espera está en `usePlan`, no en el componente.
- El Brote lee el plan al montarse (`useAssistant`). `/planes` está fuera del workspace (como el
  Perfil), así que al volver a la app el Brote se monta de nuevo y ya ve el plan nuevo.

## Flujo

1. Perfil (chip del plan o "Planes") o la landing → `/planes`.
2. Gratis o invitado: la tarjeta Premium ofrece "Pasar a Premium" (con cuenta) o "Guardá tu cuenta
   para pasar a Premium" (invitado → Perfil).
3. Checkout (modal): resumen (Studree Premium · mensual, total hoy), medio de prueba, aviso de
   simulado → "Pagar" → "Procesando el pago…" → "Ya sos Premium" (o el error, con reintento).
4. Premium: la tarjeta Gratis ofrece "Volver a Gratis" (confirmación).

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/PlansPage.jsx` | Presentación: comparación de planes y el modal de checkout |
| `src/hooks/usePlan.js` | Plan actual, `upgrade()` con la espera mínima, `downgrade()` |
| `src/services/userPlan.service.js` | `getPlan()` y `changePlan(plan)` (RPC `simulate_plan_change`) |
| `src/constants/plans.js` | `PREMIUM_PRICE`, `DEMO_CARD_LAST4`, `CHECKOUT_DELAY_MS` |
| `src/lib/format/price.js` | `formatPrice(amount, currency, lang)` (puro, con test) |
| `supabase/migrations/0013_simulated_checkout.sql` | La función `simulate_plan_change` |
| `src/lib/i18n/{es,en}/plans.js` | Textos |

## Restricciones

- Esto es **solo para la demo**. Antes de cobrar de verdad, `simulate_plan_change` se reemplaza
  por el webhook de un procesador de pagos (el plan lo cambia el servidor, nunca el cliente).
  Queda en el checklist de `docs/03-security.md`.
- Nunca agregar campos de tarjeta a este checkout.

## Pendiente

- [ ] Procesador de pagos real (Mercado Pago / Stripe) con webhook.
