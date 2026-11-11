# Feature: Foto a hoja (transcripción con el Brote)

> **Estado:** ✅ Implementado (2026-11-10, Fase 16)
> **ADRs:** ADR-025 (celular primero, foto a hoja y PWA sin dependencias), ADR-021 (el Brote)
> **Spec:** `docs/superpowers/specs/2026-11-10-fase-16-celular-camara-design.md` ·
> plan: `docs/superpowers/plans/2026-11-10-fase-16.md`
> **Archivos clave:** `src/components/features/camera/PhotoButton.jsx`,
> `PhotoSheetDialog.jsx`, `src/hooks/usePhotoSheet.js`, `src/services/photos.service.js`,
> `src/lib/photos/photo.js`, `src/lib/photos/transcription.js`,
> `supabase/functions/assistant/*` (acción `transcribe`), migración `0011`

---

## Qué hace

- En la barra de la Carpeta, **solo en celular** (`useIsMobile`), aparece el botón **Foto**
  (ícono de cámara). En escritorio no existe.
- Toca "Foto" → se abre la cámara trasera con un
  `<input type="file" accept="image/*" capture="environment">`: el flujo nativo del teléfono
  deja revisar la foto antes de confirmar. Sin `getUserMedia` ni permisos extra.
- La foto se **comprime en el navegador** (`compressPhoto`): JPEG, lado mayor ≤1600 px,
  calidad 0.82, fondo blanco, sin EXIF; reintenta con menos calidad y, si hace falta, menos
  tamaño hasta quedar ≤1,5 MB.
- El diálogo muestra la foto y **"Transcribiendo…"** mientras el Brote responde en streaming
  (los `text` se van mostrando). Se puede **Cancelar** en cualquier momento: se aborta el
  pedido y no se consume el uso.
- El resultado llega como **Markdown editable** en el diálogo. "Sacar otra" vuelve a la
  cámara; "Crear hoja" agrega una **hoja nueva al final** de la materia (fecha y hora del
  momento, igual que cualquier hoja de la Carpeta) y baja el scroll hasta ella.
- **Nada se guarda sin aprobación.** Cancelar o cerrar no crea hojas ni deja estados colgados.
- La foto **no se guarda** en Supabase, Storage, cache ni logs (ver `docs/03-security.md`).

## Cuota

| Plan | Tope |
|---|---|
| Free | 5 fotos por día |
| Premium | 100 fotos por día |

Acción `transcribe` de la Edge Function `assistant` (migración `0011`; balde propio, igual
tabla que `docs/features/assistant.md`). Los topes viven en `supabase/functions/assistant/config.js`.

## Cómo funciona por dentro

- **Reglas puras** (`src/lib/photos/photo.js`, testeadas en Node): `fitWithin` (escala sin
  deformar), `isBase64`, `photoDataUrlToBase64`, topes (`MAX_PHOTO_SIDE`, `MAX_PHOTO_BYTES`).
  La parte de canvas vive en `photos.service.js` (browser).
- **Pedido** (`lib/assistant/transcribeRequest.js`): `action: 'transcribe'`, alcance
  `subject`, `mode: 'notes'`, `uiLang` y `image: {mimeType, data}` (base64 sin prefijo).
- **Acumulador** (`lib/photos/transcription.js`): junta los eventos `text` y guarda el primer
  `error`; el service lo traduce con `camera.errors.*`.
- **Servidor:** `request.js` valida la imagen cerrado (mime, base64 canónico, tope
  `MAX.imageChars`, solo alcance `subject`, solo para `transcribe`); `handler.js` la manda como
  parte `inlineData` con un prompt propio (`buildTranscribeSystemPrompt`) que copia lo escrito
  sin inventar y trata la foto como datos, nunca instrucciones. Sin texto → `no_text` sin
  descontar uso. Con texto → `usage` (balde `transcribe`) + `done`.
- **La hoja se crea con el mismo camino que una plantilla:** `addLocalSheet(markdown)` en la
  Carpeta (se guarda al tener contenido, con su autosave). Sin APIs nuevas de hojas.

## Errores visibles

| Caso | Mensaje |
|---|---|
| Archivo que no es imagen jpeg/png/webp | "Ese archivo no es una imagen compatible." |
| Foto demasiado pesada incluso comprimida | "La foto es muy pesada. Probá de nuevo." |
| No se puede abrir la foto | "No se pudo abrir la foto. Probá de nuevo." |
| Foto sin texto legible (`no_text`) | "No encontramos texto en la foto. Probá con más luz y la hoja derecha." |
| Errores del Brote (`upstream`, `blocked`, `timeout`, …) | mensajes propios en `camera.errors.*` |

## Verificación `[ESTUDIANTE]`

1. Aplicar las migraciones `0010` + `0011` y **redesplegar** `supabase functions deploy assistant`.
2. Teléfono: foto de una hoja legible → Markdown en el diálogo → "Crear hoja" → hoja nueva al final.
3. Cancelar durante "Transcribiendo…": no se crea nada y la cuota no se descuenta.
4. Foto de una pizarra sin texto → aviso "No encontramos texto…".

## Fuera de alcance

Varias fotos por transcripción, guardar la foto como adjunto, OCR en escritorio.
