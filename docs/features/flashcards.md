# Feature: Tarjetas (flashcards)

> **Fase 15** — Estado: 🟡 En desarrollo (2026-11-10).
> Leer antes de tocar `services/flashcards.service.js`, `useFlashcards`,
> `pages/FlashcardsPage.jsx`, `features/flashcards/**` o `lib/flashcards/**`.
> Spec: `docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md`.

## Descripción

Cada materia tiene un **mazo de tarjetas** con frente y dorso. El repaso usa **cajas de
Leitner**: acertar sube una caja (hasta la 5) y fallar vuelve a la 1. El próximo repaso se
calcula con la caja: 0, 1, 2, 4 y 8 días.

## Archivos clave

- `supabase/migrations/0010_fase15.sql` — tabla `flashcards` con RLS por dueño.
- `src/lib/flashcards/srs.js` — `REVIEW_DAYS`, `nextReview`, `isDue`, `dueCards`, `boxLabel`.
- `src/services/flashcards.service.js` — listar por materia, crear, editar, borrar, repasar.
- `src/hooks/useFlashcards.js` — estado del mazo y de la sesión.
- `src/components/features/flashcards/{FlashcardDeck,FlashcardForm,FlashcardReview}.jsx`.
- `src/pages/FlashcardsPage.jsx` — `/materias/:subjectId/tarjetas` (con sesión).
- Botón "Tarjetas" en la barra de la Carpeta.

## Reglas

- Las tarjetas son privadas (RLS `auth.uid() = user_id`).
- Borrar la materia borra sus tarjetas; borrar una hoja deja la tarjeta sin `sheet_id`.
- Una tarjeta es "para hoy" si `due_at <= ahora`.
- Acertar en la caja 5 la deja en la 5 con 8 días; fallar siempre vuelve a la caja 1 con
  vencimiento inmediato.
- El repaso actualiza `box`, `due_at` y `last_reviewed_at` en una sola escritura.

## Pendiente

- Generar tarjetas desde una hoja con el Brote (fase posterior: toca la Edge Function y cuotas).
- Historial de repasos y estadísticas (fuera de alcance).
- Verificación en el navegador y aplicar la migración `0010` (paso del estudiante).
