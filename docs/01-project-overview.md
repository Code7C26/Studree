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
| Routing | React Router (`react-router-dom`) | 6 | Navegación SPA |
| Persistencia | `localStorage` (navegador) | - | Sin backend aún (ver ADR-003) |
| Backend | _Pendiente_ | - | No definido en esta etapa |
| Base de datos | _Pendiente_ | - | No definida en esta etapa |
| Auth | _Pendiente_ | - | No definida en esta etapa |
| Deploy | _Pendiente_ | - | Candidatos: Vercel / Netlify / GitHub Pages |

## Estado del Proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Setup + estructura base (Método AInnovate) | ✅ Completada |
| 2 | Carpetas (carrera/curso) + materias (CRUD) | ✅ Completada |
| 3 | Mapa conceptual interactivo por materia (React Flow, híbrido) | ✅ Completada (base) |
| 4 | Apuntes, enlaces y recursos en los nodos (sin subir binarios) | ✅ Completada (base) |
| 5 | Buscador de contenido + perfil + responsive (mobile) | 🟡 En progreso (responsive ✅; buscador y perfil pendientes) |
| 6 | Backend + autenticación + persistencia remota | ⬜ Pendiente |

## Identidad Visual

- **Modo oscuro** como diseño principal.
- Tonos **grises oscuros** para favorecer la concentración.
- Color de **acento verde** (simboliza crecimiento y aprendizaje).
- Diseño **minimalista** y navegación basada en mapas conceptuales.

## Principio Fundamental

> **El conocimiento no se guarda en carpetas, crece como un árbol.**
