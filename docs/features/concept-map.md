# Feature: Mapa Conceptual de la Materia (estilo Obsidian / híbrido)

> ## ⚠️ REEMPLAZADO (2026-08-24)
>
> Esta feature queda sustituida por **`docs/features/subject-map.md`** (canvas de
> Unidades → Temas + panel de hojas). Se conserva como registro histórico.
>
> Qué cambió y por qué:
> - El `TreeNode` recursivo se reemplaza por entidades explícitas `Unit` / `Topic` /
>   `Sheet` (**ADR-010**).
> - Las posiciones manuales dejan de persistirse: el layout lo calcula dagre siempre
>   (**ADR-008**, que reemplaza al ADR-006 citado más abajo).
> - El canvas **corta en Tema**: las hojas ya no son nodos, van en un panel lateral.

> **Estado:** ⚠️ Reemplazado (implementado en Fase 2, retirado en 2026-08-24)
> **Archivos clave:** `src/pages/SubjectMapPage.jsx`,
> `src/components/features/conceptMap/ConceptMap.jsx`,
> `src/components/features/conceptMap/TopicNode.jsx`,
> `src/services/nodes.service.js`, `src/hooks/useConceptMap.js`,
> `src/lib/treeLayout.js`
> **Dependencias:** `@xyflow/react` (React Flow v12)

---

## Descripción

Visualización interactiva de los **temas/conceptos** de una materia como un grafo de
nodos conectados. El usuario navega, agrega temas, los conecta a un tema padre, los marca
como completados y los reacomoda libremente.

## Objetivo

Resolver el pedido: *"que se parezca a Obsidian el mapa"*. Estilo **híbrido**:

- **Layout jerárquico automático** de base (raíz arriba, ramas hacia abajo) — calculado
  en `src/lib/treeLayout.js`.
- **Interacción libre** tipo Obsidian: nodos arrastrables, zoom y paneo. Si el usuario
  mueve un nodo, su posición manual se persiste y prevalece sobre el auto-layout.

> Decisión registrada como **ADR-006** en `docs/02-architecture.md` (híbrido con React
> Flow en lugar de un grafo force-directed con física, para no agregar dependencias).

## Modelo de Datos

- `TreeNode` con `parentId` (jerarquía), `completed` (progreso) y `position` (drag).
  Ver `docs/DB_SCHEMA.md`. Persistencia en `studree:nodes`.

## Flujo de Uso

1. El usuario abre el mapa de una materia (`/materias/:subjectId`).
2. Si no hay temas → empty state con CTA "Agregar primer tema" (será la raíz).
3. "Agregar tema" → modal: nombre + tema padre (opcional; sin padre = raíz).
4. Marca un tema como completado con el checkbox del nodo (actualiza el progreso).
5. Arrastra nodos para reacomodarlos (se guarda la posición).
6. Borra un tema → confirma → se borran también sus descendientes (cascada).

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/SubjectMapPage.jsx` | Página del mapa: toolbar + lienzo |
| `src/components/features/conceptMap/ConceptMap.jsx` | Lienzo React Flow (nodos/edges) |
| `src/components/features/conceptMap/TopicNode.jsx` | Nodo custom (label + checkbox + acciones) |
| `src/components/features/conceptMap/TopicFormModal.jsx` | Modal para agregar/editar tema |
| `src/services/nodes.service.js` | CRUD de nodos (con cascada de descendientes) |
| `src/hooks/useConceptMap.js` | Estado del grafo + acciones |
| `src/lib/treeLayout.js` | Auto-layout jerárquico (posiciones por nivel) |

## Mapeo de datos → React Flow

- `TreeNode` → nodo RF `{ id, type:'topic', position, data:{ label, completed, onToggle, onAddChild, onDelete } }`.
- `TreeNode.parentId` → edge RF `{ id, source:parentId, target:id }`.
- `position`: si el nodo tiene `position` (drag) se usa; si no, la calcula `treeLayout`.

## UI / Pantallas

- Lienzo a casi pantalla completa, con `Background` y `Controls` de React Flow.
- Toolbar: nombre de la materia (breadcrumb) + botón "Agregar tema" + progreso (%).
- Estados: loading, empty (sin temas), y el grafo.

## Skills Utilizadas

| Skill | Cómo se usó |
|-------|------------|
| `ui-ux-pro-max` | Referencia de patrones de nodos/lienzo |

## Restricciones

- No agregar dependencias de física (force-directed) sin autorización (ADR-006).
- Posiciones y datos SOLO vía `nodes.service.js`.
- Borrado de nodo = cascada de descendientes + confirmación.

## Pendiente

- [ ] Editar el label de un tema en línea.
- [x] Recursos por nodo (apuntes/enlaces/videos) — implementado en Fase 4 (ver `resources.md`).
- [ ] Reasignar padre arrastrando una conexión.
