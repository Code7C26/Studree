# Feature: Recursos por Tema (apuntes, enlaces, videos)

> **Estado:** ✅ Completo (Fase 4 — versión base)
> **Archivos clave:** `src/components/features/resources/ResourcePanel.jsx`,
> `src/components/features/resources/ResourceItem.jsx`,
> `src/components/features/resources/ResourceFormModal.jsx`,
> `src/services/resources.service.js`, `src/hooks/useResources.js`,
> `src/constants/resourceTypes.js`, `src/components/ui/Drawer.jsx`
> **Dependencias:** ninguna externa (localStorage)

---

## Descripción

Cada tema (nodo) del mapa puede tener **recursos** asociados: notas de texto, enlaces,
videos o archivos (como enlace). Se gestionan desde un **panel lateral (drawer)** que se
abre al hacer click en el ícono de recursos de un nodo.

## Objetivo

Resolver la parte de "apuntes, archivos y enlaces" de la visión de Studree y de la vista
de detalle del mockup, integrándola con el mapa conceptual.

## Decisión de alcance (sin subir binarios)

Siendo Studree **solo frontend** con `localStorage` (~5 MB), **no se suben archivos
binarios**. Un recurso es:

- una **nota** de texto, o
- un **enlace / video / archivo** representado por una **URL** (a Drive, YouTube, etc.).

> Cuando exista backend (Fase 6) se podrá subir archivos reales. Decisión alineada con
> ADR-003 (persistencia local).

## Modelo de Datos

- `Resource` (`id`, `nodeId`, `type` = `note|link|video|file`, `title`, `content`,
  `createdAt`). Ver `docs/DB_SCHEMA.md`. Persistencia en `studree:resources`.
- **Cascada:** borrar un nodo (o materia, o carpeta) borra sus recursos.

## Flujo de Uso

1. En el mapa, el usuario hace click en el ícono 📎 de un tema (o en su badge de conteo).
2. Se abre el panel lateral con los recursos de ese tema.
3. "Agregar recurso" → modal: tipo (nota/enlace/video/archivo) + título + contenido/URL.
4. Edita o elimina recursos (borrado con confirmación).
5. El badge 📎 del nodo refleja la cantidad de recursos.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/components/ui/Drawer.jsx` | Panel lateral genérico (overlay + slide) |
| `src/components/features/resources/ResourcePanel.jsx` | Panel con la lista + alta/edición/borrado |
| `src/components/features/resources/ResourceItem.jsx` | Una fila de recurso (ícono, link/nota, acciones) |
| `src/components/features/resources/ResourceFormModal.jsx` | Modal crear/editar recurso |
| `src/services/resources.service.js` | CRUD de recursos + cascada por nodo |
| `src/hooks/useResources.js` | Estado + acciones de los recursos de un nodo |
| `src/constants/resourceTypes.js` | Tipos de recurso (label, ícono, si es URL) |

## Integración con el mapa

- `TopicNode` muestra un botón/badge 📎 que abre el panel del nodo.
- `SubjectMapPage` mantiene el nodo seleccionado, renderiza el `ResourcePanel` y calcula
  el conteo de recursos por nodo (para el badge).

## Restricciones

- No subir binarios (solo URLs/notas) hasta tener backend (ADR-003).
- Acceso a datos SOLO vía `resources.service.js`.
- Borrado de recurso con confirmación; cascada al borrar nodo/materia/carpeta.

## Pendiente

- [ ] Buscador de recursos (Fase 5).
- [ ] Vista de detalle completa del tema (tabs Resumen/Notas/Tareas) como el mockup.
- [ ] Subida real de archivos (requiere backend, Fase 6).
