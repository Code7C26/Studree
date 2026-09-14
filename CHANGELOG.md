# Changelog — Studree

> Formato basado en [Keep a Changelog](https://keepachangelog.com/) y
> [Semantic Versioning](https://semver.org/).
> Cada entrada incluye: fecha, tipo de cambio, archivos afectados y request original.

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
