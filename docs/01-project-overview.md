# Studree

> Documento base del Método AInnovate — **LEER SIEMPRE** antes de cualquier cambio.

## Visión

Studree es una plataforma web que ayuda a estudiantes a organizar sus materias y
recursos de estudio de forma visual, mediante **árboles conceptuales interactivos**.
Su nombre une *Study + Tree*: cada carrera o curso es un árbol (y una **carpeta
escolar**), las materias son sus ramas (los **separadores de colores**) y las **hojas**
son los apuntes, todas seguidas y fechadas dentro de su materia, con un índice de temas
para orientarse (Carrera → Materia → Hoja, ADR-014 y ADR-017).

**Empresa: Mnemora** (definida el 2026-11-11). Studree es su producto, como Claude lo es de
Anthropic. El nombre viene del griego *mnḗmē* ("memoria"): la empresa construye la memoria de lo
que aprendés. Aparece en el pie de la landing ("Studree es un producto de Mnemora · ©"), en
`<meta name="author">`, en `package.json` (`author`) y en el pie de los mails de Supabase.

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
| Auto-layout | `@dagrejs/dagre` | - | Layout por defecto; las posiciones manuales sí se guardan (ADR-012) |
| Editor de hojas | TipTap (ProseMirror) | 3 | Markdown como fuente de verdad (ADR-011) |
| Routing | React Router (`react-router-dom`) | 6 | Navegación SPA |
| Persistencia | **Supabase (Postgres)** | - | Fuente de verdad (ADR-007) |
| Cache | `localStorage` (navegador) | - | Cache optimista de la UI (ADR-007) |
| Storage | Supabase Storage | - | Bucket privado `attachments` para los adjuntos de las hojas (ADR-020) |
| Backend | Supabase (BaaS) | - | Sin servidor propio |
| Base de datos | PostgreSQL (Supabase) | - | Esquema en `docs/DB_SCHEMA.md` |
| Auth | Supabase Auth | - | Necesaria para RLS (ver `docs/03-security.md`) |
| Deploy | Vercel | - | https://studree.vercel.app (ver `docs/04-deployment.md`) |

## Estado del Proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Setup + estructura base (Método AInnovate) | ✅ Completada |
| 2 | Carpetas (carrera/curso) + materias (CRUD) | ✅ Completada |
| 3 | Mapa conceptual interactivo por materia (React Flow, híbrido) | ✅ Completada (base) |
| 4 | Apuntes, enlaces y recursos en los nodos (sin subir binarios) | ✅ Completada (base) |
| 5 | Buscador de contenido + perfil + responsive (mobile) | ✅ Completada (responsive, buscador de contenido en el Command Palette y perfil) |
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
| 7.6 | Export a `.md` único y a `.zip` | `features/markdown-export.md` | ✅ Completada |

### Fase 8 — Canvas estilo n8n + correlativas opcionales (2026-10-14)

| Cambio | Doc | Estado |
|--------|-----|--------|
| Nodos arrastrables con posición guardada + "Reordenar" (ADR-012) | `features/career-map.md`, `features/subject-map.md` | ✅ |
| Crear desde el lienzo: "+" en nodos, doble click / click derecho, conectar para correlativas | idem | ✅ |
| Carrera o curso: `uses_prerequisites` (ADR-013) | `features/careers.md` | ✅ |
| Panel de carreras con tarjetas grandes, métricas y progreso | `features/careers.md` | ✅ |
| Bugs: confirmación al borrar, explorador sin refresco, consultas N+1, bundle de 1,2 MB | `CHANGELOG.md` 0.10.0 | ✅ |

> Migración `0002_manual_layout_and_prereq_toggle.sql` aplicada el 2026-10-14.

### Fase 9 — Estabilizar (Fase 0 del diagnóstico, 2026-10-14)

Diagnóstico completo en `docs/superpowers/specs/2026-10-14-diagnostico-fases-0-1-design.md`.

| Cambio | Estado |
|--------|--------|
| Borrador del editor que pisaba cambios de otro dispositivo + autosave perdido al salir | ✅ |
| Listas paginadas (no se cortan en 1000 filas); explorador sin bajar el contenido; búsqueda de contenido en el servidor | ✅ |
| Tabs de hojas borradas / títulos viejos; tabs visibles para el siguiente usuario | ✅ |
| Posiciones del canvas en un solo request (ADR-016); canvas que se actualiza si otra vista cambia datos | ✅ |
| Logo SVG nuevo (el JPEG parecía un placeholder y decía "STUIDREE") | ✅ |
| Código muerto (`useSubjects`, `useEntityById`) y reglas de IA desactualizadas | ✅ |

### Fase 10 — 3 niveles + canvas de hojas (Fase 1 del diagnóstico, 2026-10-14)

| Cambio | Doc | Estado |
|--------|-----|--------|
| Carrera → Materia → **Hoja** (ADR-014), migración 0003 con datos migrados | `DB_SCHEMA.md` | ✅ |
| Canvas de materia con hojas como nodos y `[[links]]` como aristas (ADR-015) + vista Lista | `features/subject-map.md` | ✅ → reemplazado por la Carpeta (Fase 11) |
| Panel "Enlaces" en el editor (salientes, backlinks, no resueltos) | `features/sheet-editor.md` | ✅ |
| Export a 3 niveles + **Exportar todo** + **Copiar para IA** + headings corridos + nombres sin pisarse | `features/markdown-export.md` | ✅ |

> Migración `0003_three_levels_and_sheet_links.sql` aplicada el 2026-10-14.

### Fase 11 — La Carpeta (2026-10-14)

Spec: `docs/superpowers/specs/2026-10-14-carpeta-design.md` · plan:
`docs/superpowers/plans/2026-10-14-carpeta.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| La materia se ve como una carpeta: hojas seguidas, fechadas y sin título, sobre papel blanco (ADR-017) | `features/folder.md` | ✅ |
| Índice de temas, buscador de la materia (`Ctrl+F`), `[[Tema]]` clickeable, modo lectura | `features/folder.md` | ✅ |
| Se elimina el canvas de hojas; tabs por materia; explorador Carrera → Materia | `features/navigation-shell.md` | ✅ |
| Estados de materia distinguibles (ícono + color) | `features/career-map.md` | ✅ |
| Migración 0004: títulos → temas; se borran `sheet_links`, `units`, `topics` | `DB_SCHEMA.md` | ✅ |
| Medir rendimiento con una materia grande | `features/folder.md` | ⏳ pendiente (prueba manual) |

> Migración `0004_carpeta.sql` aplicada el 2026-10-14.

### Fase 12 — Inicio útil (2026-10-14)

Hecha en paralelo con la Fase 11 y mergeada el 2026-10-15. Spec:
`docs/superpowers/specs/2026-10-14-inicio-design.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| `/` es el **Inicio** dentro del workspace (con sesión); la bienvenida pública se eliminó | `features/home.md` | ✅ |
| Seguí donde dejaste (última hoja editada → `/materias/:id?hoja=:id`), resumen de la semana, próxima fecha | `features/home.md` | ✅ |
| Calendario mensual con fechas importantes y "Próximas"; tareas con fecha límite; notas rápidas | `features/home.md` | ✅ |
| Tablas `important_dates`, `tasks`, `quick_notes` + RLS | `DB_SCHEMA.md` | ✅ |

> Migración `0005_home.sql` aplicada el 2026-10-15.

### Rediseño visual (2026-10-15, ADR-018)

Spec: `docs/superpowers/specs/2026-10-15-rediseno-visual-design.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Carpeta: hojas centradas en la pantalla, papel crema con renglones y el color de la materia (margen, títulos, links, índice) | `features/folder.md` | ✅ |
| Inicio: saludo, grilla bento de vidrio, hoja que asoma, notas como post-it; sin explorador ni tabs | `features/home.md` | ✅ |
| Shell: logo original, buscador `Ctrl K` en el header, tabs como pastillas con color, explorador cerrado por defecto | `features/navigation-shell.md` | ✅ |
| Estilo: luz de lámpara, Bricolage Grotesque + Inter, íconos SVG, foco visible | `02-architecture.md` (ADR-018) | ✅ |

### Fase 13: Papelera, adjuntos, plantillas e importar (2026-10-15)

Spec: `docs/superpowers/specs/2026-10-15-fase-13-design.md` · plan:
`docs/superpowers/plans/2026-10-15-fase-13.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Papelera: borrar manda a la papelera 30 días, con "Deshacer", página `/papelera` y purga desde la app (ADR-019) | `features/trash.md` | ✅ |
| Adjuntos en las hojas (soltar, pegar, clip): bucket privado y referencias `adjunto:<id>` en el Markdown (ADR-020) | `features/attachments.md` | ✅ |
| Plantillas de hoja: 4 de fábrica, propias, guardar y administrar | `features/sheet-templates.md` | ✅ |
| Importar `.md` y `.zip` (también un export completo de Studree o un vault de Obsidian) | `features/import.md` | ✅ |
| Export `.zip` con los adjuntos | `features/markdown-export.md` | ✅ |
| Verificación en el navegador de punta a punta | los 4 docs | ⏳ pendiente (prueba manual) |

> Migración `0006_fase13.sql` aplicada el 2026-10-15. Dependencia nueva:
> `@tiptap/extension-image@3.31.3`.

### Fase 14: Asistente de IA — el Brote (2026-10-19, ADR-021)

Spec: `docs/superpowers/specs/2026-10-19-asistente-ia-design.md` · plan:
`docs/superpowers/plans/2026-10-19-fase-14-asistente.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| El Brote flotante, panel lateral y chat en streaming (texto plano), modo "Mis apuntes" / "Con conocimiento externo" | `features/assistant.md` | ✅ |
| Edge Function `assistant` (Gemini): herramientas de solo lectura con el JWT del usuario, mapa liviano, cuotas en el servidor (ADR-021) | `features/assistant.md`, `API_DOCS.md` | ✅ |
| Atajos sobre el texto (Explicar, Refutar, Completar, Preguntame) y propuestas que el usuario acepta o rechaza | `features/assistant.md` | ✅ |
| Pruebas tipo examen, repaso de errores, resúmenes, plan de estudio, detector de huecos y conexiones entre materias | `features/assistant.md` | ✅ |
| Tablas `user_plans`, `ai_usage`, `quiz_attempts`, `weak_topics` + RLS | `DB_SCHEMA.md` | ✅ |
| Desplegar la función y cargar los secrets de Gemini | `features/assistant.md` (Cómo desplegar) | ✅ desplegada |
| Verificación en el navegador (con la función desplegada) | `features/assistant.md` | ✅ verificada por el estudiante el 2026-10-26 |
| Prueba con dos cuentas (una no ve apuntes de la otra por el asistente) | `features/assistant.md` | ⏳ pendiente (prueba manual) |

> Migraciones `0007_asistente.sql` y `0008_quiz_grade_usage.sql` aplicadas el 2026-10-19.
> Los topes de uso son **provisorios** (`supabase/functions/assistant/config.js`).

### Fase 14.1: mejoras del Brote y "Mi estudio" (2026-10-22, ADR-022)

Spec: `docs/superpowers/specs/2026-10-22-brote-mejoras-design.md` · plan:
`docs/superpowers/plans/2026-10-22-fase-14-1-brote-mejoras.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Los atajos responden en una tarjeta debajo del texto (sin abrir el panel); propuestas junto a su respuesta y achicadas a una línea al resolverse | `features/assistant.md`, `features/folder.md` | ✅ |
| Examen en ventana grande, con registro de todas las preguntas y aviso al cerrar la pestaña | `features/assistant.md` | ✅ |
| Resumen estructurado, guardado automático, ventana, PDF por impresión del navegador y "Guardar como hoja" | `features/assistant.md` | ✅ |
| Sección **Mi estudio** (`/estudio`): resúmenes y exámenes guardados, con filtro por materia | `features/study.md` | ✅ |
| Migración `0009_mi_estudio.sql` (`summaries`, `quiz_attempts` ampliada) | `DB_SCHEMA.md` | ✅ aplicada el 2026-10-22 |
| Volver a desplegar la Edge Function `assistant` (resumen estructurado) | `features/assistant.md` (Cómo desplegar) | ✅ desplegada el 2026-10-23 |
| Verificación en el navegador de punta a punta | los 2 docs | ✅ verificada por el estudiante el 2026-10-26 |

> Sin dependencias nuevas: el PDF usa la impresión del navegador (ADR-022).
### Landing pública (2026-10-21)

Spec: `docs/superpowers/specs/2026-10-21-landing-design.md` · plan: `docs/superpowers/plans/2026-10-21-landing.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Landing en `/bienvenida`, fuera del layout de la app; presenta la idea "tus apuntes + una IA que los conoce" y el Brote (Fase 14) | `features/landing.md` | ✅ (verificación visual en navegador pendiente del estudiante) |
| La primera visita de un dispositivo por `/` muestra la landing; después, directo al Inicio. Link "Conocé Studree" en el Perfil (2026-11-11) | `features/landing.md` | ✅ |

### Fase 18: Studree en inglés (2026-11-02, ADR-023)

Spec: `docs/superpowers/specs/2026-10-28-ingles-design.md` · plan: `docs/superpowers/plans/2026-10-28-fase-18-ingles.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Selector **Castellano / English** en Perfil; toda la interfaz cambia al instante y el idioma se recuerda (también al cerrar sesión) | `features/i18n.md`, `features/profile.md` | ✅ |
| Diccionario propio por área (sin dependencias nuevas), fechas y orden por idioma, formato de archivos exportados intacto | `features/i18n.md` | ✅ |
| El Brote responde en el idioma del mensaje; topes y errores traducidos por `code` + `reason` | `features/assistant.md`, `API_DOCS.md` | ✅ (falta volver a desplegar la función) |
| Landing en los dos idiomas (sin selector propio) | `features/landing.md` | ✅ |
| Verificación visual de cada pantalla en inglés en el navegador | `features/i18n.md` | ⏳ pendiente (el estudiante) |


### Fase 15: Compartir por link y tarjetas (2026-11-10, ADR-024)

Spec: `docs/superpowers/specs/2026-11-10-fase-15-compartir-tarjetas-design.md` · plan: `docs/superpowers/plans/2026-11-10-fase-15.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| **Compartir** una materia con un link público de solo lectura (un link activo, revocable) | `features/share.md` | ✅ (falta aplicar la migración 0010 y la prueba visual) |
| **Tarjetas** por materia con repaso espaciado por cajas de Leitner | `features/flashcards.md` | ✅ (falta aplicar la migración 0010 y la prueba visual) |
| Vista pública sin adjuntos, con `[[Tema]]` como texto y TipTap en solo lectura | `features/share.md` | ✅ |


### Fase 16: Celular, cámara y lectura sin señal (2026-11-10, ADR-025)

Spec: `docs/superpowers/specs/2026-11-10-fase-16-celular-camara-design.md` · plan: `docs/superpowers/plans/2026-11-10-fase-16.md`.

| Cambio | Doc | Estado |
|--------|-----|--------|
| Carpeta y diálogos adaptados al teléfono (breakpoint `md`) | `features/mobile.md` | ✅ (falta verificación en un teléfono) |
| **Foto a hoja**: cámara solo en celular y transcripción con el Brote (acción `transcribe`, cuota propia) | `features/photo-notes.md` | ✅ (faltan aplicar `0011`, redesplegar `assistant` y probar en un teléfono) |
| PWA instalable y lectura sin señal desde la cache | `features/mobile.md` | ✅ (falta verificación de instalación) |

### Próximas fases (hoja de ruta)

| Fase | Contenido | Estado |
|------|-----------|--------|
| 15 | Compartir por link, flashcards | ✅ 2026-11-10 (`features/share.md`, `features/flashcards.md`); falta aplicar la migración 0010 |
| 16 | **Celular, cámara y lectura sin señal** | ✅ 2026-11-10 (`features/mobile.md`, `features/photo-notes.md`); faltan aplicar 0011, redesplegar y probar en teléfono |
| 17 | **Planes y pago simulado**: pantalla de planes y checkout simulado para la demo (sin procesador de pagos) | ✅ 2026-11-11 (`features/plans.md`, migración `0013` aplicada) |

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
