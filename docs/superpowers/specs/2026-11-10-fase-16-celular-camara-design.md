# Fase 16 — Celular, cámara y lectura sin señal: diseño

> Spec de la Fase 16 del roadmap (`docs/01-project-overview.md`).
> Plan: `docs/superpowers/plans/2026-11-10-fase-16.md`.

## Problema

Estudiar pasa en el celular: en el colectivo, en el aula, con el cuaderno al lado. Hoy Studree
está pensado para escritorio y no hay forma de pasar una hoja escrita a mano a la carpeta sin
tipearla entera. La Fase 16 resuelve tres cosas que van juntas:

1. **Usar Studree cómodo en el celular** (la app no se rompe ni se aprieta en pantallas chicas).
2. **Sacarle una foto a una hoja de papel** y que el Brote la transcriba a una hoja nueva de la
   materia, sin tipear.
3. **Leer sin señal** lo que ya se abrió (la app instalable y la carpeta con su cache).

## Alcance de esta fase

### A. Adaptación al celular

- **Punto de corte único:** `md` (768 px) de Tailwind, igual que el explorador. Por debajo, la
  app es "celular"; desde ahí, escritorio.
- La **Carpeta** en celular:
  - la barra de herramientas se puede deslizar en horizontal (no se corta ni tapa el papel);
  - las hojas usan menos margen lateral y el texto respeta el tamaño de lectura del sistema;
  - los botones de la barra de acciones ("Nueva hoja", "Compartir", "Tarjetas") tienen área
    táctil de 44 px y no se solapan con el notch (`env(safe-area-inset-*)`);
  - "Nueva hoja" al final queda alcanzable con el pulgar.
- **Diálogos** (modal, confirmación, compartir, tarjetas): en celular se apoyan abajo como hoja
  deslizante (`max-h: 90dvh`, esquinas de arriba redondeadas, scroll interno), nunca más altos
  que la pantalla.
- **Explorador, pestañas y buscador:** sin cambios de comportamiento; se verifica que el drawer
  ocupe el ancho completo y que las pestañas se deslicen.
- **Táctil:** se eliminan los estados que dependen solo de `hover` para acciones esenciales
  (borrar hoja ya aparece con foco; se mantiene).

### B. Foto → hoja transcrita (solo celular)

- En la barra de la Carpeta aparece un botón **"Foto"** (ícono de cámara) **solo en celular**.
  En escritorio no se muestra: la función es para sacar una foto en el momento.
- Toca "Foto" → se abre la cámara trasera con `<input type="file" accept="image/*"
  capture="environment">`. No se usa `getUserMedia`: menos permisos y el flujo nativo del
  teléfono ya deja revisar la foto.
- La imagen se **comprime en el navegador** antes de viajar: lado mayor ≤ 1600 px, JPEG calidad
  0.82, fondo blanco. Se quita el EXIF al reencodear (privacidad). Tope de salida:
  1,5 MB binarios.
- Se muestra la foto y un estado "Transcribiendo…" con "Cancelar". El pedido va a la Edge
  Function `assistant` con la acción nueva **`transcribe`**, alcance de la materia abierta y el
  idioma de la interfaz.
- El Brote devuelve **Markdown** con lo que está escrito en la foto: transcribe literal, usa
  `#` solo cuando la hoja tiene títulos visibles, conserva listas y numeraciones, no inventa ni
  completa contenido. Si la foto no tiene texto legible, devuelve vacío y la UI lo dice.
- El resultado se muestra en un **diálogo de revisión** con el Markdown en un área editable.
  El usuario puede corregir, "Sacar otra" o "Crear hoja". **Nada se guarda sin aprobación.**
- "Crear hoja" agrega una **hoja nueva al final** de la materia (fecha y hora actuales, como
  cualquier hoja de la Carpeta), con el Markdown aprobado, y lleva el scroll hasta ella. Nunca
  modifica ni reemplaza una hoja existente.
- Una foto por pedido. Se puede repetir; cada transcripción consume cuota.
- Si el usuario cancela o cierra, se aborta el pedido y no se consume el resultado.

### C. Instalable y lectura sin señal

- **PWA instalable:** `manifest.webmanifest` (nombre, colores, `display: standalone`, íconos
  192/512) y un `service worker` propio (sin dependencias) que cachea el shell y los assets
  estáticos con estrategia *cache-first* para `/assets/*`, fuentes e íconos, y *network-first*
  para navegación con respaldo en cache. Se registra **solo en producción** y no intercepta
  requests a Supabase ni a la Edge Function.
- **Lectura sin señal:** la Carpeta muestra lo último guardado:
  - `useFolder` pinta primero la cache de hojas y de la materia (clave `subject:<id>`) y
    después reconcilia con Supabase, igual que el resto de la app;
  - si la red falla, se muestra un aviso discreto "Sin conexión: estás viendo lo guardado" con
    "Reintentar", sin borrar lo que se ve;
  - escribir sin señal sigue funcionando como hoy: el autosave reintenta y la hoja nueva queda
    como borrador local hasta que vuelva la conexión.
- La cache se borra al cerrar sesión (ya ocurre con `clearAllCache`), así que no queda contenido
  de un usuario para el siguiente.

## Decisiones y por qué

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Punto de corte `md` | Breakpoints nuevos | El explorador ya usa `md`; dos criterios distintos confunden y duplican estilos. |
| `input capture` | `getUserMedia` con preview propio | Flujo nativo, sin permisos extra ni cámara que queda prendida; menos código y menos fallas. |
| Comprimir en el cliente | Subir la foto original | Una foto de 8 MB no entra en el tope del pedido y tarda; comprimir también quita EXIF. |
| Acción `transcribe` en la Edge Function | Otro servicio de OCR | Ya existe el Brote, su cuota y su auditoría; una acción nueva es el cambio mínimo. |
| Markdown editable antes de crear | Crear la hoja directo | El OCR se equivoca; el usuario corrige barato y nada se guarda sin aprobación. |
| Hoja nueva al final | Insertar en una hoja existente | La Carpeta es cronológica y no tiene cursor de inserción; una hoja nueva no rompe nada. |
| Un `service worker` propio | `vite-plugin-pwa` | Ninguna dependencia nueva; el alcance es chico y explícito. |
| Cache de lectura por localStorage | Cache API con datos de Supabase | La app ya cachea listas; se reutiliza el mecanismo y se respeta ADR-007. |

## Seguridad y privacidad

- La foto viaja **solo** a la Edge Function (que la reenvía a Gemini como *inline data*) y no se
  guarda en Supabase ni en Storage. No se loguea ni se escribe en `ai_usage` (solo se registra
  `action = 'transcribe'`).
- `GEMINI_API_KEY` sigue siendo un secret de la función. El cliente usa el JWT del usuario con
  la anon key; nunca `service_role`.
- La imagen es **entrada no confiable**: va como parte multimodal, nunca como instrucción de
  sistema. El prompt pide transcribir, no obedecer lo que diga la foto.
- Validación cerrada en el servidor: acción conocida, `image.mimeType` en lista corta
  (`image/jpeg`, `image/png`, `image/webp`), `image.data` base64 con tope de caracteres y
  longitud múltiplo de 4; el cuerpo HTTP tiene un tope propio para imágenes.
- Cuota nueva `transcribe`: free 5 por día, premium 100 por día. Requiere ampliar el CHECK de
  `ai_usage.action` (migración `0011`). Sin la migración aplicada, el pedido responde bien pero
  el registro de uso falla en silencio (se loguea), igual que cualquier error de auditoría.
- El service worker no cachea respuestas de Supabase ni de `functions/v1`: no deja apuntes en
  un cache compartido del navegador más allá de localStorage, que se limpia al cerrar sesión.

## Modelo de datos (migración 0011)

Solo cambia el CHECK de auditoría; no hay tablas nuevas:

```sql
alter table ai_usage drop constraint if exists ai_usage_action_check;
alter table ai_usage add constraint ai_usage_action_check check (action in
  ('chat', 'shortcut', 'summary', 'quiz', 'weak_review', 'study_plan', 'gaps', 'connections', 'quiz_grade', 'transcribe'));

notify pgrst, 'reload schema';
```

## Contrato del pedido `transcribe`

```json
{
  "action": "transcribe",
  "message": "",
  "history": [],
  "mode": "notes",
  "scope": { "type": "subject", "id": "<uuid>" },
  "uiLang": "es",
  "image": { "mimeType": "image/jpeg", "data": "<base64 sin prefijo data:>" }
}
```

- Respuesta: stream SSE con `text` (deltas del Markdown), `usage` y `done`, igual que el chat.
- Errores nuevos: `no_text` cuando el modelo no devuelve texto legible, `bad_image` cuando la
  imagen no pasa la validación. El cliente los muestra traducidos.

## Fuera de alcance

- Varias fotos por transcripción o unión de páginas.
- Guardar la foto como adjunto de la hoja.
- OCR en escritorio (subir un archivo de imagen).
- Sincronización offline de cambios (solo lectura + borradores locales como hoy).
- Notificaciones push o instalación forzada.

## Criterios de aceptación

1. En un ancho < 768 px se puede escribir, leer, crear hojas y abrir diálogos sin scroll
   horizontal de la página ni controles tapados.
2. El botón "Foto" no aparece en escritorio y abre la cámara en un teléfono.
3. Una foto legible produce una hoja nueva con el texto, previa revisión y aprobación.
4. Cancelar en cualquier paso no crea hojas ni deja estados colgados.
5. La app se puede instalar (manifest + service worker) y abrir sin señal mostrando el shell.
6. Con señal cortada, una materia ya abierta sigue mostrando sus hojas guardadas y avisa que
   está offline.
7. `npm test`, `npx eslint src` y `npm run build` pasan; no hay secretos en `dist`.
