# Feature: Mi estudio (resúmenes y exámenes guardados)

Sección de primer nivel (`/estudio`) donde el usuario ve lo que le generó el Brote: sus
**resúmenes** y el **registro de sus exámenes**. Datos: tablas `summaries` y `quiz_attempts`
(migración 0009, ver `docs/DB_SCHEMA.md`); services en `src/services/study.service.js`
(ver `docs/API_DOCS.md`). El asistente que los genera está en `docs/features/assistant.md`.

## Rutas (lazy, dentro de `WorkspaceLayout`, como la papelera)

| Ruta | Página | Qué muestra |
|------|--------|-------------|
| `/estudio` (`ROUTES.study`) | `StudyPage` | Lista con pestañas y filtro por materia |
| `/estudio/resumenes/:summaryId` | `StudySummaryPage` | El resumen (`SummaryDocument`) con acciones |
| `/estudio/examenes/:attemptId` | `StudyQuizPage` | El registro del examen (`QuizRecordView`) |

Query de `/estudio`: `?tab=resumenes|examenes` (default `resumenes`) y `?materia=<id>`.
`studyPath({tab, subjectId})` arma el link; el botón **Estudio** de la carpeta de una materia
abre la sección filtrada por esa materia.

## Lista (`StudyPage`)

- Pestañas **Resúmenes** / **Exámenes** (`role="tablist"`).
- Filtro **Materia**: "Todas las materias" + materias presentes (`subjectOptions`). Los ítems de
  alcance carrera o todo (sin `subject_id`) solo aparecen sin filtro (`filterBySubject`).
- Cada ítem: título, materia (o "Varias materias"), fecha (`formatSheetDateLong`), y en
  exámenes "7 de 10"; link a su página y botón de borrar con confirmación.

## Papelera

Las listas ocultan lo de materias o carreras en la papelera (`filterLiveStudyItems`). Al
restaurar la materia, sus resúmenes y exámenes vuelven a verse. Una página de detalle de algo
oculto muestra "No encontramos ese resumen/examen".

## Borrar

Borrado definitivo (sin papelera): `ConfirmDialog` "¿Borrar este resumen? No se puede
deshacer." (o examen). Lo hace `useStudy().remove(kind, id)`.

## PDF y "Guardar como hoja"

En la página del resumen: **Descargar PDF** (`usePrintSummary` + `SummaryPrint`, diálogo de
impresión del navegador; hint «Guardar como PDF») y **Guardar como hoja**
(`useSaveSummaryAsSheet`, solo si el resumen es de una sola materia).

## Archivos

- `src/pages/StudyPage.jsx`, `StudySummaryPage.jsx`, `StudyQuizPage.jsx`
- `src/hooks/useStudy.js` (lista + `remove`), `useStudyItem.js` (un ítem por id)
- `src/components/features/study/` (`SummaryDocument`, `SummaryPrint`, `QuizRecordView`, `StudyItemRow`)
- `src/lib/assistant/studyItems.js` (filtros puros), `src/constants/routes.js`

## Navegación

Header: Inicio · Carreras · **Mi estudio** · Perfil (ver `navigation-shell.md`).
