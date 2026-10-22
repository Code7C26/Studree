# Feature: Asistente de IA (el Brote)

> **Fase 14** · Estado: ✅ Implementada (rama `fase-14`, versión 0.17.0, ADR-021) · ⏳ falta que el
> estudiante despliegue la función y cargue los secrets (ver "Cómo desplegar").
> Spec: [`docs/superpowers/specs/2026-10-19-asistente-ia-design.md`](../superpowers/specs/2026-10-19-asistente-ia-design.md) ·
> Plan: [`docs/superpowers/plans/2026-10-19-fase-14-asistente.md`](../superpowers/plans/2026-10-19-fase-14-asistente.md).
> Leer antes de tocar el asistente, sus servicios, la Edge Function o las claves de Gemini.

## Descripción

El **Brote** es el asistente de IA de Studree: un personaje flotante que vive en pantalla (con
sesión) y conoce los apuntes de toda la carrera del usuario. Estudia con ellos: repasa, cuestiona,
completa, resume y toma pruebas tipo examen. Nunca escribe en una hoja sin que el usuario lo
apruebe.

Decisiones de la primera etapa (detalle en el spec):

- Un único punto de entrada: el Brote flotante, con panel lateral y barra de atajos sobre el texto seleccionado.
- Modo de fuente a elegir: **solo mis apuntes** o **con conocimiento externo** (lo externo lleva marca visible).
- Límite de uso por plan, controlado en el servidor (spec § 8).
- Proveedor de IA: Gemini, llamado desde una Edge Function de Supabase. La clave es un secret del servidor.

## Capacidades (primera etapa)

Tabla del spec § 4:

| Capacidad | Qué hace |
|---|---|
| Pregunta puntual | Responde usando las hojas que necesite, y cita de qué hoja salió. |
| Refutar / completar un tema | Marca conceptos faltantes o flojos y propone texto para agregar. |
| Explicar / Explicámelo simple | Reescribe un fragmento o tema con otras palabras o ejemplos. |
| Resumen de materia | Resume la materia o una selección de hojas; puede guardarlo como hoja nueva. |
| Prueba tipo examen | Opción múltiple, verdadero/falso y desarrollo; alcance elegible; corrección con explicación y referencia a la hoja. |
| Repaso de errores | Arma una prueba solo con lo que el usuario falló antes. |
| Plan de estudio | Usa las fechas importantes del Inicio para sugerir qué repasar y cuándo. |

Segunda etapa (spec § 5, Tarea 12):

| Capacidad | Qué hace |
|---|---|
| Detectar huecos (`gaps`) | En la materia abierta, lista los temas que se mencionan pero nunca se desarrollan, citando la hoja por su fecha. |
| Conexiones entre materias (`connections`, Premium) | En la carrera (o en todas las materias), busca conceptos que se repiten entre materias y explica cómo se conectan. |

Ninguna de las dos suma herramientas: usan `list_subject_topics`, `read_sheet` y `search_notes`.

## Arquitectura (ADR-021)

```
Brote / panel (React) --useAssistant--> assistant.service.js --POST + JWT--> Edge Function `assistant`
        ^                                  (lee el stream SSE)                 |  handler.js: JWT -> plan
        | eventos text/proposal/quiz/...                                       |  -> cuota -> alcance -> mapa
        |                                                                      v
  carpeta abierta <-- assistantBridge -- propuesta aceptada         Gemini (secret) <-> herramientas de
  (editor + useSheetAutosave)                                        solo lectura con el JWT (RLS)
```

- **Servidor** (`supabase/functions/assistant/`): `index.js` arranca en Deno y arma las
  dependencias reales; `handler.js` tiene toda la lógica (testeada en Node con dependencias
  falsas); `config.js` es el único lugar con números (topes **provisorios**, funciones por plan,
  máximos de tamaño).
- **Cliente**: `useAssistant` (estado, pedidos, pruebas), `useAssistantContext` (lee el puente),
  `lib/assistant/**` (lógica pura con tests), `components/features/assistant/**` (presentación),
  `services/assistant.service.js`, `userPlan.service.js`, `quizResults.service.js`.

## Planes y topes (provisorios)

Los números viven en `supabase/functions/assistant/config.js` (`LIMITS`, `FEATURES`) y los define
el equipo antes de salir. El cliente los lee de ahí solo para no mandar pedidos que sabe
bloqueados; **el servidor decide**.

| Balde (acciones) | Free | Premium |
|---|---|---|
| `chat` (`chat`, `shortcut`) | 20 por día | 200 por día |
| `summary` | 3 por mes | sin tope |
| `quiz` (`quiz`, `weak_review`) | 3 por mes | sin tope |
| `extras` (`study_plan`, `gaps`, `connections`) | 3 por mes (solo `gaps`, Ruling P) | sin tope |
| `grade` (`quiz_grade`, migración `0008`) | 10 por día | 100 por día |
| `external` (cualquier acción en modo externo, además de su balde) | 5 por día | 100 por día |

| Función (`FEATURES`) | Free | Premium |
|---|---|---|
| Alcance carrera / todas las materias | No (solo la materia o la hoja) | Sí |
| Repaso de errores (`weak_review`) | No | Sí |
| Plan de estudio (`study_plan`) | No | Sí |
| Conexiones entre materias (`connections`) | No | Sí |

Sin fila en `user_plans` = free. El plan se cambia a mano en el panel de Supabase (Fase 17:
pantalla de planes y pago simulado).

## Cómo desplegar (lo hace el estudiante)

Las migraciones `0007` y `0008` ya están aplicadas (2026-10-19). Falta la función. Pasos en
Windows (PowerShell o Git Bash, desde la raíz del proyecto; `npx` baja la CLI sin instalarla y
`--use-api` empaqueta en el servidor, sin Docker):

1. `npx supabase login` (abre el navegador para autorizar la CLI).
2. `npx supabase link --project-ref <ref>`: el `<ref>` es el id del proyecto (lo que va entre
   `https://` y `.supabase.co` en `VITE_SUPABASE_URL`).
3. `npx supabase secrets set GEMINI_API_KEY=<clave> GEMINI_MODEL=<modelo>`: la clave la ingresa
   el estudiante en la terminal; **nunca** va en un `VITE_*`, en el código ni en `.env.local`.
   `SUPABASE_URL` y `SUPABASE_ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`) los inyecta Supabase en
   toda Edge Function. Para datos de usuarios reales, usar una clave con facturación (ver
   "Privacidad").
4. `npx supabase functions deploy assistant --no-verify-jwt --use-api`. `supabase/config.toml`
   ya trae `[functions.assistant]` con `verify_jwt = false` y
   `entrypoint = "./functions/assistant/index.js"` (CLI ≥ 1.215.0); el flag repite lo primero.
   Si la CLI no acepta la entrada `.js`, renombrar `index.js` a `index.ts` sin cambios y ajustar
   la línea `entrypoint`.
5. **Pruebas después del deploy:**
   - Sin token: `curl -i -X POST https://<ref>.supabase.co/functions/v1/assistant` → **401**
     con `"code":"auth"` y el header `access-control-allow-origin: *`. Un **503** `config`
     significa que faltan secrets (o la URL/clave de Supabase).
   - Con sesión, en la carpeta de una materia: preguntarle al Brote por un tema que exista como
     `#` en una hoja (p. ej. "¿qué dice mi hoja sobre Matrices?") → responde citando esa hoja (el
     mapa del prompt lista los temas de cada hoja del alcance).
   - Usuario free: mandar mensajes hasta pasar el tope diario de `chat` (20, provisorio) → el
     siguiente responde **429** con el aviso de tope y no llama a Gemini.
   - **Dos cuentas (RLS):** con la cuenta B, pedir un alcance con el id de una materia de la
     cuenta A → **400** `not_found`; y preguntarle a B por un tema que solo tiene A → el Brote
     dice que no está en sus apuntes.
   - Sin desplegar, el panel avisa "El asistente todavía no está disponible (falta desplegar la
     función)."
6. Para probar Premium: en el panel de Supabase, crear o editar la fila de `user_plans` del
   usuario con `plan = 'premium'`.

### Privacidad

En el **nivel gratuito** de la API de Gemini, Google puede usar los prompts (o sea, los apuntes
del usuario que viajan como datos) y las respuestas para mejorar sus productos. Para usuarios
reales, la clave tiene que ser de un proyecto con **facturación activa (nivel pago)**. Ver
`docs/03-security.md`.

## Reglas

- El asistente **nunca escribe directamente**: devuelve una propuesta que el usuario acepta, rechaza o revisa (spec § 7).
- Las herramientas del modelo consultan Supabase **con la sesión del usuario**; RLS decide qué puede ver.
- No se manda la carrera completa en cada pedido: el servidor arma un mapa liviano y el modelo lee lo que necesita (spec § 6).
- Ningún secreto llega al navegador: `GEMINI_API_KEY` y `GEMINI_MODEL` son secrets de la Edge Function.

## Edge Function `assistant` (Tarea 6)

`POST {VITE_SUPABASE_URL}/functions/v1/assistant` con `Authorization: Bearer <JWT del usuario>`,
`apikey` y cuerpo JSON `AssistantRequest` (ver `request.js`). La lógica está en `handler.js`
(dependencias inyectadas, testeada en Node); `index.js` solo cablea Supabase (anon key + JWT del
usuario), `fetch` y los secrets `GEMINI_API_KEY` / `GEMINI_MODEL`.

### Respuestas antes del stream (JSON `{error, code, message}`)

| Status | `code` | Cuándo |
|---|---|---|
| 204 | — | `OPTIONS` (CORS: `authorization, apikey, content-type, x-client-info`) |
| 405 | `method` | Método distinto de `POST` |
| 503 | `config` | Faltan `SUPABASE_URL` o la clave anon/publishable (se chequea antes del JWT: sin eso no se puede verificar) |
| 401 | `auth` | Sin `Authorization: Bearer …` o JWT inválido |
| 503 | `config` | Falta `GEMINI_MODEL` o `GEMINI_API_KEY` en los secrets (el panel muestra "El asistente todavía no está configurado (faltan las claves de la función).") |
| 400 | `invalid` | JSON roto, cuerpo de más de `MAX.bodyChars` o pedido inválido (`message` = motivo); `scope.id` y `selection.sheetId` tienen que ser UUID |
| 403 | `feature` | Función o alcance de Premium (`decideAccess`) |
| 429 | `quota` | Tope agotado, o no se pudo verificar el uso (falla cerrado) |
| 400 | `not_found` | La hoja/materia/carrera del alcance no existe o está en la papelera |
| 500 | `server` | No se pudo leer el plan o el árbol, o un error no previsto (`handleSafely`: JSON con CORS) |

En ninguno de esos casos se llama a Gemini ni se descuenta uso.

### Stream (`200`, `text/event-stream`)

Cada evento es una línea `data: <json>` seguida de una línea vacía.

| `type` | Campos | Cuándo |
|---|---|---|
| `text` | `delta: string` | Cada fragmento de texto del modelo (también el de los pasos con herramientas). El mensaje se arma concatenando los `delta`. |
| `tool` | `name: string` | El modelo usa una herramienta (para mostrar "Leyendo tus hojas…"). |
| `proposal` | `proposal: {id, status:'pending', kind:'append'\|'replace_selection'\|'new_sheet', sheetId?, subjectId?, markdown, source:'notes'\|'external'}` | Una propuesta de edición; el usuario la acepta o la rechaza. |
| `quiz` | `questions: Question[]` (`{id, type:'mcq'\|'tf'\|'open', prompt, options?, answer, explanation, topic, sheetId?}`) | `quiz` y `weak_review`. |
| `summary` | `summary: {title, sections: [{heading, body}], keyConcepts: [{term, definition}], sheets: [{sheetId, subjectId, date}], sheetCount, totalSheets, external}` | `summary` (salida estructurada validada por `summary.js`; `sheetCount` = hojas usadas, `totalSheets` = hojas con contenido en el alcance). |
| `grades` | `grades: Array<{id, correct, feedback}>` | `quiz_grade` (una por pregunta abierta). |
| `usage` | `action, bucket, used, max, period` (+ `external: {used, max, period}` en modo externo); `used`/`max` son `null` si el plan no tiene tope | La acción se registró en `ai_usage` (también `quiz_grade`, en su balde `grade`). |
| `error` | `code, message` | `upstream`, `blocked`, `empty`, `aborted` (timeout de `GEMINI_TIMEOUT_MS` o desconexión), `timeout` (se venció el plazo total `REQUEST_DEADLINE_MS` = 120 s, sumando todos los pasos), `invalid_output` (JSON del modelo inválido), `steps` (demasiados pasos), `no_notes`, `no_weak_topics`, `server`. No hay `done` después. Tras `steps`, `aborted` o `timeout` puede venir un `usage` si antes llegó algo útil (ver "Cuándo se descuenta uso"); con los demás **no se descuenta uso**. |
| `done` | `truncated?: true`, `finishReason?: string` (si no fue `STOP`, p. ej. `SAFETY` tras texto parcial o `MAX_TOKENS`) | Fin normal. |

Orden en un éxito: `text`/`tool`/`proposal`/`quiz`/`summary`/`grades` → `usage` → `done`.

### Acciones

- `chat`, `shortcut`: bucle con herramientas y el historial (sin turnos `model` iniciales).
- `summary`: **sin herramientas**. Salida JSON (`SUMMARY_SCHEMA`, `summary.js`) sobre el contenido que junta el servidor (`gatherSources`, mismo tope que el examen); emite `tool` (`read_sheet`) y un evento `summary`. Mal armado → `invalid_output` sin descontar; sin apuntes → `no_notes`. Descuenta del balde `summary`. Ya no propone hojas nuevas.
- `study_plan`, `gaps`, `connections`: bucle con herramientas y un pedido por acción
  (`actionInstruction`). `gaps` pide mirar los temas con `list_subject_topics`, leer con
  `read_sheet` y citar cada hueco por la fecha de la hoja; `connections` cruza los temas de cada
  materia y confirma las coincidencias con `search_notes`. El pedido de ninguna de las dos pide
  propuestas.
- `quiz`, `weak_review`: salida JSON (`QUIZ_SCHEMA`) sin herramientas; el servidor junta el contenido
  de las hojas del alcance (tope `MAX.quizSourceChars`, repartido entre hasta `MAX.quizSourceSubjects`
  materias) y lo manda como bloque de datos. `weak_review` lee `weak_topics` con el JWT y los pasa al
  prompt (filtrados por las materias del alcance en la base, antes del tope de 50); sin temas flojos →
  `no_weak_topics`. Con alcance `sheet`, el repaso usa las hojas de esa materia que tienen esos temas
  (primero) y no solo la hoja elegida. Por defecto `QUIZ_DEFAULTS` (5 preguntas, los 3 tipos).
- `quiz_grade`: salida JSON (`GRADES_SCHEMA`); no lee la base. Descuenta de su balde `grade`
  (provisorio: free 10/día, premium 100/día; Ruling L, migración `0008`).

Herramientas: premium puede leer todas sus materias vivas; free solo la materia del alcance (con
alcance `sheet` se resuelve la materia de la hoja).

**Mapa del prompt:** `loadTree` trae el árbol sin `content_md` (liviano); los temas del mapa salen
de `listSheetsContent(ids)`, que lee `id, subject_id, created_at, content_md` **solo de las
materias del alcance** (hoja/materia → esa materia; carrera → sus materias; todas → todas), sin
papelera, paginado de a 1000 y en tandas de 100 materias. El mapa queda recortado a
`MAX.mapChars`. El contenido de materias fuera del alcance nunca se lee para el mapa.

### Cuándo se descuenta uso (Ruling K y Ruling Q)

Se registra una fila en `ai_usage` si la acción terminó bien, **o** si terminó en `steps` después de
al menos una respuesta exitosa de Gemini y de haber emitido algo útil (`text`, `proposal`, `quiz` o
`grades`): así no se puede forzar el bucle para tener respuestas gratis. **Ruling Q:** cortar (botón
"Detener" o cerrar la pestaña → `aborted`; vencer el plazo total → `timeout`) **no** es un fallo de
Gemini: si ya se había emitido algo útil, se descuenta igual; si no llegó nada útil, no. No se
descuenta ante errores de Gemini (`upstream`, `blocked`, `empty`), `invalid_output` (no llegó nada
útil), `no_notes`, `no_weak_topics` ni `server`. La corrección (`quiz_grade`) siempre viaja en modo
`notes` desde el cliente (Ruling R, `requestMode`): nunca consume el cupo externo. Los errores de Gemini se loguean con `kind` y `status` (nunca el cuerpo
del proveedor ni la clave).

### Límites conocidos

- **El conteo no es transaccional (chequear y después registrar):** `countUsage` se lee antes del
  stream y `recordUsage` inserta al final. Varios pedidos simultáneos (otra pestaña, otro
  dispositivo) pueden pasar el chequeo antes de que cualquiera registre su uso y superar el tope
  por tantos pedidos como hayan corrido en paralelo. Cerrarlo pide una función SQL que cuente e
  inserte en una sola transacción (pendiente).
- **Corte del cliente (Ruling Q):** si se corta después de algo útil, se descuenta; si se corta antes
  de cualquier salida útil, no, aunque Gemini haya llegado a generar algo que no se emitió.
- **Plazo total:** `REQUEST_DEADLINE_MS` (120 s) queda por debajo del corte de ~150 s de Supabase;
  `GEMINI_TIMEOUT_MS` (60 s) sigue valiendo para cada llamada. Una herramienta que esté corriendo
  al vencer el plazo termina, pero no se hace otra llamada a Gemini.
- **`recordUsage` fallido deja pasar el pedido:** decisión deliberada (el usuario ya recibió la
  respuesta). Se loguea y no se emite `usage`; ese pedido no cuenta para el tope.

## Interfaz: el Brote, el panel y el chat (Tarea 9)

- **`AssistantHost`** (`src/components/features/assistant/`): botón flotante abajo a la derecha
  (`fixed`, `z-30`), con `aria-label="Abrir el Brote"` y `aria-expanded`. Se monta en `AppLayout` con
  sesión y fuera de `/entrar`, y **queda montado siempre**: en modo lectura recibe `hidden` y oculta
  botón y panel sin desmontarlos (la conversación y el pedido en curso siguen). Recuerda
  abierto/cerrado en `studree:ui:assistant-open`, que se escribe solo cuando el usuario lo abre o lo
  cierra; en el celular no se reabre solo (ahí el panel tapa todo) y tampoco pisa lo guardado.
- **Capas (z-index):** botón y panel en `z-30` (el panel va después en el DOM y tapa al botón);
  el drawer del explorador en el celular (fondo `z-40`, panel `z-50`) y la command palette (`z-50`)
  quedan encima. `Modal` (y con él `ConfirmDialog`) y `UndoToast` se renderizan **por portal en
  `document.body`**: el `<main>` del workspace es `isolate` (contexto de apilamiento propio), así que
  sin portal su `z-50` solo valía adentro del main y el Brote los tapaba. Mientras el foco está en el editor de una hoja
  (`.ProseMirror`) se achica y se aclara para no tapar lo que se escribe. La carpeta ya deja `pb-24`
  al final, así el botón no tapa la última línea ni "Nueva hoja".
- **`AssistantPanel`** se carga con `React.lazy` (chunk propio, con el hook, el chat y los
  servicios). Una vez abierto queda montado aunque se cierre: la conversación vive mientras dure la
  sesión (no se guarda, spec § 8). Es un `role="dialog"` no modal con `.glass` casi opaca: lateral
  (`w-96`) desde `sm`, pantalla completa en el celular. Cuando el usuario lo abre enfoca la entrada
  (si se recordó abierto, no roba el foco al cargar la página); `Esc` cierra y el foco vuelve al
  Brote. Enter envía (no durante una composición IME); Shift+Enter hace salto de línea.
- Controles: **modo** (Mis apuntes / Con conocimiento externo), **alcance** (Esta hoja, Esta
  materia, La carrera, Todas mis materias; según lo que publique la carpeta en `assistantBridge`; los
  de Premium salen deshabilitados con "(Premium)" para un usuario free) y **chips** "Resumir materia"
  (`summary`), "Tomame examen" (`quiz`), "Repaso de errores" (`weak_review`), "Plan de estudio"
  (`study_plan`), "Detectar huecos" (`gaps`) y "Conexiones entre materias" (`connections`).
  `gaps` va siempre sobre la **materia abierta** y `connections` sobre la **carrera** (o todas
  las materias si no hay carrera abierta), sin importar el alcance del panel (`actionScope`); sin
  materia abierta, "Detectar huecos" avisa "Abrí una materia para detectar sus huecos.". Para
  free, "Repaso de errores", "Plan de estudio" y "Conexiones" muestran el aviso de Premium **sin llamar al servidor**
  (que igual lo rechaza con 403), como **nota neutra** (`notice`, `role="status"`): no es un error
  ni pone triste al Brote. Sin materia abierta, un usuario free no tiene alcance posible y el panel
  lo avisa con la misma nota; **el texto escrito se conserva** en la entrada (`send` devuelve
  `false` si el pedido no salió y el borrador solo se borra cuando sale).
- **`ChatThread`**: mensajes como texto plano (`whitespace-pre-wrap`, nunca HTML), estado
  ("Leyendo tus hojas…"), "La respuesta se cortó." si `done` trae `truncated` o un `finishReason`
  distinto de `STOP`, notas, errores, uso ("Usaste 3 de 20 hoy.") y propuestas. `role="log"` con
  `aria-live="polite"` y `aria-busy` mientras llega la respuesta (no anuncia cada fragmento). Si hay una prueba y el panel muestra el chat, aparece "Ir a la prueba" (la responde `QuizRunner`, Tarea 11).
- **`ProposalCard`**: texto propuesto resaltado en verde (`bg-accent/10`, borde `accent`), marca
  "Agregado desde conocimiento externo" si `source === 'external'`, y **Aceptar** / **Rechazar**.
  Aceptar llama a `context.apply(proposal)` (lo implementa la carpeta en la Tarea 10) y marca
  `applied` o `failed` con el motivo.
- **`Brote`**: SVG propio (brote verde redondo con dos hojas, ojos, sonrisa y cachetes). Estados
  `idle`, `thinking`, `writing`, `happy`, `sad`, `sleeping` con clases `.brote--*` y keyframes en
  `index.css`; con `prefers-reduced-motion` no se anima. El ánimo sale de `chatMood` (pensando,
  escribiendo, triste por error); `happy` dura 2,5 s al terminar bien (no si el usuario la cortó con
  Detener) y `sleeping` llega tras 5 min
  sin uso con el panel cerrado.
- **`useAssistant`** arma el `AssistantRequest` (`history` con `buildHistory`: últimos 20 turnos,
  cada uno recortado a 4000 caracteres), llama a `streamAssistant`, pasa cada evento por
  `reduceEvent` y al terminar aplica `finishRequest` (cubre corte del usuario, `usage` después de
  `error` sin `done` y streams que terminan sin `done`). Una acción de chip muestra su etiqueta como
  mensaje del usuario y deja el chat ocupado igual. `stop()` corta con `AbortController`; desmontar
  también corta. `useAssistantContext` lee `assistantBridge` con `useSyncExternalStore`.

## Atajos sobre el texto y propuestas en la hoja (Tarea 10)

- **`SelectionShortcuts`** (`components/features/assistant/`): barra flotante
  (`role="toolbar"`, `.glass`, `z-20`) con **Explicar**, **Refutar**, **Completar** y
  **Preguntame**. Aparece con una selección no vacía del editor activo, arriba del texto (o
  abajo si no entra arriba), así nunca lo tapa; se ubica con `editor.view.coordsAtPos` y se
  reubica con scroll y resize (sin extensión de TipTap ni dependencias nuevas). Se oculta en
  modo lectura, si la selección se vacía, si la selección salió de la pantalla o si el foco
  se va del editor y de la barra. Teclado: con texto seleccionado, **Alt+Enter** lleva el
  foco al primer atajo; ← → se mueven (roving tabindex); **Esc** vuelve al editor con la
  selección intacta. El click no le saca el foco ni la selección al editor.
- **`lib/assistant/shortcuts.js`**: `buildShortcutRequest(id, selection)` →
  `{action:'shortcut', message, selection:{sheetId, text}}`. El texto va recortado a
  `MAX.selection`; el `message` nombra la acción, cita el texto (recortado para no pasar
  `MAX.message`) y, en **Completar** y **Refutar**, pide usar `propose_*`. **Preguntame** no.
  `shortcutLabel` es lo que se ve en el chat ("Explicar: «…»").
- **Cómo llega el atajo al panel:** el panel (con `useAssistant`) se carga perezoso y puede
  no estar montado, así que la carpeta no llama al hook: **encola** el pedido en el puente
  (`assistantBridge.request({request, label, selection})`). `AssistantHost` escucha
  `onRequest` y abre (y carga) el panel; `useAssistant` toma el pedido con `takeRequest()` al
  montar o al recibir el aviso (en un `setTimeout(0)`, para que el doble montaje de
  StrictMode no lo corte) y lo manda con el mismo `start` que el chat: misma conversación,
  historial, modo y alcance. Si el Brote ya está respondiendo, avisa con una nota y no lo
  manda. El pedido pendiente es uno solo: uno nuevo reemplaza al anterior.
- **La selección viaja con sus propuestas:** `useAssistant` agrega a cada propuesta
  `replace_selection` de ese pedido la selección completa (`sheetId`, `from`, `to`, `text`);
  lo que diga el servidor sobre la selección se ignora, y si el texto se había recortado
  (más de `MAX.selection`) no se adjunta (el reemplazo falla en vez de pisar texto que el
  modelo no vio). `chatState` conserva `selection` si es válida.
- **`context.apply(proposal)`** (lo implementa `SubjectFolderPage`, Ruling O):
  - `append` / `replace_selection`: la `sheetId` tiene que ser una hoja **montada de la
    carpeta abierta**; si no, `Abrí la materia de esa hoja para aplicar el cambio.`
  - `new_sheet`: la `subjectId` tiene que ser la materia abierta (mismo aviso). Crea la hoja
    con `handleAddSheet(contenido)`, el camino de las plantillas: hoja local con contenido
    que se crea al montarse.
  - Sin carpeta abierta (Inicio, carrera…) el puente está en `null` y `useAssistant` marca
    la propuesta como fallida con `Abrí la carpeta de la materia para aplicar el cambio.`
- **`lib/assistant/editorApply.js`** — `applyProposalToEditor(editor, proposal, selection)`:
  inserta el Markdown con `editor.chain().insertContentAt(...)` (la extensión `Markdown` de
  tiptap-markdown lo parsea: headings y listas quedan bien), así el cambio pasa por
  `onUpdate` → Markdown → autosave. `append` va al final del documento; `replace_selection`
  vuelve a leer `doc.textBetween(from, to, '\n')` y, si `canApplyReplace` no confirma que es
  el mismo texto, devuelve `La hoja cambió; volvé a seleccionar el texto.` sin tocar nada.
  Lo de conocimiento externo lleva `withOriginMark` ("Agregado por el Brote"). En `append` y
  `replace_selection` el foco se queda en el panel y la hoja se lleva a la vista; en
  `new_sheet` la hoja nueva se crea como cualquier "Nueva hoja" y **toma el foco** (se vuelve
  al panel con el Brote).

## Pruebas tipo examen, repaso de errores y resúmenes (Tarea 11)

- **Flujo:** el chip "Tomame examen" (`quiz`) o "Repaso de errores" (`weak_review`, Premium: el
  aviso de la Tarea 9 se reutiliza, sin llamar al servidor) pide la prueba con el alcance elegido.
  Al llegar el evento `quiz`, `useAssistant` arma una `quizSession` (`key`, `questions`, el
  `scope` del pedido, `scopeSubjectId` —materia del alcance hoja/materia— e `isReview`) y el panel
  muestra **`QuizRunner`** en lugar del chat ("Volver al chat" la esconde con `hidden` sin
  desmontarla, así no se pierden las respuestas; está deshabilitado mientras se corrige; el chat
  ofrece "Ir a la prueba"). Mientras la prueba está a la vista, la entrada del chat se oculta.
- **Una sola vez** (`lib/assistant/quizSession.js`, pura): la sesión pasa `open` → `grading` →
  `done` y guarda las respuestas y el resultado; `startSubmit` ignora un segundo envío, así la
  misma prueba no se corrige ni se guarda dos veces (no hay segundo `quiz_attempts` ni misses
  duplicados). Si el usuario vuelve a la prueba terminada, ve el resultado. `QuizRunner` además
  tiene un guard de reentrada en "Terminar".
- **Una prueba abierta no se pisa:** mientras la sesión está `open` o `grading`
  (`blocksNewQuiz`), los chips "Tomame examen" y "Repaso de errores" (`QUIZ_ACTIONS`) quedan
  deshabilitados con el motivo visible debajo de los chips y en `title`/`aria-describedby`
  ("Terminá o descartá la prueba abierta para pedir otra."); `useAssistant.start` además lo frena
  con `blockReason` → `quiz_open`. Así no se pierden respuestas ni se gasta otra prueba del cupo.
  `QuizRunner` tiene **"Descartar prueba"** (mientras se responde): `discardQuiz` la saca del
  panel **sin red** (no corrige ni guarda nada); una prueba que se está corrigiendo no se
  descarta. Una prueba terminada (`done`) no bloquea: la siguiente la reemplaza.
- **`QuizRunner`**: una pregunta por vez con "Pregunta 3 de 10" (el foco va al título al cambiar);
  opción múltiple y verdadero/falso como grupos de radios nativos (`fieldset` + `legend` con el
  enunciado; flechas del teclado), desarrollo con `textarea` etiquetada. Anterior / Siguiente /
  Terminar; avisa cuántas quedan sin responder (cuentan como error). Al terminar: puntaje
  ("Sacaste 7 de 10"), y cada error con tu respuesta, la correcta (o la de referencia), la
  devolución del servidor (abiertas), la explicación y, si la hoja de origen sigue viva, un link
  "Hoja del <fecha>" a `subjectFolderPath(materia, hoja)`. Todo texto plano
  (`whitespace-pre-wrap`); íconos SVG (`check`, `close`, `file-text`), sin animaciones nuevas.
- **Corrección** (`lib/assistant/quizScore.js`, pura): `gradeClosed` corrige mcq/tf en el cliente
  sin convertir tipos (sin responder = incorrecta; abiertas → `null`); `openAnswers` arma el
  `answers` de `quiz_grade` **solo con las abiertas respondidas** (cada texto ≤ `MAX.message`);
  `mergeResults` suma las notas (abierta vacía = incorrecta; sin nota válida = `null`) y
  `summarize` cuenta solo lo corregido, con `correct ≤ total`. `quiz_grade` se pide con el
  **alcance de la prueba** y descuenta de su balde `grade`: si el servidor responde con tope
  agotado (u otro error), el mensaje se muestra en el chat y en el resultado, y las cerradas
  quedan corregidas igual (las abiertas sin nota no cuentan en el puntaje).
- **Guardado** (`useAssistant.submitQuiz` → `services/quizResults.service.js`, con la sesión del
  usuario y RLS): `resolveQuizSources` trae las hojas y materias **vivas** de la prueba;
  `saveAttempt` guarda `{scope_type, scope_id, total, correct}` (rechaza `correct > total`);
  `attachSubjects` (`lib/assistant/weakTopics.js`) decide la materia de cada tema y **nunca
  adivina**: hoja resuelta → su materia si está viva y en el alcance; sin hoja resuelta → la
  materia del alcance solo si es hoja/materia (todas las fuentes son de esa materia); en carrera
  o todas, se saltea. Luego `listWeakTopics(materias)` + `planWeakTopicUpdates` +
  `applyWeakTopicUpdates` (upsert por `user_id,subject_id,topic`, `last_missed_at` = ahora).
- **`planWeakTopicUpdates`**: el tema se compara normalizado (espacios y mayúsculas, como el
  servidor) y reutiliza el texto guardado; un tema fallado suma **un** error por prueba; los
  aciertos solo borran el tema en un repaso (`isReview`) y si no se falló en esa misma prueba; en
  un examen normal no tocan nada. Temas recortados a 200.
- **Plan de estudio:** va por el chat como cualquier acción (`study_plan`); si termina en una
  `propose_new_sheet`, se acepta con el mismo `ProposalCard` → `context.apply` de la Tarea 10.
  El **resumen** ya no va por el chat: llega como evento `summary` estructurado (Fase 14.1).

### Límites conocidos (Tarea 11)

- **`misses` no es atómico:** se calcula en el cliente con las filas leídas justo antes del
  upsert. Dos pruebas terminadas a la vez (dos pestañas) pueden pisarse y sumar uno solo.
- El intento se guarda aunque fallen los temas flojos (y al revés); el error se muestra.
- Un acierto en el repaso solo borra el tema si el modelo reutiliza el texto guardado del tema
  (se compara normalizado: espacios y mayúsculas); si lo parafrasea, el tema no se limpia.
- La verificación manual (paso 5 del plan) requiere la Edge Function desplegada.
- **Envío robusto:** si algo lanza un error inesperado entre la corrección y el guardado,
  `submitQuiz` cierra la prueba igual en `done` con el error (`failedOutcome`): nunca queda
  trabada en "Corrigiendo…".

## Decisiones que cambiaron respecto del plan (rulings)

- **Cuotas que fallan cerrado:** si el plan tiene tope y no se pudo contar el uso (base caída,
  conteo faltante), se responde 429 "No pudimos verificar tu uso" y no se llama a Gemini.
- **`steps` también descuenta** (Ruling K): agotar los pasos después de haber mostrado algo útil
  cuenta como uso, para que no se pueda forzar el bucle y tener respuestas gratis.
- **`quiz_grade` tiene su propio balde `grade`** (Ruling L, migración `0008`): corregir las
  abiertas también llama a Gemini, pero no consume el tope de pruebas.
- **`allowedSubjectIds` nunca es `null`:** premium = todas sus materias vivas; free = solo las del
  alcance. Ninguna herramienta lee "sin filtro".
- **Las propuestas solo se aplican en la carpeta abierta** de esa materia (Ruling O); fuera de
  ella fallan con "Abrí la materia de esa hoja para aplicar el cambio.".
- **Modales por portal:** `Modal`, `ConfirmDialog` y `UndoToast` van a `document.body` para
  quedar encima del Brote (el `<main>` es `isolate`).
- **Modo lectura:** el Brote se oculta (`hidden`), no se desmonta: la conversación y el pedido en
  curso siguen.
- **`gaps` libre con tope `extras` = 3 por mes** (Ruling P, provisorio); `study_plan` y
  `connections` siguen siendo de Premium.
- **Atajo encolado:** al desmontarse la carpeta (`key={subjectId}`) se descarta el atajo que el
  panel todavía no tomó (`assistantBridge.clearRequest`), así no se dispara después en otra
  materia.
- **Cortar después de algo útil descuenta** (Ruling Q): "Detener", cerrar la pestaña o vencer el
  plazo total (`REQUEST_DEADLINE_MS`, error `timeout`) no son fallos de Gemini.
- **`quiz_grade` siempre en modo `notes`** (Ruling R): la corrección nunca gasta el cupo externo.
- **Revisión final (2026-10-19):** el mapa del prompt lee el contenido solo de las materias del
  alcance (antes salía "(sin temas)" en producción); sin URL/clave de Supabase la función
  responde 503 `config` con CORS (y `handleSafely` da JSON 500 con CORS ante lo imprevisto);
  `scope.id` y `selection.sheetId` se validan como UUID; `supabase/config.toml` con
  `[functions.assistant]`.

## Límites conocidos (generales)

- **El conteo de uso no es transaccional** (ver "Límites conocidos" de la Edge Function).
- **El historial del chat no se guarda:** vive en memoria mientras dure la sesión (spec § 8);
  recargar la página lo borra.
- **Texto plano:** las respuestas no se renderizan como Markdown (sin negritas ni listas con
  formato) para no abrir una puerta a XSS.
- Los topes y las funciones por plan son **provisorios**.
- La verificación con dos cuentas (que una no vea apuntes de la otra por el asistente) queda
  pendiente hasta desplegar la función; la cubren RLS y los tests de `tools`/`supabaseDb`.

## Archivos de esta fase

- **Base de datos:** `supabase/migrations/0007_asistente.sql`, `0008_quiz_grade_usage.sql`.
- **Deploy:** `supabase/config.toml` (`[functions.assistant]`: `verify_jwt = false`, `entrypoint`).
- **Edge Function** (`supabase/functions/assistant/`): `index.js`, `handler.js`, `config.js`,
  `quota.js`, `request.js`, `careerMap.js`, `topics.js`, `tools.js`, `supabaseDb.js`,
  `prompt.js`, `gemini.js`, `sse.js`, `loop.js`, `quiz.js`, `account.js` (+ sus `*.test.js`).
- **Lógica del cliente** (`src/lib/assistant/`): `sse.js`, `readSseStream.js`, `chatState.js`,
  `bridge.js`, `requestBuilder.js`, `shortcuts.js`, `editorApply.js`, `applyProposal.js`,
  `quizSession.js`, `quizScore.js`, `weakTopics.js`, `assistantError.js` (+ tests).
- **Services:** `assistant.service.js`, `userPlan.service.js`, `quizResults.service.js`.
- **Hooks:** `useAssistant.js`, `useAssistantContext.js`.
- **Componentes** (`src/components/features/assistant/`): `AssistantHost`, `AssistantPanel`,
  `Brote`, `ChatThread`, `ProposalCard`, `SelectionShortcuts`, `QuizRunner`.
- **Tocados:** `AppLayout.jsx` (monta el Brote), `SubjectFolderPage.jsx` (contexto, atajos y
  propuestas), `Modal`/`UndoToast` (portal), `Icon.jsx` (íconos nuevos), `storageKeys.js`
  (`studree:ui:assistant-open`), `lib/markdown/headings.js`, `index.css` (animaciones del
  Brote), `package.json` (tests de `supabase/functions/**`), `.env.example` (comentario de los
  secrets).

## Pendiente

- [x] Implementar las capacidades de la tabla (tareas 1 a 12 del plan).
- [ ] **[ESTUDIANTE]** Desplegar la función y cargar los secrets (ver "Cómo desplegar").
- [ ] Verificar en el navegador el panel, el Brote y la propuesta de cambios.
- [ ] Con dos cuentas, comprobar que una no ve apuntes de la otra por el asistente.
- [ ] Verificación manual de la Tarea 11 (prueba → corrección → fila en `weak_topics`; repaso que borra lo acertado; free sin llamada a Gemini en Repaso/Plan): requiere la Edge Function desplegada.
- [ ] Verificación manual de la Tarea 10 (paso 5 del plan: atajo → propuesta → Aceptar → "Guardado" → recargar; Rechazar; reemplazo tras editar el párrafo; marca externa): requiere la Edge Function desplegada.
