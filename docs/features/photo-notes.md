# Feature: Foto a hoja (transcripción con el Brote)

> **Estado:** En desarrollo (Fase 16, 2026-11-10)
> **ADRs:** ADR-025 (celular primero, foto a hoja y PWA sin dependencias), ADR-021 (el Brote)
> **Spec:** `docs/superpowers/specs/2026-11-10-fase-16-celular-camara-design.md`
> **Archivos clave:** `src/hooks/usePhotoSheet.js`, `src/components/features/camera/**`,
> `src/services/photos.service.js`, `src/lib/photos/photo.js`,
> `supabase/functions/assistant/handler.js`

---

## Qué hace

- En celular, la Carpeta muestra **Foto**: abre la cámara trasera, comprime la imagen y la manda
  al Brote (acción `transcribe`).
- El Brote devuelve Markdown con lo escrito en la hoja.
- El usuario revisa y corrige el Markdown; recién al tocar **Crear hoja** se agrega una hoja
  nueva al final de la materia.
- La foto no se guarda en ningún lado.

## Pendiente de completar en el cierre de la fase

Contrato, cuota, privacidad y verificación en un teléfono.
