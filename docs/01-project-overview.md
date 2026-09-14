# Studree

> Documento base del Método AInnovate — **LEER SIEMPRE** antes de cualquier cambio.

## Visión

Studree es una plataforma web que ayuda a estudiantes a organizar sus materias y
recursos de estudio de forma visual, mediante **árboles conceptuales interactivos**.
Su nombre une *Study + Tree*: cada materia crece como un árbol, donde el tronco es la
materia, las ramas son las unidades/temas y las hojas son los apuntes, archivos,
enlaces y recursos relacionados.

## Objetivos

- Centralizar apuntes, archivos, enlaces y material de estudio en un solo lugar.
- Reemplazar las carpetas tradicionales por **mapas conceptuales interactivos**.
- Permitir explorar visualmente cómo se conectan los conceptos de una materia.
- Ofrecer una experiencia moderna, limpia y minimalista (modo oscuro, acento verde).
- Lograr un acceso rápido a todo el contenido de estudio.

## Público objetivo

- Estudiantes de nivel secundario.
- Estudiantes universitarios.
- Personas que realizan cursos o capacitaciones.
- Cualquier persona que quiera organizar su material de estudio de manera visual.

## Stack Técnico

| Capa | Tecnología | Versión | Notas |
|------|-----------|---------|-------|
| Frontend | React | 18 | UI por componentes |
| Build tool | Vite | 5 | Dev server + bundling |
| Lenguaje | JavaScript (ES2022) + JSDoc | - | Sin TypeScript (ver ADR-002) |
| Estilos | TailwindCSS | 3.4 | Design system en `tailwind.config.js` |
| Mapas conceptuales | React Flow (`@xyflow/react`) | 12 | Árboles/nodos interactivos |
| Auto-layout | `@dagrejs/dagre` | - | Posiciones de nodos; no se guardan coordenadas (ADR-008) |
| Editor de hojas | TipTap (ProseMirror) | 3 | Markdown como fuente de verdad (ADR-011) |
| Routing | React Router (`react-router-dom`) | 6 | Navegación SPA |
| Persistencia | **Supabase (Postgres)** | - | Fuente de verdad (ADR-007) |
| Cache | `localStorage` (navegador) | - | Cache optimista de la UI (ADR-007) |
| Backend | Supabase (BaaS) | - | Sin servidor propio |
| Base de datos | PostgreSQL (Supabase) | - | Esquema en `docs/DB_SCHEMA.md` |
| Auth | Supabase Auth | - | Necesaria para RLS (ver `docs/03-security.md`) |
| Deploy | _Pendiente_ | - | Candidatos: Vercel / Netlify / GitHub Pages |

## Estado del Proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Setup + estructura base (Método AInnovate) | ✅ Completada |
| 2 | Carpetas (carrera/curso) + materias (CRUD) | ✅ Completada |
| 3 | Mapa conceptual interactivo por materia (React Flow, híbrido) | ✅ Completada (base) |
| 4 | Apuntes, enlaces y recursos en los nodos (sin subir binarios) | ✅ Completada (base) |
| 5 | Buscador de contenido + perfil + responsive (mobile) | 🟡 En progreso (responsive ✅; buscador y perfil pendientes) |
| 6 | Backend + autenticación + persistencia remota | 🟡 En progreso (env + RLS documentados; ver Fase 7.1) |

### Fase 7 — Shell de navegación (rediseño, 2026-08-24)

Rediseño de la navegación a una jerarquía de 5 niveles
(**Carrera → Materia → Unidad → Tema → Hoja**) con Supabase como fuente de verdad.
Ver ADR-007 a ADR-011 en `docs/02-architecture.md`.

| Sub-fase | Descripción | Doc | Estado |
|----------|-------------|-----|--------|
| 7.0 | Documentación del rediseño (ADRs, schema, features) | este bloque | ✅ Completada |
| 7.1 | Modelo de datos + validación de ciclos + services + auth | `DB_SCHEMA.md` | ✅ Completada y verificada end-to-end (28/28) |
| 7.2 | Shell: explorador + tabs + command palette | `features/navigation-shell.md` | ✅ Completada |
| 7.3 | Canvas de carrera (React Flow + dagre + correlativas) | `features/career-map.md` | ✅ Completada |
| 7.4 | Canvas de materia (unidades/temas) + panel de hojas | `features/subject-map.md` | ✅ Completada |
| 7.5 | Editor TipTap con Markdown como fuente de verdad | `features/sheet-editor.md` | ✅ Completada |
| 7.6 | Export a `.md` único y luego a `.zip` | `features/markdown-export.md` | ⬜ Pendiente |

> **Mobile** queda en el roadmap pero no es el foco de esta etapa: el canvas con nodos
> arrastrables no funciona bien en táctil, así que la navegación debe poder resolverse
> igual solo con el explorador y el command palette.

## Identidad Visual

- **Modo oscuro** como diseño principal.
- Tonos **grises oscuros** para favorecer la concentración.
- Color de **acento verde** (simboliza crecimiento y aprendizaje).
- Diseño **minimalista** y navegación basada en mapas conceptuales.

## Principio Fundamental

> **El conocimiento no se guarda en carpetas, crece como un árbol.**
