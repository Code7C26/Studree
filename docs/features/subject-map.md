# Feature: Canvas de Materia (unidades → temas) + panel de hojas

> **Estado:** ✅ Implementado (2026-09-09) · Rediseño estilo n8n (2026-10-14, ADR-012)
> **Archivos clave:** `src/pages/SubjectMapPage.jsx`,
> `src/components/features/subjectMap/`, `src/components/features/sheets/`,
> `src/hooks/useSubjectMap.js`, `src/hooks/useSheets.js`
> **Reemplaza a:** `docs/features/concept-map.md`

---

## Descripción

Canvas de una materia con la **materia como nodo raíz**, sus **Unidades** colgando de ella
y, colgando de cada unidad, sus **Temas** (como el árbol del diseño de referencia). Al hacer click en un Tema se abre un **panel lateral** con la lista de
hojas de ese tema.

## Decisión clave: el canvas corta en Tema

**Las hojas NO se dibujan en el canvas.** Una materia real puede tener cientos de hojas;
representarlas como nodos vuelve el grafo ilegible y el layout inmanejable.

| Nivel | Dónde se ve |
|-------|-------------|
| Unidad | Nodo del canvas |
| Tema | Nodo del canvas (hijo de la unidad) |
| **Hoja** | **Panel lateral tipo lista de archivos**, al clickear un tema |

El panel es una lista simple y densa — el patrón correcto cuando el contenido es
homogéneo, ordenado y potencialmente largo.

## Interacción estilo n8n (2026-10-14)

| Acción | Resultado |
|--------|-----------|
| **＋** debajo de la materia (raíz) | Nueva unidad |
| **＋** debajo de una unidad (hover) | Nuevo tema en esa unidad |
| Botón **＋ Unidad** | Nueva unidad |
| Doble click / click derecho en el fondo | Nueva unidad en ese punto |
| Click / doble click en un tema | Panel de hojas |
| Arrastrar cualquier nodo (incluida la raíz) | Se mueve y la posición se guarda |
| ✕ en unidad / tema (hover) | Eliminar con confirmación (cascada) |
| **⟲ Reordenar** | Vuelve al acomodo automático |

Ya no hay formularios arriba del canvas: todo se crea desde el lienzo.

## Layout

Híbrido, igual que el canvas de carrera (**ADR-012**): dagre `TB` (materia → unidades →
temas) para lo que no tiene posición guardada; `map_x`/`map_y` (raíz) y `pos_x`/`pos_y`
(unidades y temas) para lo acomodado a mano. Es un árbol, así que ya es un DAG por
construcción (no hace falta validar ciclos).

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectMapPage.jsx` | Página: breadcrumb + canvas + panel |
| `src/components/features/subjectMap/SubjectMap.jsx` | Lienzo React Flow (toolbar, creación en el lienzo) |
| `src/components/features/subjectMap/SubjectRootNode.jsx` | Nodo raíz: la materia + "+" para unidades |
| `src/components/features/subjectMap/UnitNode.jsx` | Nodo de unidad (nombre + nº de temas + "+" para temas) |
| `src/components/features/subjectMap/TopicNode.jsx` | Nodo de tema (nombre + nº de hojas) |
| `src/components/features/sheets/SheetListPanel.jsx` | Panel lateral con las hojas del tema |
| `src/components/features/sheets/SheetListItem.jsx` | Fila: título, fecha, acciones |
| `src/hooks/useSubjectMap.js` | Materia + unidades + temas (3 consultas, sin N+1) + posiciones |
| `src/hooks/useFlowCanvas.js` | Arrastrar/guardar, modo auto/manual, crear en el lienzo |
| `src/hooks/useSheets.js` | Hojas de un tema (listar / crear / borrar / renombrar) |
| `src/services/units.service.js`, `topics.service.js`, `sheets.service.js` | Datos |

## Flujo de uso

1. El usuario entra a `/materias/:subjectId` (desde el canvas de carrera o el explorador).
2. Ve las unidades con sus temas. Si no hay nada → empty state con CTA.
3. Click en un **Tema** → se abre el panel lateral con sus hojas.
4. Click en una **Hoja** → se abre en una tab y navega a `/hojas/:sheetId`.
5. "Nueva hoja" en el panel → se crea vacía y se abre directamente en el editor.

## Reutilización

El panel usa `src/components/ui/Drawer.jsx`, que ya existe (se creó en la Fase 4 para
`ResourcePanel`). **No se crea un componente de panel nuevo.**

## Restricciones

- El canvas **no baja al nivel de hoja**, por legibilidad. No es una limitación temporal:
  es la decisión de diseño.
- Las posiciones se guardan solo por arrastre / creación en el lienzo (ADR-012).
- Borrar unidades, temas y hojas siempre con confirmación.
- El conteo de hojas por tema se resuelve con un `count` agregado, **no** trayendo todas
  las hojas de la materia.

## Pendiente

- [ ] Reordenar unidades/temas (campo `position`).
- [ ] Mover una hoja de un tema a otro.
- [ ] Progreso por unidad.
