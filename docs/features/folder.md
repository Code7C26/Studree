# Feature: La Carpeta (materia como carpeta escolar)

> **Estado:** ✅ Implementado (2026-10-14) — reemplaza al canvas de hojas (`subject-map.md`)
> **ADRs:** ADR-017 (la carpeta), ADR-011 (Markdown fuente de verdad), ADR-014 (3 niveles)
> **Spec:** `docs/superpowers/specs/2026-10-14-carpeta-design.md`
> **Archivos clave:** `src/pages/SubjectFolderPage.jsx`, `src/components/features/folder/`,
> `src/hooks/useFolder.js`, `src/hooks/useSheetAutosave.js`, `src/lib/editor/`,
> `src/lib/markdown/headings.js`, `src/lib/format/sheetDate.js`

---

## Descripción

Cada materia se ve como **una carpeta escolar**. La carrera es la carpeta, las materias
son los **separadores de colores** y adentro van **todas las hojas seguidas**, estilo
Word, sobre **papel crema con renglones** y el **margen del color de la materia**
(ADR-018): se lee y se escribe en el mismo lugar y se va agregando más abajo.

## Cómo se usa

| Acción | Resultado |
|--------|-----------|
| Abrir una materia (`/materias/:id`) | Todas sus hojas en orden cronológico; te lleva a la **última** |
| Abrir con `?hoja=:id` | Te lleva a esa hoja (lo usa el Inicio: "Seguí donde dejaste") |
| Escribir en cualquier hoja | Se guarda sola (autosave por hoja) |
| **Nueva hoja** (al final) | Hoja en blanco con la fecha y hora del momento; se guarda recién cuando tiene contenido |
| **Nueva hoja ▾** (flecha del botón) | Menú con las plantillas de fábrica, las propias y "Administrar plantillas…"; la hoja se guarda al crearse (`docs/features/sheet-templates.md`) |
| Soltar o pegar un archivo en una hoja, o el clip de la cápsula | Lo adjunta (máx. 20 MB): las imágenes se ven en el texto, el resto queda como link; todos van en la lista al pie de la hoja (`docs/features/attachments.md`) |
| Ícono de papelera en la barra de una hoja | La manda a la papelera (con confirmación) y muestra el aviso "Deshacer" (6 s); una hoja nueva vacía se quita sin preguntar (`docs/features/trash.md`) |
| **Importar** (cápsula) | Diálogo para importar `.md` o `.zip` a esta materia (`docs/features/import.md`) |
| `# Título` en una hoja | Crea un **tema**, que aparece en el índice |
| Click en un tema del índice | Lleva al inicio de ese tema |
| `[[Tema]]` en el texto | Link en el color de la materia; el click lleva a ese tema |
| Buscador / `Ctrl+F` | Resalta en todas las hojas, "n de m", ↑ ↓ / `Enter` / `Shift+Enter`, `Esc` limpia |
| **Leer** (modo lectura) | Oculta header, explorador, tabs, índice y toolbar; queda el papel. `Esc` sale |

## Decisiones (del usuario)

- **Hojas sin título**: solo fecha y hora (`Miércoles 14/10 · 18:30`; con año si no es el
  actual). Los temas son los `#` de adentro.
- **Orden cronológico, sin reordenar**: si algo quedó en otro lugar, se corta y se pega.
- **No hay dibujo de hojas** (canvas): el índice de temas es la forma de orientarse. El
  mapa de la carrera (materias + correlativas) sigue.
- **Papel solo en las hojas**: el resto de la app sigue oscuro con verde. Desde ADR-018 el
  papel es crema con renglones y lleva el color de la materia.
- Descartados: lista de hojas en el índice, tamaño de letra, plegar hojas, dos hojas lado
  a lado.

## Diseño (ADR-018)

```
┌──── 15rem ────┬──────── hasta 52rem ─────────┬─ 15rem ─┐
│ ● Genética    │ [buscar · B I Título … Leer   │ (vacía: │
│ 2 hojas, 4 t. │  Exportar]  barra de vidrio    │ centra  │
│ Temas         │ ┃ Jueves 15/10/2026 · 11:04    │ las     │
│ │ Célula      │ ┃ # Mitosis (color materia)    │ hojas)  │
│ ┃ Organelas   │ ┃ papel crema con renglones    │         │
└───────────────┴──────────────────────────────┴─────────┘
```

- **Centrado en la pantalla:** desde `lg`, grilla
  `[minmax(13rem,1fr) | minmax(0,52rem) | minmax(0,1fr)]`. Las hojas toman primero su ancho
  y las dos columnas de los costados se reparten lo que sobra: con lugar quedan iguales y
  las hojas quedan en el centro exacto de la pantalla (explorador cerrado, por defecto); sin
  lugar (ventana chica o explorador abierto) la columna derecha se achica a 0 en vez de
  angostar las hojas. El índice (máx. 15rem) va pegado a las hojas. Debajo de `lg` solo se
  ven las hojas.
- Al saltar a un tema, los headings tienen `scroll-margin-top` para no quedar debajo de la
  barra de herramientas.
- **Color de materia:** el contenedor pone `subjectCssVars(subject.color)` (variables
  `--subject*`). Lo usan el margen de 6 px de cada hoja, el `#` (título) en `font-display`,
  los links y `[[links]]`, las citas, el punto del nombre, el tema activo del índice y el
  hover de "Nueva hoja".
- **Índice:** sin tarjeta, con una línea vertical; los `#` en `text`, los demás en
  `text-muted` con sangría; el activo con `--subject-light` y una barra del color.
- **Barra de herramientas:** una cápsula sticky (`.glass` casi opaca) con el buscador, el
  formato ("Título", "Subtítulo", H3, H4, listas, "Tarea", "Cita", código, enlace), "Leer" y
  "Exportar".
- **Fecha de cada hoja:** `formatSheetDateLong` ("Jueves 15/10/2026 · 11:04").
- Íconos SVG (`components/ui/Icon.jsx`); el ✕ de borrar hoja aparece al pasar el mouse o
  con foco.

## Cómo funciona por dentro

- **Datos:** `useFolder` trae la materia y sus hojas **con contenido**
  (`FOLDER_SHEET_COLUMNS`), ordenadas por `created_at`.
  - Cada hoja lleva una `key` estable: una hoja local (`local:…`) que se guarda cambia de
    `id`, pero su editor no se remonta.
  - Se recarga en silencio con `studree:data-changed`.
- **Remontaje por materia:** la ruta monta la carpeta con `key={subjectId}`. Pasar de
  una materia a otra arranca de cero (posición inicial, búsqueda, editores), y una carga
  vieja que vuelve tarde se descarta.
- **Si falla la carga de hojas**, no se montan editores sobre la cache vieja: se muestra el
  aviso con "Reintentar" (`nextFolderSheets`).
- **Guardado:** cada `FolderSheet` usa `useSheetAutosave`, que envuelve
  `lib/editor/sheetSaver.js` (reglas puras con el service y la cache inyectados, probadas en
  Node):
  - borrador `{ content, baseUpdatedAt }` con la regla de la Fase 0 (`resolveDraft`);
  - debounce de 800 ms;
  - los guardados de una hoja van en fila;
  - flush al desmontar y en `pagehide`;
  - antes de borrar una hoja se llama a `cancel()`, para que el flush del desmontaje no la
    reviva. Si el `create` de una hoja nueva ya estaba en vuelo, cuando vuelve se borra la
    fila creada;
  - las **hojas nuevas** guardan borrador en `studree:cache:sheet-local:<subjectId>`. Si se
    escribió sin conexión y se cerró la pestaña, al volver a abrir la materia reaparecen
    como hojas nuevas y se crean al editarlas;
  - se borra **por `key`** y con el estado actual (el id de una hoja nueva cambia al crearse).
- **Índice:** `extractHeadings` sobre el Markdown de cada hoja (ignora bloques de código y
  `#hashtag`). Cada tema se ubica en el DOM como el n-ésimo heading de primer nivel del
  editor de su hoja (`:scope > h1..h4`). El tema activo sale de un listener de scroll sobre
  `<main>`: es el último heading que llegó a su **línea de lectura** (borde de arriba +
  su `scroll-margin-top` real, leído con `getComputedStyle`, + 8 px), que es justo donde lo
  deja un salto. Así el umbral no se desfasa si cambia el margen en `index.css`.
- **Tema elegido:** al saltar a un tema (índice o `[[Tema]]`) se marca enseguida. Los
  últimos temas no llegan a su línea porque se termina el scroll: mientras el scroll esté
  al final y ese heading se vea, sigue marcado. Se olvida al scrollear a mano (rueda,
  toque o teclado).
- **Scroll de la búsqueda:** va a la coincidencia actual solo cuando navegás (↑ ↓ Enter) o
  cambiás el término, no mientras escribís con el buscador abierto.
- **Búsqueda y `[[links]]`:** `HighlightExtension` (TipTap) pinta decoraciones calculadas
  por `computeHighlights` (puro). No cambian el documento ni el Markdown. Cada hoja reporta
  cuántas coincidencias tiene, y la página traduce el índice global ("3 de 12") a la hoja
  y la coincidencia local.
- **Modo lectura:** contexto `useReadingMode` (provider en `AppLayout`).
- **Links viejos:** `/hojas/:id` → `SheetRedirectPage` → `/materias/:subjectId?hoja=:id`.

## Fase 13: papelera, adjuntos, plantillas e importar (2026-10-15)

- **Borrar → papelera:** `useFolder.deleteSheet` cancela el autosave pendiente de la hoja y
  llama a `trashService.trash`; `restoreSheet` deshace. Se mantiene el diálogo de
  confirmación ("Mover a la papelera"), y después aparece el aviso con "Deshacer".
- **Adjuntos:** `useFolderAttachments` trae los adjuntos de todas las hojas de la carpeta
  (una consulta `IN`). El clip de la cápsula está siempre visible: sin hoja con foco adjunta
  a la última, y queda deshabilitado si la materia no tiene hojas. Una hoja nueva (local) se
  crea primero con `ensureCreated()` del saver. Al pegar, solo los portapapeles con archivos
  y **sin** `text/plain` ni `text/html` cuentan como adjuntos (capturas de pantalla); lo que
  viene de Word, Excel o la web pega normal.
- **Plantillas:** `NewSheetButton` (botón partido) y "Guardar como plantilla" en la barra de
  cada hoja.
- **Importar:** `ImportDialog` desde la cápsula; importa a la materia abierta.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectFolderPage.jsx` | Arma la carpeta: índice, búsqueda, toolbar, hojas, modo lectura, borrar, export |
| `src/pages/SheetRedirectPage.jsx` | Redirige `/hojas/:id` a la carpeta |
| `src/components/features/folder/FolderSheet.jsx` | Una hoja: barra de fecha + estado de guardado + plantilla + papelera + editor + lista de adjuntos |
| `src/components/features/templates/` · `attachments/` · `import/` | Nueva hoja ▾ y administrador, lista de adjuntos al pie, diálogo de importación |
| `src/hooks/useFolderAttachments.js` | Adjuntos de todas las hojas de la carpeta |
| `src/constants/subjectTones.js` | Tonos del color de la materia (`getSubjectTones`, `subjectCssVars`) |
| `src/components/features/folder/TopicIndex.jsx` | Índice de temas (presentacional) |
| `src/components/features/folder/FolderSearchBar.jsx` | Buscador (presentacional) |
| `src/components/features/sheetEditor/SheetEditor.jsx` | Editor TipTap de una hoja (+ props de búsqueda y links) |
| `src/components/features/sheetEditor/EditorToolbar.jsx` | Toolbar única: actúa sobre la hoja con foco |
| `src/hooks/useFolder.js` | Materia + hojas + locales + borrar + contenido en vivo |
| `src/hooks/useSheetAutosave.js` | Autosave de una hoja |
| `src/hooks/useSheetLocation.js` | Materia de una hoja (para la redirección) |
| `src/hooks/useReadingMode.js` · `layout/ReadingModeProvider.jsx` | Modo lectura |
| `src/lib/editor/highlightExtension.js` · `computeHighlights.js` · `matches.js` | Resaltado de `[[links]]` y búsqueda |
| `src/lib/editor/folderSheets.js` | `resolveDraft`, `orderFolderSheets`, `isLocalSheet`, `restoreLocalSheets`, `nextFolderSheets` |
| `src/lib/editor/sheetSaver.js` | Guardado de una hoja sin React (borradores, cola, crear, cancelar) |
| `src/lib/markdown/headings.js` | `extractHeadings` |
| `src/lib/format/sheetDate.js` | `formatSheetDate`, `formatSheetDateLong`, `sheetLocalIso`, `sheetFileName` |

## Rendimiento

Todas las hojas se montan como editores a la vez. **Criterio:** montar una materia de 150
hojas en menos de ~1 s. En desarrollo, la consola muestra
`[carpeta] N hojas montadas en X ms`.

> **Pendiente de medir** con una materia grande real: la extensión de Chrome no estaba
> conectada durante la implementación. Si supera el criterio, se implementa el **montaje
> perezoso** de la spec §4.7: placeholder con altura estimada y el editor monta al acercarse
> al viewport.

## Restricciones

- Markdown es la fuente de verdad (ADR-011): las decoraciones no se guardan.
- `[[Tema]]` se resuelve dentro de la misma materia, sin distinguir mayúsculas, al primer
  tema con ese texto.
- Un heading dentro de una lista o cita no es un tema (no está en el índice). Un heading
  vacío (`# `) tampoco se muestra, pero cuenta para alinear el índice con el editor.

## Pendiente

- [ ] Verificar en el navegador la Fase 13 en la carpeta: adjuntos de punta a punta (el Markdown guarda `![…](adjunto:…)` limpio y la imagen se ve al recargar), borrar con "Deshacer", plantillas e importar.
- [ ] Medir rendimiento con una materia grande (ver arriba).
- [ ] Autocompletar `[[` con los temas de la materia.
- [ ] Celular: índice como drawer (fase "Celular", al final de la hoja de ruta).
