# Fase 14.1 — el Brote, mejoras de uso: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atajos que responden en una tarjeta dentro de la hoja, propuestas resueltas que se achican,
exámenes en una ventana grande con registro guardado, resúmenes estructurados (ventana + PDF) y la
sección "Mi estudio".

**Architecture:** El motor del Brote sigue siendo uno solo (`useAssistant`, dentro del panel lazy):
la tarjeta de los atajos es una segunda conversación ("inline") del mismo hook que se publica por
`assistantBridge`; la carpeta la dibuja en un widget de decoración de ProseMirror (no toca el
Markdown). El resumen pasa a salida estructurada en la Edge Function (mismo patrón que la prueba).
Resúmenes e intentos de examen se guardan desde el cliente (tablas `summaries` y `quiz_attempts`
ampliada, migración 0009) y se listan en páginas nuevas `/estudio`.

**Tech Stack:** React 18 + Vite + JS/JSDoc, Tailwind, TipTap 3 (`@tiptap/pm`), React Router,
Supabase (Postgres + RLS + Edge Function Deno), Gemini (`responseSchema`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-22-brote-mejoras-design.md` (leerlo entero antes de cada
tarea). Contexto previo: `docs/features/assistant.md`, ADR-021 en `docs/02-architecture.md`.

## Global Constraints

- Repo: `C:\Users\nicom\FAT\Studree\.claude\worktrees\fase-14`, rama `fase-14`. No cambiar de rama, no push.
- JavaScript + JSDoc, **sin TypeScript** y **sin dependencias nuevas** (`package.json` no cambia).
- Antes de tocar un archivo, leer el doc que indica la tabla de lookup de `CLAUDE.md`.
- Estilos solo con los tokens de `tailwind.config.js`; íconos con `<Icon name=…>` (SVG), **nunca emojis**.
- Todo lo que vino del modelo se pinta como texto o como elementos de React: **nunca** `dangerouslySetInnerHTML`.
- Textos de interfaz y comentarios en español rioplatense (voseo), como el código existente.
- `LIMITS`, `FEATURES` y los baldes de `supabase/functions/assistant/config.js` **no cambian**.
- Services devuelven `{data, error}` (ServiceResult) y paginan con `fetchAllPages`.
- No ejecutar `supabase` CLI, deploys ni SQL contra la base: la migración y el deploy los hace el controlador.
- Cada tarea termina con `npm test`, `npm run lint` y `npm run build` en verde, y suma su línea a la
  entrada `[0.18.0]` de `CHANGELOG.md` (la crea la Tarea 1).
- Commits en español, estilo `feat(asistente): …`, terminando con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Tipos compartidos (los usan varias tareas)

```js
/** Evento SSE `{type:'summary', summary}` que emite el servidor (Tarea 2). */
SummaryPayload = {
  title: string,                                      // ≤ 120
  sections: Array<{heading: string, body: string}>,   // 1..20; heading ≤ 200, body ≤ 4000 (Markdown liviano)
  keyConcepts: Array<{term: string, definition: string}>, // 0..30; term ≤ 100, definition ≤ 300
  sheets: Array<{sheetId: string, subjectId: string, date: string /* YYYY-MM-DD */}>,
  sheetCount: number,   // hojas usadas
  totalSheets: number,  // hojas con contenido en el alcance
  external: boolean,
}

/** Documento de resumen para la interfaz (Tarea 3, `rowToSummary`). */
SummaryDoc = { id: string|null, title, createdAt: string /*ISO*/, external, sheetCount, totalSheets,
  sections, keyConcepts, sheets, scopeType: 'sheet'|'subject'|'career'|'all',
  subjectId: string|null, careerId: string|null }

/** Pregunta del registro de un examen (Tarea 3, `buildQuizRecord`). */
RecordQuestion = { id, type: 'mcq'|'tf'|'open', prompt, options?: string[],
  given: number|boolean|string|null, answer: number|boolean|string, correct: boolean|null,
  explanation: string, feedback?: string, topic: string,
  sheetId?: string, subjectId?: string, sheetDate?: string /* created_at ISO */ }

/** `quiz_attempts.detail` */
QuizDetail = { version: 1, questions: RecordQuestion[] }

/** Vista de la tarjeta de un atajo (Tarea 6, `inlineView`). */
InlineView = { id: number, label: string /* 'Completar' */, replies: Message[], busy: boolean,
  status: string|null, error: string|null, notice: string|null,
  proposal: Proposal|null /* la última pendiente */, external: boolean, canAnswer: boolean }

/** Comandos de la tarjeta al motor (Tarea 6). */
InlineCommand = {type:'close'} | {type:'accept', proposalId: string} | {type:'discard'}
  | {type:'continue'} | {type:'answer', text: string}
```

## Review Focus

1. **Borrar el párrafo (o la hoja) donde está la tarjeta, o salir de la carpeta mientras responde:** la tarjeta se cierra, el pedido se corta y nada queda colgado ni tira error. Test en Tarea 7 (`deletedBefore` cierra el ancla) y Tarea 6 (`close` corta).
2. **Tocar un atajo nuevo mientras la tarjeta anterior sigue llegando:** los eventos viejos no se mezclan en la tarjeta nueva. Test en Tarea 6 (`reduceInline` ignora otro `id`).
3. **El modelo devuelve un resumen mal armado** (sin secciones, campos vacíos, tipos raros, textos larguísimos): falla cerrado con `invalid_output` y no descuenta; los largos se recortan. Tests en Tarea 2.
4. **Falla el guardado de un examen o un resumen:** se ve el resultado igual, con el error y "Reintentar", y reintentar después de un guardado exitoso no duplica la fila. Tests en Tarea 8 (`canRetrySave`) y Tarea 9 (`summaryDoc` estado).
5. **Markdown raro o HTML en el cuerpo del resumen** (`<script>`, `**` sin cerrar, listas mezcladas): se muestra literal, nunca como HTML. Tests en Tarea 3 (`parseSummaryBody`).

---

### Tarea 1: Migración 0009 y documentación de datos

**Files:**
- Create: `supabase/migrations/0009_mi_estudio.sql`
- Modify: `docs/DB_SCHEMA.md`, `docs/03-security.md`, `CHANGELOG.md` (nueva entrada `[0.18.0] — 2026-10-22`, "Fase 14.1: el Brote, mejoras de uso", con request "mejoras del Brote: respuestas debajo del texto, exámenes en ventana grande con registro, resúmenes en PDF y Mi estudio" y links al spec y a este plan)

**Interfaces:**
- Produces (columnas que usan las Tareas 4, 8, 9, 10):
  - `quiz_attempts` + `subject_id uuid null → subjects(id) on delete cascade`, `career_id uuid null → careers(id) on delete cascade`, `title text null check (title is null or length(title) between 1 and 200)`, `detail jsonb null check (detail is null or pg_column_size(detail) <= 262144)`.
  - tabla `summaries(id uuid pk default gen_random_uuid(), user_id uuid not null default auth.uid() → auth.users on delete cascade, scope_type text not null check in ('sheet','subject','career','all'), scope_id uuid null, subject_id uuid null → subjects on delete cascade, career_id uuid null → careers on delete cascade, title text not null check length 1..200, external boolean not null default false, sheet_count int not null default 0 check >= 0, total_sheets int not null default 0 check >= 0, content jsonb not null check pg_column_size(content) <= 262144, created_at timestamptz not null default now())`.
  - índices `quiz_attempts_user_created_idx (user_id, created_at desc)`, `summaries_user_created_idx (user_id, created_at desc)`.
  - RLS de `summaries`: políticas separadas `summaries_select`, `summaries_insert`, `summaries_delete`, todas `to authenticated` con `auth.uid() = user_id` (sin update). `quiz_attempts` conserva su `quiz_attempts_owner`.

- [ ] **Step 1:** Escribir la migración con el mismo formato que `0007_asistente.sql` (encabezado, secciones comentadas, `if not exists`, `drop policy if exists` antes de cada `create policy`, `notify pgrst, 'reload schema'` al final). Aditiva e idempotente, sin funciones nuevas.
- [ ] **Step 2:** Documentar en `DB_SCHEMA.md` las columnas nuevas de `quiz_attempts`, la tabla `summaries`, la forma de `content` (`{sections, keyConcepts, sheets}`) y de `detail` (`QuizDetail`), y en `03-security.md` la RLS nueva y que el contenido viene del modelo (se muestra como texto).
- [ ] **Step 3:** Crear la entrada `[0.18.0]` del CHANGELOG con la línea de esta tarea.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` → todo en verde (no cambió código).
- [ ] **Step 5: Commit** `feat(asistente): migración 0009 (summaries y detalle de quiz_attempts)`

---

### Tarea 2: Resumen estructurado en la Edge Function

**Files:**
- Create: `supabase/functions/assistant/summary.js`, `supabase/functions/assistant/summary.test.js`
- Modify: `supabase/functions/assistant/handler.js`, `supabase/functions/assistant/prompt.js`, `supabase/functions/assistant/handler.test.js`, `supabase/functions/assistant/prompt.test.js` (si afirma el texto viejo de `summary`), `docs/features/assistant.md` (protocolo: evento `summary`, acción `summary` sin herramientas)

**Interfaces:**
- Produces: evento SSE `{type:'summary', summary: SummaryPayload}`; `SUMMARY_SCHEMA`; `SUMMARY_MAX = {title:120, sections:20, heading:200, body:4000, concepts:30, term:100, definition:300}`; `validateSummary(raw) → {ok:true, summary:{title, sections, keyConcepts}} | {ok:false, error:string}`.

- [ ] **Step 1: Tests de `validateSummary` en `summary.test.js`**

```js
test('resumen válido: recorta textos y secciones de más', () => {
  const raw = { title: 'x'.repeat(200), sections: Array.from({ length: 25 }, (_, i) => ({ heading: `T${i}`, body: 'b'.repeat(5000) })),
    key_concepts: [{ term: 'ATP', definition: 'Energía' }] }
  const r = validateSummary(raw)
  assert.equal(r.ok, true)
  assert.equal(r.summary.title.length, 120)
  assert.equal(r.summary.sections.length, 20)
  assert.equal(r.summary.sections[0].body.length, 4000)
  assert.deepEqual(r.summary.keyConcepts, [{ term: 'ATP', definition: 'Energía' }])
})
test('falla cerrado: sin secciones, sección vacía, concepto mal armado, no-objeto', () => {
  for (const raw of [undefined, null, [], { title: 'a', sections: [], key_concepts: [] },
    { title: 'a', sections: [{ heading: ' ', body: 'b' }], key_concepts: [] },
    { title: 'a', sections: [{ heading: 'h', body: 'b' }], key_concepts: [{ term: 'x' }] },
    { title: '', sections: [{ heading: 'h', body: 'b' }], key_concepts: [] },
    { title: 'a', sections: 'no', key_concepts: [] }]) {
    assert.equal(validateSummary(raw).ok, false)
  }
})
test('key_concepts ausente se toma como lista vacía y se descartan los de más de 30', () => { /* … */ })
```

- [ ] **Step 2:** `npm test` → FAIL (`summary.js` no existe).
- [ ] **Step 3:** Implementar `summary.js` (mismo estilo que `quiz.js`: puro, esquema en mayúsculas, recorta textos con `trim()` y falla cerrado ante cualquier elemento mal armado). Campo del modelo `key_concepts` → `keyConcepts`.
- [ ] **Step 4: Tests del handler** — reemplazar el test `'summary: usa herramientas…'` por:

```js
test('summary: salida estructurada sin herramientas, evento summary y descuenta una vez', async () => {
  const payload = { title: 'Resumen · Bio', sections: [{ heading: 'Célula', body: 'Unidad…' }], key_concepts: [] }
  const { deps, calls } = makeDeps({ gemini: [textReply(JSON.stringify(payload))] })
  const evs = await events(await handleRequest(post({ action: 'summary', scope: { type: 'subject', id: S1 } }), deps))
  assert.equal(calls.gemini[0].body.tools, undefined)
  assert.ok(calls.gemini[0].body.generationConfig.responseSchema)
  const ev = evs.find((e) => e.type === 'summary')
  assert.equal(ev.summary.title, 'Resumen · Bio')
  assert.deepEqual(ev.summary.sheets, [{ sheetId: H1, subjectId: S1, date: /* día de SHEET.created_at */ }])
  assert.equal(ev.summary.sheetCount, 1)
  assert.equal(ev.summary.totalSheets, 1)
  assert.equal(ev.summary.external, false)
  assert.deepEqual(calls.record, [{ action: 'summary', external: false }])
})
test('summary mal armado → invalid_output y no descuenta', async () => { /* gemini devuelve '{"title":"a","sections":[]}' → evs.at(-1).code === 'invalid_output'; calls.record vacío */ })
test('summary sin apuntes → no_notes y no llama a Gemini', async () => { /* listSheetsContent/listSheetsBySubject vacíos */ })
test('summary de alcance hoja: totalSheets 1', async () => { /* scope {type:'sheet', id:H1} */ })
```

- [ ] **Step 5:** `npm test` → FAIL.
- [ ] **Step 6:** En `handler.js`: rama `if (action === 'summary')` antes de las conversacionales: emitir `{type:'tool', name:'read_sheet'}`, `gatherSources({db, ctx, weakTopics: []})` (agregarle `subject_id` a cada fuente), `no_notes` si no hay, llamar con `json: {schema: SUMMARY_SCHEMA}`, validar, emitir `summary` con `sheets`, `sheetCount = sources.length`, `totalSheets` y `external: mode === 'external'`. `resolveScope` devuelve `totalSheets` (1 si el alcance es una hoja; si no, las hojas de `withContent` con contenido no vacío). Sumar `'summary'` a `USEFUL_EVENTS`. `STREAM_ERRORS.no_notes` pasa a `'No hay apuntes en este alcance todavía.'`.
- [ ] **Step 7:** En `prompt.js`, `actionInstruction('summary')`: pedir el resumen de `${scopeLabel}` con las hojas de abajo, ordenado en secciones por tema (título y desarrollo con párrafos cortos, listas con `- ` y, si sirve, `**negrita**`), más conceptos clave con una definición de una línea; nada de `propose_new_sheet`.
- [ ] **Step 8:** `npm test` → PASS. Actualizar `docs/features/assistant.md` (protocolo y acción `summary`) y el CHANGELOG.
- [ ] **Step 9: Commit** `feat(asistente): resumen estructurado (evento summary) en la Edge Function`

---

### Tarea 3: Utilidades puras de resúmenes, registros y rutas

**Files:**
- Create: `src/lib/assistant/summaryBlocks.js` (+ `.test.js`), `src/lib/assistant/summaryDoc.js` (+ `.test.js`), `src/lib/assistant/quizRecord.js` (+ `.test.js`), `src/lib/assistant/studyItems.js` (+ `.test.js`)
- Modify: `src/constants/routes.js`, `src/lib/format/sheetDate.js` (+ test si existe; si no, crear `sheetDate.test.js` solo para la función nueva)

**Interfaces:**
- Produces:
  - `parseSummaryBody(body: string): Block[]` con `Block = {type:'p', inlines: Inline[]} | {type:'ul'|'ol', items: Inline[][]}` e `Inline = {text: string, bold: boolean}`. Listas: líneas que empiezan con `- `, `* ` (ul) o `1. ` (ol); líneas en blanco separan párrafos; líneas seguidas se unen con espacio. `**texto**` → bold; `**` sin cerrar queda literal.
  - `rowToSummary(row): SummaryDoc`; `buildSummaryRow(payload: SummaryPayload, meta: {scope: {type, id?}, subjectId: string|null, careerId: string|null}) → fila de insert` (`scope_id` null si el alcance es `all`); `summaryToMarkdown(doc: SummaryDoc): string`; `pdfFileName(title: string, iso: string): string`; `basedOnLabel(sheetCount: number, totalSheets: number): string`.
  - `buildQuizRecord(session: QuizSession, outcome: {results, sheets}) → QuizDetail`; `quizTitle({isReview: boolean, scopeType, subjectName: string|null}) → string`; `answerText(question, value) → string` (mover acá la de `QuizRunner.jsx` y que el componente la importe).
  - `filterLiveStudyItems(rows) → rows` (descarta filas con `subject?.deleted_at` o `career?.deleted_at`, o con `subject_id`/`career_id` y su embed `null`); `subjectOptions(rows) → Array<{id, name}>` (distintas, por nombre con `localeCompare('es')`); `filterBySubject(rows, subjectId|null) → rows`.
  - Rutas: `ROUTES.study = '/estudio'`, `ROUTES.studySummary = '/estudio/resumenes/:summaryId'`, `ROUTES.studyQuiz = '/estudio/examenes/:attemptId'`; `studyPath({tab?: 'resumenes'|'examenes', subjectId?: string}) → '/estudio?tab=examenes&materia=<id>'` (sin parámetros vacíos); `studySummaryPath(id)`, `studyQuizPath(id)`.
  - `formatSheetDay(iso) → 'dd/mm'` en `sheetDate.js`.

- [ ] **Step 1: Tests** (valores exactos):

```js
// summaryBlocks
assert.deepEqual(parseSummaryBody('Hola **mundo**\nsigue\n\n- a\n- **b**'), [
  { type: 'p', inlines: [{ text: 'Hola ', bold: false }, { text: 'mundo', bold: true }, { text: ' sigue', bold: false }] },
  { type: 'ul', items: [[{ text: 'a', bold: false }], [{ text: 'b', bold: true }]] },
])
assert.deepEqual(parseSummaryBody('<script>x</script> **abierto'), [
  { type: 'p', inlines: [{ text: '<script>x</script> **abierto', bold: false }] },
])
assert.deepEqual(parseSummaryBody('1. uno\n2. dos').map((b) => b.type), ['ol'])
assert.deepEqual(parseSummaryBody(''), [])
// summaryDoc
assert.equal(pdfFileName('Resumen · Biología', '2026-10-22T15:00:00'), 'Resumen - Biología - 22-10-2026')
assert.equal(pdfFileName('a/b:c*?', '2026-01-05T10:00:00'), 'a b c - 05-01-2026')   // sin caracteres inválidos, espacios colapsados
assert.equal(basedOnLabel(12, 12), 'basado en 12 hojas')
assert.equal(basedOnLabel(12, 20), 'basado en 12 de 20 hojas')
assert.equal(basedOnLabel(1, 1), 'basado en 1 hoja')
// summaryToMarkdown: cada sección como '# heading' + body; al final '# Conceptos clave' con '- **term**: definition';
// primera línea '*Resumen hecho por el Brote el 22/10/2026*'. Sin conceptos → sin esa sección.
// buildSummaryRow → { scope_type:'subject', scope_id:S1, subject_id:S1, career_id:C1, title, external, sheet_count, total_sheets, content:{sections, keyConcepts, sheets} }
// rowToSummary(buildSummaryRow(...) + {id, created_at}) vuelve a dar los mismos sections/keyConcepts/sheets
// quizRecord
assert.equal(quizTitle({ isReview: false, scopeType: 'subject', subjectName: 'Biología' }), 'Examen · Biología')
assert.equal(quizTitle({ isReview: true, scopeType: 'sheet', subjectName: 'Biología' }), 'Repaso de errores · Biología')
assert.equal(quizTitle({ isReview: false, scopeType: 'career', subjectName: null }), 'Examen · Toda la carrera')
assert.equal(quizTitle({ isReview: false, scopeType: 'all', subjectName: null }), 'Examen · Todas mis materias')
// buildQuizRecord: version 1; una pregunta por cada una de session.questions en orden; given = session.given[id] ?? null;
// correct/feedback del result con ese id (null si no hay); sheetDate y subjectId desde outcome.sheets[sheetId] si existe.
// studyItems
assert.deepEqual(filterLiveStudyItems([
  { id: 1, subject_id: 's', subject: { deleted_at: null }, career_id: 'c', career: { deleted_at: null } },
  { id: 2, subject_id: 's', subject: { deleted_at: '2026-01-01' }, career_id: null, career: null },
  { id: 3, subject_id: null, subject: null, career_id: 'c', career: { deleted_at: '2026-01-01' } },
  { id: 4, subject_id: 's', subject: null, career_id: null, career: null },
  { id: 5, subject_id: null, subject: null, career_id: null, career: null },
]).map((r) => r.id), [1, 5])
assert.equal(studyPath({ tab: 'examenes', subjectId: 'abc' }), '/estudio?tab=examenes&materia=abc')
assert.equal(studyPath({}), '/estudio')
assert.equal(formatSheetDay('2026-10-17T12:00:00'), '17/10')
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar. **Step 4:** `npm test` → PASS; lint y build.
- [ ] **Step 5: Commit** `feat(asistente): utilidades de resúmenes, registros de examen y rutas de Mi estudio`

---

### Tarea 4: Services de "Mi estudio" y guardado completo del intento

**Files:**
- Create: `src/services/study.service.js`
- Modify: `src/services/quizResults.service.js` (`saveAttempt`), `docs/API_DOCS.md`

**Interfaces:**
- Consumes: `filterLiveStudyItems` (Tarea 3), tablas de la Tarea 1.
- Produces:
  - `saveAttempt({scope, total, correct, subjectId?, careerId?, title?, detail?}) → ServiceResult<{id: string, …}>` (mismas validaciones de hoy; los nuevos campos van a `subject_id`, `career_id`, `title`, `detail`).
  - `saveSummary(row) → ServiceResult<{id: string}>`; `listSummaries() → ServiceResult<SummaryListItem[]>`; `getSummary(id) → ServiceResult<Object|null>` (fila completa con `content`; `null` si no existe o su materia/carrera está en la papelera); `deleteSummary(id) → ServiceResult<null>`.
  - `listQuizAttempts() → ServiceResult<AttemptListItem[]>`; `getQuizAttempt(id) → ServiceResult<Object|null>` (con `detail`); `deleteQuizAttempt(id) → ServiceResult<null>`.
  - Las listas traen `subject:subjects(id, name, deleted_at), career:careers(id, name, deleted_at)` embebidos, ordenan por `created_at desc` (y `id`), paginan con `fetchAllPages`, pasan por `filterLiveStudyItems` y no traen `content`/`detail`. Sin cache y sin avisar "cambió el árbol" (`notifies: false`).

- [ ] **Step 1:** Implementar siguiendo `quizResults.service.js` (`createCrudService`, `translateError`, mensajes en español: "No se pudieron leer tus resúmenes.", "No se pudo guardar el resumen.", etc.).
- [ ] **Step 2:** Documentar en `API_DOCS.md` cada función con su forma de retorno. CHANGELOG.
- [ ] **Step 3:** `npm test`, lint, build → verde.
- [ ] **Step 4: Commit** `feat(asistente): services de Mi estudio y detalle del intento`

---

### Tarea 5: Propuestas junto a su respuesta y achicadas al resolverse

**Files:**
- Modify: `src/lib/assistant/chatState.js` (+ `chatState.test.js`), `src/lib/assistant/bridge.js` (typedef `ApplyResult`), `src/components/features/assistant/ChatThread.jsx`, `src/components/features/assistant/ProposalCard.jsx`, `src/hooks/useAssistant.js` (`acceptProposal` pasa `sheetCreatedAt`), `src/pages/SubjectFolderPage.jsx` (`applyRef` devuelve `sheetCreatedAt`)

**Interfaces:**
- Consumes: `formatSheetDay` (Tarea 3).
- Produces:
  - `Message.turn: number`, `ChatState.turn: number` (0 al inicio), `Proposal.turn: number`, `Proposal.appliedSheetCreatedAt?: string`, `ChatState.summary: SummaryPayload|null`.
  - `addUserMessage` abre turno nuevo (`turn + 1`); los mensajes del asistente y las propuestas que llegan toman `state.turn`.
  - `threadItems(state) → Array<{type:'message', message: Message} | {type:'proposal', proposal: Proposal}>`.
  - `setProposalStatus(state, id, status, extra?: {sheetCreatedAt?: string})`.
  - `appendExchange(state, {messages: Message[], proposals: Proposal[]}) → ChatState` (cada mensaje `user` del intercambio abre un turno nuevo; las propuestas pendientes toman el último turno del intercambio; las no pendientes se descartan; respeta `MAX_MESSAGES`).
  - `ApplyResult = {ok: true, sheetCreatedAt?: string} | {ok: false, error: string}`.

- [ ] **Step 1: Tests en `chatState.test.js`**

```js
test('threadItems: cada propuesta va después del último mensaje de su turno', () => {
  let s = addUserMessage(initialChat(), 'a')
  s = reduceEvent(s, { type: 'text', delta: 'r1' })
  s = reduceEvent(s, { type: 'proposal', proposal: P1 })
  s = finishRequest(s)
  s = addUserMessage(s, 'b')
  s = reduceEvent(s, { type: 'text', delta: 'r2' })
  assert.deepEqual(threadItems(s).map((i) => i.type === 'message' ? i.message.text : i.proposal.id), ['a', 'r1', P1.id, 'b', 'r2'])
})
test('threadItems: propuestas de turnos ya recortados van al principio', () => { /* MAX_MESSAGES + 5 turnos; la propuesta del turno 1 queda primera */ })
test('setProposalStatus guarda sheetCreatedAt al aplicar', () => { /* appliedSheetCreatedAt === '2026-10-17T12:00:00Z' */ })
test('appendExchange suma el intercambio en turnos nuevos y solo propuestas pendientes', () => { /* … */ })
test('evento summary válido queda en state.summary; uno sin sections se ignora', () => { /* … */ })
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar en `chatState.js`.
- [ ] **Step 4:** `ProposalCard`: `applied` → una línea con `<Icon name="check">`: "Agregado a tu hoja del {formatSheetDay}" (si hay fecha), "Agregado a una hoja nueva" (`new_sheet`) o "Agregado a tu hoja"; `rejected` → una línea "Descartado"; `pending` y `failed` como hoy. `ChatThread` recorre `threadItems(state)`.
- [ ] **Step 5:** `SubjectFolderPage` `applyRef`: en `append`/`replace_selection` exitosos devuelve `{ok: true, sheetCreatedAt: sheet.created_at}`; `useAssistant.acceptProposal` lo pasa a `setProposalStatus`.
- [ ] **Step 6:** `npm test`, lint, build → verde. CHANGELOG.
- [ ] **Step 7: Commit** `feat(asistente): propuestas junto a su respuesta y en una línea al resolverse`

---

### Tarea 6: Motor de la tarjeta de atajos (conversación "inline")

**Files:**
- Create: `src/lib/assistant/inlineAnswer.js` (+ `.test.js`), `src/hooks/useInlineAnswer.js`
- Modify: `src/lib/assistant/bridge.js` (+ `bridge.test.js`), `src/hooks/useAssistant.js`, `src/components/features/assistant/AssistantHost.jsx`

**Interfaces:**
- Consumes: `addUserMessage`, `reduceEvent`, `appendExchange`, `initialChat` (Tarea 5); `buildHistory` (requestBuilder).
- Produces:
  - Bridge: `request(item)` ahora avisa a los suscriptores **con el item** (`onRequest(fn: (item) => void)`); `QueuedRequest.target?: 'chat'|'inline'` (default `'chat'`); `setInline(view: InlineView|null)`, `getInline()`, `subscribeInline(fn)`; `sendInline(cmd: InlineCommand)`, `onInlineCommand(fn)`; `requestOpen()`, `onOpenRequest(fn)`; `setPendingApply({subjectId, proposal}|null)`, `takePendingApply(subjectId) → Proposal|null` (solo si coincide la materia; lo saca).
  - `inlineAnswer.js`: `createInline(id: number, item: QueuedRequest, {mode, scope}) → InlineState` (`{id, shortcutId, label, selection, requestMessage, scope, external, answered: false, chat}` con `chat = addUserMessage(initialChat(), item.label)`); `reduceInline(inline, id, event) → InlineState|null` (si `inline?.id !== id` devuelve `inline` igual); `addInlineAnswer(inline, text)`; `inlineHistory(inline) → Array<{role:'user'|'model', text}>` (primer turno = `requestMessage` completo, después los del `chat` sin el primero); `pendingProposal(inline) → Proposal|null`; `inlineView(inline) → InlineView|null` (`label` = etiqueta del atajo, p. ej. `'Completar'`; `replies` = mensajes sin el primero; `canAnswer = shortcutId === 'ask' && !answered && !busy && replies.length > 0`).
  - `useAssistant`: los pedidos con `target: 'inline'` van a la tarjeta; un solo `AbortController` para todo el Brote con dueño (`'chat'|'inline'`); un atajo nuevo **corta y reemplaza** la tarjeta anterior; si el que responde es el chat, la tarjeta se crea con el aviso `'El Brote está respondiendo en el chat: probá cuando termine.'` y sin pedido; y si responde la tarjeta, el chat avisa como hoy (`BUSY`). Comandos: `close` (corta si es suyo y borra la tarjeta), `discard` (= close), `accept` (aplica con `context.apply`; ok → tarjeta `null`; error → error en la tarjeta y la propuesta `failed`), `continue` (solo sin `busy`: `appendExchange` al chat, tarjeta `null`, `assistantBridge.requestOpen()`), `answer` (solo si `canAnswer`: `addInlineAnswer` y pedido `{action:'chat', message: text}` con `history: inlineHistory` previo y el `scope` guardado). Publica `inlineView` en el bridge en cada cambio.
  - `useInlineAnswer() → {view: InlineView|null, close(), accept(proposalId), discard(), continueInChat(), answer(text)}`.
  - `AssistantHost`: con `item.target === 'inline'` solo carga el panel (`setLoaded(true)`), no lo abre; `onOpenRequest` lo abre como el botón (guarda la preferencia y enfoca).

- [ ] **Step 1: Tests** en `inlineAnswer.test.js` y `bridge.test.js`:

```js
test('reduceInline ignora eventos de otra tarjeta', () => {
  const a = createInline(1, ITEM, { mode: 'notes', scope: SCOPE })
  assert.equal(reduceInline(a, 2, { type: 'text', delta: 'viejo' }), a)
  assert.equal(inlineView(reduceInline(a, 1, { type: 'text', delta: 'hola' })).replies[0].text, 'hola')
})
test('Preguntame: canAnswer solo con la pregunta llegada, sin responder y sin busy', () => { /* … */ })
test('inlineHistory arranca con el pedido completo, no con la etiqueta', () => { /* [0] = {role:'user', text: ITEM.request.message} */ })
test('inlineView: external según el modo y la última propuesta pendiente', () => { /* … */ })
test('bridge: onRequest recibe el item; takePendingApply solo devuelve si coincide la materia', () => { /* … */ })
test('bridge: sendInline llega a onInlineCommand; requestOpen a onOpenRequest', () => { /* … */ })
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar `inlineAnswer.js` y el bridge; `npm test` → PASS.
- [ ] **Step 4:** Integrar en `useAssistant` (refactor de `start` a un `run({fields, visibleText, selection, scopeOverride, target})` donde `target` es `'chat'` o `{inlineId}`; para inline no se suma `addUserMessage` al chat y el `history` lo pasa quien llama: `[]` en el primer pedido del atajo). `useInlineAnswer` y `AssistantHost`.
- [ ] **Step 5:** `npm test`, lint, build → verde. CHANGELOG.
- [ ] **Step 6: Commit** `feat(asistente): motor de la tarjeta de atajos`

---

### Tarea 7: Tarjeta del atajo dentro de la hoja

**Files:**
- Create: `src/lib/editor/broteAnchor.js` (+ `broteAnchor.test.js`), `src/components/features/assistant/InlineAnswerCard.jsx`
- Modify: `src/components/features/sheetEditor/SheetEditor.jsx` (registrar la extensión), `src/pages/SubjectFolderPage.jsx`, `docs/features/folder.md` (la carpeta dibuja la tarjeta)

**Interfaces:**
- Consumes: `useInlineAnswer`, bridge con `target: 'inline'` (Tarea 6).
- Produces:
  - `blockEndPos(doc, pos) → number` (posición justo después del bloque de primer nivel que contiene `pos`: `doc.resolve(pos).after(1)`; si `depth === 0`, `pos`).
  - `createBroteAnchorPlugin({onRemoved}) → Plugin` con estado `{pos, dom}|null`: meta `{pos, dom}|null` lo fija/borra; con `docChanged` mapea `pos` con `tr.mapping.mapResult(pos, -1)` y, si `deletedBefore`, pasa a `null` y llama `onRemoved()`. Decoración: `Decoration.widget(pos, () => dom, {key: 'brote-inline', side: -1, stopEvent: () => true, ignoreSelection: true})`.
  - `BroteAnchorExtension` (TipTap `Extension`, opción `onRemoved`), `setBroteAnchor(editor, {pos, dom}|null)`, `getBroteAnchor(editor) → {pos}|null`.
  - `InlineAnswerCard({view, onClose, onAccept, onDiscard, onContinue, onAnswer, onEscape})`.

- [ ] **Step 1: Tests** con `@tiptap/pm/state`, `@tiptap/pm/model` y `@tiptap/pm/schema-basic` (sin TipTap Editor):

```js
test('blockEndPos: después del párrafo que contiene la posición', () => { /* doc p("uno"), p("dos"): blockEndPos(doc, 2) === 5 */ })
test('el ancla sigue al texto cuando se escribe antes', () => { /* insertar "xx" al inicio → pos + 2 */ })
test('borrar el párrafo de arriba cierra el ancla y avisa', () => { /* delete(0,5) → estado null, onRemoved llamado una vez */ })
test('escribir dentro del párrafo no cierra el ancla', () => { /* insertText en pos 2 → sigue */ })
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar `broteAnchor.js`; `npm test` → PASS.
- [ ] **Step 4:** `InlineAnswerCard`: como la maqueta (`mejoras-brote.html`): tarjeta oscura de ancho `max-w-md` (≈28 rem) dentro del papel; encabezado "Brote · {label}", chip "Con conocimiento externo" si `external`, ✕ (`aria-label="Cerrar la respuesta del Brote"`); respuestas con `whitespace-pre-wrap`; estado mientras `busy` (`status ?? 'Pensando…'`); `notice`/`error`; propuesta resaltada (texto plano) con **Agregar a la hoja** / **Descartar** / **Seguir en el chat** (este último deshabilitado con `busy`); sin propuesta, solo **Seguir en el chat**; si `canAnswer`, `textarea` con etiqueta "Tu respuesta" y botón **Responder**. `role="region"` + `aria-label="Respuesta del Brote"`; un `aria-live="polite"` que anuncia el texto final solo cuando `busy` pasa a `false`; Esc → `onClose()` y `onEscape()` (devuelve el foco al editor).
- [ ] **Step 5:** `SubjectFolderPage`: `handleShortcut` arma un `div` (`contenteditable=false`), `setBroteAnchor(editor, {pos: blockEndPos(doc, selection.to), dom})` (y borra el ancla de otro editor si la había), guarda `{editor, dom}` en estado y encola con `target: 'inline'`. Dibuja `createPortal(<InlineAnswerCard …/>, slot.dom)` mientras `view` exista. Si `view` pasa a `null`, borra el ancla; si el ancla se borra (`onRemoved`), manda `close`. Al desmontar la carpeta, manda `close`. Además consume `assistantBridge.takePendingApply(subjectId)` cuando la materia y las hojas terminaron de cargar y lo aplica con `applyRef` (lo usa la Tarea 9).
- [ ] **Step 6:** `npm test`, lint, build → verde. Prueba manual en `npm run dev`: seleccionar texto → Completar → la tarjeta aparece debajo del párrafo, empuja el texto, Agregar la cierra; borrar el párrafo la cierra. Docs (`folder.md`) y CHANGELOG.
- [ ] **Step 7: Commit** `feat(asistente): respuesta de los atajos debajo del texto`

---

### Tarea 8: Examen en ventana grande y su registro

**Files:**
- Create: `src/components/features/assistant/QuizWindow.jsx`, `src/components/features/study/QuizRecordView.jsx`, `src/hooks/useLeaveWarning.js`
- Modify: `src/components/features/assistant/QuizRunner.jsx`, `src/components/features/assistant/AssistantPanel.jsx`, `src/components/features/assistant/ChatThread.jsx` (línea de la prueba), `src/hooks/useAssistant.js`, `src/lib/assistant/quizSession.js` (+ `quizSession.test.js`)

**Interfaces:**
- Consumes: `buildQuizRecord`, `quizTitle`, `answerText`, `studyQuizPath` (Tarea 3); `saveAttempt` (Tarea 4).
- Produces:
  - `QuizSession` suma `title: string`, `careerId: string|null` (meta del pedido: `subjectName` de `context.subject?.name`; `careerId` = `scope.id` si el alcance es carrera, si no `context?.career?.id ?? null`).
  - `QuizOutcome` suma `attemptId: string|null` y `record: QuizDetail`.
  - `canRetrySave(session) → boolean` (`done`, `attemptId === null`, `score.total > 0`); `withSavedAttempt(session, key, {attemptId, error}) → QuizSession` (solo si es la misma `key`; con `attemptId` limpia `saveError`).
  - `useAssistant` devuelve además `retryQuizSave(): Promise<void>` (no hace nada si `!canRetrySave`).
  - `QuizWindow({open, title, onClose, children})`: `createPortal` a `document.body`, `role="dialog"`, `aria-modal="true"`, overlay `fixed inset-0 z-50 bg-black/60`, caja centrada `sm:max-w-3xl sm:h-[min(90vh,52rem)] sm:rounded-xl`, pantalla completa debajo de `sm`; Esc → `onClose`; queda **montada** con `hidden` cuando `open` es `false` (no se pierden las respuestas).
  - `QuizRecordView({title, createdAt?, score: {total, correct}, questions: RecordQuestion[]|null})`.
  - `useLeaveWarning(active: boolean)`: con `active`, `beforeunload` con `preventDefault()` y `returnValue = ''`.

- [ ] **Step 1: Tests** en `quizSession.test.js`: `canRetrySave` (true solo en `done` sin `attemptId` y con total > 0), `withSavedAttempt` (ignora otra `key`; con id limpia `saveError`; con error lo conserva).
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar; `npm test` → PASS.
- [ ] **Step 4:** `useAssistant`: guardar con `saveAttempt({scope, total, correct, subjectId: scopeSubjectId, careerId, title, detail: buildQuizRecord(...)})`, `attemptId` en el outcome, `retryQuizSave`.
- [ ] **Step 5:** `QuizRunner` dentro de `QuizWindow` (lo monta `AssistantPanel`, no el cuerpo del panel): encabezado "{title}", "Pregunta 3 de 10" con barra de progreso (`role="progressbar"` con `aria-valuenow/min/max`), **Salir** y **Descartar prueba**; `textarea` de desarrollo con `rows={8}`. Al terminar: `QuizRecordView` con **todas** las preguntas (✔ con `<Icon name="check">`, ✘ con `<Icon name="close">`, "Sin corregir"); en falladas y sin corregir: tu respuesta, la correcta o de referencia, devolución, explicación y link a la hoja (`subjectFolderPath(subjectId, sheetId)`, "Hoja del {formatSheetDateLong}"); avisos de `gradeError`/`saveError` con **Reintentar** (`retryQuizSave`); **Ver en Mi estudio** (si hay `attemptId`, `studyQuizPath`) y **Cerrar**. `QuizRecordView` con `questions === null` muestra "Sin detalle (prueba anterior)".
- [ ] **Step 6:** Panel: la prueba se abre sola en la ventana al llegar; `ChatThread` muestra "Tenés una prueba abierta · Seguir" (abierta o corrigiéndose) o "Tu examen: {correct} de {total} · Ver resultado" (terminada). `useLeaveWarning(blocksNewQuiz(quizSession))` en el panel (la Tarea 9 le suma el resumen).
- [ ] **Step 7:** `npm test`, lint, build → verde. Manual: pedir examen → ventana grande; Salir y Seguir conservan respuestas; terminar muestra todo. CHANGELOG.
- [ ] **Step 8: Commit** `feat(asistente): examen en ventana grande con registro guardado`

---

### Tarea 9: Resumen en ventana, PDF y "Guardar como hoja"

**Files:**
- Create: `src/components/features/study/SummaryDocument.jsx`, `src/components/features/study/SummaryPrint.jsx`, `src/components/features/assistant/SummaryWindow.jsx`, `src/hooks/usePrintSummary.js`, `src/hooks/useSaveSummaryAsSheet.js`
- Modify: `src/hooks/useAssistant.js`, `src/components/features/assistant/AssistantPanel.jsx`, `src/components/features/assistant/ChatThread.jsx`, `src/index.css`

**Interfaces:**
- Consumes: evento `summary` (Tarea 2); `ChatState.summary` (Tarea 5); `parseSummaryBody`, `rowToSummary`, `buildSummaryRow`, `summaryToMarkdown`, `pdfFileName`, `basedOnLabel`, `studySummaryPath` (Tarea 3); `saveSummary` (Tarea 4); `setPendingApply` (Tarea 6) y su consumo en la carpeta (Tarea 7). `QuizWindow` (Tarea 8) para la ventana grande (reusar el mismo componente o extraer una base común).
- Produces:
  - `useAssistant` devuelve `summaryDoc: {key: number, doc: SummaryDoc, status: 'saving'|'saved'|'error', savedId: string|null, saveError: string|null}|null`, `retrySummarySave(): Promise<void>` (solo con `status === 'error'`; nunca inserta dos veces) y `summaryPending: boolean` (pedido de resumen en curso o guardándose). La meta del pedido (`scope`, `subjectId` de `context.subject` si el alcance es hoja/materia, `careerId` como en la Tarea 8) se toma al lanzar `runAction('summary')`.
  - `SummaryDocument({doc: SummaryDoc, print?: boolean})`: título, fecha, `basedOnLabel`, chip "Incluye conocimiento externo", secciones numeradas ("1. Célula") con bloques de `parseSummaryBody` (p, ul, ol; `strong` para bold), "Conceptos clave" (`<dl>`), "Hojas usadas" con links (sin links si `print`).
  - `usePrintSummary() → {printing: SummaryDoc|null, print(doc: SummaryDoc)}`: monta `SummaryPrint` (portal `#print-root` en `body` con `SummaryDocument print`), agrega `html.printing`, cambia `document.title` a `pdfFileName(doc.title, doc.createdAt)`, llama `window.print()` en el próximo frame y en `afterprint` restaura todo.
  - CSS (en `index.css`): `#print-root{display:none}`; `@media print`: `html.printing body > *:not(#print-root){display:none !important}`, `html.printing #print-root{display:block}`, fondo blanco y texto negro, `@page{margin:18mm}`, títulos de sección con `break-after: avoid` y secciones con `break-inside: avoid-page`.
  - `useSaveSummaryAsSheet() → {save(doc: SummaryDoc): {ok: boolean, error?: string}}`: solo si `doc.subjectId`; propuesta `{id: 'summary-' + (doc.id ?? Date.now()), kind: 'new_sheet', subjectId, markdown: summaryToMarkdown(doc), source: doc.external ? 'external' : 'notes', status: 'pending'}`; si la carpeta abierta es esa materia (`assistantBridge.get()?.subject?.id`), `context.apply(propuesta)`; si no, `setPendingApply` + `navigate(subjectFolderPath(subjectId))`.
  - `SummaryWindow({summaryDoc, open, onClose, onRetry})`: ventana grande con `SummaryDocument`, **Descargar PDF** (`<Icon name="arrow-down">`) con la ayuda "Elegí «Guardar como PDF»", **Guardar como hoja** (si `subjectId`), **Ver en Mi estudio** (si `savedId`), "Guardando…" / error + **Reintentar**, **Cerrar**.

- [ ] **Step 1:** `useAssistant`: capturar el `summary` del stream y, al terminar el pedido, pasar a `saving` → `saveSummary(buildSummaryRow(payload, meta))` → `saved`/`error`. El doc se arma con `rowToSummary` (con `id: null` y `created_at` = ahora hasta que se guarde).
- [ ] **Step 2:** Panel: abre `SummaryWindow` sola al llegar un `summaryDoc` nuevo (`key`); `ChatThread` muestra "Tu resumen «{title}» está listo · Abrir" cuando `state.summary` existe. `useLeaveWarning(blocksNewQuiz(quizSession) || summaryPending)`.
- [ ] **Step 3:** Componentes, hooks y CSS de arriba.
- [ ] **Step 4:** `npm test`, lint, build → verde. Manual: Resumir materia → ventana ordenada; Descargar PDF → la vista previa de impresión muestra solo el resumen sobre blanco y el nombre sugerido es "Resumen - … - dd-mm-aaaa"; Guardar como hoja desde otra pantalla navega a la carpeta y agrega la hoja. CHANGELOG.
- [ ] **Step 5: Commit** `feat(asistente): resumen en ventana, PDF y guardar como hoja`

---

### Tarea 10: Sección "Mi estudio"

**Files:**
- Create: `docs/features/study.md` (**primero**, antes de codear), `src/pages/StudyPage.jsx`, `src/pages/StudySummaryPage.jsx`, `src/pages/StudyQuizPage.jsx`, `src/hooks/useStudy.js`
- Modify: `src/App.jsx`, `src/components/layout/Header.jsx`, `src/pages/SubjectFolderPage.jsx` (botón Estudio), `docs/features/navigation-shell.md`

**Interfaces:**
- Consumes: rutas, `subjectOptions`, `filterBySubject` (Tarea 3); services (Tarea 4); `SummaryDocument`, `usePrintSummary`, `useSaveSummaryAsSheet` (Tarea 9); `QuizRecordView` (Tarea 8); `ConfirmDialog` existente.
- Produces:
  - `useStudy() → {summaries, attempts, loading, error, remove(kind: 'summary'|'quiz', id): Promise<{error: string|null}>}`.
  - Rutas lazy dentro de `WorkspaceLayout` (como `TrashPage`): `ROUTES.study`, `ROUTES.studySummary`, `ROUTES.studyQuiz`.
  - Header: `NAV_ITEMS` = Inicio · Carreras · **Mi estudio** · Perfil.

- [ ] **Step 1:** Escribir `docs/features/study.md` (qué es, rutas, filtros, papelera, borrar, PDF, archivos) y la entrada en la tabla de lookup de `CLAUDE.md` (+ sus 4 copias con su encabezado "COPIA" de 2 líneas).
- [ ] **Step 2:** `StudyPage`: título "Mi estudio"; pestañas **Resúmenes** / **Exámenes** (`?tab=resumenes|examenes`, default resúmenes, `role="tablist"`); filtro "Materia" con "Todas las materias" + `subjectOptions` (`?materia=<id>`; los de alcance carrera/todo solo aparecen sin filtro); cada ítem: título, materia o "Varias materias", fecha (`formatSheetDateLong`), y en exámenes "7 de 10"; link a su página; botón borrar (`<Icon name="trash">`, `aria-label`) con `ConfirmDialog` ("¿Borrar este resumen? No se puede deshacer." / examen). Vacío: "Todavía no tenés resúmenes. Pedile uno al Brote con «Resumir materia»." (y la variante de exámenes con «Tomame examen»).
- [ ] **Step 3:** `StudySummaryPage`: `SummaryDocument` + **Descargar PDF**, **Guardar como hoja**, **Borrar**, "Volver a Mi estudio"; si no existe: "No encontramos ese resumen (puede haberse borrado)." `StudyQuizPage`: `QuizRecordView` + **Borrar** + volver; mismo texto de no encontrado para exámenes.
- [ ] **Step 4:** `SubjectFolderPage`: botón **Estudio** en la barra (junto a Importar/Exportar, clase `TOOL`, `<Icon name="file-text">`) → `navigate(studyPath({subjectId}))`.
- [ ] **Step 5:** `npm test`, lint, build → verde. Manual: la nav muestra Mi estudio; filtros y borrar funcionan; Estudio desde la carpeta filtra. CHANGELOG.
- [ ] **Step 6: Commit** `feat(estudio): sección Mi estudio con resúmenes y exámenes`

---

### Tarea 11: Cierre de documentación

**Files:**
- Modify: `docs/features/assistant.md`, `docs/02-architecture.md` (ADR-022 "Mi estudio" y PDF por impresión del navegador; estructura de carpetas con `components/features/study/` y las páginas nuevas), `docs/01-project-overview.md` (Fase 14.1 en el estado), `CHANGELOG.md` (completar 0.18.0 con tabla de decisiones como la 0.17.0), `CLAUDE.md` + `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md` (filas de lookup de los archivos nuevos del asistente si faltan)

- [ ] **Step 1:** `assistant.md`: atajos en la tarjeta (flujo, reglas, un pedido a la vez, sin historial), propuestas en una línea, ventana del examen y registro, resumen estructurado, PDF, "Guardar como hoja", aviso al cerrar la pestaña, límites conocidos (prueba a medias se pierde al cerrar la pestaña).
- [ ] **Step 2:** ADR-022, overview, CHANGELOG, CLAUDE.md y copias idénticas.
- [ ] **Step 3:** `npm test`, `npm run lint`, `npm run build` → verde.
- [ ] **Step 4: Commit** `docs(asistente): Fase 14.1 - ADR-022, Mi estudio y CHANGELOG 0.18.0`
