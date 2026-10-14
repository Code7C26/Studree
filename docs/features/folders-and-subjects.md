# Feature: Carpetas (Carreras/Cursos) y Materias

> ⚠️ **OBSOLETO** — describe el modelo viejo (localStorage, ADR-003/006/010). Reemplazado por `docs/features/careers.md` (panel de carreras) y `docs/features/career-map.md`. Se conserva solo como registro histórico; **no** refleja el código actual.

> **Estado:** ✅ Completo (Fase 2)
> **Archivos clave:** `src/pages/FoldersPage.jsx`, `src/pages/FolderPage.jsx`,
> `src/services/folders.service.js`, `src/services/subjects.service.js`,
> `src/hooks/useFolders.js`, `src/hooks/useSubjects.js`
> **Dependencias:** ninguna externa (localStorage + React Router)

---

## Descripción

Permite organizar el estudio en dos niveles: **Carpetas** (una por carrera o curso) y,
dentro de cada carpeta, **Materias**. Es la base estructural sobre la que cuelga el mapa
conceptual de cada materia.

## Objetivo

Resolver el pedido del usuario: *"tener una carpeta por carrera/curso y adentro dividido
en materias"*. Da una jerarquía clara antes de entrar al detalle de cada materia.

## Modelo de Datos

- `Folder` (carrera/curso) y `Subject` (materia, con `folderId`). Ver `docs/DB_SCHEMA.md`.
- Persistencia en `localStorage` (claves `studree:folders`, `studree:subjects`).
- **Cascada:** borrar una carpeta borra sus materias y los nodos de esas materias.

## Flujo de Uso

1. El usuario entra a **Carpetas** (`/carpetas`) y ve sus carreras/cursos.
2. Crea una carpeta (nombre + color) con el botón "Nueva carpeta".
3. Entra a una carpeta (`/carpetas/:folderId`) y ve sus materias.
4. Crea/edita/borra materias dentro de esa carpeta.
5. Desde una materia, abre su **mapa** (`/materias/:subjectId`) — ver `concept-map.md`.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/pages/FoldersPage.jsx` | Lista de carpetas + alta/edición/borrado |
| `src/pages/FolderPage.jsx` | Materias de una carpeta + alta/edición/borrado |
| `src/components/features/folders/FolderCard.jsx` | Tarjeta de carpeta |
| `src/components/features/folders/FolderFormModal.jsx` | Modal crear/editar carpeta |
| `src/components/features/subjects/SubjectCard.jsx` | Tarjeta de materia (con progreso) |
| `src/components/features/subjects/SubjectFormModal.jsx` | Modal crear/editar materia |
| `src/services/folders.service.js` | CRUD de carpetas (con cascada) |
| `src/services/subjects.service.js` | CRUD de materias (con cascada) |
| `src/hooks/useFolders.js` | Estado + acciones de carpetas |
| `src/hooks/useSubjects.js` | Estado + acciones de materias de una carpeta |

## UI / Pantallas

- Grid de tarjetas (modo oscuro, acento por color de la carpeta/materia).
- Estados: **loading**, **empty** (CTA para crear), **success** (toast implícito en UI).
- Borrado siempre con **confirmación** (Mandamiento UX / Fase 4).

## Skills Utilizadas

| Skill | Cómo se usó |
|-------|------------|
| `ui-ux-pro-max` / `ui-styling` | Guía de patrones de cards, modales y estados (referencia) |

## Restricciones

- No inventar colores fuera de `src/constants/palette.js` (Mandamiento VII).
- Acceso a datos SOLO vía services (los componentes no tocan `localStorage`).
- Borrados con cascada y confirmación (no dejar datos huérfanos).

## Pendiente

- [ ] Búsqueda/filtrado de carpetas y materias.
- [ ] Reordenar (drag) carpetas/materias.
