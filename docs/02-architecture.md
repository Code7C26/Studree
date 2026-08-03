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
| Routing | React Router DOM 6 | Navegación entre páginas (SPA) |
| Persistencia | `localStorage` | Guardado local de datos del usuario |
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
├── public/                        # Assets estáticos servidos tal cual
├── src/
│   ├── main.jsx                   # Punto de entrada (monta React)
│   ├── App.jsx                    # Componente raíz + rutas
│   ├── index.css                  # Tailwind + variables de tema globales
│   ├── pages/                     # Páginas/vistas (una por ruta)
│   │   ├── HomePage.jsx
│   │   ├── FoldersPage.jsx        # Lista de carpetas (carreras/cursos)
│   │   ├── FolderPage.jsx         # Materias de una carpeta
│   │   ├── SubjectMapPage.jsx     # Mapa conceptual de una materia
│   │   └── ProfilePage.jsx
│   ├── components/
│   │   ├── ui/                    # Base: Button, Modal, Drawer, TextField,
│   │   │                          #       ConfirmDialog, EmptyState, ColorPicker
│   │   ├── layout/                # AppLayout, Header
│   │   └── features/
│   │       ├── folders/           # FolderCard, FolderFormModal
│   │       ├── subjects/          # SubjectCard, SubjectFormModal
│   │       ├── conceptMap/        # ConceptMap, TopicNode, TopicFormModal
│   │       └── resources/         # ResourcePanel, ResourceItem, ResourceFormModal
│   ├── hooks/                     # useFolders, useSubjects, useConceptMap, useResources
│   ├── services/                  # storage / folders / subjects / nodes / resources
│   ├── lib/                       # id.js, treeLayout.js
│   ├── constants/                 # routes.js, storageKeys.js, palette.js, resourceTypes.js
│   └── types/
│       └── models.js              # Typedefs JSDoc del modelo de datos
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

```
Componente (UI)  →  hook (use*)  →  service  →  localStorage
       ▲                                            │
       └────────────── estado / re-render ──────────┘
```

- Los **componentes** no acceden directamente a `localStorage`; lo hacen vía `services/`.
- Los **services** encapsulan leer/escribir/serializar datos.
- Los **hooks** exponen estado y acciones a los componentes.

## Variables de Entorno

| Variable | Descripción | Tipo | Requerida |
|----------|-------------|------|-----------|
| `VITE_APP_NAME` | Nombre visible de la app | pública | NO (default: "Studree") |

> En frontend, toda variable `VITE_*` es **pública** (se incluye en el bundle).
> Ver `docs/03-security.md`. Cuando exista backend se agregarán aquí variables como
> `VITE_API_URL`, y los **secretos vivirán solo en el servidor**.

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
**Contexto:** El usuario pidió un mapa "estilo Obsidian". Obsidian usa un grafo
force-directed (con física), que requeriría una librería extra (ej. react-force-graph).
**Decisión:** Implementar un mapa **híbrido** con React Flow (ya instalado): auto-layout
jerárquico de base (`src/lib/treeLayout.js`) + nodos arrastrables, zoom y paneo libres.
Si el usuario mueve un nodo, su posición manual se persiste y prevalece sobre el layout.
**Consecuencias:** No se agregan dependencias de física. El layout jerárquico se calcula
en cliente; las posiciones manuales se guardan en `TreeNode.position`.

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | `HomePage` | Inicio / bienvenida |
| `/carpetas` | `FoldersPage` | Lista de carpetas (carreras/cursos) |
| `/carpetas/:folderId` | `FolderPage` | Materias de una carpeta |
| `/materias/:subjectId` | `SubjectMapPage` | Mapa conceptual de una materia |
| `/perfil` | `ProfilePage` | Perfil (placeholder) |

> Las rutas y sus helpers (`folderPath`, `subjectMapPath`) están en `src/constants/routes.js`.
