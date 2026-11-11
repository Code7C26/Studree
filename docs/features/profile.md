# Feature: Perfil de usuario

> **Estado:** ✅ Implementado (2026-09-28) · rediseño visual el 2026-11-11
> **Archivos clave:** `src/pages/ProfilePage.jsx`, `src/hooks/useProfile.js`,
> `src/lib/profile/profileStats.js`, `src/components/layout/AuthProvider.jsx`, `src/hooks/useAuth.js`,
> `src/hooks/useExplorerTree.js`
> **Dependencias nuevas:** ninguna

---

## Descripción

Última pieza pendiente de la Fase 5. Es la pantalla `/perfil`: muestra la cuenta actual y
un resumen de cuánto contenido tiene cargado el usuario. No es un CRUD de "settings" (no
hay preferencias que editar todavía, más allá de la sesión) — eso queda para cuando exista
una necesidad real, en vez de anticiparla (Mandamiento I).

## Problema que resuelve

`AuthProvider` ya soporta **sesión anónima** (ver `docs/03-security.md` y el comentario en
`isAnonymous`): el usuario entra sin registrarse y su `auth.uid()` es real, así que RLS
funciona igual. El riesgo es que **cerrar sesión siendo anónimo pierde los datos para
siempre**: no existe ninguna credencial con la que volver a entrar a ese usuario. Antes de
esta feature no había forma de salir de ese estado sin arriesgarse.

## Decisiones

- **Vincular cuenta anónima → permanente.** Si la sesión es anónima, el perfil ofrece un
  formulario de email + contraseña. Por abajo llama a
  `supabase.auth.updateUser({ email, password })`, que **no crea un usuario nuevo**: la fila
  de `auth.users` sigue siendo la misma, solo deja de ser anónima. Todo lo que el usuario ya
  cargó (carreras, materias, hojas) queda intacto porque `user_id` no cambia.
  - Si el proyecto de Supabase tiene confirmación de email activada, el mail nuevo queda
    pendiente en `new_email` hasta que el usuario abre el link de confirmación — el perfil
    muestra un aviso (`needsConfirmation`), no un error.
  - El link del mail vuelve al **Perfil del mismo sitio** (`emailRedirectTo`), siempre que esa
    URL esté en las Redirect URLs de Supabase (`docs/04-deployment.md`).
  - Reintentar enseguida ("only request this after N seconds") o usar un email que ya tiene
    cuenta muestran su propio mensaje, no el genérico (`services/authErrors.js`).
  - Si el envío del mail falla (ej. SMTP mal configurado), Supabase igual deja guardada la
    contraseña; al reintentar con la misma responde `same_password`. `linkIdentity` lo detecta y
    reintenta solo con el email.
  - Si el link se abre en **otro dispositivo** (ej. el celular), esta pestaña no se entera: su
    token sigue diciendo "anónimo" hasta vencer. Mientras la sesión sea anónima, `AuthProvider`
    pide un token nuevo (`refreshSession`) al volver a la pestaña (como mucho cada 30 s), y el
    perfil pasa solo a "Cuenta con email".
  - Si el email ya tiene cuenta ("Ese email ya tiene cuenta. Iniciá sesión"), debajo del
    formulario está **"¿Ya tenés cuenta? Entrá"** → `/entrar`, que acepta al invitado (antes lo
    redirigía al Inicio y no había forma de iniciar sesión).
  - Implementado en `AuthProvider.linkIdentity(email, password)` (no en el componente,
    Mandamiento II: la lógica de negocio va en el provider/hook, no en la página).
- **Resumen de contenido, no un dashboard.** Carreras / materias / hojas contadas a partir
  del árbol que ya trae `useExplorerTree` (el mismo hook del explorador y el Command
  Palette) — se reutiliza en vez de escribir otra consulta a Supabase para lo mismo
  (Mandamiento XI). No se agregó un service ni un hook nuevo solo para contar filas.
- **No hay "cambiar contraseña" ni "borrar cuenta" todavía.** No se pidió y no hay caso de
  uso claro todavía (el único flujo real hoy es "vengo anónimo y quiero no perder mis
  datos"). Se deja como pendiente explícito más abajo en vez de construirlo sin que haga
  falta.
- **`signOut` no se duplica**: el botón "Salir" del perfil llama al mismo
  `useAuth().signOut()` que ya usa `Header.jsx`. No se muestra si la sesión es anónima
  (mismo criterio que el header: no hay con qué volver a entrar).

- **Idioma (Fase 18).** Entre la cuenta y el contenido cargado hay una sección "Idioma /
  Language" con el selector Castellano / English (`components/ui/LanguageSelector.jsx`). Es la
  única "preferencia" del perfil: se guarda en el dispositivo (`studree:ui:lang`), no en
  Supabase, y sobrevive a cerrar sesión. Ver `docs/features/i18n.md`.

- **"Conocé Studree" (2026-11-11).** Al pie, un link a la landing (`/bienvenida`): es la única
  forma de volver a verla desde la app después de la primera visita. Ver `docs/features/landing.md`.

- **Rediseño (2026-11-11): más tecnológico y con detalle, como el Inicio.** Misma grilla de
  vidrio (`.glass`) y la luz de lámpara (ADR-018), en este orden (en celular, una columna):
  1. **Tarjeta de identidad** con la lámpara: avatar (inicial del email con anillo verde, o el
     Brote si es invitado), email o "Invitado", chips de tipo de cuenta, plan (`getPlan()`, ya
     existente) y "Miembro desde" (`auth.users.created_at`), y una línea en mono con el id corto.
  2. **Métricas:** carreras, materias y hojas en número grande con ícono.
  3. **Cuenta:** para el invitado es la tarjeta protagonista ("Guardá tu cuenta", aviso en
     `warn` y el formulario); con cuenta, el email y "Salir".
  4. **Preferencias:** idioma y "Conocé Studree".
  5. **Tus carreras:** una barra por carrera en su color con materias y hojas (hasta 6).
  Todo sale del árbol de `useExplorerTree` y del plan: no hay consultas nuevas. Los cálculos son
  puros y con test (`lib/profile/profileStats.js`); `useProfile` junta sesión, árbol y plan.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/ProfilePage.jsx` | Presentación: identidad, métricas, cuenta (+ form si es anónima), preferencias y tus carreras |
| `src/hooks/useProfile.js` | Junta `useAuth`, `useExplorerTree` y `getPlan()`; calcula las estadísticas |
| `src/lib/profile/profileStats.js` | Puras con test: `profileStats`, `shortId`, `initialOf` |
| `src/components/layout/AuthProvider.jsx` | `linkIdentity(email, password)` — la lógica de conversión anónima → permanente |
| `src/hooks/useAuth.js` | Expone `linkIdentity` en el contrato de `useAuth()` |
| `src/components/ui/LanguageSelector.jsx` | Selector de idioma (radiogroup de dos botones), usa `useI18n` |
| `src/hooks/useExplorerTree.js` | Fuente de los conteos (carreras/materias/hojas), sin cambios — se reutiliza tal cual |

## Restricciones

- El perfil no toca `localStorage` directamente: todo pasa por `useAuth` (sesión) y
  `useExplorerTree` (datos), igual que el resto de la app.
- `linkIdentity` no valida el DAG ni nada del modelo de datos: es pura autenticación,
  Supabase Auth es quien valida el email/contraseña.

## Pendiente

- [ ] Cambiar contraseña (usuario ya autenticado con email).
- [ ] Borrar cuenta.
- [ ] Preferencias visuales (si alguna vez dejan de ser solo "modo oscuro fijo").
