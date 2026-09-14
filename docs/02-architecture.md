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
│   └── logo.jpg                   # Logo optimizado 256px → se referencia como /logo.jpg
├── src/
│   ├── main.jsx                   # Punto de entrada (monta React)
│   ├── App.jsx                    # Componente raíz + rutas
│   ├── index.css                  # Tailwind + variables de tema globales
│   ├── pages/                     # Páginas/vistas (una por ruta)
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx          # Acceso (email + contraseña)
│   │   ├── CareersPage.jsx        # Workspace: panel de inicio con las carreras
│   │   ├── CareerMapPage.jsx      # Canvas de materias + correlativas
│   │   ├── SubjectMapPage.jsx     # Canvas de unidades → temas + panel de hojas
│   │   ├── SheetPage.jsx          # Editor de una hoja (TipTap)
│   │   └── ProfilePage.jsx
│   ├── components/
│   │   ├── ui/                    # Base: Button, Modal, Drawer, TextField,
│   │   │                          #       ConfirmDialog, EmptyState, ColorPicker
│   │   ├── layout/                # AppLayout, Header, AuthProvider, RequireAuth,
│   │   │                          # WorkspaceLayout, TabBar
│   │   └── features/
│   │       ├── explorer/          # Explorer, ExplorerTree, ExplorerItem
│   │       ├── commandPalette/    # CommandPalette
│   │       ├── careers/           # CareerCard, CareerFormModal
│   │       ├── careerMap/         # CareerMap, SubjectNode, PrerequisiteEditor
│   │       ├── subjectMap/        # SubjectMap, UnitNode, TopicNode
│   │       ├── sheets/            # SheetListPanel, SheetListItem
│   │       ├── sheetEditor/       # SheetEditor, EditorToolbar
│   │       └── export/            # ExportDialog
│   ├── hooks/                     # useAuth, useCareers, useSubjects, useCareerMap,
│   │                              # useSubjectMap, useSheets, useSheet,
│   │                              # useExplorerTree, useHotkeys
│   ├── services/                  # supabase.client, cache, crudService (fábrica),
│   │                              # careers, subjects, units, topics, sheets,
│   │                              # prerequisites
│   ├── lib/
│   │   ├── id.js
│   │   ├── graph/                 # validateDag.js, dagreLayout.js, subjectStatus.js
│   │   ├── markdown/              # serialize.js, parse.js
│   │   └── export/                # toSingleMarkdown.js, toZip.js, frontmatter.js
│   ├── constants/                 # routes.js, storageKeys.js, palette.js,
│   │                              # subjectStatus.js, prerequisiteKinds.js
│   └── types/
│       └── models.js              # Typedefs JSDoc del modelo de datos
├── supabase/
│   └── migrations/                # SQL versionado del esquema + RLS
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
4. **`@layer components`** en `index.css` — clases reutilizables (`.btn`, `.card`).

### Paleta base (design system)

| Token | Uso | Valor de referencia |
|-------|-----|---------------------|
| `accent` (verde) | Color de marca / acciones primarias | `#22c55e` (green-500) |
| `bg` | Fondo principal (modo oscuro) | gris muy oscuro |
| `surface` | Tarjetas / paneles | gris oscuro |
| `text` | Texto principal | gris claro |

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

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | `HomePage` | Inicio / bienvenida |
| `/entrar` | `LoginPage` | Acceso (email + contraseña). Pública |
| `/carreras` | `CareersPage` | **Workspace**: panel de inicio con las carreras (estilo VSCode) |
| `/carreras/:careerId` | `CareerMapPage` | Canvas de materias + correlativas (React Flow + dagre) |
| `/materias/:subjectId` | `SubjectMapPage` | Canvas de unidades → temas + panel de hojas |
| `/hojas/:sheetId` | `SheetPage` | Editor de la hoja (TipTap) |
| `/perfil` | `ProfilePage` | Perfil (placeholder) |

> Las rutas y sus helpers (`careerPath`, `subjectMapPath`, `sheetPath`) están en
> `src/constants/routes.js`.

**Rutas retiradas** (jerarquía anterior, ver ADR-010): `/carpetas` y `/carpetas/:folderId`
quedan reemplazadas por `/carreras` y `/carreras/:careerId`.

### Rutas protegidas

Todo lo que toca datos del usuario cuelga de `<RequireAuth>`
(`src/components/layout/RequireAuth.jsx`). **No es cosmético**: las políticas RLS son
`for all to authenticated`, así que sin sesión `auth.uid()` es `NULL`, las consultas
devuelven vacío y los `INSERT` fallan. Sin el guard, la app se vería rota en vez de pedir
login. `/` y `/entrar` son las únicas rutas públicas.

### Shell de navegación

A partir de `/carreras`, todas las vistas se renderizan dentro de `WorkspaceLayout`, que
aporta de forma persistente:

- **Explorador** lateral (árbol colapsable con los 5 niveles), siempre visible en desktop.
- **Barra de tabs** con las hojas abiertas.
- **Command Palette** (`Ctrl+K`) para saltar a cualquier hoja por nombre.

> El canvas es un **modo de exploración**, no el único camino: toda la navegación debe ser
> posible solo con explorador + palette (requisito de mobile, donde arrastrar nodos no
> funciona bien).
