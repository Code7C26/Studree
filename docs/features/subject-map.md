# Feature: Canvas de Materia (hojas conectadas por `[[links]]`)

> **Estado:** ✅ Implementado (2026-10-14) — reemplaza al canvas Unidad → Tema (2026-09-09)
> **ADRs:** ADR-012 (layout híbrido), ADR-014 (3 niveles), ADR-015 (links), ADR-016 (posiciones en lote)
> **Archivos clave:** `src/pages/SubjectMapPage.jsx`, `src/components/features/subjectMap/`,
> `src/hooks/useSubjectMap.js`, `src/services/sheetLinks.service.js`,
> `src/lib/markdown/wikiLinks.js`, `src/lib/graph/dagreLayout.js`

---

## Descripción

El canvas de una materia muestra sus **hojas como nodos**, conectadas por los **`[[links]]`**
que hay entre ellas: un mapa conceptual de verdad, estilo n8n/Obsidian. No hay niveles
intermedios (Unidad/Tema se eliminaron, ADR-014). Para materias con muchas hojas hay una
vista **Lista**.

## Cómo funciona un link

Una flecha **A → B** significa que el Markdown de la hoja A contiene `[[B]]`. El canvas no
guarda conexiones propias: las lee de `sheet_links`, que la base deriva del texto (ADR-015).

| Acción en el canvas | Qué pasa con los datos |
|---------------------|------------------------|
| Unir el punto derecho de A con el izquierdo de B | Se agrega `[[B]]` en una línea nueva al final de A |
| Click en la flecha A → B (con confirmación) | Se quita `[[B]]` de A: si estaba sola en su línea se borra la línea; si estaba en una frase queda el texto plano `B` |
| **＋** al costado de A | Nueva hoja B, y `[[B]]` al final de A |
| Escribir `[[B]]` en el editor | Aparece la flecha la próxima vez que se abre el canvas |
| Renombrar B | La base reescribe `[[B]]` → `[[nuevo]]` en A: la flecha sigue |
| Borrar B | Se borran sus flechas; en A queda el texto `[[B]]` como link colgado |

## Interacción

| Acción | Resultado |
|--------|-----------|
| Botón **＋ Hoja** / doble click o click derecho en el fondo | Nueva hoja (en ese punto, si es en el lienzo) |
| Click en el título / doble click en el nodo | Abre la hoja en una tab (`/hojas/:id`) |
| Arrastrar un nodo | Se mueve y la posición se guarda (un request para todos, ADR-016) |
| ✕ en el nodo (hover) | Eliminar la hoja (confirmación) |
| **⟲ Reordenar** | Vuelve al acomodo automático |
| Toggle **Canvas / Lista** | Lista de hojas ordenadas por última edición (abrir / eliminar) |

Cada nodo muestra el título, la fecha de última edición y la cantidad de enlaces (🔗).

## Layout

Híbrido (ADR-012), con `computeSheetLayout`:

- las hojas **conectadas** se ordenan con dagre `LR` (origen → enlazada), con
  `acyclicer: 'greedy'` porque los links pueden formar ciclos (A ↔ B es normal);
- las hojas **sueltas** van en grilla **debajo** del bloque conectado (dagre sin aristas
  las apilaría en una columna larguísima);
- `sheets.pos_x/pos_y` (posición manual) manda sobre lo calculado.

## Datos

- `useSubjectMap(subjectId)` trae la materia, sus hojas **sin `content_md`**
  (`SHEET_SUMMARY_COLUMNS`) y los links salientes de esas hojas. Conectar y desconectar son
  optimistas: la arista aparece o desaparece ya, y después se releen los links reales.
- Se recarga en silencio cuando otra vista emite `studree:data-changed` (ej. renombrar en
  el explorador).
- Títulos únicos por materia: crear una hoja con un título repetido muestra
  *"Ya existe una hoja con ese título en esta materia."*

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectMapPage.jsx` | Página: encabezado, toggle Canvas/Lista, diálogos de crear/borrar/quitar enlace, export |
| `src/components/features/subjectMap/SubjectMap.jsx` | Lienzo React Flow (crear en el lienzo, conectar, quitar enlace) |
| `src/components/features/subjectMap/SheetNode.jsx` | Nodo hoja (título, fecha, enlaces, ✕, ＋) |
| `src/components/features/subjectMap/SheetList.jsx` | Vista Lista |
| `src/components/features/sheets/SheetListItem.jsx` | Fila de la lista (reutilizada) |
| `src/hooks/useSubjectMap.js` | Materia + hojas + links + acciones |
| `src/hooks/useFlowCanvas.js` | Arrastrar/guardar, modo auto/manual, crear en el lienzo (compartido con el canvas de carrera) |
| `src/services/sheetLinks.service.js` | Leer links; conectar/desconectar editando el Markdown |
| `src/lib/markdown/wikiLinks.js` | `appendWikiLink`, `removeWikiLink`, `extractWikiLinks`, `unescapeWikiLinks` |

## Restricciones

- Los links se resuelven **dentro de la misma materia**. Links entre materias: fuera de
  alcance.
- El canvas **no escribe** `sheet_links`: solo edita Markdown (fuente de verdad, ADR-011).
- Borrar hojas y quitar enlaces siempre con confirmación.

## Pendiente

- [ ] Agrupar hojas visualmente (colores/etiquetas).
- [ ] Links entre hojas de materias distintas.
- [ ] Vista previa del contenido al pasar el mouse por un nodo.
