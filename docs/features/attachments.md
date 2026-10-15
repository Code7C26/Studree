# Feature: Adjuntos

> **Fase 13** · Estado: 🟡 Service, hook y saver hechos (falta la UI del editor y la verificación en el navegador).
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
- `src/lib/editor/attachmentNodes.js` y `src/components/features/attachments/**` — UI del editor (Tareas 6 y 7).

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
real. La referencia se inserta de inmediato con un id generado en el cliente y la imagen
aparece con "Subiendo…" hasta que termina (`upload` registra la subida como pendiente de
forma sincrónica). Se sube el archivo y recién después se inserta la fila; si la fila falla,
se borra el archivo.

## Ver

Link firmado de **1 h**, cacheado en memoria por id (se renueva a los 55 min).

## Borrar

Es **definitivo** (no pasa por la papelera). La referencia en el texto queda como
"Adjunto no disponible". Sacar la referencia del texto **no** borra el archivo: se borra
desde la lista al pie.

## Seguridad

Bucket privado, rutas `<user_id>/<attachment_id>/<nombre>` y políticas por primera carpeta
= `auth.uid()`. Ver [`03-security.md` § Storage](../03-security.md#storage-adjuntos-0006).

## Errores

Archivo de más de 20 MB, archivo vacío, sesión vencida y fallos de Storage o de la fila se
traducen a un mensaje en castellano (`ServiceResult.error`); nunca se propaga el error crudo.

## Pendiente

- UI del editor (nodo de adjunto, soltar/pegar, lista al pie): Tareas 6 y 7.
- Export `.zip` con los archivos (usa `download`).
