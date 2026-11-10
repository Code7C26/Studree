# Feature: Compartir por link

> **Fase 15** — Estado: 🟡 En desarrollo (2026-11-10).
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
- `src/lib/share/token.js` — token de 32 hex (128 bits).
- `src/lib/share/publicMarkdown.js` — quita adjuntos y resuelve `[[Tema]]` a texto.
- `src/hooks/useSharedLink.js`, `src/hooks/usePublicSubject.js`.
- `src/components/features/share/ShareDialog.jsx` y `src/pages/SharedSubjectPage.jsx`.
- Ruta pública `ROUTES.shared` (`/compartido/:token`), fuera de `AppLayout`.

## Reglas

- Un **solo link activo por materia** (`unique (subject_id) where revoked_at is null`).
- Revocar es inmediato: la RPC devuelve vacío si `revoked_at is not null`.
- La lectura pública la hace `get_shared_subject`, la única función `security definer` del
  proyecto. Ver la revisión en [`03-security.md`](../03-security.md).
- La vista pública **no muestra adjuntos** (el bucket es privado) ni permite navegar a otra
  materia. Los `[[Tema]]` se ven como texto.
- No vence sola: queda activa hasta que el dueño la revoca.

## Pendiente

- Verificación en el navegador con una ventana privada.
- Aplicar la migración `0010` (paso del estudiante).
