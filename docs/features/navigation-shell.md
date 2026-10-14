# Feature: Shell de Navegación (explorador + tabs + command palette)

> **Estado:** ✅ Implementado (2026-09-09) · 3 niveles + búsqueda en servidor + tabs sincronizadas (2026-10-14)
> **Archivos clave:** `src/components/layout/WorkspaceLayout.jsx`,
> `src/components/layout/TabBar.jsx`,
> `src/components/features/explorer/`, `src/components/features/commandPalette/`,
> `src/hooks/useExplorerTree.js`, `src/hooks/useHotkeys.js`
> **Dependencias nuevas:** ninguna (el filtro del palette se implementa a mano)
>
> Jerarquía de **3 niveles** desde el 2026-10-14 (ADR-014): Carrera → Materia → Hoja.

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
| `src/components/layout/WorkspaceLayout.jsx` | Grilla del shell: explorador + tabs + `<Outlet/>` |
| `src/components/layout/TabBar.jsx` | Tabs de las hojas abiertas (activar / cerrar) |
| `src/components/features/explorer/Explorer.jsx` | Panel lateral: buscador + raíz del árbol |
| `src/components/features/explorer/ExplorerTree.jsx` | Render de los 3 niveles |
| `src/components/features/explorer/ExplorerItem.jsx` | Fila: chevron, icono, nombre, acciones |
| `src/components/features/commandPalette/CommandPalette.jsx` | Overlay `Ctrl+K` con búsqueda |
| `src/hooks/useExplorerTree.js` | Árbol completo + estado de expandido/colapsado |
| `src/hooks/useHotkeys.js` | Registro de atajos de teclado |

## Explorador

- Árbol colapsable con la jerarquía completa: **Carrera → Materia → Hoja**.
- Un icono por nivel, para distinguirlos de un vistazo.
- El nodo correspondiente a la ruta actual queda **resaltado y auto-expandido**.
- El estado de expandido persiste en `studree:ui:explorer` (preferencia de UI).
- En mobile: colapsado por defecto, se abre como drawer sobre el contenido.
- Cada fila tiene un botón ✏️ (visible al hover) para renombrar in-line, en
  cualquiera de los 3 niveles: `Enter`/blur confirma, `Escape` cancela. La
  acción vive en `useExplorerTree.js` (`renameEntity`), que elige el service
  correcto por tipo y usa `title` para hojas, `name` para el resto. Si falla (ej.
  título repetido en la materia) el error se muestra debajo de la fila.

## Command Palette (`Ctrl+K`)

- Se abre con `Ctrl+K` (`Cmd+K` en Mac) y se cierra con `Esc`.
- Busca **hojas por nombre** (objetivo principal) y también materias.
- Cada resultado muestra su **ruta jerárquica** (`Biología › Genética`) para
  desambiguar hojas con el mismo título.
- Navegación con flechas ↑/↓, `Enter` abre en una tab nueva.
- El matching es *subsecuencia* (tipo fuzzy) implementado a mano, sin dependencias.

### Buscador de contenido (Fase 5, 2026-09-28 · en el servidor desde 2026-10-14)

El palette no busca solo por nombre: también busca dentro del **contenido** (`content_md`)
de las hojas. Es el mismo Ctrl+K, no una pantalla nueva.

- Desde 3 letras y con debounce de 250 ms, `sheetsService.searchContent(q)` hace un
  `ilike` en Supabase (máx. 20 hojas, las más recientes primero). Antes el explorador bajaba
  el `content_md` de **todas** las hojas solo para esto; ahora el árbol se carga sin
  contenido. Las respuestas que llegan tarde (el usuario siguió escribiendo) se descartan.
- `src/lib/search/snippet.js` (`buildContentSnippet`) — función pura: busca la query
  (case-insensitive, substring simple, **no** fuzzy) dentro del contenido, limpia la
  sintaxis Markdown más obvia (`#`, `*`, `` ` ``, links) y devuelve un fragmento de ~100
  caracteres alrededor del match, o `null` si no hay coincidencia.
- `CommandPalette.jsx` — un match por **nombre** siempre rankea mejor que uno por
  **contenido** (`CONTENT_MATCH_SCORE = 4`, peor que cualquier score de nombre). Cuando el
  resultado viene por contenido, la fila muestra el fragmento en vez de la ruta jerárquica.
- Solo las **hojas** buscan por contenido. Una hoja que ya apareció por nombre no se
  repite por contenido.
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

- Cada hoja abierta ocupa una tab; se persisten en `studree:ui:tabs`.
- Click en una tab la activa; la ✕ la cierra.
- Abrir una hoja ya abierta **activa la tab existente**, no duplica.
- Cada vez que el árbol del explorador termina de cargar (incluida la recarga después de
  borrar o renombrar), se **cierran las tabs de hojas que ya no existen** y se
  **actualizan los títulos** (2026-10-14).
- Al cerrar sesión o entrar con otra cuenta se borran (`clearAllCache` borra todo
  `studree:`): las tabs guardan títulos de hojas y no pueden verse desde otra cuenta.

## Restricciones

- El shell **no accede a datos**: consume `useExplorerTree`, que habla con los services.
- Las tabs y el estado del explorador son **preferencias de UI**, no datos de negocio:
  viven solo en `localStorage` y nunca se sincronizan a Supabase.
- Los atajos no deben pisar los del navegador salvo `Ctrl+K` (que se intercepta con
  `preventDefault`).

## Logo e identidad en el header

El logo vive en **`public/logo.svg`** y se referencia como **`/logo.svg`** (header y
favicon). Desde el 2026-10-14 es un **SVG propio**: un árbol de 3 nodos verde
(`accent` / `accent-soft`) sobre el gris `surface`, legible a 16 px.

- El JPEG anterior (una carpeta beige sobre gris) parecía un *placeholder* en el header y
  tenía una errata: decía **"STUIDREE"**. `assets/Logo.jpg` queda solo como histórico.
- Todo asset estático servido tal cual va en **`public/`**. Vite **no sirve** la carpeta
  `assets/` de la raíz del repo: eso es material fuente.
- **Nunca** referenciar el logo con rutas relativas tipo `./assets/…`.
- Siempre con `width`/`height` explícitos, para que no haya *layout shift* al cargar.
- Si se cambian los colores del design system, actualizar los hex del SVG (no puede leer
  los tokens de Tailwind).

## Refresco del explorador (2026-10-14)

El explorador arma su propio árbol (`useExplorerTree`), separado del estado de cada
página. Antes, crear o borrar algo en un canvas no aparecía hasta recargar. Ahora los
services emiten `studree:data-changed` (`services/dataEvents.js`) después de cada
crear / renombrar / borrar exitoso, y `useExplorerTree` se recarga con debounce de 300 ms.
La carga pasó de N+1 consultas a **3** (carreras, materias, hojas sin `content_md`), cada
una paginada para no cortarse en 1000 filas, armando el árbol en memoria. Los canvas
también escuchan el aviso y se recargan en silencio.

## Pendiente

- [ ] Reordenar tabs arrastrando.
- [ ] Acciones del palette además de navegar (crear hoja, exportar).
- [x] Renombrar en línea desde el explorador (2026-09-14).
