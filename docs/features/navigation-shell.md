# Feature: Shell de Navegación (explorador + tabs + command palette)

> **Estado:** ✅ Implementado (2026-09-09) · Carpeta: explorador Carrera → Materia, tabs por materia, modo lectura (2026-10-14, ADR-017) · Rediseño: Inicio sin shell, explorador cerrado por defecto, pastillas con color, buscador en el header (2026-10-15, ADR-018)
> **Archivos clave:** `src/components/layout/WorkspaceLayout.jsx`,
> `src/components/layout/TabBar.jsx`,
> `src/components/features/explorer/`, `src/components/features/commandPalette/`,
> `src/hooks/useExplorerTree.js`, `src/hooks/useHotkeys.js`
> **Dependencias nuevas:** ninguna (el filtro del palette se implementa a mano)
>
> Desde ADR-017 el explorador muestra **Carrera → Materia**; las hojas y sus temas viven en
> la carpeta de cada materia (`docs/features/folder.md`).

---

## Descripción

El armazón persistente de la aplicación, inspirado en VSCode. Envuelve todas las vistas a
partir de `/carreras` y aporta tres piezas siempre disponibles: **explorador** lateral,
**barra de tabs** y **command palette**.

## Problema que resuelve

El canvas es lindo para entender la estructura, pero **no escala como método de
navegación**: con decenas de hojas cargadas, llegar a una concreta a fuerza de clicks y
zoom es lento. El explorador da acceso jerárquico directo y el palette da acceso por
nombre en dos teclas.

> **Requisito de mobile:** en pantallas táctiles arrastrar nodos no funciona bien, así que
> **toda** la navegación tiene que poder resolverse solo con explorador + palette, sin
> depender del canvas. Esto no es un extra: es la razón por la que el shell existe.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/layout/WorkspaceLayout.jsx` | Grilla del shell: explorador + tabs + `<Outlet/>`; exporta `OPEN_PALETTE_EVENT` |
| `src/components/layout/TabBar.jsx` | Pastillas de las materias abiertas (activar / cerrar) + botón del explorador |
| `src/components/layout/Header.jsx` | Logo, buscador que abre el palette, navegación (Inicio · Carreras · Mi estudio · Perfil) |
| `src/components/features/explorer/Explorer.jsx` | Panel lateral: buscador + raíz del árbol + entrada "Papelera" al pie |
| `src/components/features/explorer/ExplorerTree.jsx` | Render Carrera → Materia (con cantidad de hojas) |
| `src/components/features/explorer/ExplorerItem.jsx` | Fila: chevron, icono, nombre, acciones |
| `src/components/features/commandPalette/CommandPalette.jsx` | Overlay `Ctrl+K` con búsqueda |
| `src/hooks/useExplorerTree.js` | Árbol completo + estado de expandido/colapsado |
| `src/hooks/useHotkeys.js` | Registro de atajos de teclado |

## Explorador

- Árbol colapsable **Carrera → Materia**. Cada materia muestra cuántas hojas tiene; click
  abre su carpeta.
- Un icono por nivel, para distinguirlos de un vistazo.
- El nodo correspondiente a la ruta actual queda **resaltado y auto-expandido**.
- El estado de expandido persiste en `studree:ui:explorer` (preferencia de UI).
- **Arranca cerrado** en todas las pantallas (ADR-018): se abre con `Ctrl+B` o con el botón
  de la izquierda de la barra de tabs, y lo último que eligió el usuario se recuerda en
  `studree:ui:explorer-open`. Así la Carpeta centra las hojas en la pantalla. En el
  celular (< `md`) siempre arranca cerrado, aunque se haya guardado abierto.
- En mobile se abre como drawer sobre el contenido. Cerrado, el drawer queda `inert` (no
  recibe foco con Tab).
- **En el Inicio (`/`) no hay explorador ni tabs**, y `Ctrl+B` no hace nada ahí.
- **Papelera (Fase 13):** al pie del explorador hay una entrada "Papelera" (ícono `trash`)
  que lleva a `/papelera` (`ROUTES.trash`, página `TrashPage`). Lo que se manda a la papelera
  desaparece del árbol, de las tabs, del `Ctrl+K` y del Inicio. Ver `docs/features/trash.md`.
- Cada fila tiene un botón ✏️ (visible al hover) para renombrar in-line, en
  carreras y materias: `Enter`/blur confirma, `Escape` cancela. La acción vive en
  `useExplorerTree.js` (`renameEntity`). Si falla, el error se muestra debajo de la fila.

## Command Palette (`Ctrl+K`)

- Se abre con `Ctrl+K` (`Cmd+K` en Mac) o con el buscador del header, y se cierra con `Esc`.
  El header vive fuera de `WorkspaceLayout`: emite el evento de ventana
  `studree:open-palette` (`OPEN_PALETTE_EVENT`) y el layout lo escucha. Fuera del
  workspace (Perfil, Entrar) el buscador no se muestra.
- Busca **materias por nombre** y **texto dentro de las hojas** (ver abajo).
- Cada materia muestra su **ruta jerárquica** (`Biología › Genética`) para
  desambiguar hojas con el mismo título.
- Navegación con flechas ↑/↓, `Enter` abre en una tab nueva.
- El matching es *subsecuencia* (tipo fuzzy) implementado a mano, sin dependencias.

### Buscador de contenido (Fase 5, 2026-09-28 · en el servidor desde 2026-10-14)

El palette no busca solo por nombre: también busca dentro del **contenido** (`content_md`)
de las hojas. Es el mismo Ctrl+K, no una pantalla nueva.

- Desde 3 letras y con debounce de 250 ms, `sheetsService.searchContent(q)` hace un
  `ilike` en Supabase (máx. 20 hojas, las más recientes primero). Las respuestas que llegan
  tarde (el usuario siguió escribiendo) se descartan.
- Cada resultado muestra **la materia, la fecha de la hoja y el fragmento**, y abre la
  carpeta posicionada en esa hoja (`/materias/:id?hoja=:sheetId`).
- `src/lib/search/snippet.js` (`buildContentSnippet`) — función pura: busca la query
  (case-insensitive, substring simple, **no** fuzzy) dentro del contenido, limpia la
  sintaxis Markdown más obvia (`#`, `*`, `` ` ``, links) y devuelve un fragmento de ~100
  caracteres alrededor del match, o `null` si no hay coincidencia.
- `CommandPalette.jsx` — un match por **nombre** siempre rankea mejor que uno por
  **contenido** (`CONTENT_MATCH_SCORE = 4`, peor que cualquier score de nombre). Cuando el
  resultado viene por contenido, la fila muestra el fragmento en vez de la ruta jerárquica.
- Dentro de una materia, el buscador propio de la carpeta (`Ctrl+F`) resalta todas las
  coincidencias (ver `folder.md`).
- `%` y `\` de la búsqueda se neutralizan (PostgREST no respeta el escape `\%`); los
  falsos positivos se descartan porque solo se muestra la hoja si `buildContentSnippet`
  encuentra el texto exacto.

**Restricción deliberada:** es `ilike` (substring), no full-text search de Postgres ni
semántica/RAG — la vectorización queda fuera de alcance en esta etapa.

## Atajos

| Atajo | Acción |
|-------|--------|
| `Ctrl+K` / `Cmd+K` | Abrir el command palette |
| `Esc` | Cerrar el palette |
| `↑` / `↓` | Moverse entre resultados |
| `Enter` | Abrir el resultado seleccionado |
| `Ctrl+B` | Mostrar/ocultar el explorador |

## Tabs

- Cada **materia** abierta ocupa una tab, como tener varias carpetas abiertas (ADR-017);
  se persisten en `studree:ui:tabs`. Las tabs viejas de hojas se descartan solas.
- Se ven como **pastillas** con el punto del color de la materia; la activa con fondo
  `soft` y borde de ese color (ADR-018). Cada tab guarda `{ id, title, color }`.
- Click en una tab la activa; la ✕ la cierra. La ✕ se ve siempre en la activa y en las
  demás al pasar el mouse **o con foco**.
- Abrir una hoja ya abierta **activa la tab existente**, no duplica.
- Cada vez que el árbol del explorador termina de cargar (incluida la recarga después de
  borrar o renombrar), se **cierran las tabs de materias que ya no existen** y se
  **actualizan los nombres y colores**.
- En **modo lectura** (carpeta) se ocultan el header, el explorador y las tabs.
- **Capas:** el `<main>` del shell es `lamp relative isolate` (contexto de apilamiento propio). Por
  eso `Modal` (y `ConfirmDialog`) y `UndoToast` se renderizan **por portal en `document.body`**: así
  su `z-50` queda sobre el Brote flotante (`z-30`, docs/features/assistant.md). Un overlay nuevo que
  viva dentro del main tiene que usar esos componentes o su propio portal.
- Al cerrar sesión o entrar con otra cuenta se borran (`clearAllCache` borra todo
  `studree:`): las tabs guardan títulos de hojas y no pueden verse desde otra cuenta.

## Restricciones

- El shell **no accede a datos**: consume `useExplorerTree`, que habla con los services.
- Las tabs y el estado del explorador son **preferencias de UI**, no datos de negocio:
  viven solo en `localStorage` y nunca se sincronizan a Supabase.
- Los atajos no deben pisar los del navegador salvo `Ctrl+K` (que se intercepta con
  `preventDefault`).

## Sesión en el header

- Con cuenta (email): "Salir".
- Invitado (sesión anónima): **"Entrar"**, para pasar a una cuenta que ya existe (2026-11-11). No se
  ofrece "Salir": cerrar la sesión anónima pierde los datos para siempre.
- Sin sesión: "Entrar".
- La pantalla Entrar deja pasar al invitado y le avisa que lo cargado como invitado no pasa a la
  otra cuenta (`auth.login.guestNotice`); solo redirige si ya hay una cuenta con email.

## Logo e identidad en el header

El logo es el **original**: `public/logo.jpg` (256 px, versión optimizada de
`assets/Logo.jpg`) y se referencia como **`/logo.jpg`** en el header y el favicon
(ADR-018). Al lado va "Studree" en `font-display`. `index.html` declara
`<meta name="theme-color" content="#0d1117">`.

- El SVG que lo reemplazó el 2026-10-14 se eliminó: el usuario prefiere el logo original
  (dice **STUDREE**; la supuesta errata "STUIDREE" no existía).
- Todo asset estático servido tal cual va en **`public/`**. Vite **no sirve** la carpeta
  `assets/` de la raíz del repo: eso es material fuente.
- **Recorte centrado (2026-11-11):** `logo.jpg` y `icons/icon-192.png` / `icon-512.png` salen
  de `assets/Logo.jpg` con un recorte cuadrado centrado en la carpeta (la carpeta ocupa ~86 % del
  ancho). El recorte anterior la dejaba corrida a la derecha y abajo. Al cambiar estas imágenes,
  subir la versión de `CACHE` en `public/sw.js` (las sirve cache-first).
- **Nunca** referenciar el logo con rutas relativas tipo `./assets/…`.
- Siempre con `width`/`height` explícitos, para que no haya *layout shift* al cargar.

## Refresco del explorador (2026-10-14)

El explorador arma su propio árbol (`useExplorerTree`), separado del estado de cada
página. Antes, crear o borrar algo en un canvas no aparecía hasta recargar. Ahora los
services emiten `studree:data-changed` (`services/dataEvents.js`) después de cada
crear / renombrar / borrar exitoso, y `useExplorerTree` se recarga con debounce de 300 ms.
La carga son **3** consultas (carreras, materias, y de las hojas solo `id, subject_id`
para contarlas), cada una paginada para no cortarse en 1000 filas. El canvas de carrera y
la carpeta también escuchan el aviso y se recargan en silencio.

## Pendiente

- [ ] Reordenar tabs arrastrando.
- [ ] Acciones del palette además de navegar (crear hoja, exportar).
- [x] Renombrar en línea desde el explorador (2026-09-14).

## Idioma (Fase 18)

Todo el texto del shell (cabecera, tabs, explorador, buscador `Ctrl K`, drawer, 404) sale del
diccionario `shell` de `src/lib/i18n/` (castellano / inglés, ver `docs/features/i18n.md`). Los
componentes llaman a `useI18n()`; los links de navegación guardan una `labelKey`, no un texto.
`App.jsx` también se suscribe al idioma para que todo el árbol de rutas vuelva a pintar al cambiarlo.
