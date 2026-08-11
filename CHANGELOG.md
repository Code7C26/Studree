# Changelog — Studree

> Formato basado en [Keep a Changelog](https://keepachangelog.com/) y
> [Semantic Versioning](https://semver.org/).
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.

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
