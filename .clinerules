<!-- COPIA de CLAUDE.md (fuente de verdad). No editar acá: editar CLAUDE.md y volver a copiarlo. -->

# Studree — Reglas para IA (Método AInnovate v2)

> **ATENCIÓN IA:** Este proyecto usa **Documentation-Driven Development**.
> **ANTES** de escribir CUALQUIER línea de código, DEBES leer los docs relevantes.
> Documento completo del método: `metodo_ainnovate.md` (raíz del proyecto).

## Contexto del Proyecto

- **Studree**: plataforma web para organizar materias de estudio como **árboles
  conceptuales interactivos** (Study + Tree).
- **Stack:** React 18 + Vite + **JavaScript (JSDoc, NO TypeScript)** + TailwindCSS +
  React Flow (`@xyflow/react`) + React Router DOM.
- **Persistencia:** **Supabase** (Postgres + Auth + RLS) es la fuente de verdad;
  `localStorage` es solo cache optimista (ADR-007).
- **Jerarquía:** Carrera → Materia → Hoja (ADR-014). La materia se ve como **una carpeta**
  de hojas fechadas sin título (ADR-017); los temas son los `#` y `[[Tema]]` salta a uno.
- **Diseño:** modo oscuro + **acento verde** con la "lámpara" (ADR-018): papel crema con el
  color de la materia, Bricolage Grotesque + Inter, íconos SVG (nunca emojis).

## Protocolo Obligatorio (antes de cada cambio)

1. LEER `docs/01-project-overview.md` (visión, stack, estado)
2. LEER `docs/02-architecture.md` (estructura, convenciones, ADRs)
3. IDENTIFICAR qué feature se modifica
4. LEER `docs/features/[feature].md`
5. Si NO existe doc para la feature → **CREARLO antes de codear**
6. Si se toca el modelo de datos → LEER `docs/DB_SCHEMA.md`
7. Si se toca services/API → LEER `docs/API_DOCS.md`
8. Si se toca seguridad / datos del usuario / env → LEER `docs/03-security.md`
9. ANTES de implementar una feature → revisar `docs/SKILLS.md`

## Los 12 Mandamientos del Vibe Coding (INVIOLABLES)

| # | Mandamiento | Regla |
|---|-------------|-------|
| I | NO ALUCINARÁS | Solo implementar exactamente lo pedido. Ante duda → PREGUNTAR |
| II | SEPARARÁS LÓGICA DE ESTILOS | Lógica de negocio en `services/`+`hooks/`; presentación (Tailwind) en componentes |
| III | DOCUMENTARÁS CADA CAMBIO | Ningún cambio sin su doc correspondiente |
| IV | ACTUALIZARÁS EL CHANGELOG | Cada request que toque código → nueva entrada en `CHANGELOG.md` |
| V | DOCUMENTARÁS EL MODELO DE DATOS | Cada cambio de datos → `docs/DB_SCHEMA.md` |
| VI | SEGUIRÁS LA ESTRUCTURA | Respetar la estructura de `docs/02-architecture.md`. No crear carpetas sin permiso |
| VII | USARÁS EL SISTEMA DE ESTILOS | Respetar `tailwind.config.js`. NO inventar colores/tamaños fuera del design system |
| VIII | PROTEGERÁS CREDENCIALES | Nada hardcodeado. En frontend `VITE_*` es PÚBLICO: jamás secretos ahí |
| IX | TIPARÁS CON JSDoc | Este proyecto usa JavaScript + JSDoc (NO TypeScript, ver ADR-002). Tipar props y retornos |
| X | VALIDARÁS ANTES DE ENTREGAR | Checklist: build ok, funciona, docs + CHANGELOG, sin deps extra, sin secretos |
| XI | MANTENDRÁS CONSISTENCIA | Leer archivos existentes y seguir SUS convenciones |
| XII | COMUNICARÁS CON CLARIDAD | Resumen de acciones al terminar |

## 4 Leyes de Operación

1. **LEER ANTES DE ACTUAR** — Consultar docs antes de cualquier cambio.
2. **NO ROMPER LO QUE FUNCIONA** — Si hay conflicto con la arquitectura: detenerse,
   advertir, explicar impacto y pedir autorización.
3. **DOCUMENTACIÓN CONTINUA** — Actualizar docs + CHANGELOG después de cada cambio.
4. **SEGURIDAD** — Nunca deploy/push/cambios destructivos sin confirmación explícita.

## Documentación del Proyecto

| Doc | Cuándo leerlo |
|-----|--------------|
| `docs/01-project-overview.md` | SIEMPRE (visión, stack, estado) |
| `docs/02-architecture.md` | SIEMPRE (estructura, convenciones, ADRs) |
| `docs/03-security.md` | Si se toca datos del usuario, env, (futuro) auth |
| `docs/04-deployment.md` | Si se toca deploy/build |
| `docs/DB_SCHEMA.md` | Si se toca el modelo de datos / localStorage |
| `docs/API_DOCS.md` | Si se toca services/API |
| `docs/SKILLS.md` | ANTES de implementar cualquier feature nueva |
| `docs/features/*.md` | El doc de la feature que se modifica |

## Tabla de Lookup

> Cuando se modifica un archivo, leer primero el doc correspondiente.
> _(La IA agrega entradas aquí conforme se crean features.)_

| Archivo que se modifica | Doc que se debe leer primero |
|------------------------|------------------------------|
| `src/services/*.service.js` | `docs/API_DOCS.md` + `docs/DB_SCHEMA.md` |
| `src/services/supabase.client.js` · `.env*` (claves Supabase) | `docs/03-security.md` + `docs/API_DOCS.md` |
| `supabase/migrations/*.sql` | `docs/DB_SCHEMA.md` + `docs/03-security.md` (RLS) |
| `src/constants/*` (claves de storage) | `docs/DB_SCHEMA.md` |
| `tailwind.config.js` / `src/index.css` / `constants/palette.js` | `docs/02-architecture.md` (sistema de estilos) |
| `features/folders/**` · `features/subjects/**` · `useFolders` · `useSubjects` | ⚠️ Obsoleto → `docs/features/careers.md` |
| `features/conceptMap/**` · `useConceptMap` · `lib/treeLayout.js` | ⚠️ Reemplazado → `docs/features/subject-map.md` |
| `features/resources/**` · `useResources` · `resources.service.js` · `constants/resourceTypes.js` | `docs/features/resources.md` |
| `layout/WorkspaceLayout` · `layout/TabBar` · `layout/Header` · `features/explorer/**` · `features/commandPalette/**` · `useExplorerTree` · `useHotkeys` · `lib/search/**` | `docs/features/navigation-shell.md` |
| `public/**` · `index.html` (favicon, assets estáticos) | `docs/features/navigation-shell.md` (sección Logo) |
| `services/trash.service.js` · `useTrash` · `useTrashPurge` · `pages/TrashPage.jsx` · `features/trash/**` · `lib/trash/**` | `docs/features/trash.md` |
| `features/careerMap/**` · `useCareerMap` · `prerequisites.service.js` · `lib/graph/**` · `useFlowCanvas` | `docs/features/career-map.md` |
| `pages/CareersPage.jsx` · `features/careers/**` · `useCareers` | `docs/features/careers.md` |
| `services/dataEvents.js` · `services/crudService.js` | `docs/API_DOCS.md` |
| `constants/subjectTones.js` · `components/ui/Icon.jsx` · clases `.lamp`/`.glass`/`.paper-sheet` | `docs/02-architecture.md` (ADR-018, sistema de estilos) |
| `pages/SubjectFolderPage.jsx` · `pages/SheetRedirectPage.jsx` · `features/folder/**` · `useFolder` · `useReadingMode` · `useSheetLocation` · `lib/editor/**` · `lib/format/**` · `lib/markdown/headings.js` | `docs/features/folder.md` |
| `features/sheetEditor/**` · `lib/markdown/**` · `useSheetAutosave` · `sheets.service.js` | `docs/features/sheet-editor.md` |
| `constants/sheetTemplates.js` · `services/sheetTemplates.service.js` · `useSheetTemplates` · `features/templates/**` | `docs/features/sheet-templates.md` |
| `features/export/**` · `lib/export/**` · `useExportTree` | `docs/features/markdown-export.md` |
| `lib/import/**` · `services/import.service.js` · `useImport` · `features/import/**` | `docs/features/import.md` |
| `services/attachments.service.js` · `useFolderAttachments` · `lib/attachments/**` · `lib/editor/attachmentNodes.js` · `features/attachments/**` | `docs/features/attachments.md` |
| `docs/superpowers/specs/**` · `docs/superpowers/plans/**` | Specs y planes de diseño (histórico de decisiones; no reemplazan a los docs de features) |
| `pages/ProfilePage.jsx` · `layout/AuthProvider.jsx` · `hooks/useAuth.js` | `docs/features/profile.md` |
| `pages/HomePage.jsx` · `features/home/**` · `useHome` · `home.service.js` · `importantDates/tasks/quickNotes.service.js` · `lib/home/**` · `constants/homeLimits.js` | `docs/features/home.md` |
| `services/supabase.client.js` · `services/cache.service.js` · `supabase/migrations/**` | `docs/DB_SCHEMA.md` + `docs/03-security.md` |
| `src/components/**` (otros) | `docs/features/[feature].md` |
| `.env*` | `docs/03-security.md` |

## Reglas del rediseño (ADR-007 a ADR-018)

> Vigentes desde 2026-08-24 (actualizadas 2026-10-15). Reemplazan a ADR-003, ADR-006,
> ADR-008, ADR-015 y, en la profundidad, ADR-010.

- **Supabase es la fuente de verdad**; `localStorage` es SOLO cache optimista descartable.
- **Layout híbrido (ADR-012) — solo canvas de carrera:** dagre por defecto; las posiciones
  manuales (`subjects.pos_x`/`pos_y`) se guardan SOLO por arrastre o creación en el lienzo,
  y "Reordenar" las vuelve a `NULL`.
- **Correlativas opcionales por carrera (ADR-013):** respetar `careers.uses_prerequisites`.
- **Validar el DAG de correlativas al GUARDAR**, nunca al renderizar.
- **Markdown es la fuente de verdad del contenido**; el HTML de TipTap es solo de memoria.
- La jerarquía es **fija de 3 niveles** (ADR-014): Carrera → Materia → Hoja (una tabla por
  nivel). `units`, `topics` y `sheet_links` **ya no existen** (migración 0004).
- **La Carpeta (ADR-017):** la materia muestra todas sus hojas seguidas, en orden
  cronológico (`created_at`), sin reordenar, sobre papel crema (ADR-018). **Las hojas no tienen
  título** (`title` siempre NULL): se muestran por fecha y hora.
- **Colores de materia (ADR-018):** usar `getSubjectTones` / `subjectCssVars`
  (`constants/subjectTones.js`); nunca el color crudo de la materia para texto.
- **Temas = headings `#` del Markdown**; el índice se calcula en el cliente
  (`extractHeadings`). `[[Tema]]` salta a un tema de la misma materia: no hay tabla de links.
- Una hoja nueva no se guarda hasta tener contenido. Antes de borrar una hoja, cancelar su
  autosave pendiente.
- No hay canvas de hojas. Posiciones (solo canvas de carrera): siempre en lote con
  `savePositions` (RPC `save_node_positions`, ADR-016).
- Las listas paginan (PostgREST corta en 1000 filas): usar `crudService.list`/`listByParents`.
- Funciones SQL nuevas: `security invoker`, nunca `security definer` sin revisión.
- Los archivos `.cursorrules`, `.windsurfrules`, `.clinerules` y
  `.github/copilot-instructions.md` son **copias** de este archivo: al editarlo, copiarlo.
