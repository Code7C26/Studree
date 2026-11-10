# Feature: Compartir por link

> **Fase 15** — Estado: ✅ Implementado (2026-11-10). Migración `0010_fase15.sql` escrita;
> **falta aplicarla** (paso del estudiante). Verificación visual en navegador pendiente.
> Leer antes de tocar `services/sharedLinks.service.js`, `useSharedLink`, `usePublicSubject`,
> `pages/SharedSubjectPage.jsx`, `features/share/**` o `lib/share/**`.
> Spec: `docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md`.

## Descripción

Una materia (la Carpeta completa) se puede compartir con un link público de **solo lectura**.
El dueño genera el link, lo copia y puede revocarlo. Quien lo abre ve el nombre de la materia,
el de la carrera y sus hojas fechadas, sin cuenta y sin header.

## Archivos clave

- `supabase/migrations/0010_fase15.sql` — tabla `shared_links` y RPC `get_shared_subject`.
- `src/services/sharedLinks.service.js` — link activo, crear, revocar, leer público.
- `src/lib/share/token.js` — token de 32 hex (128 bits): `isValidToken`, `normalizeToken`, `newToken`.
- `src/lib/share/publicMarkdown.js` — quita adjuntos y resuelve `[[Tema]]` a texto.
- `src/hooks/useSharedLink.js` — link activo, generar, revocar y copiar.
- `src/hooks/usePublicSubject.js` — lectura pública por token.
- `src/components/features/share/ShareDialog.jsx` — diálogo con input, copiar y revocar.
- `src/pages/SharedSubjectPage.jsx` — página pública (hojas sobre papel, TipTap en solo lectura).
- Ruta pública `ROUTES.shared` (`/compartido/:token`), fuera de `AppLayout`; helper `sharedPath(token)`.
- Botón **Compartir** en la barra de la Carpeta.

## Reglas

- Un **solo link activo por materia** (`unique (subject_id) where revoked_at is null`).
- Revocar es inmediato (`revoked_at`, no se borra la fila): la RPC devuelve vacío.
- La lectura pública la hace `get_shared_subject`, la única función `security definer` del
  proyecto. Revisión en [`03-security.md`](../03-security.md) y ADR-024.
- La vista pública **no muestra adjuntos** (el bucket es privado) ni permite navegar a otra
  materia. Los `[[Tema]]` se ven como texto.
- No vence sola: queda activa hasta que el dueño la revoca.
- La página pública es `noindex` por no estar enlazada; el token es la única credencial.

## Flujos

- **Generar:** Compartir → "Generar link" (`sharedLinksService.create`). Si ya había uno activo,
  se reusa; si dos pestañas compiten, la que pierde el índice único relee el link ganador.
- **Copiar:** botón Copiar (`navigator.clipboard`). Si falla, se selecciona el input y se avisa
  para copiar a mano.
- **Revocar:** confirmación → `revoke(id)` → el link queda inactivo al instante. Se puede generar
  uno nuevo (fila nueva, token nuevo).
- **Abrir el link:** `usePublicSubject(token)` → RPC → se pintan las hojas con
  `toPublicMarkdown` (sin adjuntos) y `formatSheetDateLong`. Estados: cargando, error y
  "este link no está disponible" (inexistente, revocado o materia en la papelera).

## Errores

Todos los métodos devuelven `{ data, error }` con el error traducido (`translateError`):
`errors.share.load`, `.create`, `.revoke`, `.open`.

## Pendiente

- **Aplicar la migración `0010`** (estudiante) y probar con dos cuentas + ventana privada.
- Verificación visual de la página pública en el navegador.
