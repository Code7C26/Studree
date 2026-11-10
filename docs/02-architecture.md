# Arquitectura — Studree

> Documento base del Método AInnovate — **LEER SIEMPRE** antes de cualquier cambio.

## Stack Completo

| Categoría | Tecnología | Para qué |
|-----------|-----------|----------|
| UI | React 18 | Componentes de interfaz |
| Build / Dev | Vite 5 | Servidor de desarrollo y bundling |
| Lenguaje | JavaScript ES2022 + JSDoc | Tipado vía comentarios JSDoc |
| Estilos | TailwindCSS 3.4 | Utilidades + design system |
| Diagramas | React Flow (`@xyflow/react`) 12 | Árboles conceptuales interactivos |
| Auto-layout | `@dagrejs/dagre` | Posiciones de los nodos (ADR-008) |
| Routing | React Router DOM 6 | Navegación entre páginas (SPA) |
| Persistencia | **Supabase (Postgres)** | Fuente de verdad (ADR-007) |
| Cache | `localStorage` | Cache optimista de la UI (ADR-007) |
| Editor | TipTap v3 (ProseMirror) | Editor de hojas, Markdown como fuente de verdad (ADR-011) |
| Export | `jszip` | Export `.zip` con estructura de carpetas |
| Lint | ESLint | Calidad de código |

## Estructura de Carpetas

> **Estado:** Estructura generada y verificada el 2026-06-28 (`npm run build` y
> `npm run lint` sin errores). Las carpetas con `[vacío]` quedan listas para la FASE 2.

```
Studree/
├── docs/                          # Documentación (Método AInnovate)
│   ├── superpowers/               # specs/ y plans/ de las sesiones de diseño (brainstorming)
│   ├── 01-project-overview.md     # Visión, stack, estado  (LEER SIEMPRE)
│   ├── 02-architecture.md         # Este archivo            (LEER SIEMPRE)
│   ├── 03-security.md             # Seguridad, env, datos
│   ├── 04-deployment.md           # Proceso de deploy
│   ├── DB_SCHEMA.md               # Modelo de datos (localStorage)
│   ├── API_DOCS.md                # API (pendiente, sin backend aún)
│   ├── SKILLS.md                  # Skills/herramientas disponibles
│   ├── features/                  # Un .md por funcionalidad (FASE 2)
│   ├── Investigacion.md           # Investigación previa (librerías)
│   └── Investigacion #2.md        # Investigación previa (estructura visual)
├── assets/                        # Material FUENTE (alta resolución) — Vite NO lo sirve
├── public/                        # Assets estáticos servidos tal cual (raíz del sitio)
│   └── logo.svg                   # Logo (SVG, colores del design system) → /logo.svg
├── src/
│   ├── main.jsx                   # Punto de entrada (monta React)
│   ├── App.jsx                    # Componente raíz + rutas
│   ├── index.css                  # Tailwind + variables de tema globales
│   ├── pages/                     # Páginas/vistas (una por ruta)
│   │   ├── HomePage.jsx           # Inicio (`/`): seguí donde dejaste, calendario, tareas, notas
│   │   ├── LandingPage.jsx        # Landing pública (`/bienvenida`), fuera del layout de la app
│   │   ├── LoginPage.jsx          # Acceso (email + contraseña)
│   │   ├── CareersPage.jsx        # Workspace: panel de inicio con las carreras
│   │   ├── CareerMapPage.jsx      # Canvas de materias + correlativas
│   │   ├── SubjectFolderPage.jsx  # La Carpeta de una materia (ADR-017)
│   │   ├── SheetRedirectPage.jsx  # /hojas/:id → carpeta en esa hoja
│   │   ├── TrashPage.jsx          # Papelera (`/papelera`, ADR-019)
│   │   ├── StudyPage.jsx          # Mi estudio (`/estudio`, ADR-022): resúmenes y exámenes
│   │   ├── StudySummaryPage.jsx   # Un resumen guardado (`/estudio/resumenes/:id`)
│   │   ├── StudyQuizPage.jsx      # Registro de un examen (`/estudio/examenes/:id`)
│   │   └── ProfilePage.jsx
│   ├── features/                  # EXCEPCIÓN autorizada (2026-10-21): carpeta de primer nivel, fuera de
│   │   └── landing/               #   components/features/. Landing pública: un componente por bloque,
│   │                              #   landingCopy.js (textos) y paperTones.js; con sus tests (node --test)
│   ├── components/
│   │   ├── ui/                    # Base: Button, Modal, Drawer, TextField,
│   │   │                          #       ConfirmDialog, PromptDialog, EmptyState, ColorPicker,
│   │   │                          #       Icon (íconos SVG, ADR-018), UndoToast
│   │   ├── layout/                # AppLayout, Header, AuthProvider, RequireAuth,
│   │   │                          # WorkspaceLayout, TabBar, ReadingModeProvider
│   │   └── features/
│   │       ├── explorer/          # Explorer, ExplorerTree, ExplorerItem
│   │       ├── commandPalette/    # CommandPalette
│   │       ├── careers/           # CareerCard, CareerFormModal (panel de inicio)
│   │       ├── careerMap/         # CareerMap, SubjectNode, PrerequisiteEditor,
│   │       │                      # PrerequisiteKindDialog
│   │       ├── folder/            # FolderSheet, TopicIndex, FolderSearchBar (La Carpeta)
│   │       ├── sheetEditor/       # SheetEditor, EditorToolbar
│   │       ├── export/            # ExportDialog
│   │       ├── trash/             # TrashItemRow (Fase 13)
│   │       ├── attachments/       # AttachmentList (lista al pie de la hoja)
│   │       ├── templates/         # NewSheetButton, TemplatesManager
│   │       ├── import/            # ImportDialog
│   │       ├── assistant/         # El Brote (Fase 14, ADR-021): AssistantHost, AssistantPanel,
│   │       │                      # Brote, ChatThread, ProposalCard, SelectionShortcuts, QuizRunner,
│   │       │                      # InlineAnswerCard (tarjeta de atajos), QuizWindow, SummaryWindow (14.1)
│   │       ├── study/             # Mi estudio (Fase 14.1, ADR-022): SummaryDocument, SummaryPrint,
│   │       │                      # QuizRecordView, StudyItemRow
│   │       └── home/              # Inicio: HomePanel, ContinueCard, NextDateCard, WeekSummary,
│   │                              # CalendarPanel, DateFormModal, TaskList, QuickNotes
│   ├── hooks/                     # useAuth, useCareers, useCareerMap, useFolder,
│   │                              # useSheetAutosave, useSheetLocation, useReadingMode,
│   │                              # useExplorerTree, useExportTree, useHotkeys, useFlowCanvas, useHome,
│   │                              # useTrash, useTrashPurge, useFolderAttachments,
│   │                              # useSheetTemplates, useImport, useAssistant, useAssistantContext,
│   │                              # useInlineAnswer, useLeaveWarning, usePrintSummary,
│   │                              # useSaveSummaryAsSheet, useStudy (Fase 14.1)
│   ├── services/                  # supabase.client, cache, crudService (fábrica),
│   │                              # dataEvents, careers, subjects, sheets,
│   │                              # prerequisites, home, importantDates, tasks,
│   │                              # quickNotes, trash, attachments, sheetTemplates, import,
│   │                              # assistant, userPlan, quizResults (Fase 14), study (Fase 14.1)
│   ├── lib/
│   │   ├── id.js
│   │   ├── graph/                 # validateDag.js, dagreLayout.js (carrera), subjectStatus.js,
│   │   │                          # canvasPositions.js
│   │   ├── markdown/              # serialize.js, parse.js, wikiLinks.js, headings.js
│   │   ├── editor/                # highlightExtension, computeHighlights, matches, folderSheets,
│   │   │                          # broteAnchor (widget de la tarjeta del Brote, 14.1)
│   │   ├── format/                # sheetDate.js (fecha y hora de las hojas), dateParts.js
│   │   ├── i18n/                  # Idiomas (Fase 18, ADR-023): core, index (`t`, `tIn`), detectLang,
│   │   │                          # es/ y en/ (un diccionario por área), tests de paridad y trinquete
│   │   ├── export/                # toSingleMarkdown.js, toZip.js, frontmatter.js
│   │   ├── trash/                 # trashItems.js (textos de la papelera, puras)
│   │   ├── attachments/           # refs.js (`adjunto:<id>`), files.js (puras)
│   │   ├── import/                # frontmatter, createdAt, mediaRefs, plan (puras, con tests)
│   │   ├── home/                  # dates.js, calendar.js, preview.js, summary.js, greeting.js (Inicio, puras)
│   │   └── assistant/             # El Brote (puras, con tests): sse, readSseStream, chatState, bridge,
│   │                              # requestBuilder, shortcuts, editorApply, applyProposal,
│   │                              # quizSession, quizScore, weakTopics, assistantError; 14.1: inlineAnswer,
│   │                              # requestSlot, quizRecord, summaryBlocks, summaryDoc,
│   │                              # summarySession, studyItems
│   ├── constants/                 # routes.js, storageKeys.js, palette.js, subjectTones.js (ADR-018),
│   │                              # subjectStatus.js, prerequisiteKinds.js, homeLimits.js,
│   │                              # sheetTemplates.js, attachmentLimits.js (Fase 13)
│   └── types/
│       └── models.js              # Typedefs JSDoc del modelo de datos
├── supabase/
│   ├── migrations/                # SQL versionado del esquema + RLS (0001 a 0008)
│   └── functions/
│       └── assistant/             # Edge Function del Brote (Deno, ADR-021): index.js (arranque),
│                                  # handler.js (lógica testeable), config.js (topes PROVISORIOS),
│                                  # quota, request, careerMap, topics, tools, supabaseDb, prompt,
│                                  # gemini, sse, loop, quiz, account (+ *.test.js en Node)
├── index.html                     # HTML raíz de la SPA
├── vite.config.js                 # Configuración de Vite
├── tailwind.config.js             # Design system (colores, fuentes, spacing)
├── postcss.config.js              # PostCSS (Tailwind + autoprefixer)
├── eslint.config.js               # Reglas de ESLint
├── .env.example                   # Variables de entorno (template)
├── .gitignore
├── package.json
├── CHANGELOG.md
├── readme.md
├── metodo_ainnovate.md            # Método completo
└── [reglas de IA]                 # CLAUDE.md, .windsurfrules, .cursorrules, ...
```

> **Mandamiento VI:** esta estructura es la fuente de verdad. NO crear archivos fuera de
> ella sin autorización. Si hace falta una carpeta nueva → PREGUNTAR primero.

## Separación lógica / estilos (Mandamiento II con Tailwind)

Con TailwindCSS las clases de estilo van en el JSX, pero la **lógica de negocio se
mantiene separada** de la presentación:

- Los componentes en `components/` son **presentacionales** (reciben props, renderizan).
- La lógica de datos vive en `services/` y `hooks/`.
- Estructura recomendada por componente:

```
components/ui/Button/
├── Button.jsx       # Lógica de presentación + JSX con clases Tailwind
├── Button.types.js  # @typedef JSDoc de las props (opcional)
└── index.js         # Re-export: export { Button } from './Button'
```

## Sistema de estilos (Mandamiento VII con Tailwind)

Jerarquía (fuente de verdad → uso):

1. **`tailwind.config.js`** — design tokens: colores (incl. acento verde), tipografía,
   spacing, radios, sombras. **NO inventar valores fuera de este config.**
2. **`src/index.css`** — directivas `@tailwind`, variables CSS globales y `@layer base`.
3. **Clases utilitarias de Tailwind** en el JSX.
4. **`@layer components`** en `index.css` — clases reutilizables (`.btn-accent`, `.card`,
   y desde ADR-018 `.lamp`, `.glass`, `.paper-sheet`).

### Paleta base (design system)

| Token | Uso | Valor de referencia |
|-------|-----|---------------------|
| `accent` (verde) | Color de marca / acciones primarias | `#22c55e` (green-500) |
| `bg` | Fondo principal (modo oscuro) | gris muy oscuro |
| `surface` | Tarjetas / paneles | gris oscuro |
| `text` | Texto principal | gris claro |
| `surface-lit` | Bloque protagonista bajo la lámpara | `#14201a` |
| `paper` / `paper.line` / `paper.border` | Papel crema de las hojas (ADR-018) | `#fbf8ef` / `#ebe5d5` / `#e3dcc9` |
| `ink` / `ink.muted` | Tinta sobre el papel | `#2b2620` / `#7a6f5a` |
| `postit` / `postit.ink` | Notas rápidas del Inicio | `#fff3a8` / `#3b3415` |
| `warn` | Urgente / búsqueda / "cursando" | `#f59e0b` |
| `font-display` | Títulos, saludo, números grandes | Bricolage Grotesque |

> **Color de materia:** nunca el hex crudo para texto. Usar `getSubjectTones` /
> `subjectCssVars` (`src/constants/subjectTones.js`, ADR-018).

> Los valores exactos se definen en `tailwind.config.js`. El **modo oscuro es el diseño
> principal**.

## Flujo de Datos

> Actualizado por **ADR-007**: la fuente de verdad es Supabase; `localStorage` es cache.

```
                                   ┌──────────────┐
Componente (UI) → hook (use*) → service ─┬────────→│  Supabase    │ ← fuente de verdad
       ▲                                 │         └──────────────┘
       │                                 ↓                │
       │                        cache.service.js          │
       │                        (localStorage)            │
       └──── estado / re-render ────┴───────────────────┘
              (pinta ya desde cache)     (reconcilia al responder)
```

1. El **hook** pide datos al service.
2. El **service** devuelve **primero** lo que haya en cache (pintado instantáneo) y en
   paralelo consulta Supabase.
3. Cuando Supabase responde, se **reconcilia**: se actualiza la cache y se re-renderiza.
4. En escritura, el service aplica el cambio en cache **de inmediato** (optimista), manda
   el `INSERT/UPDATE` y, si falla, **revierte** y avisa en la UI.

Reglas:

- Los **componentes** nunca tocan `localStorage` ni el cliente de Supabase: solo `services/`.
- Ante conflicto **gana Supabase**. La cache es descartable por definición.
- Los **hooks** exponen estado, acciones y el **estado de sincronización**
  (`idle | saving | saved | error`).

## Variables de Entorno

| Variable | Descripción | Tipo | Requerida |
|----------|-------------|------|-----------|
| `VITE_APP_NAME` | Nombre visible de la app | pública | NO (default: "Studree") |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | pública | SÍ (para persistencia remota) |
| `VITE_SUPABASE_ANON_KEY` | Clave `anon` / *publishable* de Supabase | pública | SÍ (para persistencia remota) |

> En frontend, toda variable `VITE_*` es **pública** (se incluye en el bundle).
> La **anon key** de Supabase es pública **por diseño**: lo que protege los datos es
> **Row Level Security (RLS)** activado en cada tabla, no el secreto de la clave.
> La **`service_role` key NUNCA** va en el cliente ni en un `VITE_*`.
> Ver `docs/03-security.md`.

Los valores reales se cargan desde **`.env.local`** (no versionado, ver `.gitignore`);
**`.env.example`** es el template versionado, sin valores.

## Convenciones del Proyecto

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componentes | PascalCase `.jsx` | `SubjectCard.jsx` |
| Páginas | PascalCase + `Page` | `HomePage.jsx` |
| Hooks | camelCase con `use` | `useSubjects.js` |
| Servicios | camelCase + `.service` | `subjects.service.js` |
| Utilidades | camelCase | `formatDate.js` |
| Constantes | SCREAMING_SNAKE_CASE | `STORAGE_KEYS` |
| Typedefs JSDoc | PascalCase | `@typedef {Object} Subject` |
| Clases CSS propias | kebab-case | `.tree-node` |
| Variables CSS | kebab-case | `--color-accent` |

> **Regla de oro (Mandamiento XI):** leer los archivos existentes y seguir SU convención.

## Tipado con JSDoc (Mandamiento IX adaptado)

El proyecto usa **JavaScript, no TypeScript** (ver ADR-002). El tipado se documenta con
**JSDoc**:

```js
/**
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {string} [color]
 * @property {number} createdAt
 */

/** @param {Subject} subject */
function renderSubject(subject) { /* ... */ }
```

- Evitar variables sin propósito claro; documentar funciones públicas con JSDoc.
- `@typedef` reutilizables van en `src/types/`.

## Decisiones Arquitectónicas (ADR)

### ADR-001: React + Vite (no vanilla, no Next.js)
**Fecha:** 2026-06-28
**Contexto:** El readme mencionaba HTML/CSS/JS vanilla, pero la funcionalidad central
(árboles conceptuales interactivos) se apoya en **React Flow**, que requiere React.
**Decisión:** Usar **React 18 + Vite**. Vite da un dev server rápido y build simple,
sin el peso de Next.js (no se necesita SSR en esta etapa).
**Consecuencias:** Hay un paso de build; el equipo trabaja con componentes React.

### ADR-002: JavaScript + JSDoc (no TypeScript)
**Fecha:** 2026-06-28
**Contexto:** El readme define el stack como JavaScript y el equipo son estudiantes.
**Decisión:** Usar **JavaScript con JSDoc** para tipar, como contempla el Mandamiento IX.
**Consecuencias:** Menor barrera de entrada; el tipado es por convención (JSDoc), no
forzado por el compilador. Migrar a TS más adelante es posible si el equipo lo decide.

### ADR-003: Persistencia con localStorage (sin backend aún)
**Fecha:** 2026-06-28
**Estado:** ⚠️ **REEMPLAZADO por ADR-007** (2026-08-24). Se conserva como registro histórico.
**Contexto:** En esta etapa el foco es la UI y la experiencia; no hay backend definido.
**Decisión:** Guardar los datos del usuario en **`localStorage`**, encapsulado en
`services/`, para poder reemplazar la capa de persistencia por una API en el futuro.
**Consecuencias:** Datos solo en el navegador del usuario (no sincronizados). El acceso
se aísla en services para facilitar la migración a backend (Fase 6).

### ADR-004: TailwindCSS para estilos
**Fecha:** 2026-06-28
**Contexto:** La investigación mencionó Tailwind; se busca diseño rápido y consistente.
**Decisión:** Usar **TailwindCSS** con el design system definido en `tailwind.config.js`.
**Consecuencias:** Las clases viven en el JSX; el design system es la fuente de verdad
de colores/espaciados. NO se inventan valores fuera del config.

### ADR-005: React Flow para los árboles conceptuales
**Fecha:** 2026-06-28
**Contexto:** La `docs/Investigacion.md` evaluó React Flow, Mermaid y GoJS y recomendó
**React Flow** por ser interactivo, moderno y alineado con la idea del proyecto.
**Decisión:** Usar **`@xyflow/react`** (React Flow v12) para nodos/ramas interactivos.
**Consecuencias:** Dependencia central para la Fase 3; los nodos serán componentes React.

### ADR-006: Mapa híbrido (jerárquico + drag) con React Flow, sin física
**Fecha:** 2026-06-28
**Estado:** ⚠️ **REEMPLAZADO por ADR-008** (2026-08-24). Se conserva como registro histórico.
**Contexto:** El usuario pidió un mapa "estilo Obsidian". Obsidian usa un grafo
force-directed (con física), que requeriría una librería extra (ej. react-force-graph).
**Decisión:** Implementar un mapa **híbrido** con React Flow (ya instalado): auto-layout
jerárquico de base (`src/lib/treeLayout.js`) + nodos arrastrables, zoom y paneo libres.
Si el usuario mueve un nodo, su posición manual se persiste y prevalece sobre el layout.
**Consecuencias:** No se agregan dependencias de física. El layout jerárquico se calcula
en cliente; las posiciones manuales se guardan en `TreeNode.position`.

### ADR-007: Supabase como fuente de verdad, localStorage como cache optimista
**Fecha:** 2026-08-24
**Reemplaza a:** ADR-003
**Contexto:** El usuario necesita que sus apuntes sobrevivan al navegador y estén
disponibles en varios dispositivos. `localStorage` no da nada de eso: los datos viven en
un solo navegador y se pierden al limpiar el sitio. Al mismo tiempo, esperar el round-trip
de red en cada tecla haría el editor de hojas inusable.
**Decisión:** **Supabase (Postgres) es la fuente de verdad.** `localStorage` pasa a ser
**exclusivamente una cache optimista**: la UI lee de la cache para pintar instantáneo y
escribe ahí primero, mientras el guardado real viaja a Supabase en background. Ante
conflicto, **gana Supabase**. La cache es descartable: borrarla no debe perder datos.
**Consecuencias:**
- Se adelanta la Fase 6 del roadmap.
- Requiere **auth** (los datos se filtran por `auth.uid()`) y **RLS obligatorio en todas
  las tablas** — ver `docs/03-security.md`.
- Los services dejan de hablar con `localStorage` y pasan a hablar con Supabase; la cache
  queda encapsulada en `cache.service.js`.
- Hay que manejar estados nuevos en la UI: *guardando*, *guardado*, *error de red*.
- La app deja de funcionar 100 % offline (queda degradada a lectura de cache).

### ADR-008: Auto-layout con dagre; las coordenadas no se persisten
**Fecha:** 2026-08-24
**Estado:** ⚠️ **REEMPLAZADO por ADR-012** (2026-10-14). dagre sigue siendo el layout
por defecto, pero ahora las posiciones manuales **sí** se guardan.
**Reemplaza a:** ADR-006
**Contexto:** ADR-006 persistía la posición manual de cada nodo y la hacía prevalecer
sobre el layout. Con la jerarquía nueva (y decenas de materias por carrera) eso produce
grafos que quedan desordenados apenas se agrega un nodo, y obliga a mantener coordenadas
a mano que se desincronizan de la estructura real.
**Decisión:** **La estructura de datos es la única fuente de verdad del layout.** Las
posiciones `{x, y}` se **calculan siempre** con **dagre** a partir de la relación
padre/hijo (canvas de materia) o de las correlativas (canvas de carrera). **No se guarda
ninguna coordenada** en la base: se elimina `TreeNode.position`.
**Consecuencias:**
- Se agrega la dependencia `@dagrejs/dagre`; se jubila `src/lib/treeLayout.js`.
- El usuario **no puede** reacomodar nodos de forma permanente (el canvas se reordena
  solo). Es un cambio de UX deliberado: el orden lo define la estructura.
- El grafo de correlativas **debe ser un DAG**: dagre entra en bucle infinito con ciclos.
  De ahí el ADR-009.

### ADR-009: Validación de ciclos al guardar, no al renderizar
**Fecha:** 2026-08-24
**Contexto:** Si una correlativa cierra un ciclo (A requiere B, B requiere A), dagre
recibe un grafo circular y el canvas se rompe en tiempo de render — un error tardío,
difícil de atribuir y que deja la app inutilizable.
**Decisión:** Validar que el grafo sea un **DAG en el momento de guardar** una
correlativa. Si el alta cerrara un ciclo, se **rechaza la operación** y se le muestra al
usuario **el ciclo concreto** que se formaría (ej. *"Análisis II → Álgebra → Análisis
II"*). El render asume siempre un grafo válido.
**Consecuencias:** La detección vive en `src/lib/graph/validateDag.js` (DFS de 3 colores)
y se ejecuta en el service antes de escribir. La validación de cliente se replica como
constraint en la base (no confiar solo en el cliente — `docs/03-security.md`).

### ADR-010: Jerarquía de 5 niveles con entidades explícitas
**Fecha:** 2026-08-24
**Estado:** ⚠️ **REEMPLAZADO por ADR-014** (2026-10-14) en cuanto a la profundidad (5 → 3
niveles). Sigue vigente la idea central: un nivel = una tabla con FK real.
**Contexto:** El modelo actual (`TreeNode` recursivo con `parentId`) permite profundidad
arbitraria. El modelo objetivo es de **profundidad fija**: Carrera → Materia → Unidad →
Tema → Hoja. Con un árbol recursivo nada impide una jerarquía inválida y el export a
Markdown por *headings* (`#`, `##`, `###`, `####`) no tiene de dónde deducir el nivel.
**Decisión:** Modelar cada nivel como **entidad propia** (`careers`, `subjects`, `units`,
`topics`, `sheets`) con FK real entre ellas. La profundidad queda garantizada por el
esquema. Las **correlativas** son una tabla aparte (`prerequisites`) porque son una
relación *muchos-a-muchos entre materias*, no jerarquía.
**Consecuencias:**
- El nivel de cada fila es evidente por su tabla → el export a Markdown es directo.
- La cascada la hace Postgres con `ON DELETE CASCADE` (ya no a mano en los services).
- `TreeNode` y `Resource` quedan obsoletos. Por decisión del usuario **no se migran los
  datos existentes**: el esquema nuevo arranca vacío.

### ADR-011: TipTap como editor, Markdown como fuente de verdad
**Fecha:** 2026-08-24
**Contexto:** Las hojas necesitan un editor tipo Word/Notion (WYSIWYG). TipTap
(ProseMirror) resuelve esa UX, pero su formato natural de salida es **HTML**. Guardar HTML
haría que el export a Markdown para IA — objetivo explícito del proyecto — requiriera una
conversión con pérdida en cada exportación.
**Decisión:** Usar **TipTap** para la edición, pero **persistir Markdown**
(`sheets.content_md`). El HTML existe solo en memoria mientras el editor está montado:
se **parsea** de Markdown al abrir y se **serializa** a Markdown al guardar.
**Consecuencias:**
- El export a `.md` es **copiar el campo**, sin conversión ni pérdida.
- El contenido queda *chunkeable* por hoja, listo para RAG/embeddings más adelante
  (**no se implementa vectorización en esta etapa**, solo se deja el terreno preparado).
- El editor queda limitado a lo que Markdown puede representar (sin colores de texto,
  sin tablas complejas). Es un límite aceptado a cambio de la portabilidad.
- La conversión vive aislada en `src/lib/markdown/` para poder cambiar de editor sin
  tocar los datos.

### ADR-012: Layout híbrido — dagre por defecto, posiciones manuales persistidas
**Fecha:** 2026-10-14
**Reemplaza a:** ADR-008
**Contexto:** Al probar la app, el usuario no sentía los canvas "estilo n8n": los nodos
no se podían mover y todo se creaba con formularios fuera del lienzo. Pidió
explícitamente **mover los nodos a mano y que la posición quede guardada**.
**Decisión:** Layout **híbrido**:
- Columnas nullable `pos_x`/`pos_y` en `subjects` (canvas de carrera), `units` y `topics`
  (canvas de materia), y `map_x`/`map_y` en `subjects` (nodo raíz del canvas de materia).
  Migración `0002_manual_layout_and_prereq_toggle.sql`.
- `NULL` = el nodo lo ubica dagre. Con valor = se dibuja ahí.
- **Modo automático** (ningún nodo guardado) vs **modo manual**: al primer arrastre (o al
  crear un nodo en un punto concreto del lienzo) se guardan las posiciones de **todos**
  los nodos visibles, para que dagre no reacomode los demás alrededor del movido.
- Botón **"⟲ Reordenar"**: pone todo en `NULL` y vuelve al modo automático.
- La lógica compartida vive en `src/hooks/useFlowCanvas.js` y
  `src/lib/graph/canvasPositions.js`.
**Consecuencias:**
- ADR-009 sigue vigente: dagre se sigue usando (modo automático y nodos sin posición),
  así que el grafo de correlativas tiene que seguir siendo un DAG.
- Mover un nodo es un `UPDATE` silencioso (no recarga el explorador).
- En mobile arrastrar sigue siendo incómodo: la navegación sigue resolviéndose con
  explorador + palette.

### ADR-013: Correlativas opcionales por carrera (`careers.uses_prerequisites`)
**Fecha:** 2026-10-14
**Contexto:** No todo lo que el usuario organiza es una carrera universitaria: cursos,
capacitaciones o notas personales no tienen correlativas, y mostrar candados, flechas y
botones de correlativas ahí es ruido.
**Decisión:** Columna `careers.uses_prerequisites boolean not null default true`. Se elige
al crear la carrera ("Carrera con correlativas" / "Curso u organizador") y se puede
cambiar desde el canvas ("Usa correlativas"). Con `false`: sin aristas, sin estado
`bloqueada`, sin botón 🔗, sin conectar nodos, y layout automático en grilla.
**Consecuencias:** Desactivar **no borra** las correlativas: solo se ocultan (vuelven si se
reactiva). Default `true` = las carreras existentes no cambian de comportamiento.

### ADR-014: Jerarquía de 3 niveles — Carrera → Materia → Hoja
**Fecha:** 2026-10-14
**Estado:** vigente en la jerarquía. Lo del **canvas de hojas** quedó reemplazado por
ADR-017 (La Carpeta).
**Reemplaza a:** ADR-010 (en la profundidad)
**Contexto:** Con 5 niveles, llegar a una hoja exigía crear y abrir Unidad → Tema: el
usuario lo describió como "tedioso". El público incluye secundarios y cursos cortos, para
quienes Unidad/Tema es fricción pura. La visión original era "carpeta = carrera → nodos =
materias → hojas".
**Decisión:** Las hojas cuelgan **directo de la materia** (`sheets.subject_id`, migración
0003). La organización interna de una materia la dan los **links entre hojas** (ADR-015),
no carpetas intermedias. `units`/`topics` quedan deprecadas en la base (sin UI ni
services) y se eliminan en una migración futura; la 0003 migró los datos.
**Consecuencias:**
- El canvas de materia muestra **hojas como nodos** (antes cortaba en Tema y las hojas iban
  en un panel lateral). Para materias con muchas hojas hay una vista **Lista**.
- Explorador, palette y export pasan a 3 niveles (el export ya no tiene `###` de unidad).
- Títulos únicos por materia (si no, un `[[link]]` sería ambiguo).

### ADR-015: Links entre hojas con `[[Título]]`, derivados del Markdown en la base
**Fecha:** 2026-10-14
**Estado:** ⚠️ **DEROGADO por ADR-017** (mismo día). Las hojas ya no tienen título: los
`[[links]]` apuntan a **temas** y se resuelven en el cliente; `sheet_links` y sus triggers
se eliminaron en la migración 0004.
**Contexto:** Sin Unidad/Tema, lo que estructura una materia son las relaciones entre
apuntes. Guardar las conexiones del canvas en una tabla editable por el cliente crearía dos
fuentes de verdad (el texto y la tabla) que se desincronizan, y el export para IA no
llevaría las relaciones.
**Decisión:** La relación vive **en el Markdown** (`[[Título]]`, ADR-011 sigue mandando).
`sheet_links` es un **índice derivado** que mantiene la base con triggers
(`refresh_sheet_links`): al guardar el contenido se recalculan los links salientes, y al
renombrar una hoja se reescriben los `[[título viejo]]` que la apuntaban. Conectar dos
nodos en el canvas = agregar `[[destino]]` al final del origen; quitar una arista = quitar
ese texto.
**Consecuencias:**
- Imposible que el grafo y el texto difieran; el export para IA incluye las relaciones.
- Los triggers son `security invoker` (RLS aplica). La resolución es por título dentro de
  la misma materia y sin mayúsculas; títulos con corchetes no son enlazables.
- `prosemirror-markdown` escapa corchetes: `editorToMarkdown` los desescapa
  (`unescapeWikiLinks`) y el parser SQL acepta las dos formas.
- Los links pueden formar ciclos: el layout usa `acyclicer: 'greedy'` de dagre y no se
  valida DAG (a diferencia de las correlativas, ADR-009).

### ADR-016: Posiciones del canvas en lote vía RPC
**Fecha:** 2026-10-14
**Contexto:** "Congelar" el layout (ADR-012) mandaba un `UPDATE` por nodo, y cada uno
reescribía la lista entera en `localStorage`: con 40 materias, 40 requests.
**Decisión:** Función `save_node_positions(p_table, p_x_column, p_y_column, p_moves)`
(migración 0003): un único `UPDATE ... FROM jsonb_to_recordset`, `security invoker` y con
**whitelist** de tabla/columnas (el nombre de tabla va en SQL dinámico).
`crudService.savePositions` la usa y actualiza la cache una sola vez.
**Consecuencias:** Un request por arrastre. Agregar un canvas nuevo exige sumar su tabla a
la whitelist de la función (migración). Desde la 0004 la whitelist es **solo**
`subjects (pos_x, pos_y)` (el canvas de hojas desapareció con ADR-017).

### ADR-017: La Carpeta — la materia como documento continuo de hojas fechadas
**Fecha:** 2026-10-14
**Reemplaza a:** el canvas de hojas de ADR-014 y la tabla de links de ADR-015.
**Contexto:** el usuario quería que una materia se sintiera como una **carpeta escolar**
(separadores de colores = materias, y adentro todas las hojas seguidas, estilo Word), con
herramientas para leer y orientarse. El dibujo de hojas no le servía, y los títulos de hoja
eran fricción.
**Decisión:**
- `/materias/:id` muestra todas las hojas de la materia en un scroll, en **orden
  cronológico**, sobre **papel crema (ADR-018)**. Cada hoja es un editor TipTap con su propio
  autosave. No hay reordenamiento.
- Las hojas **no tienen título**: se identifican por fecha y hora de creación. Los
  **temas** son los headings `#` del contenido, y arman un índice lateral.
- `[[Tema]]` es un salto a un tema de la misma materia, resuelto en el cliente.
- Buscador de la materia (resaltado con decoraciones de ProseMirror) y modo lectura.
- Los datos siguen divididos en hojas (no un documento único): no se pone lenta con meses
  de apuntes y no se pisan ediciones entre dispositivos.
- Migración 0004: títulos → `# tema`, se eliminan `sheet_links`, `units`, `topics` y las
  columnas sin uso.

**Consecuencias:**
- `/hojas/:id` pasa a ser una redirección. Tabs por materia; explorador Carrera → Materia.
- Todas las hojas se montan como editores a la vez. Si una materia muy grande tarda (>~1 s),
  el plan B es el montaje perezoso (`docs/features/folder.md`).
- El export titula cada hoja con su fecha y nombra los archivos por fecha.

### ADR-018: Identidad visual — la lámpara, el papel crema y el color de materia
**Fecha:** 2026-10-15
**Spec:** `docs/superpowers/specs/2026-10-15-rediseno-visual-design.md`
**Contexto:** las hojas se veían corridas a la derecha y chicas, todo era de un solo color
(no se distinguían materias ni temas) y la interfaz se sentía genérica para una app que va a
integrar IA. El diseño se hizo con las skills `frontend-design`, `ui-ux-pro-max` y
`web-design-guidelines`.
**Decisión:**
- Concepto **"estudiar de noche con la lámpara"**: fondo oscuro (el escritorio), un único
  cono de luz verde suave arriba a la izquierda (`.lamp`, estático) y paneles de vidrio
  (`.glass`) con distinto peso, en una grilla bento en el Inicio.
- Las hojas van en **papel crema con renglones** (`.paper-sheet`, tokens `paper` / `ink`) y
  con un **margen del color de la materia**. Reemplaza el "papel blanco" de ADR-017.
- **Color de materia:** tabla `src/constants/subjectTones.js` con cuatro tonos por color de
  la paleta (`base`, `onPaper`, `onDark`, `soft`; los de texto con contraste ≥ 4.5:1). En la
  Carpeta se aplican como variables CSS `--subject`, `--subject-ink`, `--subject-light` y
  `--subject-soft`. Un color fuera de la paleta usa los tonos del verde.
- **Tipografía:** Inter (texto) + Bricolage Grotesque (`font-display`: títulos, saludo,
  números grandes y marca), desde Google Fonts con `display=swap`.
- **Íconos SVG propios** (`components/ui/Icon.jsx`; en la Fase 13 se sumaron `trash`,
  `restore`, `paperclip`, `image`, `upload`, `template` y `chevron-down`), nunca emojis. Foco visible global
  (`:focus-visible`).
- **Se evita:** etiquetas en mayúsculas, texto en degradé, tarjetas idénticas, animaciones
  de entrada en cada bloque. La única animación nueva (la hoja que asoma en "Seguí donde
  dejaste") respeta `prefers-reduced-motion`.
- El **Inicio** no muestra explorador ni tabs. El **explorador arranca cerrado** (`Ctrl+B`
  o el botón de la barra de tabs) y se recuerda; así la Carpeta centra las hojas en la
  pantalla (grilla de 3 columnas: índice, hojas de hasta 52rem, columna espejo).
- Logo original (`public/logo.jpg`) en el header y el favicon.

**Consecuencias:**
- Agregar un color a `palette.js` exige agregar sus tonos a `subjectTones.js` (si no, la
  materia se ve verde).
- El texto nunca usa el color crudo de la materia: siempre `onPaper` u `onDark`.
- Tokens nuevos: `paper.line`, `postit`, `surface-lit`, `fontFamily.display`.

### ADR-019: Papelera con `deleted_at`
**Fecha:** 2026-10-15
**Spec:** `docs/superpowers/specs/2026-10-15-fase-13-design.md`
**Contexto:** borrar una carrera, una materia o una hoja era definitivo (con cascada): un
click de más podía costar semanas de apuntes.
**Decisión:**
- Columna `deleted_at` en `careers`, `subjects` y `sheets`. Borrar llama a la función SQL
  `trash_item` (`security invoker`), que marca el elemento y, en cascada, todo lo que
  contiene con **una sola marca** (`clock_timestamp()`, no `now()`, para que dos borrados
  dentro de una misma transacción tengan marcas distintas).
- Restaurar (`restore_item`) revive lo que tiene **esa misma marca**: lo que ya estaba en la
  papelera antes de borrar el contenedor sigue ahí.
- La papelera lista solo el **primer nivel** borrado (`list_trash`); lo vencido a los 30 días
  se purga desde la app (`list_expired_trash` + `attachment_paths_for`).
**Alternativas descartadas:** una tabla `trash` aparte que guarde copias (duplica el modelo
y complica restaurar las relaciones y las correlativas).
**Consecuencias:**
- **Toda lectura** de esas tres tablas filtra `deleted_at is null` (`crudService` con
  `softDelete: true`, `searchContent`, `getLastEditedSheet`).
- Las correlativas hacia una materia en la papelera siguen en la base: se descartan **en el
  cliente** (`livePrerequisites`).
- La purga corre desde la app (`useTrashPurge`, una vez por sesión), no hay cron: si nadie
  entra, lo vencido espera.
- Borrar para siempre: primero los archivos de Storage, después las filas.

### ADR-020: Adjuntos en bucket privado con referencias `adjunto:`
**Fecha:** 2026-10-15
**Spec:** `docs/superpowers/specs/2026-10-15-fase-13-design.md`
**Contexto:** las hojas necesitan imágenes y archivos (fotos del pizarrón, PDF), y el
Markdown es la fuente de verdad del contenido (ADR-011).
**Decisión:**
- Archivos en el bucket **privado** `attachments` de Supabase Storage, con rutas
  `<user_id>/<attachment_id>/<nombre>` y políticas por primera carpeta = `auth.uid()`;
  metadatos en la tabla `attachments`.
- En el Markdown se guarda `![nombre](adjunto:<id>)` o `[nombre](adjunto:<id>)`, **nunca una
  URL**. Al mostrarlo se pide un link firmado de 1 h (cacheado en memoria).
**Alternativa descartada:** bucket público con URLs fijas (cualquiera con el link vería los
apuntes; las URLs quedarían clavadas en el Markdown).
**Consecuencias:**
- Los links firmados vencen: el id es lo estable, el link se resuelve al mostrar.
- El export `.zip` reescribe `adjunto:<id>` a rutas relativas y el import hace el camino
  inverso; el `.md` único y "Copiar para IA" los describen como `[imagen: …]`.
- Borrar archivos siempre con la API de Storage (no con SQL) y antes que las filas.
- Tope de 20 MB por archivo.

### ADR-021: Asistente de IA en una Edge Function con herramientas de lectura y propuestas aprobadas
**Fecha:** 2026-10-19
**Spec:** `docs/superpowers/specs/2026-10-19-asistente-ia-design.md`
**Contexto:** el asistente (el Brote) tiene que trabajar con los **apuntes privados** del usuario
(toda su carrera), hablar con un proveedor de IA pago (Gemini) y, a la vez, no poder filtrar
datos de otra cuenta, no gastar sin control ni romper las reglas de edición (Markdown como
fuente de verdad, autosave, papelera). La app no tiene servidor propio (Supabase BaaS).
**Decisión:**
- **Una sola Edge Function de Supabase** (`supabase/functions/assistant`) es el único lugar que
  habla con Gemini. La clave (`GEMINI_API_KEY`) y el modelo (`GEMINI_MODEL`) son *secrets* de la
  función. La lógica vive en `handler.js` con dependencias inyectadas (testeada en Node);
  `index.js` solo cablea Deno.
- La función valida el JWT y consulta la base **con la sesión del usuario** (`anon key` + JWT,
  nunca `service_role`): RLS decide qué ve, igual que en la app.
- **Mapa liviano + herramientas de solo lectura** (`read_sheet`, `list_subject_topics`,
  `search_notes`, `get_agenda`) en vez de mandar todo; las herramientas ignoran la papelera y un
  usuario free solo ve la materia del alcance (`allowedSubjectIds`, nunca `null`).
- El contenido de las hojas entra como **datos** (resultado de herramienta o bloque JSON marcado),
  nunca como instrucción.
- **El asistente nunca escribe:** emite propuestas (`propose_append`, `propose_replace_selection`,
  `propose_new_sheet`) que el usuario acepta; al aceptar, el cambio entra por el **editor** de la
  carpeta abierta (`useSheetAutosave`), no por el service. No borra hojas.
- **Cuotas y plan en el servidor** (`user_plans`, `ai_usage`, `config.js`): falla cerrado si no
  puede contar el uso; el cliente solo muestra el estado y evita pedidos que sabe bloqueados.
- Respuesta por **streaming SSE**; el cliente muestra **texto plano** (nunca HTML).
**Alternativas descartadas:**
- **Clave de Gemini en el cliente** (un `VITE_*`): sería pública; cualquiera la usaría sin topes.
- **Mandar toda la carrera en cada pedido:** lento, caro, choca con el contexto del modelo y es
  menos preciso que leer lo que hace falta.
- **Escritura directa del modelo en la base:** un apunte con instrucciones maliciosas o un error
  del modelo podría pisar o borrar apuntes; además saltearía el autosave y el borrador local.
- **Personaje en 3D real** (three.js o similar): dependencia pesada para un adorno; el Brote es un
  SVG con animaciones CSS que respetan `prefers-reduced-motion`.
**Consecuencias:**
- Hay que **desplegar la función y cargar los secrets** aparte del front (ver
  `docs/features/assistant.md`); sin eso el panel muestra "no está disponible".
- Las propuestas solo se aplican en la **carpeta abierta** de esa materia; fuera de ella fallan
  con un aviso.
- El conteo de uso no es transaccional (dos pedidos simultáneos pueden pasar el tope por uno).
- El historial del chat no se guarda: vive mientras dure la sesión.
- Los topes y precios son **provisorios** (`config.js`); la pantalla de planes y el pago simulado
  quedan para la Fase 17.


## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | `HomePage` | **Inicio** (con sesión, dentro del workspace): seguí donde dejaste, resumen, próxima fecha, calendario, tareas y notas — ver `docs/features/home.md` |
| `/entrar` | `LoginPage` | Acceso (email + contraseña). Pública |
| `/carreras` | `CareersPage` | **Workspace**: panel de inicio con las carreras (estilo VSCode) |
| `/carreras/:careerId` | `CareerMapPage` | Canvas de materias (+ correlativas si la carrera las usa) — lazy |
| `/materias/:subjectId` | `SubjectFolderPage` | **La Carpeta**: hojas seguidas + índice de temas + buscador; acepta `?hoja=:id` — lazy |
| `/hojas/:sheetId` | `SheetRedirectPage` | Redirige a `/materias/:subjectId?hoja=:sheetId` (links viejos) |
| `/papelera` | `TrashPage` | **Papelera** (Fase 13, ADR-019): restaurar, borrar para siempre o vaciar — ver `docs/features/trash.md` |
| `/estudio` | `StudyPage` | **Mi estudio** (Fase 14.1, ADR-022): resúmenes y exámenes guardados; acepta `?tab=` y `?materia=` — ver `docs/features/study.md` |
| `/estudio/resumenes/:id` | `StudySummaryPage` | Un resumen guardado: PDF, guardar como hoja, borrar |
| `/estudio/examenes/:id` | `StudyQuizPage` | Registro de un examen con todas las preguntas |
| `/perfil` | `ProfilePage` | Perfil (placeholder) |

> Las páginas con canvas, el editor y el perfil se cargan con `React.lazy` (chunks
> aparte) para no meter React Flow, dagre y TipTap en el bundle inicial.

> Las rutas y sus helpers (`careerPath`, `subjectFolderPath(subjectId, sheetId?)`) están en
> `src/constants/routes.js`.

**Rutas retiradas** (jerarquía anterior, ver ADR-010): `/carpetas` y `/carpetas/:folderId`
quedan reemplazadas por `/carreras` y `/carreras/:careerId`.

### Rutas protegidas

Todo lo que toca datos del usuario cuelga de `<RequireAuth>`
(`src/components/layout/RequireAuth.jsx`). **No es cosmético**: las políticas RLS son
`for all to authenticated`, así que sin sesión `auth.uid()` es `NULL`, las consultas
devuelven vacío y los `INSERT` fallan. Sin el guard, la app se vería rota en vez de pedir
login. `/entrar` es la única ruta pública (desde el Inicio, `/` exige sesión; la
bienvenida pública se eliminó).

### Shell de navegación

Desde el Inicio (`/`) y a partir de `/carreras`, todas las vistas se renderizan dentro de `WorkspaceLayout`, que
aporta de forma persistente:

- **Explorador** lateral (Carrera → Materia), siempre visible en desktop.
- **Barra de tabs** con las materias abiertas.
- **Command Palette** (`Ctrl+K`) para saltar a una materia o a la hoja donde aparece un texto.

> El canvas es un **modo de exploración**, no el único camino: toda la navegación debe ser
> posible solo con explorador + palette (requisito de mobile, donde arrastrar nodos no
> funciona bien).

### ADR-022: "Mi estudio" y PDF por impresión del navegador
**Fecha:** 2026-10-22
**Spec:** `docs/superpowers/specs/2026-10-22-brote-mejoras-design.md`
**Contexto:** los resúmenes y los exámenes del Brote se perdían al cerrar el chat (el resumen era
texto del chat; del examen solo se guardaba el puntaje). El estudiante quiere volver a ellos,
verlos en una ventana cómoda y sacar un PDF, sin sumar dependencias ni un servidor de PDF.
**Decisión:**
- **Una sección propia, "Mi estudio" (`/estudio`)**, más un acceso directo por materia (botón
  **Estudio** en la carpeta, que abre la sección filtrada con `?materia=`). Lo estudiado es un
  producto aparte de las hojas: no ensucia el Markdown de las materias y se encuentra en un solo lugar.
- **El PDF sale de la impresión del navegador** (`window.print()` + CSS `@media print` sobre un
  `#print-root`), con "Guardar como PDF". Sin librería de PDF.
- **Los registros se guardan en la base:** el examen en `quiz_attempts.detail` (jsonb, junto al
  puntaje) y el resumen en la tabla nueva `summaries`. Ambos con RLS propia, `subject_id` y
  `career_id` con borrado en cascada (siguen a su materia y a su carrera, también en la papelera
  y el borrado definitivo) y borrado real con confirmación. Migración `0009`.
- El resumen es **salida estructurada** (JSON validado en la Edge Function, sin herramientas), así
  la interfaz lo dibuja con elementos de React, nunca con HTML del modelo.
**Alternativas descartadas:**
- **Librería de PDF** (jsPDF, react-pdf, html2pdf): dependencia pesada (el bundle principal ya
  cruza el aviso de Vite), fuentes y tildes a resolver, y un PDF menos fiel que el del navegador.
- **PDF generado en la Edge Function:** más superficie en el servidor y más costo, sin ventaja.
- **Guardar los resúmenes como hojas automáticamente:** mezclaría texto generado con los apuntes;
  se conserva como acción explícita ("Guardar como hoja").
- **Solo un listado dentro de cada materia:** no alcanza para ver todo lo estudiado ni filtrar.
**Consecuencias:**
- Hay que **volver a desplegar la función `assistant`** (el resumen cambió de formato).
- El PDF depende del diálogo de impresión del navegador (el estudiante elige "Guardar como PDF").
- Una prueba a medias no se guarda: cerrar o recargar la pestaña la pierde (el navegador avisa antes).
- Los exámenes anteriores a la 0009 no tienen detalle y se muestran como "Sin detalle (prueba anterior)".

### ADR-023: Idiomas de la interfaz con un diccionario propio (castellano / inglés)
**Fecha:** 2026-11-02
**Spec:** `docs/superpowers/specs/2026-10-28-ingles-design.md` · plan: `docs/superpowers/plans/2026-10-28-fase-18-ingles.md`
**Contexto:** toda la interfaz estaba escrita a mano en castellano. El estudiante pidió "simplemente un botón
para pasar a inglés, como en todas las web", dentro de la configuración, y que el Brote conteste en el idioma
en que le escriben.
**Decisión:**
- **Un núcleo propio sin React** (`src/lib/i18n/`): `createI18n` guarda el idioma activo, traduce (`t`, y `tIn`
  para un idioma explícito), se suscribe y persiste. Lo usan igual los componentes (vía `useI18n`, con
  `useSyncExternalStore`, sin proveedor), los hooks, `lib/` y `services/` (que arman mensajes de error).
- **Diccionarios por área** (`es/` y `en/`, objetos anidados con `{marcadores}` y plurales `{one, other}`).
  Si falta una clave en inglés cae al castellano; si falta en los dos, devuelve la clave.
- **El idioma es una preferencia del dispositivo:** `localStorage` (`studree:ui:lang`), que `clearAllCache()`
  conserva al cerrar sesión. Sin migración ni columna en Supabase. Idioma inicial: el guardado o el del navegador.
- **Qué se traduce:** todo texto visible, mensajes de error de los services, fechas (nombres y formato) y orden
  alfabético. **Qué no:** el contenido del usuario, los identificadores guardados en la base (`aprobada`,
  `cursar`…) y el **formato de los archivos exportados** (claves del frontmatter, `adjuntos/`, `adjunto:`), para
  que el importador lea cualquier export.
- **El Brote** responde en el idioma del mensaje del usuario; el pedido lleva `uiLang` para las acciones sin mensaje
  escrito y para desempatar. Los errores y topes del servidor se traducen en el cliente por `code` + `reason`.
- **Dos tests protegen el trabajo:** la paridad `es`/`en` (mismas claves y marcadores) y un "trinquete" que falla si
  aparece castellano visible fuera de los diccionarios.
**Alternativas descartadas:**
- **`react-i18next` u otra librería:** la regla del proyecto es no sumar dependencias sin necesidad; el núcleo propio
  son ~100 líneas y funciona también fuera de React.
- **Guardar el idioma en Supabase:** exigiría una migración y una pantalla de carga; no hace falta para una
  preferencia de interfaz.
- **Traducir el contenido de las hojas o el de las plantillas ya creadas:** es contenido del usuario.
- **Selector en la landing:** el estudiante pidió el botón solo en la configuración.
**Consecuencias:**
- Hay que mantener `es` y `en` en paridad (el test lo exige) y pasar todo texto nuevo por `t()`.
- Lo **ya creado** (hojas desde plantillas, resúmenes, exámenes) no cambia de idioma al cambiarlo: queda en el idioma de
  su momento. La **landing** no tiene selector propio: sigue el idioma guardado o el del navegador.
- El inglés va en el bundle principal (+24 kB gzip): se puede cargar bajo demanda más adelante.
- Hay que **volver a desplegar la función `assistant`** para que la regla de idioma y los `reason` de los topes lleguen.

### ADR-024: Compartir una materia por link y tarjetas con cajas de Leitner (Fase 15)
**Fecha:** 2026-11-10
**Spec:** `docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md` · plan: `docs/superpowers/plans/2026-11-10-fase-15.md`
**Contexto:** faltaban dos funciones del roadmap: mostrar una materia a alguien sin cuenta y estudiar con
preguntas y respuestas. La jerarquía ya es Carrera → Materia → Hoja (ADR-014) y los adjuntos viven en un bucket
privado (ADR-020), así que la vista pública no puede reusar los archivos.
**Decisión:**
- **Se comparte la materia completa**, no una hoja: el link abre la Carpeta en modo lectura, con las hojas
  fechadas. Un solo link activo por materia (`unique (subject_id) where revoked_at is null`), revocable y sin
  vencimiento automático. El token son 32 hex (128 bits) generados en el cliente.
- **La lectura pública la hace una RPC `security definer`, `get_shared_subject(token)`** (la única del proyecto):
  `set search_path = public`, `stable`, solo lectura, `revoke` a `public` y `grant execute` a `anon` y
  `authenticated`. Filtra por token, link activo y materia/carrera vivas; devuelve solo nombre/color de la
  materia, nombre de la carrera y las hojas vivas. **Nunca** ids de usuario ni otras materias. Revisión en
  `docs/03-security.md`.
- **La vista pública no muestra adjuntos:** los `adjunto:` se quitan del Markdown (`lib/share/publicMarkdown.js`)
  y los `[[Tema]]` quedan como texto. Se renderiza con TipTap en `editable={false}`, sin HTML crudo.
- **Tarjetas por materia** (`flashcards`, RLS por dueño) con frente y dorso de 1–2000 caracteres. Repaso con
  **cajas de Leitner** (1–5; días 0, 1, 2, 4 y 8): acertar sube una caja, fallar vuelve a la 1. El cálculo vive
  en `lib/flashcards/srs.js` (puro) y el repaso actualiza `box`, `due_at` y `last_reviewed_at` en una escritura.
  La generación con IA queda fuera de esta fase (toca la Edge Function y cuotas).
**Alternativas descartadas:**
- **Compartir una hoja suelta:** la unidad de estudio es la materia; una hoja sola pierde el hilo.
- **Hacer públicas las tablas (RLS `true`) o usar `service_role` en el cliente:** expondría todas las materias.
- **Links con vencimiento:** el estudiante quiere control manual; revocar es inmediato.
- **Guardar los adjuntos en un bucket público:** rompe ADR-020; la vista pública los omite.
- **SM-2 u otro algoritmo:** Leitner alcanza para el mazo simple y se explica en una frase.
**Consecuencias:**
- La migración `0010` **no se aplica sola**: la corre el estudiante (regla del proyecto).
- La vista pública descarga TipTap en su propio chunk: la primera apertura del link es más pesada que la app.
- Revocar y volver a generar crea una fila nueva; el link viejo deja de funcionar al instante.
- Sin generación automática de tarjetas ni estadísticas de repaso en esta fase.
