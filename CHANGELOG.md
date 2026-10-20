# Changelog — Studree

> Formato basado en [Keep a Changelog](https://keepachangelog.com/) y
> [Semantic Versioning](https://semver.org/).
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.

---

## [0.17.0] — 2026-10-19

### Added — El Brote, asistente de IA (FASE 14)

> Request: "pasar a la fase 14".
> Spec: `docs/superpowers/specs/2026-10-19-asistente-ia-design.md` · plan:
> `docs/superpowers/plans/2026-10-19-fase-14-asistente.md` · doc de la feature:
> `docs/features/assistant.md` · decisión: ADR-021.

**Decisiones del brainstorming y de la implementación:**

| Tema | Decisión |
|------|----------|
| Entrada | Un único punto: el Brote flotante, con panel lateral y barra de atajos sobre el texto seleccionado |
| Proveedor (ADR-021) | Gemini, solo desde la Edge Function `assistant`; `GEMINI_API_KEY` y `GEMINI_MODEL` son secrets de la función |
| Datos | La función usa la `anon key` + el JWT del usuario (RLS), nunca `service_role`; mapa liviano + herramientas de solo lectura en vez de mandar toda la carrera |
| Escritura | Nunca directa: propuestas (`append`, `replace_selection`, `new_sheet`) que el usuario acepta; entran por el editor de la carpeta abierta y su autosave. No borra hojas |
| Fuente | "Mis apuntes" o "Con conocimiento externo" (marcado como externo) |
| Cuotas | En el servidor, por plan y balde (`config.js`, valores **provisorios**); fallan cerrado si no se puede contar el uso |
| Uso | Se descuenta si la acción terminó bien o si agotó los pasos (`steps`) después de mostrar algo útil; nunca ante errores de Gemini |
| Corrección de pruebas | `quiz_grade` con su propio balde `grade` (migración `0008`) |
| Huecos / conexiones | `gaps` libre dentro del tope `extras` (3/mes, Ruling P); `connections`, `study_plan` y `weak_review` solo Premium |
| Respuestas | Texto plano (`whitespace-pre-wrap`), nunca HTML ni Markdown renderizado |
| Historial | No se guarda: vive mientras dure la sesión |
| Personaje | SVG propio con 6 estados animados por CSS (quieto con `prefers-reduced-motion`); se descartó el 3D real |

**Datos (`0007_asistente.sql` y `0008_quiz_grade_usage.sql`, aplicadas el 2026-10-19):**
- Tablas `user_plans` (solo `select` propio: el plan se cambia a mano en Supabase; sin fila =
  `free`), `ai_usage` (solo `select` e `insert` propios), `quiz_attempts` y `weak_topics`, todas
  con RLS y `user_id default auth.uid()`. Sin funciones SQL nuevas.
- `0008`: `ai_usage.action` admite `quiz_grade`.

**Edge Function `assistant` (`supabase/functions/assistant/`):**
- `handler.js` (lógica testeable con dependencias inyectadas): CORS, 401 sin JWT, 503 sin
  secrets, 400 pedido inválido o alcance inexistente/en la papelera, 403 función de Premium, 429
  tope agotado; stream SSE con eventos `text`, `tool`, `proposal`, `quiz`, `grades`, `usage`,
  `error` y `done`; corte por timeout o desconexión. `index.js` solo cablea Deno.
- `config.js` (acciones, baldes, topes provisorios, funciones por plan, máximos), `quota.js`,
  `request.js`, `topics.js` (paridad con `extractHeadings`), `careerMap.js` (mapa liviano),
  `tools.js` + `supabaseDb.js` (`read_sheet`, `list_subject_topics`, `search_notes`,
  `get_agenda` y `propose_*`; ignoran la papelera; `allowedSubjectIds` nunca es `null`),
  `prompt.js` (contenido de las hojas como datos), `gemini.js`, `sse.js`, `loop.js` (tope de
  pasos), `quiz.js` (salida JSON validada) y `account.js`.
- Acciones: `chat`, `shortcut`, `summary`, `quiz`, `weak_review`, `study_plan`, `gaps`,
  `connections` y `quiz_grade`.

**Cliente:**
- `AssistantHost` (el Brote flotante; recuerda abierto/cerrado; en modo lectura se oculta sin
  desmontarse), `AssistantPanel` (lazy; modo, alcance y chips "Resumir materia", "Tomame examen",
  "Repaso de errores", "Plan de estudio", "Detectar huecos" y "Conexiones entre materias"; los de
  Premium avisan sin llamar al servidor), `ChatThread`, `ProposalCard`, `SelectionShortcuts`
  (Explicar, Refutar, Completar, Preguntame) y `QuizRunner` (una pregunta por vez, puntaje y
  errores con link a la hoja).
- Hooks `useAssistant` y `useAssistantContext`; lógica pura en `src/lib/assistant/` (`sse`,
  `readSseStream`, `chatState`, `bridge`, `requestBuilder`, `shortcuts`, `editorApply`,
  `applyProposal`, `quizSession`, `quizScore`, `weakTopics`, `assistantError`); services
  `assistant`, `userPlan` y `quizResults`.
- La carpeta publica su contexto en `assistantBridge` y aplica las propuestas solo si son de la
  carpeta abierta; `replace_selection` verifica que el texto no haya cambiado. Los atajos se
  encolan en el puente y la cola se descarta al desmontarse la carpeta.
- Pruebas: se corrigen y guardan una sola vez (`open` → `grading` → `done`); un error inesperado
  cierra la prueba en `done` con el error. Los temas fallados alimentan el "Repaso de errores".
- `Modal`/`ConfirmDialog` y `UndoToast` se renderizan por portal en `document.body` (quedan sobre
  el Brote). Íconos nuevos en `Icon.jsx`; `extractHeadings` acepta saltos `\r\n`.

**Archivos afectados:** `supabase/migrations/0007_asistente.sql`, `0008_quiz_grade_usage.sql`;
`supabase/functions/assistant/**`; `src/lib/assistant/**`; `src/components/features/assistant/**`;
`src/hooks/useAssistant.js`, `useAssistantContext.js`; `src/services/assistant.service.js`,
`userPlan.service.js`, `quizResults.service.js`; `src/components/layout/AppLayout.jsx`;
`src/pages/SubjectFolderPage.jsx`; `src/components/ui/{Modal,UndoToast,Icon}.jsx`;
`src/constants/storageKeys.js`; `src/lib/markdown/headings.js`; `src/index.css`; `package.json`
(`npm test` incluye `supabase/functions/**`); `.env.example`.

**Docs:** ADR-021 y árbol de carpetas en `docs/02-architecture.md`; `docs/features/assistant.md`
(nuevo); `API_DOCS.md` (Edge Function y services), `DB_SCHEMA.md`, `03-security.md` (apartado del
asistente), `01-project-overview.md` (Fase 14 y **Fase 17: planes y pago simulado**, pendiente
al final) y las reglas de IA (`CLAUDE.md` y sus 4 copias).

**Fixed — revisión final de la rama:**
- El mapa que va a Gemini traía todas las hojas "(sin temas)" en producción (`loadTree` no trae
  `content_md`): ahora `listSheetsContent` lee el contenido **solo de las materias del alcance**.
- **Ruling Q:** "Detener", cerrar la pestaña o vencer el plazo total después de algo útil
  descuenta uso (antes era gratis); antes de algo útil, no.
- Plazo total del pedido `REQUEST_DEADLINE_MS` = 120 s (por debajo del corte de ~150 s de
  Supabase) → error `timeout`.
- Sin `SUPABASE_URL` o clave anon (fallback `SUPABASE_PUBLISHABLE_KEY`) → 503 `config` con
  CORS en vez de un 500 sin CORS; `handleSafely` devuelve JSON 500 con CORS ante cualquier error
  no previsto. El panel muestra "El asistente todavía no está configurado (faltan las claves de
  la función)." ante un 503 `config`.
- `scope.id` y `selection.sheetId` se validan como UUID (400 en vez de un 500 de PostgREST).
- Con una prueba abierta, "Tomame examen" y "Repaso de errores" quedan deshabilitados con el
  motivo visible; nuevo "Descartar prueba" (sin red).
- **Ruling R:** `quiz_grade` siempre viaja en modo `notes` (no gasta el cupo externo).
- Un free en Inicio ya no pierde la pregunta escrita si el pedido no sale.
- Se quitaron `bridge.peekRequest` y `ChatState.grades` (sin uso).
- `supabase/config.toml` con `[functions.assistant]` (`verify_jwt = false`, `entrypoint`);
  pasos de deploy para Windows y pruebas post-deploy en `docs/features/assistant.md`; aviso de
  privacidad del nivel gratuito de Gemini en `03-security.md`.

**Tests:** `npm test` = 385 tests, todos pasan. `npx eslint src supabase` sin salida y
`npm run build` ok. `grep -ri "AIza" dist src` sin coincidencias; el nombre `GEMINI_API_KEY`
solo aparece en `docs/`, `CHANGELOG.md` (texto), `.env.example` (sin valor) y `supabase/`.

**Límites conocidos:**
- El conteo de uso no es transaccional (chequear y después registrar): pedidos simultáneos
  pueden pasar el tope por tantos como corran en paralelo.
- En el nivel gratuito de Gemini, Google puede usar los apuntes enviados para mejorar sus
  productos: para usuarios reales, clave con facturación.
- `misses` de `weak_topics` se calcula en el cliente: dos pruebas a la vez pueden pisarse.
- El historial del chat no se guarda; las respuestas son texto plano.
- Las propuestas solo se aplican con la carpeta de esa materia abierta.
- Topes y funciones por plan provisorios; no hay pantalla de planes (Fase 17).

> **Pendiente del estudiante:** desplegar la función y cargar los secrets
> (`npx supabase secrets set GEMINI_API_KEY=… GEMINI_MODEL=…` y `npx supabase functions deploy
> assistant --no-verify-jwt --use-api`, ver `docs/features/assistant.md`). Después, la verificación en el navegador
> (panel, atajos, propuestas, pruebas) y con dos cuentas (una no ve los apuntes de la otra por
> el asistente).

## [0.16.0] — 2026-10-15

### Added — Papelera, adjuntos, plantillas e importar (FASE 13)

> Request: "quiero trabajar en la fase 13".
> Spec: `docs/superpowers/specs/2026-10-15-fase-13-design.md` · plan:
> `docs/superpowers/plans/2026-10-15-fase-13.md`.

**Decisiones del brainstorming:**

| Tema | Decisión |
|------|----------|
| Adjuntos | Solo en hojas; imágenes dentro del texto y lista "Adjuntos" al pie de la hoja |
| Papelera | Carreras, materias y hojas (en cascada); 30 días y se borra sola |
| Plantillas | 4 de fábrica + "Guardar como plantilla" |
| Importar | `.md`/`.zip` en una materia + restaurar un export de Studree + imágenes |
| Almacenamiento (ADR-020) | Bucket privado + tabla `attachments` + referencias `adjunto:<id>` con links firmados |
| Papelera (ADR-019) | Columna `deleted_at` en `careers`, `subjects` y `sheets` |
| Purga | La hace la app al iniciar sesión (sin servidor) |

**Datos (`0006_fase13.sql`, aplicada el 2026-10-15):**
- Columna `deleted_at` en `careers`, `subjects` y `sheets`; tablas `attachments` y
  `sheet_templates` con RLS; bucket privado `attachments` con políticas por primera carpeta.
- Funciones `security invoker`: `trash_item`, `restore_item`, `list_trash`,
  `list_expired_trash` y `attachment_paths_for`. `trash_item` y `list_expired_trash` usan
  `clock_timestamp()` (no `now()`) para que dos borrados en una misma transacción tengan
  marcas distintas.
- Probada antes de aplicarla con un `begin … rollback` con asserts, incluida la RLS cruzada
  entre usuarios (21 usuarios).

**Papelera (ADR-019):**
- Borrar una carrera, materia u hoja la manda a la papelera (30 días) con aviso "Deshacer";
  página `/papelera` (restaurar, borrar para siempre, vaciar) y entrada en el explorador.
- Purga de lo vencido una vez por sesión (`useTrashPurge`); borrar para siempre elimina antes
  los archivos de Storage.
- Toda lectura filtra `deleted_at` (`softDelete` en `crudService`, `searchContent`,
  `getLastEditedSheet`); las correlativas hacia materias en la papelera se descartan en el
  cliente (`livePrerequisites`).

**Adjuntos (ADR-020):**
- Soltar, pegar o usar el clip (siempre visible en la cápsula; sin hoja con foco adjunta a la
  última, deshabilitado si la carpeta no tiene hojas). Máximo 20 MB.
- Las imágenes se ven dentro del texto; el marcador "Subiendo…" es el propio nodo de imagen
  (`adjunto:<id>` antes de terminar la subida). Los otros archivos se insertan como link
  enseguida y todos van en la lista al pie de la hoja.
- Al pegar, solo los portapapeles con archivos y sin `text/plain` ni `text/html` (capturas)
  cuentan como adjuntos; lo de Word, Excel o la web pega normal.
- Una hoja nueva se crea antes de subir (`ensureCreated` en el saver).

**Plantillas:**
- "Nueva hoja ▾" (botón partido): en blanco, 4 de fábrica (Clase, Resumen, Práctica, Repaso
  para parcial) o propias; "Guardar como plantilla" (sin adjuntos) y administrador. La hoja
  creada desde una plantilla se guarda al crearse.

**Importar:**
- `.md` sueltos y `.zip` (export de Studree o vault de Obsidian) en una materia, o restaurar
  un export completo desde el panel de carreras; las imágenes y archivos del zip se suben como
  adjuntos y cada hoja conserva su fecha.
- Duplicados: mismo minuto de creación y mismo contenido ignorando los destinos de links e
  imágenes (un export con imágenes vuelto a importar se detecta como duplicado). La raíz
  `Studree/` se descarta si hay al menos una carpeta más; se normalizan las rutas de Windows
  (`\`); se aceptan BOM y frontmatter vacío.

**Export:**
- El `.zip` lleva los adjuntos en `adjuntos/`; las rutas se codifican por segmento
  (`encodeURIComponent` más paréntesis, así sobrevive el `#`). Si una descarga falla, la
  referencia pasa a `[imagen: …]` / `[archivo: …]` y el diálogo avisa. El `.md` único y
  "Copiar para IA" describen los adjuntos como `[imagen: …]` / `[archivo: …]`.

**Dependencias:** `@tiptap/extension-image@3.31.3` (autorizada). Se agregó el script
`npm test` (`node --test`).

**Docs:** ADR-019 y ADR-020 en `docs/02-architecture.md`; `docs/features/{trash,attachments,sheet-templates,import}.md`
nuevos; `folder.md`, `navigation-shell.md`, `markdown-export.md`, `API_DOCS.md`, `DB_SCHEMA.md`,
`03-security.md`, `01-project-overview.md` y las reglas de IA (`CLAUDE.md` y sus 4 copias).

**Tests:** `npm test` = 62 tests, todos pasan (puras de adjuntos, papelera, export, import,
saver, correlativas vivas y plantillas). `npx eslint src` sin salida y `npm run build` ok.

> **Pendiente:** la verificación en el navegador no se pudo hacer (la extensión de Chrome no
> estaba conectada): adjuntos de punta a punta en el editor, papelera completa, plantillas e
> export/import de ida y vuelta.

---

### Fixed (revisión final)

- **Papelera:** "Borrar para siempre" y "Vaciar papelera" ya no pueden borrar algo vivo:
  `purgeForever` confirma que la fila sigue en la papelera antes de tocar archivos y filtra
  `deleted_at` en el `DELETE`; la página recarga después de cada acción y "Vaciar" pide la lista
  de nuevo. La confirmación nombra los otros elementos listados que arrastra un borrado.
- **Export:** los adjuntos se piden de a 100 hojas (antes un `IN` gigante fallaba con cientos de
  hojas) y solo para el `.zip`.
- **Adjuntos:** los nombres con `_ * ~ ! #` etc. ya no ganan barras en cada export→import, y la
  detección de duplicados del import ignora esos escapes.
- **Plantillas:** una hoja de plantilla ya no se crea dos veces (StrictMode / remontaje): el
  primer guardado va en un efecto y hay un registro de creates por hoja local.
- **Importar:** las hojas importadas no se suman a la cache local (crecía al cuadrado).
- **Inicio y Ctrl+K:** no muestran hojas de una materia que está en la papelera.

## [0.15.0] — 2026-10-15

### Changed — Rediseño visual (ADR-018)

> Request: "las hojas tienen que estar centradas dentro de la pantalla… esta todo de 1 solo
> color… aplicaria las skills que tenemos disponibles… y aplicar el logo original" +
> "en el inicio no se tiene que ver [el explorador] ni las ventanas abiertas de las materias".

- **Carpeta:** hojas centradas en la pantalla y más anchas (hasta 52rem), en papel crema con
  renglones y el margen del color de la materia; `#` en Bricolage Grotesque con ese color;
  links y `[[links]]` en el color de la materia; índice con línea y tema activo resaltado;
  herramientas en una cápsula ("Título", "Subtítulo", "Tarea", "Cita", "Leer", "Exportar").
- **Inicio:** saludo con la fecha y la próxima fecha importante, grilla bento de paneles de
  vidrio, "Seguí donde dejaste" con la hoja que asoma, "Esta semana" como bloque con número,
  notas como post-it. Sin explorador ni tabs.
- **Shell:** logo original (`public/logo.jpg`, header y favicon; se borró `logo.svg`),
  buscador `Ctrl K` en el header, materias abiertas como pastillas con su color, explorador
  cerrado por defecto (`Ctrl+B`, se recuerda en `studree:ui:explorer-open`).
- **Estilo:** luz de lámpara (`.lamp`), vidrio (`.glass`), papel (`.paper-sheet`), tokens
  `paper.line`, `postit`, `surface-lit`, `font-display`; Inter y Bricolage Grotesque desde
  Google Fonts (Inter antes no se cargaba); `theme-color`.
- **Accesibilidad:** íconos SVG propios (`components/ui/Icon.jsx`) en lugar de emojis; foco
  visible global; la ✕ de tabs y de hojas aparece también con foco; el drawer cerrado queda
  `inert`; la hoja que asoma respeta `prefers-reduced-motion`.
- **Fix (índice de temas):** al elegir un tema el índice marcaba el anterior (el umbral del
  tema activo, 140 px, quedaba por encima del `scroll-margin-top` de 144 px de los headings);
  ahora el umbral sale del `scroll-margin-top` real. Los últimos temas, que no pueden subir
  hasta arriba, quedan marcados al elegirlos.
- **Nuevo:** `src/constants/subjectTones.js` (tonos con contraste ≥ 4.5:1 por color de
  materia), `src/lib/home/greeting.js`.
- Archivos: `tailwind.config.js`, `src/index.css`, `index.html`, `public/logo.jpg`,
  `layout/{Header,WorkspaceLayout,TabBar}.jsx`, `pages/{HomePage,SubjectFolderPage}.jsx`,
  `features/folder/*`, `features/home/*`, `sheetEditor/EditorToolbar.jsx`,
  `ui/{Icon,EmptyState,Drawer}.jsx`, `constants/storageKeys.js`, docs.

---

## [0.14.0] — 2026-10-14

### Added — Inicio útil (FASE 12)

**Request original:** "Al abrir Studree (ya logueado) la app tiene que abrir en el Inicio",
con "Seguí donde dejaste" (última hoja editada, materia, fecha y click directo a
`/materias/:subjectId?hoja=:sheetId`), un calendario de fechas importantes, tareas
pendientes, notas rápidas y propuestas del brainstorming. En paralelo con La Carpeta (otro
agente). Spec: `docs/superpowers/specs/2026-10-14-inicio-design.md`; plan:
`docs/superpowers/plans/2026-10-14-inicio.md`.

Decisiones del usuario:
- el Inicio va dentro del workspace;
- `/` es el Inicio y la bienvenida pública se eliminó;
- las fechas son solo título + día;
- calendario con mes + "Próximas";
- tareas con fecha límite opcional y "Hechas";
- las tareas también se marcan en el calendario;
- notas en tarjetas sueltas;
- extras: resumen de la semana y próxima fecha;
- preview del primer renglón;
- vencidas en rojo.

**Migración `0005_home.sql` aplicada** el 2026-10-15 (solo agrega tablas, idempotente).

#### Datos
- `supabase/migrations/0005_home.sql` (**nuevo**): `important_dates`, `tasks` y
  `quick_notes`, con RLS `_owner`, `user_id default auth.uid()`, `set_updated_at` y
  checks de largo. No hay funciones nuevas.
- `crudService.js`: flag `notifies` (default `true`). Con `false`, las tablas del Inicio no
  recargan el explorador.
- Services **nuevos**: `importantDates.service.js`, `tasks.service.js`,
  `quickNotes.service.js` y `home.service.js` (`getLastEditedSheet`: una consulta con
  `limit 1`, sin `title`, preview de una sola hoja).
- `types/models.js`: `ImportantDate`, `Task`, `QuickNote` y `LastSheet`.

#### UI
- `pages/HomePage.jsx` reescrita: grilla de 2 columnas en desktop y 1 en el celular
  (orden: resumen, seguí, próxima fecha, tareas, calendario, notas).
- `components/features/home/` (**nuevo**): `HomePanel`, `ContinueCard`, `NextDateCard`,
  `WeekSummary`, `CalendarPanel`, `DateFormModal`, `TaskList` y `QuickNotes`.
- `hooks/useHome.js` (**nuevo**): bloques independientes, escrituras optimistas y borrado
  de notas con "Deshacer" (5 s, que se manda igual al salir).
- `lib/home/` (**nuevo**, puras): `dates.js`, `calendar.js` (grilla de 6×7 que empieza el
  lunes), `preview.js` y `summary.js`. `constants/homeLimits.js` (**nuevo**).
- Ruteo:
  - `App.jsx`: `/` dentro de `RequireAuth` + `WorkspaceLayout`;
  - `AppLayout.jsx`: `/` exacta es ruta del workspace;
  - `LoginPage.jsx`: vuelve a `/`;
  - `ContinueCard` usa `subjectFolderPath(subjectId, sheetId)` de La Carpeta.

#### Docs
- `docs/features/home.md` (**nuevo**).
- Actualizados: `DB_SCHEMA.md`, `API_DOCS.md`, `02-architecture.md` y
  `01-project-overview.md`.
- Fila de lookup en `CLAUDE.md` y sus 4 copias.

> Es 0.14.0 porque La Carpeta ya tomó la 0.13.0. Mergeada en `rama-nicolas` el 2026-10-15.

## [0.13.0] — 2026-10-14

### Changed — La Carpeta (FASE 11)

**Request original:** "me gustaría que por materia haya una hoja y vas agregando más en el
mismo lugar estilo Word… como si fuera una carpeta escolar", fondo blanco para el
contenido, buscar por temas, herramientas para leer mejor, y estados de materia que se
diferencien. Decisiones en el brainstorming: carpeta continua con los datos divididos en
hojas, sin dibujo de hojas, orden cronológico sin reordenar, papel blanco solo en las hojas,
índice de temas + buscador + modo lectura, hojas sin título. Spec:
`docs/superpowers/specs/2026-10-14-carpeta-design.md`; plan:
`docs/superpowers/plans/2026-10-14-carpeta.md`.

**Migración `0004_carpeta.sql` aplicada** (destructiva, autorizada). Probada antes en
`begin … rollback` con asserts; esa prueba encontró que los triggers de la 0003 dejaban el
contenido en NULL al anular títulos, así que se dropean primero.

#### Datos (ADR-017)
- Cada título de hoja pasó a ser el primer tema (`# título`); `title` queda NULL.
- Se eliminan `sheet_links` (+ triggers/funciones), `units`, `topics`, `sheets.topic_id`,
  `sheets.pos_x/pos_y` y `subjects.map_x/map_y`. `save_node_positions` solo acepta `subjects`.

#### La Carpeta (`features/folder.md`, **nuevo doc**)
- `SubjectFolderPage` (**nuevo**): hojas en orden cronológico sobre papel blanco, cada una
  con su autosave (`useSheetAutosave`, **nuevo**, misma regla de borrador de la Fase 0).
- **＋ Nueva hoja**: se guarda recién con contenido. `?hoja=:id` posiciona (contrato con el Inicio).
- **Índice de temas** (`extractHeadings`), **buscador** con resaltado en todas las hojas
  (`HighlightExtension` + `computeHighlights`), **`[[Tema]]` clickeable**, **modo lectura**.
- `/hojas/:id` redirige a la carpeta (`SheetRedirectPage`, **nuevo**).

#### Shell, export y estilos
- Tabs por materia; explorador Carrera → Materia (con cantidad de hojas); Ctrl+K abre la
  carpeta en la hoja encontrada (materia + fecha + fragmento).
- Export: cada hoja con su fecha como heading; `.zip` con archivos `AAAA-MM-DD HH-MM.md`
  y `creada` en el frontmatter.
- Tokens `paper`, `ink`, `warn`. Estados: `○ Pendiente`, `◐ Cursando` (ámbar),
  `✓ Aprobada`, `🔒 Bloqueada` (punteado).
- `@tiptap/pm` declarado en `package.json` (ya estaba instalado como peer).

#### Eliminados
`SubjectMapPage`, `SheetPage`, `features/subjectMap/*`, `SheetListItem`,
`SheetLinksPanel`, `useSubjectMap`, `useSheet`, `useSheetLinks`, `sheetLinks.service.js`,
`computeSheetLayout`, `appendWikiLink`/`removeWikiLink`/`includesTitle`.

#### Fixed (revisión final de la rama)
- Borrar una hoja nueva mientras se creaba la dejaba viva: ahora se borra por `key` con el
  estado actual, y un `create` en vuelo que vuelve después de borrar elimina la fila creada.
- Las hojas nuevas no tenían borrador local (se perdía lo escrito sin conexión): ahora lo
  tienen y se restauran al abrir la materia.
- Cambiar de materia arrastraba el scroll y podía mostrar hojas de la anterior: la carpeta
  se remonta por materia y las cargas viejas se descartan.
- Con el buscador abierto, la vista saltaba al resultado en cada pausa al escribir.
- Un heading vacío o dentro de una lista desalineaba el índice con el editor.
- Si fallaba la carga de hojas, los editores se abrían sobre la cache vieja.
- La lógica de guardado se movió a `lib/editor/sheetSaver.js` (sin React, con pruebas).

#### Pendiente
- Medir el montaje con una materia grande: en desarrollo, la consola muestra
  `[carpeta] N hojas montadas en X ms` (criterio < ~1 s).

---

## [0.12.0] — 2026-10-14

### Changed — Jerarquía de 3 niveles + canvas de hojas con `[[links]]` (FASE 10 / Fase 1)

**Request original:** analizar a fondo el proyecto contra la visión, y después
"completá la fase 0 y fase 1". Decisiones del usuario en el brainstorming: pasar a
**Carrera → Materia → Hoja** ("es tedioso ir abriendo y abriendo") y que el canvas de
materia muestre **las hojas como nodos conectadas por links** (opción A). Spec:
`docs/superpowers/specs/2026-10-14-diagnostico-fases-0-1-design.md`; plan:
`docs/superpowers/plans/2026-10-14-fases-0-1.md`.

**Migración `0003_three_levels_and_sheet_links.sql` aplicada** (2026-10-14) vía
Management API. Antes se probó dentro de una transacción con `rollback` (asserts de links,
rename, títulos con caracteres especiales, autoenlace, duplicados, whitelist, posiciones),
y después con un E2E como usuario autenticado (RLS de `sheet_links` y de la RPC; otro
usuario no puede mover nodos ajenos). Datos migrados: 0 hojas sin `subject_id`.

#### Datos (ADR-014, ADR-015, ADR-016)
- `sheets.subject_id` (backfill desde tema → unidad), `sheets.pos_x/pos_y`, títulos únicos
  por materia, `topic_id` legado (`on delete set null`). `units`/`topics` deprecadas.
- `sheet_links` + RLS, **derivada del Markdown** por triggers (`refresh_sheet_links`); el
  rename de una hoja reescribe los `[[título viejo]]` que la apuntaban.
- RPC `save_node_positions` (security invoker + whitelist).
- `updated_at` de hojas solo cambia con título o contenido.

#### Canvas de materia (`subject-map.md`, reescrito)
- Hojas como nodos (`SheetNode.jsx`, **nuevo**); conectar dos nodos agrega `[[destino]]` al
  origen; click en la flecha lo quita; ＋ crea una hoja ya enlazada; vista **Lista**
  (`SheetList.jsx`, **nuevo**). Layout `computeSheetLayout`: dagre para las conectadas,
  grilla debajo para las sueltas.
- `useSubjectMap` reescrito (materia + hojas sin contenido + links).
- **Eliminados:** `UnitNode`, `TopicNode`, `SubjectRootNode`, `SheetListPanel`, `useSheets`,
  `units.service.js`, `topics.service.js`.

#### Editor (`sheet-editor.md`)
- Panel **Enlaces** (`SheetLinksPanel.jsx`, `useSheetLinks.js`, **nuevos**): salientes,
  backlinks y `[[títulos]]` sin hoja con botón para crearla.
- `lib/markdown/wikiLinks.js` (**nuevo**); `editorToMarkdown` desescapa `\[\[ \]\]`.
- "← Volver a la materia"; error claro si el título ya existe (y vuelve al anterior).

#### Explorador, palette y export
- Explorador y palette a 3 niveles; el rename muestra el error debajo de la fila.
- Export: alcance **todas mis carreras** (botón "Exportar todo" en `/carreras`),
  **📋 Copiar para IA** (portapapeles + preámbulo), headings de las hojas corridos de nivel
  (sin tocar bloques de código), nombres del `.zip` deduplicados, frontmatter
  `carrera/materia/fecha`.

#### Archivos
`supabase/migrations/0003_three_levels_and_sheet_links.sql`, `src/services/{crudService,
cache.service,sheets.service,sheetLinks.service}.js`, `src/hooks/{useSubjectMap,useSheet,
useSheetLinks,useExplorerTree,useExportTree,useCareerMap}.js`, `src/lib/markdown/
{wikiLinks,serialize}.js`, `src/lib/graph/dagreLayout.js`, `src/lib/export/*`,
`src/components/features/{subjectMap,sheetEditor,explorer,commandPalette,export}/*`,
`src/components/layout/{WorkspaceLayout,AuthProvider,Header,TabBar}.jsx`,
`src/pages/{SubjectMapPage,SheetPage,CareersPage,CareerMapPage,HomePage}.jsx`,
`src/types/models.js`, docs.

---

## [0.11.0] — 2026-10-14

### Fixed — Estabilización (FASE 9 / Fase 0 del diagnóstico)

- **Borrador del editor pisaba cambios de otro dispositivo** (`useSheet.js`): el borrador
  ahora es `{ content, baseUpdatedAt }`, solo gana si el servidor no cambió desde entonces,
  y se borra después de guardar bien.
- **Autosave perdido al salir** de la hoja antes de los 800 ms: se manda enseguida al
  desmontar y en `pagehide`.
- **Truncado silencioso a 1000 filas**: `crudService.list` y `listByParents` paginan.
- **El explorador bajaba el contenido de todas las hojas**: ahora trae columnas sin
  `content_md`; la búsqueda por contenido del palette va al servidor
  (`sheetsService.searchContent`, debounce 250 ms, desde 3 letras).
- **Tabs huérfanas** de hojas borradas y títulos viejos: se podan y sincronizan con el
  árbol del explorador.
- **Fuga entre usuarios**: `clearAllCache` borra todo `studree:` (también tabs y
  explorador), al cerrar sesión y al entrar con otra cuenta.
- **Un `UPDATE` por nodo** al acomodar un canvas: ahora un solo request
  (`savePositions` → RPC, ADR-016).
- **Canvas desactualizado** al renombrar desde el explorador: los canvas se recargan en
  silencio con `studree:data-changed`.
- **Logo**: SVG nuevo (`public/logo.svg`) con los colores del design system. El JPEG
  anterior parecía un placeholder y decía "STUIDREE". Se eliminó `public/logo.jpg`.

### Removed
- Código muerto: `hooks/useSubjects.js`, `hooks/useEntityById.js`.

### Changed
- `.cursorrules`, `.windsurfrules`, `.clinerules` y `.github/copilot-instructions.md` pasan
  a ser copias de `CLAUDE.md` (estaban desactualizados y describían el modelo viejo).
- Trabajo pendiente de la Fase 8 commiteado (`facab6a`).

---

## [0.10.0] — 2026-10-14

### Changed — Canvas estilo n8n, correlativas opcionales y panel de carreras (FASE 8)

Al probar la app, los canvas no se sentían "estilo n8n": nodos fijos, todo se creaba con
formularios fuera del lienzo y las carreras se veían poco. Decisiones del usuario: mover
nodos a mano **con posición guardada**, carreras **sin** canvas pero más visibles, y poder
elegir si una carrera usa correlativas.

**Migración `0002_manual_layout_and_prereq_toggle.sql` aplicada** (2026-10-14) con la
Management API de Supabase, usando `SUPABASE_ACCESS_TOKEN` de `.env.local` (sin prefijo
`VITE_`, ver `docs/03-security.md`). Se verificó: las 9 columnas nuevas existen, RLS sigue
activo en las 6 tablas y la API REST ya expone `uses_prerequisites` (se recargó la caché
de esquema con `notify pgrst`).

#### Datos (ADR-012, ADR-013)
- `supabase/migrations/0002_manual_layout_and_prereq_toggle.sql` (**nuevo**):
  `careers.uses_prerequisites` (default `true`); `pos_x`/`pos_y` en `subjects`, `units`,
  `topics`; `map_x`/`map_y` en `subjects` (nodo raíz del canvas de materia).
- `services/crudService.js`: `listByParents` (consulta con `IN`), `savePosition`
  (update silencioso), `clearPositions` ("Reordenar"), `update(..., { silent })`.
  Ahora emite el aviso de cambios después de crear / actualizar / borrar.
- `services/dataEvents.js` (**nuevo**): aviso global `studree:data-changed`.
- `careers/subjects/units/topics.service.js`: aceptan `uses_prerequisites` / posición
  inicial. Solo mandan esas columnas cuando hace falta, así crear sigue funcionando sin la 0002.

#### Canvas de carrera (`career-map.md`)
- Nodos arrastrables con posición guardada. Al primer arrastre se "congela" el layout
  entero; **⟲ Reordenar** vuelve al automático.
- Crear materias desde el lienzo: **＋ Materia**, doble click o click derecho en el fondo,
  y **＋** al costado de cada nodo (si hay correlativas, la nueva nace requiriendo a esa).
- Correlativas: unir los puntos de dos nodos → elegir "para cursar / para rendir"
  (`PrerequisiteKindDialog.jsx`, **nuevo**). Click en una flecha → quitarla.
- Interruptor **"Usa correlativas"** en el header. Apagado: sin flechas, sin bloqueos, sin
  🔗, layout en grilla.
- Canvas de alto completo, visible aunque esté vacío ("Agregar primera materia").
- `SubjectNode.jsx` rediseñado: ícono con color, puntos de conexión visibles, acciones al hover.

#### Canvas de materia (`subject-map.md`)
- La **materia es el nodo raíz**, con unidades y temas colgando (como el diseño de referencia).
- Sin formularios: **＋** en la raíz → unidad, **＋** en una unidad → tema, doble click /
  click derecho → unidad en ese punto. Arrastrable + Reordenar.
- Nuevos: `SubjectRootNode.jsx`, `hooks/useFlowCanvas.js`, `lib/graph/canvasPositions.js`,
  `components/ui/PromptDialog.jsx`.

#### Panel de carreras (`careers.md`, **nuevo doc**)
- Tarjetas grandes con color, inicial, tipo (con correlativas / curso), cantidad de materias
  y barra de progreso; métricas arriba; tarjeta "+ Nueva carrera".
- `CareerCard.jsx` y `CareerFormModal.jsx` (**nuevos**): crear / editar nombre, color y tipo.
- `useCareers`: estadísticas por carrera con una sola consulta de materias; `updateCareer`.

### Fixed
- **Borrados sin confirmación**: carreras, materias, unidades, temas, hojas y correlativas
  ahora piden confirmación (`ConfirmDialog` existía pero no se usaba). `Supr` ya no "borra"
  nodos solo en pantalla.
- **El explorador no se refrescaba** al crear o borrar desde un canvas: ahora escucha
  `studree:data-changed`.
- **Consultas N+1**: el explorador pasó a 5 consultas en total; el canvas de materia y el
  export, a 3. Antes era una consulta por cada carrera / materia / unidad / tema.
- **Bundle de 1,2 MB**: las páginas con canvas, el editor y el perfil se cargan con
  `React.lazy`. Bundle inicial: **432 KB** (126 KB gzip). El editor TipTap queda en su propio
  chunk de 520 KB, que solo se descarga al abrir una hoja.
- Mensaje de "falta migración" genérico (antes nombraba solo la 0001).
- Se eliminó la carpeta vacía `scr/` de la raíz.

### Documentación
- `docs/02-architecture.md`: ADR-012 (reemplaza a ADR-008) y ADR-013; estructura y rutas.
- `docs/DB_SCHEMA.md`, `docs/API_DOCS.md`, `docs/01-project-overview.md` (Fase 8),
  `docs/features/career-map.md`, `subject-map.md`, `navigation-shell.md`, `careers.md` (**nuevo**).
- `folders-and-subjects.md`, `concept-map.md` y `resources.md` marcados como **OBSOLETOS**.
- `CLAUDE.md`: reglas de la Fase 7 actualizadas (layout híbrido, correlativas opcionales) y
  tabla de lookup.

### Verificación (Mandamiento X)
- `npm run lint`: sin errores. `npm run build`: compila.
- Funciones de layout probadas con Node (grilla, lugar libre, dagre con nodo raíz).
- Vite transforma sin errores todos los módulos nuevos y modificados.
- ⚠️ **Sin verificación visual en el navegador**: la extensión de Chrome no estaba conectada.
  Falta probar a mano arrastrar, doble click, conectar nodos y "Reordenar" contra Supabase
  con la 0002 aplicada.

### Request original
> Vas a completar el plan y corregir los bugs. si quiero mover los nodos a mano y que la
> posicion quede guardada y las carreras no tienen que ser un canvas de nodos. pero podrias
> estar de otra forma mas facil de ver que como estan ahora, no se ven importantes. tambien
> tienes que poner la opcion de ser o no correlativa la carrera, porq no todas son carreras.

---

## [0.9.3] — 2026-09-28

### Added — Export `.zip` con estructura de carpetas (Método AInnovate · FASE 7.6, cierre)

Completa lo que había quedado pendiente a propósito en la v0.9.0: la prioridad 2 de
`docs/features/markdown-export.md`, un `.zip` con la jerarquía como carpetas y frontmatter
YAML por hoja, para importar a Obsidian o similar.

- `npm install jszip` — se carga con **`import()` dinámico** desde `ExportDialog`, así que
  no entra en el bundle inicial de quien nunca exporta a `.zip` (queda en su propio chunk,
  verificado en el build: `jszip.min-*.js`, ~30 KB gzip).
- `src/lib/export/frontmatter.js` (**nuevo**) — `buildFrontmatter({ subjectName, unitName,
  topicName, date })`, a mano (4 campos, no justifica sumar `js-yaml`).
- `src/lib/export/toZip.js` (**nuevo**) — `subjectTreeToZip(JSZip, subject)` /
  `careerTreeToZip(JSZip, career)`. Nombres de carpeta/archivo sanitizados
  (`/ \ : * ? " < > |` → `-`); las unidades se prefijan `01 - `, `02 - `… según su posición
  en la lista ya ordenada (no el `position` crudo de la base, así no importa si tiene
  huecos).
- `src/lib/export/download.js` — `buildExportFilename` ahora recibe la extensión
  (`md`/`zip`); se separó `downloadBlob` de `downloadTextFile` para reutilizar la descarga
  con el `Blob` que arma `jszip`.
- `src/hooks/useExportTree.js` — cada hoja trae también `updated_at`, que es el campo
  `fecha` del frontmatter.
- `src/components/features/export/ExportDialog.jsx` — nuevo selector de **formato**
  (`.md` / `.zip`) además del de alcance.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (442 módulos, ~7,2 s); `jszip` aparece como chunk separado, no
  en el bundle principal.
- ⚠️ Sin verificación visual en navegador: no se probó en runtime que el `.zip` generado
  abra bien en Obsidian ni que el frontmatter se lea correcto.

### Documentación
- `docs/features/markdown-export.md` — estado a "✅ Implementado", tabla de componentes y
  flujo de uso actualizados, pendiente de `.zip` tildado.
- `docs/01-project-overview.md` — Fase 7.6 marcada como ✅ Completada.

### Request original
> seguimos con el .zip

---

## [0.9.2] — 2026-09-28

### Added — Perfil de usuario (Método AInnovate · FASE 5, cierre)

Cierra la Fase 5: `/perfil` deja de ser un placeholder. Dos bloques: la cuenta actual y un
resumen del contenido cargado.

- `src/components/layout/AuthProvider.jsx` — nuevo `linkIdentity(email, password)`: usa
  `supabase.auth.updateUser({ email, password })` para convertir la sesión **anónima**
  actual en una cuenta permanente sin perder nada (`user_id` no cambia). Responde
  `needsConfirmation` cuando el proyecto de Supabase exige confirmar el email antes de que
  el cambio quede firme.
- `src/hooks/useAuth.js` — `linkIdentity` documentado en el contrato de `useAuth()`.
- `src/pages/ProfilePage.jsx` (reescrito) — card de cuenta: email si la sesión es normal,
  o aviso + formulario de vinculación si es anónima (con el riesgo de perder los datos
  explicado, ver `docs/features/profile.md`); card de resumen: cantidad de carreras,
  materias y hojas, calculada a partir del árbol de `useExplorerTree` (se reutiliza el
  mismo hook del explorador, sin services ni consultas nuevas).
- `docs/features/profile.md` (**nuevo**).

**Deliberadamente fuera de esta entrega:** cambiar contraseña, borrar cuenta, preferencias
visuales — no hay pedido ni caso de uso todavía (Mandamiento I), quedan anotados como
pendiente en el doc de la feature.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (436 módulos, ~6,5 s).
- ⚠️ Sin verificación visual en navegador: en particular, el flujo de vincular una cuenta
  anónima (con y sin confirmación de email activada en el proyecto de Supabase) no se
  probó en runtime.

### Documentación
- `docs/features/profile.md` (**nuevo**).
- `docs/01-project-overview.md` — Fase 5 marcada como ✅ Completada.
- `CLAUDE.md` — nueva fila en la tabla de lookup para `ProfilePage`/`AuthProvider`/`useAuth`.

### Request original
> dale crea el prefil de usuario.

---

## [0.9.1] — 2026-09-28

### Added — Buscador de contenido en el Command Palette (Método AInnovate · FASE 5)

El Command Palette (`Ctrl+K`) ya buscaba por nombre; ahora también busca **dentro del
texto de las hojas** (`content_md`), completando el pendiente "buscador de contenido" de
la Fase 5. Se extendió el palette existente en vez de crear una pantalla nueva, para no
duplicar el punto de entrada de navegación (decisión tomada con el usuario).

- `src/hooks/useExplorerTree.js` — cada `SearchEntry` de tipo `sheet` ahora incluye
  `content: sheet.content_md`. El árbol ya se cargaba entero de una sola vez, así que no
  agrega ninguna consulta nueva.
- `src/lib/search/snippet.js` (**nuevo**, `buildContentSnippet`) — función pura: busca la
  query (substring simple, case-insensitive, no fuzzy) dentro del contenido, limpia la
  sintaxis Markdown más obvia y devuelve ~100 caracteres de contexto alrededor del match.
- `src/components/features/commandPalette/CommandPalette.jsx` — si la query no matchea
  ningún nombre, se prueba contra el contenido de las hojas. Un match por nombre siempre
  rankea mejor que uno por contenido; cuando el resultado viene por contenido, la fila
  muestra el fragmento encontrado en vez de la ruta jerárquica.

Sigue siendo búsqueda de texto plano en cliente — sin full-text search de Postgres ni
RAG/semántica (fuera de alcance, ver `docs/DB_SCHEMA.md` § "Preparado para IA").

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (436 módulos, ~23,5 s).
- ⚠️ Sin verificación visual en navegador: no se probó en runtime que el snippet se vea
  bien con hojas reales (Markdown con listas, código, etc.).

### Documentación
- `docs/features/navigation-shell.md` — nueva sección "Buscador de contenido (Fase 5)".
- `docs/01-project-overview.md` — Fase 5: buscador de contenido marcado como hecho.
- `CLAUDE.md` — tabla de lookup: `lib/search/**` apunta a `navigation-shell.md`.

### Request original
> continua con la siguiente fase
> (aclarado por el usuario: extender el Command Palette existente para que busque también
> dentro del contenido de las hojas, en vez de armar una pantalla de búsqueda dedicada)

---

## [0.9.0] — 2026-09-23

### Added — Export a Markdown único (Método AInnovate · FASE 7.6, parcial)

Implementa la prioridad 1 de `docs/features/markdown-export.md`: exportar una materia o
una carrera completa a un solo `.md` con la jerarquía como headings. El `.zip` (prioridad
2) queda para después, según lo pedido.

- `src/hooks/useExportTree.js` (**nuevo**) — trae el árbol con `content_md` de cada hoja
  vía los services existentes (`loadSubjectTree(subjectId)` / `loadCareerTree(careerId)`).
  Vive aparte de `useSubjectMap`/`useExplorerTree` porque necesita el contenido completo,
  no solo nombres o conteos.
- `src/lib/export/toSingleMarkdown.js` (**nuevo**) — funciones puras
  `subjectTreeToMarkdown` / `careerTreeToMarkdown`: arman el string con los headings por
  nivel (`#`/`##`/`###`/`####`) tal como define el doc de la feature. No convierten nada:
  `content_md` ya es Markdown (ADR-011).
- `src/lib/export/download.js` (**nuevo**) — `buildExportFilename(name)` (formato
  `studree-<nombre>-<AAAA-MM-DD>.md`) y `downloadTextFile(filename, content)` (Blob +
  `URL.createObjectURL`, sin endpoint).
- `src/components/features/export/ExportDialog.jsx` (**nuevo**) — modal de export. Si se
  abre desde una materia, deja elegir alcance (esta materia / toda la carrera); desde una
  carrera el alcance es siempre "toda la carrera". Por ahora solo ofrece `.md`.
- `src/pages/CareerMapPage.jsx`, `src/pages/SubjectMapPage.jsx` — botón "Exportar" en el
  header que abre el diálogo.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (435 módulos, ~12,8 s).
- ⚠️ Sin verificación visual en navegador (misma limitación de fases anteriores del
  rediseño): el flujo completo (abrir diálogo, elegir alcance, descargar y abrir el
  `.md` generado) no se probó en runtime.

### Documentación
- `docs/features/markdown-export.md` — estado a "🟡 Parcialmente implementado", tabla de
  componentes actualizada con lo que existe vs. lo pendiente (`.zip`, `frontmatter.js`).
- `docs/01-project-overview.md` — Fase 7.6 marcada como parcial (`.md` ✅, `.zip` pendiente).

### Request original
> deja el .zip para despues y arranca de inmediato con la fase 7.6

---

## [0.8.0] — 2026-09-14

### Changed — Refactor: hook `useEntityById` + limpieza

- `src/hooks/useEntityById.js` (**nuevo**) — extrae el patrón (`useState` +
  `useEffect` + guarda de `cancelled`) que `CareerMapPage` y `SubjectMapPage`
  repetían línea por línea para traer la carrera/materia dueña de la página.
- `src/pages/CareerMapPage.jsx`, `src/pages/SubjectMapPage.jsx` — usan el hook
  nuevo en vez de su propia carga manual.
- Se borra `tmp-smoke.mjs`, script de prueba manual contra Supabase que ya
  había cumplido su función (nunca estuvo trackeado en git).

### Added — Renombrar desde el explorador

- `src/hooks/useExplorerTree.js` — nueva acción `renameEntity(type, id, name, node)`:
  elige el service correcto por tipo (careers/subjects/units/topics/sheets),
  usa `title` para hojas y `name` para el resto, y recarga el árbol al
  terminar.
- `src/components/features/explorer/ExplorerItem.jsx` — modo edición in-line
  por botón ✏️ (visible al hover). `Enter`/blur confirma, `Escape` cancela.
- `docs/features/navigation-shell.md` — se tilda el pendiente "Renombrar en
  línea desde el explorador".

### Changed — Documentación: README actualizado

- `README.md` — se conserva la visión/problemática/filosofía; se reemplaza el
  stack (decía HTML/CSS/JS/Python, no mencionaba React ni Supabase) y el
  estado del proyecto (decía "en fase de diseño"). Se agrega una sección de
  instalación real (clonar, `npm install`, variables de entorno, migración
  SQL, `npm run dev`) y un resumen del estado técnico actual (qué funciona
  hoy vs. qué queda pendiente).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila sin errores.

### Request original
> Bloque 1 Refactorización [...] Bloque 2 Desarrollo [...] Bloque 3 Documentación.
> Actualizar el archivo README.md del repositorio indicando los pasos para usar el
> proyecto y su estado técnico actual.

---

## [0.7.3] — 2026-09-09

### Added — Editor de hojas: TipTap con Markdown como fuente de verdad (Método AInnovate · FASE 7.5)

**Nota de versión:** TipTap se instaló en **v3** (`3.31.3`), no v2 como decía el doc
original (escrito antes de que saliera v3). Se verificó que `tiptap-markdown@0.9.0`
declara soporte explícito para `@tiptap/core ^3.0.1` antes de seguir. Cambio relevante de
v3: `starter-kit` ahora **incluye `Link`** (antes había que instalarlo aparte) — se
instaló igual por las dudas y se desinstaló al confirmar que duplicaba la extensión.
`TaskList`/`TaskItem` siguen sin venir en `starter-kit`, esos sí son dependencias nuevas
reales.

**Conversión (aislada, ADR-011)**
- `src/lib/markdown/parse.js`, `serialize.js` — el contrato Markdown↔TipTap vive acá. La
  conversión real la hace la extensión `Markdown` de `tiptap-markdown`; estos módulos
  existen para que nada fuera de `lib/markdown/` dependa de ESE detalle (cambiar de
  librería de edición el día de mañana solo toca estos dos archivos).

**Editor**
- `src/components/features/sheetEditor/SheetEditor.jsx` — instancia de TipTap.
  Extensiones: `starter-kit` (Bold/Italic/Strike/Code/CodeBlock/Heading h1-h4/
  BulletList/OrderedList/Blockquote/HorizontalRule/Link) + `TaskList`/`TaskItem`
  (checkboxes) + `Markdown`. `onChange` entrega siempre Markdown ya serializado — quien
  usa el componente nunca ve HTML.
- `src/components/features/sheetEditor/EditorToolbar.jsx` — negrita, itálica, tachado,
  código, H1-H4, listas, checklist, cita, bloque de código, línea horizontal, enlace
  (prompt simple para la URL). Solo botones para lo que Markdown representa sin pérdida.
- `src/index.css` — estilos del contenido (`.sheet-editor .ProseMirror ...`) con los
  tokens del design system existente. No se instaló el plugin de tipografía de Tailwind
  solo para esto (Mandamiento VII: no sumar dependencias fuera de lo necesario).

**Autosave real (reemplaza el guardado manual de la Fase 7.2)**
- `src/hooks/useSheet.js` — el contenido se escribe en la cache local
  (`studree:cache:sheet:<id>`) de forma síncrona en cada cambio, y a Supabase con
  **debounce de ~800ms**. Al cargar una hoja, si hay un borrador local distinto al del
  servidor, gana el borrador (red de seguridad ante un cierre accidental). El título se
  guarda al perder el foco, no en cada tecla. Expone `syncStatus`
  (`idle/saving/saved/error`), visible en `SheetPage.jsx`.
- `src/pages/SheetPage.jsx` — reemplaza el `<textarea>` puente por `SheetEditor` +
  `EditorToolbar`. Usa `key={sheet.id}` para remontar el editor al cambiar de hoja: el
  `content` de TipTap solo se lee al montar, no se re-sincroniza solo.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (430 módulos, ~7,4 s). El bundle creció bastante (TipTap +
  ProseMirror), Vite avisa por tamaño de chunk — no es un error; code-splitting queda
  como optimización futura, no se actúa sobre esto ahora.
- ⚠️ Sin verificación visual en navegador (misma limitación de las fases 7.2-7.4). Este
  editor en particular es el que más se beneficia de una prueba manual real: el
  round-trip Markdown↔TipTap (sobre todo TaskList) no se verificó en runtime.

### Documentación
- `docs/features/sheet-editor.md` — estado a "✅ Implementado" + nota de la versión de
  TipTap (v3, no v2) y de dependencias.
- `docs/01-project-overview.md`, `docs/02-architecture.md` — TipTap v3 en las tablas de
  stack; Fase 7.5 marcada como completada.
- `docs/features/navigation-shell.md` — nota actualizada (`SheetPage` ya no es puente).

### Request original
> genial, sigue con la siguiente fase.

---

## [0.7.2] — 2026-09-09

### Changed — Correlativas opcionales, visible en la UI (no solo en los docs)

El usuario recordó que la decisión de "correlativas opcionales" (registrada en la
v0.6.2, doc-only) tenía que notarse también en la app, no quedar solo escrita.

- `src/pages/CareerMapPage.jsx` — si la carrera no tiene ninguna correlativa cargada, se
  muestra una nota debajo del canvas aclarando que es opcional y que la carrera funciona
  igual como organizador simple (sirve para cursos/capacitaciones sin requisitos).

### Added — Canvas de materia: unidades → temas + panel de hojas (Método AInnovate · FASE 7.4)

**Datos**
- `src/services/sheets.service.js` — `countByTopics(topicIds)`: cuenta hojas por tema en
  una sola consulta trayendo solo `id, topic_id` (nunca `content_md`), para el badge del
  canvas sin arrastrar todas las hojas de la materia (restricción explícita del doc).
- `src/hooks/useSubjectMap.js` — unidades + temas (con conteo de hojas) de una materia,
  con alta/borrado de unidad y de tema. **Reemplaza** a `useUnits.js`/`useTopics.js` de la
  Fase 7.2 (se borraron: quedaban sin otro uso y la arquitectura documentada solo preveía
  `useSubjectMap`, no un hook por tabla).
- `src/lib/graph/dagreLayout.js` — `computeSubjectMapLayout()`: layout `TB` de
  Unidad→Tema. Al ser un árbol ya es un DAG por construcción, no hace falta validar
  ciclos acá (a diferencia del canvas de carrera).

**Canvas (React Flow)**
- `src/components/features/subjectMap/SubjectMap.jsx` — lienzo: unidades arriba, temas
  debajo, posiciones siempre de dagre (ADR-008).
- `UnitNode.jsx` (nombre + nº de temas), `TopicNode.jsx` (nombre + nº de hojas; click abre
  el panel lateral — **el canvas no baja a hoja**, decisión de diseño, no límite temporal).
- `src/components/features/sheets/SheetListPanel.jsx` + `SheetListItem.jsx` — panel de
  hojas del tema elegido. Reutiliza `Drawer.jsx` (ya existía, de la Fase 4) y
  `useSheets.js` (ya existía, de la Fase 7.2) tal cual — **cero piezas de datos nuevas**
  acá, solo la UI que faltaba. "Nueva hoja" crea vacía y abre directo en el editor.
- `src/pages/SubjectMapPage.jsx` — reemplaza las listas puente de la Fase 7.2 por el
  canvas real + el panel; se mantienen los formularios de alta de unidad/tema arriba.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (297 módulos, ~4 s).
- ⚠️ Sin verificación visual en navegador (misma limitación de las fases 7.2/7.3).

### Documentación
- `docs/features/subject-map.md` — estado a "✅ Implementado".
- `docs/features/navigation-shell.md` — nota actualizada (ya no dice que
  `SubjectMapPage` es puente).
- `docs/01-project-overview.md` — Fase 7.4 marcada como completada.

### Request original
> genial todo anda biem, recuerda de poner que sea opcional que una carrera sea con
> correlativas, y avanza a la siguiente fase

---

## [0.7.1] — 2026-09-09

### Added — Canvas de carrera: materias + correlativas (Método AInnovate · FASE 7.3)

**Layout**
- `src/lib/graph/dagreLayout.js` — posiciones calculadas siempre con dagre a partir del
  grafo de correlativas (ADR-008), nunca persistidas. **Solo entran al grafo las
  correlativas de tipo `cursar`**: mezclar `cursar` y `rendir` en un mismo grafo de layout
  podría cerrar un ciclo que la validación no detecta (se valida cada tipo por separado),
  y dagre entra en bucle infinito con un grafo circular (ADR-009). Las de `rendir` se
  dibujan igual como arista punteada, solo no mueven el layout.

**Datos**
- `src/hooks/useCareerMap.js` — materias + correlativas de una carrera, con alta/borrado
  de materia, cambio de estado declarado y alta/borrado de correlativa.

**Canvas (React Flow)**
- `src/components/features/careerMap/CareerMap.jsx` — lienzo: nodos = materias
  (posición de dagre), aristas = correlativas (sólida `cursar`, punteada `rendir`).
  `nodesDraggable={false}` a propósito (ADR-008: el usuario no puede reacomodar nodos).
- `src/components/features/careerMap/SubjectNode.jsx` — nodo con nombre (navega a la
  materia), selector de estado (pendiente/cursando/aprobada — quedaba pendiente de la
  Fase 7.2), candado + motivo si está bloqueada, y acceso a "Correlativas".
- `src/components/features/careerMap/PrerequisiteEditor.jsx` — modal para agregar
  correlativas (elegir materia + tipo `cursar`/`rendir`) y ver/quitar las existentes. Si
  el alta cerraría un ciclo, `prerequisites.service.js` la rechaza y el modal muestra el
  ciclo concreto (ADR-009); no hace falta lógica nueva acá, ya existía.
- `src/pages/CareerMapPage.jsx` — reemplaza la lista puente de la Fase 7.1→7.2 por el
  canvas real + el modal de correlativas.

**Dependencia nueva**
- `@dagrejs/dagre` (ya estaba prevista en `docs/01-project-overview.md` y
  `docs/features/career-map.md` desde la Fase 7.0).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (293 módulos, ~4 s). Aviso de Vite por tamaño de chunk
  (React Flow pesa) — no es un error, queda como posible optimización futura
  (code-splitting), no se actúa sobre esto ahora.
- ⚠️ Sin verificación visual en navegador (misma limitación que la Fase 7.2: esta máquina
  no tiene Chromium headless instalado).

### Documentación
- `docs/features/career-map.md` — estado a "✅ Implementado".
- `docs/01-project-overview.md` — Fase 7.3 marcada como completada.

### Request original
> genial, anda todo excelente, sigue con la siguiente fase.

---

## [0.7.0] — 2026-09-09

### Added — Shell de navegación: explorador + tabs + command palette (Método AInnovate · FASE 7.2)

**Datos (nuevos hooks, mismo patrón que `useCareers`/`useSubjects`)**
- `src/hooks/useUnits.js`, `useTopics.js`, `useSheets.js` — CRUD (crear/renombrar/borrar)
  de unidades, temas y hojas. `units.service.js`/`topics.service.js`/`sheets.service.js`
  ya existían de la Fase 7.1; faltaban los hooks.
- `src/hooks/useSheet.js` — carga y guarda **una** hoja puntual. Guardado **manual**
  (sin debounce ni TipTap todavía — eso es la Fase 7.5), pero ya expone `syncStatus`
  (`idle/saving/saved/error`) para no romper el contrato cuando llegue el autosave real.
- `src/hooks/useExplorerTree.js` — árbol completo Carrera→Materia→Unidad→Tema→Hoja del
  usuario + índice plano para el buscador. Se carga entero de una vez (no de a un nivel
  por click): para uso de estudio personal el volumen de filas es chico, y así el mismo
  árbol alimenta tanto al explorador (jerárquico) como al command palette (búsqueda
  plana) sin pedir datos dos veces.
- `src/hooks/useHotkeys.js` — registro genérico de atajos (`mod+k`, `mod+b`, etc.).

**Shell**
- `src/components/layout/WorkspaceLayout.jsx` — arma el explorador, la barra de tabs, el
  command palette y los atajos globales (`Ctrl+K` abre el palette, `Ctrl+B` muestra/oculta
  el explorador). Deduce a qué carrera pertenece la materia/hoja activa recorriendo el
  árbol (las rutas `/materias/:id` y `/hojas/:id` no llevan el `careerId` en la URL), para
  resaltar y auto-expandir el nodo correspondiente.
- `src/components/layout/TabBar.jsx` — tabs de las hojas abiertas; abrir una ya abierta
  activa la existente en vez de duplicar. Persisten en `studree:ui:tabs`.
- `src/components/features/explorer/` — `Explorer` (buscador local + árbol),
  `ExplorerTree` (render de los 5 niveles, profundidad fija a propósito — ADR-010, sin
  recursión genérica), `ExplorerItem` (fila con chevron/ícono/indentación). El estado de
  expandido persiste en `studree:ui:explorer`.
- `src/components/features/commandPalette/CommandPalette.jsx` — overlay `Ctrl+K` con
  matching de subsecuencia (fuzzy) hecho a mano, sin dependencias nuevas. Busca hojas,
  materias, unidades y temas; cada resultado muestra su ruta jerárquica.
- **Mobile:** el explorador no tiene panel fijo — se abre como `Drawer` (reutiliza el
  componente existente) desde un botón "☰ Explorador", colapsado por defecto. Es un
  requisito real del doc, no cosmético: en táctil el canvas no sirve para navegar, así
  que el explorador tiene que poder reemplazarlo por completo.
- `src/components/layout/AppLayout.jsx` — las rutas del workspace (`/carreras`,
  `/materias`, `/hojas`) ahora ocupan el alto completo debajo del header (sin el
  `max-w-6xl` + padding que usan las páginas simples), para que el shell tenga su propio
  scroll interno.

**Páginas puente nuevas (para que el explorador tuviera a dónde navegar)**
- `src/pages/SubjectMapPage.jsx` — unidades → temas → hojas como listas anidadas con
  CRUD real, todavía sin el canvas de React Flow (Fase 7.4).
- `src/pages/SheetPage.jsx` — título + `<textarea>` de Markdown con guardado manual,
  todavía sin TipTap (Fase 7.5). Ya persiste en `content_md` (ADR-011).
- `src/pages/CareerMapPage.jsx` — las materias ahora enlazan a su `SubjectMapPage`.

**Routing**
- `src/App.jsx` — `WorkspaceLayout` envuelve `/carreras`, `/carreras/:careerId`,
  `/materias/:subjectId` y `/hojas/:sheetId`. `/perfil` queda protegida pero **fuera**
  del shell (no es parte del workspace de estudio).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (123 módulos, ~9 s).
- ⚠️ **Sin verificación visual en navegador**: esta máquina no tiene `chromium-cli` ni
  Playwright instalados y el usuario prefirió probarlo manualmente antes que instalar un
  Chromium headless solo para la prueba. Pendiente de confirmación del usuario.

### Documentación
- `docs/features/navigation-shell.md` — estado a "✅ Implementado"; nota sobre las
  versiones puente de `subject-map.md`/`sheet-editor.md`.
- `docs/features/subject-map.md`, `docs/features/sheet-editor.md` — nota de la versión
  puente ya implementada (qué hooks ya están hechos, qué falta).
- `docs/01-project-overview.md` — Fase 7.2 marcada como completada.

### Request original
> dale termina la fase 7.2, preguntame si necesitas algo importante

---

## [0.6.2] — 2026-09-09

### Changed — Documentación: correlativas opcionales (decisión de producto)

> Solo documentación. El canvas de correlativas (Fase 7.3) todavía no está
> implementado, así que se registra la decisión antes de codearlo.

El usuario aclaró que Studree no es solo para carreras universitarias, también para
cursos y capacitaciones — para esos casos no tiene sentido forzar correlativas.

- `docs/features/career-map.md` — nueva sección **"Las correlativas son opcionales, no
  un requisito"**: cargar correlativas es una acción secundaria ("Editar correlativas"),
  nunca un paso obligatorio al crear una materia. Una carrera sin ninguna correlativa
  cargada es un caso de uso válido (modo "organizador simple"). Se aclara además el paso
  4 del flujo de uso como opcional.
- `docs/DB_SCHEMA.md` — nota junto a "Correlativas: dos tipos distintos" aclarando que
  `prerequisites` es una tabla aparte sin restricción que obligue a tener correlativas;
  una materia sin filas ahí es un caso normal, no un estado incompleto.

No se tocó el esquema SQL ni ningún service: `prerequisites` ya era una tabla opcional
por diseño (sin `NOT NULL` que la fuerce), así que esto es dejar explícito en los docs
un comportamiento que la base ya soportaba, para que la Fase 7.3 se implemente bien
desde el arranque.

### Request original
> me gustaria cambiar lo de que las materias sean correlativas, ya que este proyecto no
> es solo para la universidad sino para cursos y demas, puede servir solo para guardar
> informacion.

---

## [0.6.1] — 2026-08-24

### Added — Sesión anónima (auth sin login)

El usuario pidió no tener que autenticarse con nada por ahora. Como las políticas RLS son
`to authenticated`, sin sesión no funciona nada — así que se usa **Supabase Anonymous
Sign-ins**: la app pide una sesión sola al arrancar, sin email ni contraseña.

Es una sesión **real**: `auth.uid()` devuelve un ID válido y el rol del JWT es
`authenticated`, así que **las políticas RLS del esquema aplican sin modificar una sola
línea de SQL** (verificado, ver abajo).

- `src/components/layout/AuthProvider.jsx` — si no hay sesión, intenta
  `signInAnonymously()` antes de mandar al login. Si el proyecto tiene la opción
  desactivada, falla en silencio y cae al login con email: no rompe nada.
- Se expone `isAnonymous` en el contexto de auth.
- `src/components/layout/Header.jsx` — **se oculta el botón "Salir" en sesión anónima**:
  no hay credencial con la que volver a entrar, así que cerrar sesión dejaría los datos
  inaccesibles para siempre. Era una pérdida de datos a un click.

### Limitación conocida
Los datos de una sesión anónima quedan atados al navegador. Limpiar los datos del sitio o
abrir la app en otro navegador da un usuario anónimo nuevo; las filas anteriores quedan
huérfanas (no borradas, pero inaccesibles). Antes de un uso real conviene convertir la
cuenta anónima agregándole email y contraseña — `LoginPage` ya existe para eso.

### Verificación (Mandamiento X) — 28/28 contra la base real

| Bloque | Verificado |
|--------|-----------|
| Esquema | Las 6 tablas existen y se consultan |
| RLS | `INSERT` sin sesión rechazado (Postgres `42501`) |
| Sesión anónima | Se obtiene sin credenciales; `is_anonymous=true`; rol `authenticated` |
| `default auth.uid()` | El cliente no manda `user_id` y Postgres lo completa correcto |
| CHECKs | Rechazan `status` inválido, autocorrelativa, `kind` inválido y nombre vacío |
| Ciclos (ADR-009) | Se detecta y **rechaza antes de escribir**: `Algebra → Analisis II → Analisis I → Algebra`; se confirma que la fila no llegó a la base |
| `UNIQUE` | Correlativa duplicada rechazada |
| Estado derivado | Con datos reales: `Algebra` aprobada, `Analisis I` pendiente, `Analisis II` **bloqueada por Analisis I** |
| Jerarquía | Alta de Unidad → Tema → Hoja; Markdown se guarda intacto |
| Trigger | `updated_at` se actualiza solo en cada `UPDATE` |
| Cascada | Borrar la carrera arrasa materias, unidades, temas, hojas y correlativas |
| **Aislamiento** | **Un usuario NO ve las carreras de otro** (dos sesiones anónimas simultáneas) |

- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (98 módulos, ~3,3 s).
- Smoke test HTTP sobre el build: `/` → 200, `/logo.jpg` → 200.
- Todos los datos de prueba se eliminaron al terminar (quedan 0 carreras).

### Request original
> no podes desactivar el OAuth, por ahora no me quiero logear a nada

---

## [0.6.0] — 2026-08-24

### Added — Modelo de datos, validación de ciclos y auth (Método AInnovate · FASE 7.1)

**Lógica pura (verificada con 26 casos)**
- `src/lib/graph/validateDag.js` — `wouldCreateCycle()` (rechaza correlativas que cierren
  un ciclo, ADR-009), `findCycle()` (DFS de 3 colores como red de seguridad) y
  `formatCycle()` (traduce el ciclo a nombres legibles). **DFS iterativa**, no recursiva:
  verificada con una cadena de 500 materias sin desbordar la pila.
- `src/lib/graph/subjectStatus.js` — `computeSubjectStates()` deriva `bloqueada` (nunca se
  persiste), `describeBlockReason()` dice **qué materias faltan** y
  `computeCareerProgress()`.

**Modelo y constantes**
- `src/types/models.js` — **reescrito**: Career, Subject, Prerequisite, Unit, Topic, Sheet,
  `ServiceResult`, `SyncStatus`. Corrige la desincronización que tenía con `DB_SCHEMA.md`.
- `src/constants/subjectStatus.js`, `src/constants/prerequisiteKinds.js` — nuevos.
- `src/constants/storageKeys.js` — reescrito: prefijo de cache + preferencias de UI.
- `src/lib/id.js` — ahora genera **UUID v4**. El formato corto anterior
  (`timestamp-random`) no era un UUID válido y Postgres lo habría rechazado.

**Capa de datos (Supabase + cache optimista, ADR-007)**
- `src/services/cache.service.js` — reemplaza a `storage.service.js`. Incluye
  `clearAllCache()`, que se ejecuta al cerrar sesión para que la cache de un usuario no
  quede visible para el siguiente en el mismo navegador.
- `src/services/crudService.js` — **fábrica** con el ciclo optimista (escribe en cache →
  manda a Supabase → revierte si falla) y `translateError()`. Evita repetir esa lógica
  seis veces.
- `careers` · `subjects` · `units` · `topics` · `sheets` · `prerequisites``.service.js`.
  `prerequisites` es el único con lógica propia: valida el DAG **antes** de escribir y
  devuelve el ciclo concreto en el mensaje de error.

**Autenticación (email + contraseña; sin OAuth por decisión del usuario)**
- `src/hooks/useAuth.js` + `src/components/layout/AuthProvider.jsx` — separados en dos
  archivos para no romper Fast Refresh (`react-refresh/only-export-components`).
- `src/components/layout/RequireAuth.jsx` — guard de rutas.
- `src/pages/LoginPage.jsx` — entrar / crear cuenta, con errores traducidos.
- Se eligió contraseña sobre magic link porque el SMTP por defecto de Supabase está
  limitado a pocos mails por hora, lo que haría muy incómodo el desarrollo.

**Workspace (base)**
- `src/pages/CareersPage.jsx` + `src/hooks/useCareers.js` — alta, listado y borrado de
  carreras.

### Removed — Capa de datos y UI del modelo viejo

Al reemplazar `subjects.service.js` las dos capas no podían convivir bajo el mismo nombre.
Se retiraron 23 archivos que operaban sobre el modelo abandonado (`Folder → Subject →
TreeNode → Resource` en localStorage): services `folders`/`nodes`/`resources`/`storage`,
hooks `useFolders`/`useSubjects`/`useConceptMap`/`useResources`, páginas `FoldersPage`/
`FolderPage`/`SubjectMapPage`, los componentes de `folders`/`subjects`/`conceptMap`/
`resources`, `lib/treeLayout.js` (jubilado por ADR-008) y `constants/resourceTypes.js`.

> Recuperables desde git si hiciera falta consultarlos.

### Changed
- `src/constants/routes.js` — rutas nuevas (`/entrar`, `/carreras`, `/hojas/:sheetId`);
  se retiran `/carpetas`.
- `src/App.jsx`, `src/main.jsx`, `src/components/layout/Header.jsx`,
  `src/pages/HomePage.jsx` — rewiring a las rutas nuevas + estado de sesión en el header.
- `docs/02-architecture.md`, `docs/API_DOCS.md`, `docs/DB_SCHEMA.md` — estructura, ruta
  `/entrar`, rutas protegidas, fábrica CRUD y esquema de claves de cache.

### Verificación (Mandamiento X)
- **26/26 casos** de la lógica de grafos en verde (ciclos directos, cadenas, diamantes,
  componentes desconectados, correlativas huérfanas, `rendir` que no bloquea, cadena de
  500 nodos).
- Conexión a Supabase verificada: URL y `anon key` válidas (la API responde).
- `npm run lint` — sin errores **ni warnings**.
- `npm run build` — compila (98 módulos, ~2,8 s).
- ⚠️ **Sin verificación end-to-end**: las tablas todavía no existen en la base.

### Bloqueante para el usuario
Falta aplicar `supabase/migrations/0001_init.sql` desde **Supabase Dashboard → SQL
Editor**. Hasta entonces las 6 tablas no existen y cualquier consulta falla. La `anon key`
no puede crear tablas por diseño, así que este paso es manual.

### Request original
> puedes seguir, ya tienes acceso a mi base de datos en supabase

---

## [0.5.1] — 2026-08-24

### Fixed — El logo no cargaba en el header (Método AInnovate · FASE 7.2, parcial)

**Causa real** (no era una ruta mal escrita):
1. `src/components/layout/Header.jsx` tenía el emoji 🌳 **escrito literal en el JSX** —
   el logo nunca se referenciaba desde ningún lado.
2. **No existía la carpeta `public/`**, así que Vite no tenía de dónde servir el archivo.
3. El logo real estaba en `assets/Logo.jpg`, en la raíz del repo: una ruta que Vite
   **no sirve** ni copia al build.

**Solución**
- `public/logo.jpg` (**nuevo**) — versión optimizada del logo: recorte cuadrado que quita
  el margen sobrante y reescalado a 256 px. **De 5,3 MB (6250×6250) a 7,7 KB**, ~99,9 %
  menos. Se descartó PNG (66 KB para el mismo tamaño): la imagen no necesita
  transparencia, así que JPEG es el formato correcto.
- `src/components/layout/Header.jsx` — el emoji se reemplaza por `<img src="/logo.jpg">`
  de 28 px (32 px en `sm:`), con `rounded-lg` porque el JPEG tiene fondo opaco propio y
  sobre el fondo oscuro funciona como *app icon*, no como imagen recortada.
  Lleva `width`/`height` explícitos para reservar el espacio y evitar *layout shift*, y
  `alt=""` por ser decorativo (el nombre "Studree" ya está en texto al lado).
- `index.html` — se descomenta el `<link rel="icon">`, que ya apuntaba a `/logo.jpg`.

**Nota:** `assets/Logo.jpg` se deja intacto como archivo fuente de alta resolución.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (235 módulos, ~2,7 s) y copia `dist/logo.jpg`.
- **Runtime verificado**: `npm run preview` + petición HTTP a `/logo.jpg` →
  `200 · image/jpeg · 7875 bytes`.

### Request original
> El logo no está carga (se ve un emoji de placeholder en el header) [...] revisar que el
> archivo esté en `/public`

---

## [0.5.0] — 2026-08-24

### Added — Documentación del rediseño de navegación (Método AInnovate · FASE 7.0)

> **Solo documentación. No se tocó una línea de código de la app** ni se instalaron
> dependencias. Es la fase "documentar primero" del método, previa a implementar.

**ADRs nuevos (`docs/02-architecture.md`)**
- **ADR-007** — Supabase como fuente de verdad; `localStorage` pasa a ser cache optimista.
  *Reemplaza a ADR-003.*
- **ADR-008** — Auto-layout con dagre; **las coordenadas `x`/`y` no se persisten**.
  *Reemplaza a ADR-006.*
- **ADR-009** — Validación de ciclos (DAG) **al guardar**, no al renderizar.
- **ADR-010** — Jerarquía fija de 5 niveles con entidades explícitas
  (Carrera → Materia → Unidad → Tema → Hoja).
- **ADR-011** — TipTap como editor, **Markdown como fuente de verdad** del contenido.

**Docs de features nuevos**
- `docs/features/navigation-shell.md` — explorador tipo VSCode, tabs y command palette (`Ctrl+K`).
- `docs/features/career-map.md` — canvas de materias + correlativas (`cursar` / `rendir`), estados y bloqueo.
- `docs/features/subject-map.md` — canvas de unidades → temas + panel lateral de hojas.
- `docs/features/sheet-editor.md` — editor TipTap con persistencia en Markdown.
- `docs/features/markdown-export.md` — export a `.md` único (prioridad 1) y a `.zip` (prioridad 2).

### Changed
- `docs/DB_SCHEMA.md` — **reescrito**: modelo nuevo de 5 tablas + `prerequisites` con
  `kind` (`cursar`/`rendir`), SQL completo de Supabase con `ON DELETE CASCADE`, estado
  `bloqueada` como valor **derivado** (no persistido) y claves de cache nuevas.
- `docs/API_DOCS.md` — reescrita la capa de acceso a datos: services contra Supabase,
  contrato común, flujo optimista y normalización de errores.
- `docs/01-project-overview.md` — stack actualizado (Supabase, dagre, TipTap) y Fase 7
  con sus 7 sub-fases.
- `docs/02-architecture.md` — estructura de carpetas, flujo de datos (cache → Supabase),
  tabla de rutas nueva (`/carreras`, `/hojas/:sheetId`) y sección del shell.
- `docs/features/concept-map.md` — marcado como **reemplazado** por `subject-map.md`.
- `CLAUDE.md` — tabla de lookup ampliada + bloque "Reglas del rediseño".

### Decisiones del usuario registradas
- Modelo de datos: **entidades explícitas** (no `TreeNode` con `level`).
- Datos existentes: **empezar limpio**, sin migración desde `localStorage`.
- Dependencias y carpetas: aprobadas **fase por fase**, no todas de entrada.

### Verificación (Mandamiento X)
- Sin cambios de código → no aplica `build` / `lint`.
- Revisión de consistencia entre `DB_SCHEMA.md`, `02-architecture.md` y los docs de features.

### Pendiente detectado (a resolver al implementar)
- `src/types/models.js` está **desincronizado** de `DB_SCHEMA.md` (le falta `Folder`,
  le falta `Subject.folderId`, y define `TreeNode.type` en lugar de `completed`).
  Se corrige al reescribir el modelo en la Fase 7.1.
- **El logo no carga**: `Header.jsx` tiene el emoji 🌳 escrito literal, no existe la
  carpeta `public/` y `assets/Logo.jpg` (5,3 MB) está fuera de lo que Vite sirve.
  Se arregla en la Fase 7.2.

### Request original
> Quiero rediseñar la navegación del proyecto [...] Jerarquía: Carrera → Materia →
> Unidad → Tema → Hoja [...] Proponeme el plan de archivos/componentes antes de escribir
> código.

---

## [0.4.1] — 2026-08-24

### Added — Conexión a Supabase preparada (Método AInnovate · FASE 7.1, parcial)

- `.env.local` (**no versionado**) — creado con `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY` listas para completar, con instrucciones de dónde obtenerlas.
- `.env.example` — template versionado con las mismas variables (sin valores) y la
  advertencia sobre `anon key` vs `service_role key`.
- `src/services/supabase.client.js` — instancia única del cliente de Supabase. Expone
  `supabase`, `isSupabaseConfigured` y `getSupabase()`. Si faltan las variables de
  entorno **no rompe la app**: avisa por consola y `getSupabase()` lanza un error
  explicativo.
- `supabase/migrations/0001_init.sql` — esquema inicial completo según
  `docs/DB_SCHEMA.md`: tablas `careers`, `subjects`, `prerequisites`, `units`,
  `topics`, `sheets`; cascadas `ON DELETE CASCADE`; índices; trigger de `updated_at`;
  y **RLS activado con políticas por `auth.uid()` en las 6 tablas**.
  Las columnas `user_id` llevan `default auth.uid()`, así el cliente nunca las manda
  (como exige `docs/API_DOCS.md`).
- Dependencia nueva: `@supabase/supabase-js`.

### Changed
- `docs/02-architecture.md` — tabla de Variables de Entorno ampliada con las dos
  variables de Supabase y la aclaración de que la `anon key` es pública por diseño
  (lo que protege es RLS).
- `docs/03-security.md` — nueva sección **"Supabase — claves y RLS"** (tabla
  `anon` vs `service_role`, reglas de uso, rotación de claves) y dos ítems nuevos en el
  checklist de seguridad.

### Notas
- **No se migró ningún service todavía.** La app sigue funcionando contra
  `localStorage` con el modelo viejo (`folders/subjects/nodes/resources`). La migración
  a los services nuevos es la Fase 7.1 completa.
- **Pendiente del usuario para que la conexión funcione:**
  1. Completar los valores en `.env.local`.
  2. Correr `supabase/migrations/0001_init.sql` en el SQL Editor de Supabase.
  3. **Activar Supabase Auth**: el esquema exige `auth.uid()`, sin sesión iniciada las
     políticas RLS no devuelven ni aceptan ninguna fila (ADR-007).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila sin errores.
- `.env.local` verificado como ignorado por git (`git check-ignore`).

### Request original
> Creame los datos .env para cargar las claves de supabase para que conectes la base de
> datos a este proyecto

---

## [0.4.0] — 2026-08-10

### Changed — Adaptación mobile / responsive (Método AInnovate · FASE 5, parcial)

- `src/components/layout/Header.jsx` — nav y logo con tamaños/paddings responsive
  (`px-2/py-1.5 text-xs` en mobile → `sm:px-3 text-sm`) para que quepan en pantallas
  angostas sin desbordar.
- `src/pages/FoldersPage.jsx`, `src/pages/FolderPage.jsx`, `src/pages/SubjectMapPage.jsx`
  — encabezados (título + botón de acción) pasan de una fila fija a `flex-col` en mobile
  y `sm:flex-row` en desktop, evitando que se aprieten con nombres largos.

### Fixed
- `src/components/features/folders/FolderCard.jsx`,
  `src/components/features/subjects/SubjectCard.jsx`,
  `src/components/features/conceptMap/TopicNode.jsx` — los botones de editar/eliminar
  (y las acciones del nodo del mapa) dependían de `opacity-0 group-hover:opacity-100`,
  por lo que eran invisibles e inutilizables en dispositivos táctiles (sin estado
  `:hover`). Ahora son visibles por defecto (`opacity-100`) y solo se ocultan hasta el
  hover a partir de `sm:` (desktop con mouse). Se agrandó levemente el área táctil
  (`px-1.5` → `p-1.5`).
- `docs/01-project-overview.md` — Fase 5 marcada como en progreso (responsive
  completado; buscador y perfil siguen pendientes).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (235 módulos, ~15 s).
- Verificación visual: probado en viewport mobile (DevTools responsive mode).

### Request original
> haz el A, adaptalo para mobiles

---

## [0.3.0] — 2026-06-28

### Added — Recursos por Tema (Método AInnovate · FASE 4)

- `src/components/features/resources/` — `ResourcePanel` (drawer), `ResourceItem`, `ResourceFormModal`.
- `src/components/ui/Drawer.jsx` — panel lateral genérico reutilizable.
- `src/services/resources.service.js` — CRUD de recursos + cascada por nodo.
- `src/hooks/useResources.js` — estado + acciones de los recursos de un nodo.
- `src/constants/resourceTypes.js` — tipos de recurso (nota / enlace / video / archivo).
- Recursos por tema: notas de texto y enlaces (videos, archivos como URL). **Sin subir
  binarios** (coherente con localStorage / ADR-003).

### Changed
- `src/services/nodes.service.js` — borrado en cascada de los recursos al borrar nodos.
- `src/components/features/conceptMap/TopicNode.jsx` — badge 📎 + botón para abrir recursos.
- `src/components/features/conceptMap/ConceptMap.jsx` — pasa `onOpenResources` y `resourceCounts`.
- `src/pages/SubjectMapPage.jsx` — panel de recursos por nodo + conteo por nodo.
- `docs/DB_SCHEMA.md` — `Resource` marcado como implementado + reglas de cascada.
- `docs/02-architecture.md`, `docs/features/concept-map.md`, `docs/01-project-overview.md` (Fase 4 ✅).
- Tablas de lookup de `CLAUDE.md` y `.windsurfrules`.

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (235 módulos, ~2.4 s).
- Verificación visual de runtime: pendiente (correr `npm run dev`).

### Request original
> sigue con la siguiente fase

---

## [0.2.0] — 2026-06-28

### Added — Carpetas, Materias y Mapa Conceptual (Método AInnovate · FASES 2 y 3)

> Esta entrega cubrió dos fases del roadmap en una sola iteración (a pedido): la Fase 2
> (carpetas + materias) y la Fase 3 (mapa conceptual estilo Obsidian / híbrido).

**Organización (carpetas + materias)**
- `src/pages/FoldersPage.jsx` — lista de carpetas (carreras/cursos) con alta/edición/borrado.
- `src/pages/FolderPage.jsx` — materias de una carpeta, con barra de progreso y breadcrumb.
- `src/components/features/folders/` — `FolderCard`, `FolderFormModal`.
- `src/components/features/subjects/` — `SubjectCard`, `SubjectFormModal`.
- `src/services/folders.service.js`, `subjects.service.js` — CRUD con borrado en cascada.
- `src/hooks/useFolders.js`, `useSubjects.js` — estado + acciones.

**Mapa conceptual (estilo Obsidian / híbrido)**
- `src/pages/SubjectMapPage.jsx` — lienzo del mapa + toolbar + progreso.
- `src/components/features/conceptMap/` — `ConceptMap` (React Flow), `TopicNode`, `TopicFormModal`.
- `src/services/nodes.service.js` — CRUD de temas con cascada de descendientes.
- `src/hooks/useConceptMap.js` — estado del grafo, progreso y auto-layout.
- `src/lib/treeLayout.js` — auto-layout jerárquico (híbrido con drag libre, ADR-006).

**UI base y utilidades**
- `src/components/ui/` — `Button`, `Modal`, `TextField`, `ConfirmDialog`, `EmptyState`, `ColorPicker`.
- `src/lib/id.js` — generación de IDs.
- `src/constants/palette.js` — paleta de colores; `routes.js` y `storageKeys.js` ampliados.

### Changed
- `src/App.jsx` — rutas nuevas (`/carpetas`, `/carpetas/:folderId`, `/materias/:subjectId`).
- `src/components/layout/Header.jsx` — nav: Inicio · Carpetas · Perfil.
- `src/pages/HomePage.jsx` — CTA hacia las carpetas.
- `docs/DB_SCHEMA.md` — añadido `Folder`; `Subject.folderId`; `TreeNode.completed`/`position`.
- `docs/02-architecture.md` — estructura real, ADR-006 y tabla de rutas.
- `docs/01-project-overview.md` — Fases 2 y 3 marcadas como completadas.
- Tablas de lookup de `CLAUDE.md` y `.windsurfrules`.

### Removed
- `src/pages/SubjectsPage.jsx` y `src/pages/ConceptMapPage.jsx` (placeholders del andamiaje, reemplazados).

### Verificación (Mandamiento X)
- `npm run lint` — sin errores ni warnings.
- `npm run build` — compila (228 módulos, ~2.4 s).
- Verificación visual de runtime: pendiente (correr `npm run dev`).

### Request original
> AVANZA CON LA FASE 2 [...] te agregué un ejemplo de interfaz en la carpeta design,
> quiero que se parezca a Obsidian el mapa, poder tener una carpeta por carrera/cursos
> y ahí adentro dividido en materias.

---

## [0.1.0] — 2026-06-28

### Added — Setup Inicial (Método AInnovate · FASE 1)

**Documentación base (`docs/`)**
- `docs/01-project-overview.md` — Visión, público, stack, estado, identidad visual.
- `docs/02-architecture.md` — Estructura de carpetas, sistema de estilos (Tailwind),
  flujo de datos, convenciones, tipado con JSDoc y 5 ADRs.
- `docs/03-security.md` — Seguridad para app de solo frontend, reglas sobre `VITE_*`
  y `localStorage`, checklist de deploy.
- `docs/04-deployment.md` — Placeholder de deploy (Vercel/Netlify/GitHub Pages).
- `docs/DB_SCHEMA.md` — Modelo de datos lógico en `localStorage` (Subject, TreeNode,
  Resource, Settings) con diagrama Mermaid y typedefs JSDoc.
- `docs/API_DOCS.md` — Template de API (sin backend aún; documenta los services).
- `docs/SKILLS.md` — Registro de skills y MCP servers disponibles en el entorno.

**Reglas para IA (multi-IDE)**
- `CLAUDE.md`, `.windsurfrules`, `.cursorrules`, `.clinerules`,
  `.github/copilot-instructions.md`, `.aider.conf.yml` — Mismas reglas (12 Mandamientos,
  4 Leyes, tabla de lookup) adaptadas al stack real.

**Andamiaje del proyecto (paso 1.9)**
- `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`,
  `eslint.config.js` — Configuración de React + Vite + Tailwind + ESLint.
- `index.html` + `src/` — Estructura base: `main.jsx`, `App.jsx`, `index.css`,
  `pages/`, `components/{ui,layout,features}/`, `hooks/`, `services/`, `lib/`,
  `constants/`, `types/`.
- `.env.example` — Variables de entorno (template, sin secretos).
- `.gitignore` — Ignora `node_modules`, `dist`, `.env*`, etc.

### Decisiones tomadas (ver ADRs en `docs/02-architecture.md`)
- React + Vite (ADR-001), JavaScript + JSDoc en vez de TypeScript (ADR-002),
  persistencia en `localStorage` sin backend aún (ADR-003), TailwindCSS (ADR-004),
  React Flow para árboles conceptuales (ADR-005).
- Identidad visual: modo oscuro + acento **verde** (resuelve conflicto verde/violeta
  a favor del readme).

### Verificación (Mandamiento X)
- `npm install` — 345 paquetes instalados sin errores.
- `npm run build` — compila (203 módulos, ~3 s).
- `npm run lint` — sin errores ni warnings.

### Request original
> Lee el archivo METODO_AINNOVATE.md completo y sigue las instrucciones de la FASE 1.
> La info de mi proyecto está en: readme.md.
