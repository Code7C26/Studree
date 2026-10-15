# Feature: Adjuntos

> **Fase 13** · Estado: ✅ Implementado (2026-10-15). Migración `0006_fase13.sql` aplicada el 2026-10-15.
> Leer antes de tocar `services/attachments.service.js`, `useFolderAttachments`,
> `lib/attachments/**`, `lib/editor/attachmentNodes.js` o `features/attachments/**`.

## Archivos clave

- `supabase/migrations/0006_fase13.sql` — tabla `attachments` y bucket privado `attachments`.
- `src/services/attachments.service.js` — subir, listar, link firmado, borrar y descargar.
- `src/hooks/useFolderAttachments.js` — adjuntos de todas las hojas de la carpeta (una consulta `IN`).
- `src/lib/attachments/refs.js` — referencias `adjunto:<id>` en el Markdown (puras).
- `src/lib/attachments/files.js` — `storageSafeName` y `formatBytes` (puras).
- `src/constants/attachmentLimits.js` — 20 MB.
- `src/lib/editor/sheetSaver.js` — `ensureCreated()` y `createNow`.
- `src/lib/editor/attachmentNodes.js` — extensión TipTap de imágenes y links `adjunto:` (`@tiptap/extension-image@3.31.3`).
- `src/components/features/attachments/AttachmentList.jsx` — lista al pie de la hoja.

## Descripción

Se adjuntan archivos **solo a las hojas**. Las imágenes se ven dentro del texto; el resto
(PDF, etc.) queda como link y todos aparecen en una lista al pie de la hoja.

## Modelo

Ver [`DB_SCHEMA.md` § Adjuntos](../DB_SCHEMA.md#adjuntos-0006).

## Referencias en el Markdown

`![nombre](adjunto:<id>)` para imágenes y `[nombre](adjunto:<id>)` para el resto. **No se
guardan URLs**: los links firmados vencen y el Markdown es la fuente de verdad del
contenido; el id es estable y el link se resuelve al mostrarlo.

## Subir

Soltar el archivo, pegarlo o usar el botón. Máximo **20 MB** por archivo. Una hoja nueva
(todavía local) se crea primero con `ensureCreated()`, porque el adjunto cuelga de una hoja
real. Se sube el archivo y recién después se inserta la fila; si la fila falla, se borra el
archivo.

- **"Subiendo…":** el marcador es **el propio nodo de imagen**, que se inserta con
  `adjunto:<id>` (id generado en el cliente) antes de que termine la subida; no es una
  decoración aparte. `upload` registra la subida como pendiente de forma sincrónica. Si la
  pestaña se cierra a mitad de la subida, la referencia queda en el texto y muestra
  "Adjunto no disponible". Los archivos que no son imagen se insertan como link enseguida.
- **Pegar:** solo se tratan como adjuntos los portapapeles con archivos y **sin**
  `text/plain` ni `text/html` (capturas de pantalla). Lo copiado de Word, Excel o la web
  se pega normal.
- **Botón de adjuntar (clip):** siempre visible en la cápsula de herramientas; sin hoja con
  foco adjunta a la última, y queda deshabilitado si la carpeta no tiene hojas.

## Ver

Link firmado de **1 h**, cacheado en memoria por id (se renueva a los 55 min).

## Borrar

Es **definitivo** (no pasa por la papelera). La referencia en el texto queda como
"Adjunto no disponible". Sacar la referencia del texto **no** borra el archivo: se borra
desde la lista al pie.

## Seguridad

Bucket privado, rutas `<user_id>/<attachment_id>/<nombre>` y políticas por primera carpeta
= `auth.uid()`. Ver [`03-security.md` § Storage](../03-security.md#storage-adjuntos-0006).

## Export e import

El export `.zip` lleva los archivos en `adjuntos/` y reescribe las referencias a rutas
relativas, codificando cada segmento con `encodeURIComponent` más los paréntesis (así
sobrevive el `#`); si una descarga falla, la referencia pasa a `[imagen: …]` / `[archivo: …]`
y el diálogo avisa. El import hace el camino inverso. Ver `markdown-export.md` e `import.md`.

## Errores

Archivo de más de 20 MB, archivo vacío, sesión vencida y fallos de Storage o de la fila se
traducen a un mensaje en castellano (`ServiceResult.error`); nunca se propaga el error crudo.

## Pendiente

- [ ] Verificar en el navegador (la extensión de Chrome no estaba conectada al implementar): el round-trip en el editor (el Markdown guarda `![…](adjunto:…)` limpio y la imagen se ve al recargar), soltar, pegar una captura y el clip; y que el borrado deje el bucket sin huérfanos.
- [ ] Seguimiento menor: si la pestaña se cierra a mitad de una subida, la referencia queda en el texto como "Adjunto no disponible".
