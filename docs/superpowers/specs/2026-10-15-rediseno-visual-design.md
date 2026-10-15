# Rediseño visual: "estudiar de noche con la lámpara" (Inicio + Carpeta)

> **Fecha:** 2026-10-15 · **Estado:** aprobado en el brainstorming, pendiente de revisión del spec
> **Rama:** `rama-nicolas` · **Versión objetivo:** 0.15.0 · **ADR nuevo:** ADR-018 (Identidad visual)
> **Skills usadas para el diseño:** `frontend-design` (dirección estética), `ui-ux-pro-max`
> (estilos, tipografía, reglas de accesibilidad), `web-design-guidelines` (auditoría del código actual).
> **Maquetas aprobadas:** `.superpowers/brainstorm/276-1792070033/content/combinado-v2.html`

## 1. Problema

1. Las hojas de la Carpeta se ven **corridas a la derecha y chicas**: se centran en el espacio
   que queda después del explorador (`w-64`) y del índice (`w-60`), con `max-w-3xl`.
2. **Todo es de un solo color**: en el índice todos los temas son `text-text-muted` y en el papel
   todos los títulos son `ink`. No se diferencian materias ni temas.
3. El estilo es **simple y estructurado** (grilla de tarjetas iguales); no transmite que es una app
   moderna que va a tener IA.
4. En el Inicio se ven el explorador estilo VSCode y las tabs de materias, que no aportan ahí.
5. El header usa `logo.svg` en vez del logo original.

## 2. Objetivo y criterios de éxito

- Las hojas quedan **centradas respecto de la pantalla** y más anchas (~52rem de papel).
- Cada materia se reconoce por **su color** (margen de la hoja, títulos, índice, pastilla).
- La interfaz se siente **moderna y con identidad**, sin cambiar la paleta base (oscuro + verde).
- El Inicio ocupa la pantalla entera, sin explorador ni tabs.
- Se usa el **logo original** (header y favicon).
- Ningún cambio de comportamiento, datos ni servicios: es un rediseño de presentación.

**Fuera de alcance:** adaptación a celular (fase propia), IA integrada, modo claro, cambios de
base de datos, nuevas funciones del Inicio o de la Carpeta.

## 3. Dirección estética

**Concepto:** estudiar de noche con la lámpara del escritorio. El fondo oscuro es el escritorio;
una **luz verde suave** cae desde arriba a la izquierda (no son manchas al azar: es un solo cono de
luz); los papeles de las hojas son **crema con renglones**, con un **margen del color de la
materia** como una hoja de carpeta real. Los bloques del Inicio son una **grilla bento** de paneles
de vidrio translúcido con distinto peso.

**Lo memorable (un solo lugar):** la luz de la lámpara sobre los papeles. Todo lo demás es sobrio.

**Se evita explícitamente** (señales de "diseño hecho por IA", según `frontend-design`):
etiquetas en MAYÚSCULAS monoespaciadas, texto en degradé, cadenas "A · B · C" con puntos medios,
tarjetas idénticas con el mismo radio y la misma sombra, animaciones de entrada en cada bloque.

## 4. Sistema visual (tokens)

Se agregan a `tailwind.config.js` (Mandamiento VII). Los existentes no cambian salvo `paper`/`ink`.

| Token | Valor | Uso |
|---|---|---|
| `paper.DEFAULT` | `#fbf8ef` (antes `#ffffff`) | Hoja: papel crema |
| `paper.line` | `#ebe5d5` | Renglones del papel |
| `paper.border` | `#e3dcc9` (antes `#d0d7de`) | Separadores sobre el papel |
| `ink.DEFAULT` | `#2b2620` (antes `#1f2328`) | Texto sobre el papel |
| `ink.muted` | `#7a6f5a` (antes `#59636e`) | Fecha y texto secundario sobre el papel |
| `postit` | `#fff3a8` / `postit.ink` `#3b3415` | Notas rápidas del Inicio |
| `fontFamily.display` | `'Bricolage Grotesque', Inter, …` | Títulos, saludo, números grandes, nombre de marca |

**Contraste a verificar (test):** `ink` sobre `paper` ≥ 7:1; `ink.muted` sobre `paper` ≥ 4.5:1;
`text-muted` sobre el vidrio (`surface` al 62 % sobre `bg` con la luz) ≥ 4.5:1.

**Clases nuevas en `src/index.css` (`@layer components`):**

- `.lamp` — pseudo-elemento `::before` con un `radial-gradient` elíptico verde
  (`accent-soft` al 20 % → `accent` al 7 % → transparente), fijo arriba a la izquierda,
  `pointer-events: none`. Estático (no anima).
- `.glass` — `bg-surface/60`, borde `rgba(240,246,252,.07)`, `backdrop-blur-md`, `rounded-xl`.
- `.paper-sheet` — fondo `paper` con renglones (`repeating-linear-gradient` con `paper.line`) y
  sombra profunda (`0 22px 48px rgba(0,0,0,.55)`).
- Anillo de foco global: `:focus-visible { outline: 2px solid accent-soft; outline-offset: 2px }`
  para botones, links e inputs (reemplaza los `outline-none` sin reemplazo).

**Fuentes:** Inter (texto) y Bricolage Grotesque (display) desde Google Fonts, con
`<link rel="preconnect">` y `display=swap` en `index.html`. No son dependencias de npm.
Hoy Inter no se carga (cae a la fuente del sistema): esto lo corrige.

## 5. Color de materia (`src/constants/subjectTones.js`)

Las materias usan la paleta fija de 6 colores (`src/constants/palette.js`). Se agrega una tabla
estática con tres tonos por color, elegidos para pasar contraste:

| Color base | `onPaper` (títulos y `[[links]]` sobre crema, ≥ 4.5:1) | `onDark` (índice, ≥ 4.5:1 sobre `bg`) | `soft` (fondo del tema activo) |
|---|---|---|---|
| Verde `#22c55e` | `#15803d` | `#86efac` | `rgba(34,197,94,.16)` |
| Azul `#3b82f6` | `#1d4ed8` | `#93c5fd` | `rgba(59,130,246,.16)` |
| Violeta `#8b5cf6` | `#6d28d9` | `#c4b5fd` | `rgba(139,92,246,.16)` |
| Ámbar `#f59e0b` | `#b45309` | `#fcd34d` | `rgba(245,158,11,.16)` |
| Rosa `#ec4899` | `#be185d` | `#f9a8d4` | `rgba(236,72,153,.16)` |
| Cian `#06b6d4` | `#0e7490` | `#67e8f9` | `rgba(6,182,212,.16)` |

- `getSubjectTones(color)` → `{ base, onPaper, onDark, soft }`. Normaliza mayúsculas; un color
  fuera de la paleta (o `null`) devuelve los tonos del verde.
- Son valores por dato: se aplican con `style` inline o con variables CSS
  (`--subject`, `--subject-ink`, `--subject-light`, `--subject-soft`) puestas en el contenedor de
  la carpeta. El CSS del editor usa esas variables (`.sheet-editor h1 { color: var(--subject-ink) }`).
- **Test:** cada `onPaper` contra `paper` y cada `onDark` contra `bg` cumple ≥ 4.5:1 (función pura
  `contrastRatio` en `src/lib/format/` o junto al test).

## 6. Estructura

### 6.1 Shell (`AppLayout`, `Header`, `WorkspaceLayout`, `TabBar`)

- **Header:** logo original (`public/logo.jpg`, 256 px, recuperado de `git show 6fb2f30^:public/logo.jpg`,
  `width`/`height` explícitos), "Studree" en `display`, un botón-buscador "Buscar un tema o una
  materia" con `Ctrl K` que abre el `CommandPalette` existente, y los links Inicio · Carreras ·
  Perfil (links de texto; el activo con subrayado/realce verde, ya no `bg-accent` lleno).
  Fondo transparente sobre `bg` con borde inferior sutil.
- **Favicon:** `index.html` pasa a `/logo.jpg`. Se agrega `<meta name="theme-color" content="#0d1117">`.
  `logo.svg` se borra.
- **Abrir la palette desde el header:** el estado `paletteOpen` vive en `WorkspaceLayout` y el
  header está afuera. Se resuelve con un evento de ventana `studree:open-palette` que el header
  emite y `WorkspaceLayout` escucha (sin levantar estado ni contexto nuevo). Fuera del workspace
  (Perfil, Entrar) el botón no se muestra.
- **Inicio (`/`):** `WorkspaceLayout` no renderiza explorador, botón "☰ Explorador" ni `TabBar`
  cuando la ruta es `ROUTES.home`. `Ctrl+B` no hace nada ahí. `Ctrl+K` sigue funcionando.
- **Explorador:** deja de arrancar abierto en desktop. Arranca **cerrado** en todas las rutas y se
  abre con `Ctrl+B` o con un botón "Explorador" (ícono) en la barra de tabs; la preferencia
  abierto/cerrado se recuerda en `localStorage` (cache de UI). Así la Carpeta puede centrar las
  hojas en la pantalla.
- **TabBar:** se mantiene en `WorkspaceLayout` (no se mueve al header, para no levantar el estado
  de tabs). Pasa a ser una fila fina de **pastillas**: cada materia con su punto de color, la activa
  con fondo `soft` y borde del color de la materia. El ✕ se ve siempre en la activa y en las demás
  al pasar el mouse **o al tener foco** (`group-focus-within`). Para eso `tabs` guarda también el
  `color` de la materia (se completa desde el árbol del explorador, como hoy el nombre).
- **`main`:** lleva la clase `.lamp` (la luz) y `relative`; el contenido va por encima.

### 6.2 Carpeta (`SubjectFolderPage`, `TopicIndex`, `FolderSheet`, `FolderSearchBar`, `EditorToolbar`)

Layout en desktop (`lg` en adelante), centrado en el `main`:

```
┌───────────── 15rem ─┬──────── minmax(0, 52rem) ────────┬─ 15rem ─┐
│ ● Genética          │   [ B I Título Subtítulo … Leer  │         │
│ 12 hojas, 8 temas   │     Exportar ]  (barra de vidrio) │         │
│ Temas               │   ┌─────────────────────────────┐ │ (vacío: │
│ │ Célula            │   ┃ Miércoles 14 de octubre…    │ │ equili- │
│ │   Organelas       │   ┃ # Mitosis   (color materia) │ │  bra)   │
│ ┃ Mitosis (activo)  │   ┃ …papel crema con renglones  │ │         │
│ │   Fases           │   └─────────────────────────────┘ │         │
└─────────────────────┴───────────────────────────────────┴─────────┘
```

- Grilla `grid-cols-[15rem_minmax(0,52rem)_15rem] justify-center gap-8`. Entre `md` y `lg`:
  índice + hojas (sin la columna espejo). Debajo de `md`: solo hojas (el índice no se ve, como hoy).
- **Contenedor:** pone las variables CSS del color de la materia (sección 5).
- **Índice (`TopicIndex`):** sin tarjeta. Arriba el nombre de la materia en `display` con su punto
  de color (con brillo), "N hojas, M temas", el link "Volver a la carrera". La lista va con una
  línea vertical a la izquierda (`border-l border-border`); los temas `#` en `text`, los `##`+ en
  `text-muted` con sangría; el **activo** con `--subject-light`, `font-semibold` y una barra de 2 px
  del color de la materia sobre la línea. La etiqueta "Temas" va en minúscula (sin `uppercase`).
- **Barra de herramientas:** una sola cápsula `.glass` sticky, centrada sobre la columna de hojas,
  con: buscador, formato (B, I, Título, Subtítulo, listas, tarea, código, cita, link), separador,
  "Leer" (modo lectura) y "Exportar". Los botones H1/H2 pasan a llamarse **Título** y
  **Subtítulo** (con `aria-label`). En pantallas angostas la cápsula hace wrap.
- **Hoja (`FolderSheet`):** `.paper-sheet` + `border-l-[6px]` del color de la materia, radio
  `rounded-md`. Barra superior con la fecha en `ink-muted` (`formatSheetDateLong`: "Miércoles 14 de
  octubre, 18:30") y el estado de guardado; el botón eliminar es un ícono que se ve al pasar el mouse
  **o con foco** (`focus-visible`).
- **Editor sobre crema:** `h1` en `display` 800 y `--subject-ink`; `h2` en `display` 700 e `ink`;
  `h3`/`h4` en Inter semibold. `[[links]]` y links en `--subject-ink`. Citas con borde del color de
  la materia. Coincidencias de búsqueda siguen en `warn`.
- **"Nueva hoja":** botón con borde punteado `border-border`, al pasar el mouse borde y texto del
  color de la materia.
- **Modo lectura:** igual que hoy (oculta todo menos las hojas); el botón de salir pasa a `.glass`.

### 6.3 Inicio (`HomePage` + `features/home/*`)

Solo cambia la presentación. `useHome`, los servicios y la lógica de cada bloque **no cambian**.

```
          Buenas tardes.                           (display 800)
          Jueves 15 de octubre — tenés un parcial en 3 días.
┌──────────────────────────┬────────────┬────────────┐
│ Seguí donde dejaste       │ Parcial de │ Hojas esta │
│ Genética                  │ Química  3 │ semana  12 │
│ Escribiste ayer 18:30     ├────────────┴────────────┤
│              ┌hoja crema┐ │ 2 tareas pendientes     │
│              │ inclinada│ │ ○ … ○ …                 │
├──────────────┴──────────┴─┴──────────┬──────────────┤
│ Calendario (mes)                      │ post-it nota │
└───────────────────────────────────────┴──────────────┘
```

- Contenedor `max-w-5xl mx-auto`. Grilla bento de 4 columnas en `lg`, 2 en `md`, 1 en mobile
  (el orden del DOM sigue siendo el del celular, como hoy).
- **Saludo:** "Buenos días / Buenas tardes / Buenas noches" según la hora local (función pura
  `greetingFor(date)` en `src/lib/home/`), y debajo una frase con la fecha larga y, si hay, la
  próxima fecha importante ("tenés un parcial en 3 días") armada con datos que `useHome` ya da.
  Reemplaza al `h1` "Inicio" y absorbe a `WeekSummary` (su texto pasa a ser esta línea).
- **Seguí donde dejaste** (`ContinueCard`): bloque protagonista 2×2, más redondeado
  (`rounded-2xl`), borde y tinte verde, nombre de la materia en `display`, y una **hoja crema
  inclinada (-4°) que asoma** con el margen del color de la materia y el primer título de la hoja.
  Todo el bloque es un `<Link>`.
- **Próxima fecha** (`NextDateCard`): número grande en `display` con borde `warn` si faltan ≤ 7 días.
- **Tareas** (`TaskList`) y **Calendario** (`CalendarPanel`): paneles `.glass`; el día de hoy en
  verde lleno, los días con fecha subrayados en `warn`; números con `tabular-nums`.
- **Notas** (`QuickNotes`): cada nota es un **post-it** (`postit`, rotación leve ±2°, sombra).
  La edición y "deshacer" siguen igual.
- `HomePanel` pasa a usar `.glass` y un título en minúscula normal (sin `uppercase`).
- Los paneles tienen radios distintos según jerarquía: protagonista `rounded-2xl`, resto `rounded-xl`.

## 7. Calidad (de la auditoría con `web-design-guidelines`)

- **Íconos:** `src/components/ui/Icon.jsx` con un set mínimo de SVG inline (stroke 1.75, 16/20 px):
  `search`, `close`, `plus`, `edit`, `book-open`, `sidebar`, `chevron-left`, `chevron-right`,
  `arrow-up`, `arrow-down`, `file-text`. Reemplaza los emojis/glifos usados como íconos (🔍 📖 📝 ☰
  ✕ ✎ ＋ ‹ › ↑ ↓) en Carpeta, Inicio, tabs y layout. Los íconos decorativos llevan `aria-hidden`;
  los botones solo-ícono, `aria-label`. Sin dependencias nuevas.
- **Foco visible** en todo lo interactivo (anillo global de la sección 4); se quitan los
  `outline-none` sin reemplazo en `TaskList`, `QuickNotes`, `ContinueCard`.
- **Movimiento:** la luz es estática. La única animación nueva es la de la hoja que asoma en
  "Seguí donde dejaste" al pasar el mouse (`transform`, 200 ms), desactivada con
  `prefers-reduced-motion`. Nada de `transition: all`.
- **Títulos** con `text-wrap: balance`.
- **Textos:** "Cargando…" con `…`; voz activa; sin MAYÚSCULAS en etiquetas.

## 8. Archivos

| Archivo | Cambio |
|---|---|
| `tailwind.config.js` | Tokens de la sección 4 |
| `src/index.css` | `.lamp`, `.glass`, `.paper-sheet`, foco global, editor con variables de materia, `text-wrap` |
| `index.html` | Fuentes (preconnect + link), favicon `logo.jpg`, `theme-color`, descripción actualizada |
| `public/logo.jpg` (nuevo) · `public/logo.svg` (se borra) | Logo original |
| `src/constants/subjectTones.js` (nuevo) | Tonos por color de la paleta + `getSubjectTones` |
| `src/lib/home/greeting.js` (nuevo) | `greetingFor(date)` |
| `src/components/ui/Icon.jsx` (nuevo) | Set de íconos SVG |
| `src/components/layout/Header.jsx` | Logo, marca, buscador `Ctrl K`, links |
| `src/components/layout/WorkspaceLayout.jsx` | Sin explorador/tabs en `/`, explorador cerrado por defecto y recordado, `.lamp`, escucha `studree:open-palette` |
| `src/components/layout/TabBar.jsx` | Pastillas con color, ✕ accesible, botón del explorador |
| `src/pages/SubjectFolderPage.jsx` | Grilla centrada, variables de color, cápsula de herramientas |
| `src/components/features/folder/*` | Índice, hoja y buscador con el estilo nuevo |
| `src/components/features/sheetEditor/EditorToolbar.jsx` | Estilo cápsula, "Título"/"Subtítulo" |
| `src/pages/HomePage.jsx` · `src/components/features/home/*` | Saludo + bento + post-its (solo presentación) |
| `src/constants/storageKeys.js` | Clave de la preferencia del explorador |

## 9. Pruebas

- **Unitarias (Node, como el resto del repo):** `getSubjectTones` (paleta, mayúsculas, fuera de
  paleta, `null`); contraste ≥ 4.5:1 de cada tono y de `ink`/`ink.muted` sobre `paper`;
  `greetingFor` en los bordes (5:59, 6:00, 12:59, 13:00, 19:59, 20:00).
- **Estáticas:** `npx eslint src`, `npm run build`, grep de emojis usados como íconos y de
  `outline-none` sin reemplazo en los archivos tocados.
- **Visual:** capturas del Inicio y la Carpeta a 375, 768 y 1440 px con el navegador; comparar con
  la maqueta aprobada.
- **Auditoría final:** volver a correr `web-design-guidelines` sobre los archivos tocados.
- **Manual (usuario):** abrir Studree → Inicio sin explorador ni tabs; abrir una materia → hojas
  centradas, color de materia en margen/títulos/índice; `Ctrl+B` abre el explorador; `Ctrl+K`
  desde el header; modo lectura; foco con Tab visible en todo.

## 10. Documentación

- **ADR-018 "Identidad visual"** en `docs/02-architecture.md`: concepto de la lámpara, papel crema,
  color de materia por tonos, tipografías, reglas de "qué evitar". Actualiza ADR-017 ("papel
  blanco" → "papel crema") y la sección de sistema de estilos.
- `docs/features/folder.md`, `home.md`, `navigation-shell.md` (Logo, Inicio sin shell, explorador
  cerrado por defecto, evento `studree:open-palette`), `sheet-editor.md` (estilos).
- `docs/01-project-overview.md` (estado), `CHANGELOG.md` **0.15.0**.
- `CLAUDE.md` (línea de Diseño y reglas de la Carpeta) y sus 4 copias.

## 11. Riesgos

- **`backdrop-filter` en muchos paneles** puede costar en equipos lentos: se usa solo en el Inicio,
  la cápsula de herramientas y el header; las hojas no lo usan.
- **Google Fonts** agrega una petición externa: con `display=swap` el texto se ve igual mientras
  carga. Si en algún momento se quiere evitar, se pueden servir desde `public/`.
- **El otro chat (Inicio útil)** está en pausa; este rediseño toca sus componentes solo en la
  presentación. Si se retoma, debe partir de esta versión.
