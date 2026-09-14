# Feature: Canvas de Materia (unidades → temas) + panel de hojas

> **Estado:** ✅ Implementado (2026-09-09)
> **Archivos clave:** `src/pages/SubjectMapPage.jsx`,
> `src/components/features/subjectMap/`, `src/components/features/sheets/`,
> `src/hooks/useSubjectMap.js`, `src/hooks/useSheets.js`
> **Reemplaza a:** `docs/features/concept-map.md`

---

## Descripción

Canvas de una materia que muestra **dos niveles**: sus **Unidades** y, colgando de cada
una, sus **Temas**. Al hacer click en un Tema se abre un **panel lateral** con la lista de
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

## Layout

Igual que el canvas de carrera: **dagre siempre, sin coordenadas guardadas** (ADR-008).
Acá la relación es la jerarquía `Unit → Topic`, que es un árbol y por lo tanto ya es un DAG
por construcción (no hace falta validar ciclos).

- Dirección `TB` (arriba → abajo): la unidad arriba, sus temas debajo.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectMapPage.jsx` | Página: breadcrumb + canvas + panel |
| `src/components/features/subjectMap/SubjectMap.jsx` | Lienzo React Flow |
| `src/components/features/subjectMap/UnitNode.jsx` | Nodo de unidad (nombre + nº de temas) |
| `src/components/features/subjectMap/TopicNode.jsx` | Nodo de tema (nombre + nº de hojas) |
| `src/components/features/sheets/SheetListPanel.jsx` | Panel lateral con las hojas del tema |
| `src/components/features/sheets/SheetListItem.jsx` | Fila: título, fecha, acciones |
| `src/hooks/useSubjectMap.js` | Unidades + temas de la materia |
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
- Nunca persistir `x`/`y` (ADR-008).
- El conteo de hojas por tema se resuelve con un `count` agregado, **no** trayendo todas
  las hojas de la materia.

## Pendiente

- [ ] Reordenar unidades/temas (campo `position`).
- [ ] Mover una hoja de un tema a otro.
- [ ] Progreso por unidad.
