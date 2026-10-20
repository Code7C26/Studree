# Feature: Asistente de IA (el Brote)

> **Fase 14** · Estado: 🟡 En desarrollo (rama `fase-14`, versión objetivo 0.17.0).
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

Segunda etapa (misma fase, después de cerrar la primera): detector de huecos y conexiones entre
materias (spec § 5).

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
| 401 | `auth` | Sin `Authorization: Bearer …` o JWT inválido |
| 503 | `config` | Falta `GEMINI_MODEL` o `GEMINI_API_KEY` en los secrets |
| 400 | `invalid` | JSON roto, cuerpo de más de `MAX.bodyChars` o pedido inválido (`message` = motivo) |
| 403 | `feature` | Función o alcance de Premium (`decideAccess`) |
| 429 | `quota` | Tope agotado, o no se pudo verificar el uso (falla cerrado) |
| 400 | `not_found` | La hoja/materia/carrera del alcance no existe o está en la papelera |
| 500 | `server` | No se pudo leer el plan o el árbol |

En ninguno de esos casos se llama a Gemini ni se descuenta uso.

### Stream (`200`, `text/event-stream`)

Cada evento es una línea `data: <json>` seguida de una línea vacía.

| `type` | Campos | Cuándo |
|---|---|---|
| `text` | `delta: string` | Cada fragmento de texto del modelo (también el de los pasos con herramientas). El mensaje se arma concatenando los `delta`. |
| `tool` | `name: string` | El modelo usa una herramienta (para mostrar "Leyendo tus hojas…"). |
| `proposal` | `proposal: {id, status:'pending', kind:'append'\|'replace_selection'\|'new_sheet', sheetId?, subjectId?, markdown, source:'notes'\|'external'}` | Una propuesta de edición; el usuario la acepta o la rechaza. |
| `quiz` | `questions: Question[]` (`{id, type:'mcq'\|'tf'\|'open', prompt, options?, answer, explanation, topic, sheetId?}`) | `quiz` y `weak_review`. |
| `grades` | `grades: Array<{id, correct, feedback}>` | `quiz_grade` (una por pregunta abierta). |
| `usage` | `action, bucket, used, max, period` (+ `external: {used, max, period}` en modo externo); `used`/`max` son `null` si el plan no tiene tope | La acción se registró en `ai_usage` (también `quiz_grade`, en su balde `grade`). |
| `error` | `code, message` | `upstream`, `blocked`, `empty`, `aborted` (timeout de `GEMINI_TIMEOUT_MS` o desconexión), `invalid_output` (JSON del modelo inválido), `steps` (demasiados pasos), `no_notes`, `no_weak_topics`, `server`. No hay `done` después. Solo tras `steps` puede venir un `usage` (ver "Cuándo se descuenta uso"); con los demás **no se descuenta uso**. |
| `done` | `truncated?: true`, `finishReason?: string` (si no fue `STOP`, p. ej. `SAFETY` tras texto parcial o `MAX_TOKENS`) | Fin normal. |

Orden en un éxito: `text`/`tool`/`proposal`/`quiz`/`grades` → `usage` → `done`.

### Acciones

- `chat`, `shortcut`: bucle con herramientas y el historial (sin turnos `model` iniciales).
- `summary`, `study_plan`, `gaps`, `connections`: bucle con herramientas y un pedido por acción
  (`actionInstruction`); `gaps` y `connections` se afinan en la Tarea 12.
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

### Cuándo se descuenta uso (Ruling K)

Se registra una fila en `ai_usage` si la acción terminó bien, **o** si terminó en `steps` después de
al menos una respuesta exitosa de Gemini y de haber emitido algo útil (`text`, `proposal`, `quiz` o
`grades`): así no se puede forzar el bucle para tener respuestas gratis. No se descuenta ante errores de
Gemini (`upstream`, `blocked`, `empty`, `aborted`), `invalid_output` (no llegó nada útil), `no_notes`,
`no_weak_topics` ni `server`. Los errores de Gemini se loguean con `kind` y `status` (nunca el cuerpo
del proveedor ni la clave).

### Límites conocidos

- **El conteo no es transaccional:** dos pedidos simultáneos pueden pasar el conteo antes de que
  cualquiera registre su uso, y superar el tope por uno o dos.
- **Ventana de abort:** si el cliente se desconecta justo después de que Gemini terminó y antes de
  `recordUsage`, el uso se registra igual (Gemini ya respondió); si corta durante la llamada, no.
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
  (`summary`), "Tomame examen" (`quiz`), "Repaso de errores" (`weak_review`) y "Plan de estudio"
  (`study_plan`). Para free, los dos últimos muestran el aviso de Premium **sin llamar al servidor**
  (que igual lo rechaza con 403), como **nota neutra** (`notice`, `role="status"`): no es un error
  ni pone triste al Brote. Sin materia abierta, un usuario free no tiene alcance posible y el panel
  lo avisa con la misma nota.
- **`ChatThread`**: mensajes como texto plano (`whitespace-pre-wrap`, nunca HTML), estado
  ("Leyendo tus hojas…"), "La respuesta se cortó." si `done` trae `truncated` o un `finishReason`
  distinto de `STOP`, notas, errores, uso ("Usaste 3 de 20 hoy.") y propuestas. `role="log"` con
  `aria-live="polite"` y `aria-busy` mientras llega la respuesta (no anuncia cada fragmento). La prueba (`quiz`) por ahora se lista; la responde `QuizRunner` (Tarea 11).
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

## Archivos de esta fase

Se completa en la Tarea 12 del plan.

## Pendiente

- [ ] Implementar las capacidades de la tabla (tareas 1 a 11 del plan).
- [ ] Verificar en el navegador el panel, el Brote y la propuesta de cambios.
