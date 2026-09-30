# Feature: Perfil de usuario

> **Estado:** ✅ Implementado (2026-09-28)
> **Archivos clave:** `src/pages/ProfilePage.jsx`, `src/components/layout/AuthProvider.jsx`,
> `src/hooks/useAuth.js`, `src/hooks/useExplorerTree.js`
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

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/ProfilePage.jsx` | Presentación: card de cuenta (+ form de vinculación si es anónima) y card de resumen de contenido |
| `src/components/layout/AuthProvider.jsx` | `linkIdentity(email, password)` — la lógica de conversión anónima → permanente |
| `src/hooks/useAuth.js` | Expone `linkIdentity` en el contrato de `useAuth()` |
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
