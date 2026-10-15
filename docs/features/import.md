# Feature: Importar (.md y .zip)

> **Estado:** 🚧 En desarrollo (Fase 13) · lógica pura lista (`src/lib/import/`); service, hook y UI pendientes
> **Archivos clave:** `src/lib/import/` (`frontmatter.js`, `createdAt.js`, `mediaRefs.js`, `plan.js`),
> `src/services/import.service.js`, `src/hooks/useImport.js`, `src/components/features/import/`

---

## Dónde está

- **Carpeta de una materia:** importa a esa materia.
- **Panel de carreras (`/carreras`):** importa a las carreras (crea o reusa carreras y materias).

## Formatos

- **`.md` sueltos:** cada archivo es una hoja.
- **`.zip` con `.md`:** cada `.md` es una hoja; las imágenes y archivos del zip se suben como adjuntos.
- **Export de Studree:** `Studree/Carrera/Materia/…`, `Carrera/Materia/…` o `Materia/…` con frontmatter
  (`carrera`, `materia`, `creada`, `fecha`).
- **Vault de Obsidian:** `![[foto.png]]` se resuelve por nombre en cualquier carpeta del zip.
  `[[Tema]]` (sin `!`) es un link de Studree y no se toca.

## Reglas

- **Fecha de la hoja:** `creada:` del frontmatter → nombre `AAAA-MM-DD HH-MM` → fecha del archivo → ahora.
  Las dos primeras son hora local; una fecha inválida pasa a la siguiente fuente.
- **Carrera y materia existentes** se reusan por nombre, sin distinguir mayúsculas ni espacios de los bordes.
- **"Importado":** lo que no tiene carpeta va a la carrera y materia `Importado`.
- **Se saltean:** hojas vacías, archivos ocultos (`.obsidian/`, `__MACOSX/`, `.DS_Store`), archivos del zip
  que ninguna hoja usa, y duplicados (mismo minuto de creación y mismo contenido, en la base o repetido en el zip).
- **Imágenes y archivos → adjuntos:** la referencia se reescribe a `adjunto:<id>`.
- **Límite:** 20 MB por archivo.

## Flujo

Resumen (`describeSummary`) → importar → progreso → informe.

## Errores

Un archivo que falla no frena al resto: queda en el informe con su motivo.

## Pendiente

Service, hook y UI del diálogo de importación.
