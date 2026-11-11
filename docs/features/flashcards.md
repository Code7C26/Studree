# Feature: Tarjetas (flashcards)

> **Fase 15** — Estado: ✅ Implementado (2026-11-10). Migración `0010_fase15.sql` escrita;
> **falta aplicarla** (paso del estudiante). Verificación visual en navegador pendiente.
> Leer antes de tocar `services/flashcards.service.js`, `useFlashcards`,
> `pages/FlashcardsPage.jsx`, `features/flashcards/**` o `lib/flashcards/**`.
> Spec: `docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md`.

## Descripción

Cada materia tiene un **mazo de tarjetas** con frente y dorso. El repaso usa **cajas de
Leitner**: acertar sube una caja (hasta la 5) y fallar vuelve a la 1. El próximo repaso se
calcula con la caja: 0, 1, 2, 4 y 8 días.

## Archivos clave

- `supabase/migrations/0010_fase15.sql` — tabla `flashcards` con RLS por dueño.
- `src/lib/flashcards/srs.js` — `REVIEW_DAYS`, `nextReview`, `isDue`, `dueCards`, `boxLabel`
  (puros, con tests).
- `src/services/flashcards.service.js` — listar por materia, crear, editar, borrar, repasar.
- `src/hooks/useFlashcards.js` — mazo, vencidas, alta/edición/borrado y repaso.
- `src/components/features/flashcards/FlashcardDeck.jsx` — lista con caja y próximo repaso.
- `src/components/features/flashcards/FlashcardForm.jsx` — alta y edición (1–2000 por lado).
- `src/components/features/flashcards/FlashcardReview.jsx` — sesión frente → dorso → respuesta.
- `src/pages/FlashcardsPage.jsx` — `/materias/:subjectId/tarjetas` (con sesión); helper `cardsPath`.
- Botón **Tarjetas** en la barra de la Carpeta.

## Reglas

- Las tarjetas son privadas (RLS `auth.uid() = user_id`); el `with check` exige que la materia
  sea del usuario.
- Borrar la materia borra sus tarjetas; borrar una hoja deja la tarjeta sin `sheet_id`
  (`on delete set null`).
- Una tarjeta es "para hoy" si `due_at <= ahora`.
- Acertar sube una caja: `1 → 2` (1 día), `2 → 3` (2), `3 → 4` (4), `4 → 5` (8), `5 → 5` (8).
  Fallar vuelve a la caja 1 con vencimiento inmediato.
- El repaso actualiza `box`, `due_at` y `last_reviewed_at` en una sola escritura.
- La sesión trabaja sobre una **foto** de las vencidas al empezar: repasar no acorta la lista.

## Flujos

- **Crear/editar:** formulario modal; se valida frente y dorso no vacíos y el tope de 2000.
- **Repasar:** "Repasar" toma las vencidas y abre la sesión; Mostrar → La sabía / No la sabía;
  al terminar, resumen y vuelta al mazo.
- **Borrar:** confirmación → `remove(id)`.
- **Cambio de idioma:** las cajas y las fechas cambian al instante (todo por `t()`).

## Errores

Todos los métodos devuelven `{ data, error }` con el error traducido (`translateError`):
`errors.flashcards.load`, `.create`, `.save`, `.remove`, `.review`.

## Pendiente / fuera de alcance

- **Aplicar la migración `0010`** (estudiante) y probar con dos cuentas.
- Generar tarjetas desde una hoja con el Brote (toca la Edge Function y cuotas).
- Historial de repasos, estadísticas y tarjetas compartidas.
- Verificación visual en el navegador.
