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

## Archivos de esta fase

Se completa en la Tarea 12 del plan.

## Pendiente

- [ ] Implementar las capacidades de la tabla (tareas 1 a 11 del plan).
- [ ] Verificar en el navegador el panel, el Brote y la propuesta de cambios.
