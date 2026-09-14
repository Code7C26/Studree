# Feature: Shell de Navegación (explorador + tabs + command palette)

> **Estado:** ✅ Implementado (2026-09-09)
> **Archivos clave:** `src/components/layout/WorkspaceLayout.jsx`,
> `src/components/layout/TabBar.jsx`,
> `src/components/features/explorer/`, `src/components/features/commandPalette/`,
> `src/hooks/useExplorerTree.js`, `src/hooks/useHotkeys.js`
> **Dependencias nuevas:** ninguna (el filtro del palette se implementa a mano)
>
> El explorador baja hasta Unidad/Tema/Hoja apoyándose en `SubjectMapPage`
> (canvas, Fase 7.4) y `SheetPage` (editor TipTap, Fase 7.5) — ambos ya
> implementados, ninguno es puente a esta altura.

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
| `src/components/features/explorer/ExplorerTree.jsx` | Render recursivo de los 5 niveles |
| `src/components/features/explorer/ExplorerItem.jsx` | Fila: chevron, icono, nombre, acciones |
| `src/components/features/commandPalette/CommandPalette.jsx` | Overlay `Ctrl+K` con búsqueda |
| `src/hooks/useExplorerTree.js` | Árbol completo + estado de expandido/colapsado |
| `src/hooks/useHotkeys.js` | Registro de atajos de teclado |

## Explorador

- Árbol colapsable con la jerarquía completa: **Carrera → Materia → Unidad → Tema → Hoja**.
- Un icono por nivel, para distinguirlos de un vistazo.
- El nodo correspondiente a la ruta actual queda **resaltado y auto-expandido**.
- El estado de expandido persiste en `studree:ui:explorer` (preferencia de UI).
- En mobile: colapsado por defecto, se abre como drawer sobre el contenido.
- Cada fila tiene un botón ✏️ (visible al hover) para renombrar in-line, en
  cualquiera de los 5 niveles: `Enter`/blur confirma, `Escape` cancela. La
  acción vive en `useExplorerTree.js` (`renameEntity`), que elige el service
  correcto por tipo y usa `title` para hojas, `name` para el resto.

## Command Palette (`Ctrl+K`)

- Se abre con `Ctrl+K` (`Cmd+K` en Mac) y se cierra con `Esc`.
- Busca **hojas por nombre** (objetivo principal) y también materias, unidades y temas.
- Cada resultado muestra su **ruta jerárquica** (`Biología > Genética > Unidad 3`) para
  desambiguar hojas con el mismo título.
- Navegación con flechas ↑/↓, `Enter` abre en una tab nueva.
- El matching es *subsecuencia* (tipo fuzzy) implementado a mano, sin dependencias.

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

## Restricciones

- El shell **no accede a datos**: consume `useExplorerTree`, que habla con los services.
- Las tabs y el estado del explorador son **preferencias de UI**, no datos de negocio:
  viven solo en `localStorage` y nunca se sincronizan a Supabase.
- Los atajos no deben pisar los del navegador salvo `Ctrl+K` (que se intercepta con
  `preventDefault`).

## Logo e identidad en el header

El logo vive en **`public/logo.jpg`** y se referencia como **`/logo.jpg`** (ruta absoluta
desde la raíz del sitio). Reglas para no repetir el bug que tenía el header:

- Todo asset estático servido tal cual va en **`public/`**. Vite **no sirve** la carpeta
  `assets/` de la raíz del repo: eso es material fuente, no assets de la app.
- **Nunca** referenciar el logo con rutas relativas tipo `./assets/…`.
- `assets/Logo.jpg` (6250×6250, 5,3 MB) es el **archivo fuente**. Lo que se publica es la
  versión optimizada de 256 px (7,7 KB). No poner el original en `public/`.
- El logo es un JPEG **con fondo opaco**: se muestra con `rounded-lg` como *app icon*.
  Si algún día se necesita transparencia, hay que rehacerlo como SVG o PNG.
- Siempre con `width`/`height` explícitos, para que no haya *layout shift* al cargar.

## Pendiente

- [ ] Reordenar tabs arrastrando.
- [ ] Acciones del palette además de navegar (crear hoja, exportar).
- [x] Renombrar en línea desde el explorador (2026-09-14).
