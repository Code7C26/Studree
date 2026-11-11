# Feature: Importar (.md y .zip)

> **Estado:** ✅ Implementado (2026-10-15, Fase 13)
> **Archivos clave:** `src/lib/import/` (`frontmatter.js`, `createdAt.js`, `mediaRefs.js`, `plan.js`),
> `src/services/import.service.js`, `src/hooks/useImport.js`, `src/components/features/import/ImportDialog.jsx`

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
- **Raíz `Studree/`:** se descarta si hay al menos una carpeta más (`Studree/Materia` no crea una carrera "Studree"). Las rutas de Windows con `\` se normalizan a `/`.
- **Carrera y materia existentes** se reusan por nombre, sin distinguir mayúsculas ni espacios de los bordes.
- **"Importado":** lo que no tiene carpeta va a la carrera y materia `Importado`.
- **Frontmatter:** se acepta con BOM al principio y también vacío.
- **Se saltean:** hojas vacías, archivos ocultos (`.obsidian/`, `__MACOSX/`, `.DS_Store`), archivos del zip
  que ninguna hoja usa, y duplicados (mismo minuto de creación y mismo contenido, en la base o repetido en el zip; al comparar se ignoran los destinos de links e imágenes, porque en la base son `adjunto:<id>`, y los escapes de CommonMark de su texto, porque el editor guarda `\_a\*.png` y el export escribe `_a*.png`; así un export de Studree con imágenes que se vuelve a importar se detecta como duplicado).
- **Imágenes y archivos → adjuntos:** la referencia se reescribe a `adjunto:<id>`.
- **Límite:** 20 MB por archivo.

## Flujo

Resumen (`describeSummary`) → importar → progreso → informe.

## Cómo funciona

`useImport` lee los archivos (los `.zip` con `jszip` por `import()` dinámico), arma el plan
(`buildImportPlan`), marca duplicados contra la base (`markDuplicates`) y muestra el resumen.
`importService.executePlan` crea, por hoja, la carrera y materia que falten, la hoja con su
fecha original (`sheets.create` con `created_at` y `{ cache: false }`: un import grande no
reescribe la cache local por cada hoja) y sus adjuntos; si hubo adjuntos, guarda el
Markdown con las referencias reescritas. `ImportDialog` se abre desde la cápsula de la
carpeta (materia abierta) y desde el panel de carreras.

## Errores

Un archivo que falla no frena al resto: queda en el informe con su motivo.

## Pendiente

- [ ] Verificar en el navegador (la extensión de Chrome no estaba conectada al implementar): importar un `.md` suelto, importar un `.zip` de export de Studree en otra carrera (con la imagen visible) y volver a importarlo (no debe duplicar); ida y vuelta export/import.

## Idioma (Fase 18)

El diálogo y el plan de importación (`lib/import/plan.js`) siguen el idioma activo: los motivos de
salteo, el resumen ("This will create 2 careers…") y el nombre de reserva (`importFallbackName`,
"Importado" / "Imported"). **El importador sigue leyendo exports en cualquier idioma**: las claves del
frontmatter (`carrera`, `materia`, `creada`, `fecha`), la carpeta `adjuntos/` y el protocolo
`adjunto:` del Markdown son formato de archivo y no se traducen.
