# Feature: Export a Markdown (para IA / segundo cerebro)

> **Estado:** ✅ Implementado (2026-09-28) — `.md` único y `.zip` con carpetas
> **Archivos clave:** `src/lib/export/`, `src/hooks/useExportTree.js`,
> `src/components/features/export/ExportDialog.jsx`
> **Dependencias nuevas:** `jszip` (cargada con `import()` dinámico, no va en el bundle inicial)

---

## Descripción

Exporta el contenido de una materia o de una carrera completa a Markdown, para subirlo a
un proyecto de Claude/ChatGPT o importarlo a Obsidian.

Gracias al ADR-011 (Markdown como fuente de verdad) el export **no convierte nada**: lee
`sheets.content_md` y lo concatena.

## Prioridad de implementación

| # | Formato | Para qué | Prioridad |
|---|---------|----------|-----------|
| 1 | **`.md` único concatenado** | Subir directo a un proyecto de IA | **Primero** |
| 2 | **`.zip` con estructura de carpetas** | Importar a Obsidian o similar | Después |

---

## 1. Export `.md` único

Un solo archivo con la jerarquía expresada como **headings**:

| Nivel | Heading |
|-------|---------|
| Carrera | `#` |
| Materia | `##` |
| Unidad | `###` |
| Tema | `####` |
| Hoja | Título en negrita + su contenido debajo |

```markdown
# Licenciatura en Biología

## Genética

### Unidad 1 — Herencia mendeliana

#### Leyes de Mendel

**Apunte de clase 12/03**

Contenido de la hoja en Markdown, tal cual está guardado…

**Resumen del capítulo 4**

Otro contenido…
```

> Los headings **dentro** del contenido de una hoja se preservan tal cual. Puede haber un
> `#` de la hoja bajo un `####` de tema: es Markdown válido y las IAs lo interpretan bien.
> Reescalar los headings del usuario sería alterar su contenido.

**Nombre del archivo:** `studree-<carrera-o-materia>-<AAAA-MM-DD>.md`

## 2. Export `.zip`

Estructura de carpetas espejo del árbol, con **frontmatter YAML** por hoja:

```
Licenciatura en Biología/
└── Genética/
    └── 01 - Herencia mendeliana/
        └── Leyes de Mendel/
            ├── Apunte de clase 12-03.md
            └── Resumen del capítulo 4.md
```

```markdown
---
materia: Genética
unidad: Herencia mendeliana
tema: Leyes de Mendel
fecha: 2026-08-24
---

Contenido de la hoja…
```

- Los nombres se **sanitizan** para el sistema de archivos (se quitan `/ \ : * ? " < > |`).
- Las unidades se prefijan con su `position` (`01 - `, `02 - `) para que el orden se
  respete al listarlas alfabéticamente.
- El frontmatter se genera a mano (`frontmatter.js`): son 5 campos, **no justifica sumar
  `js-yaml`** como dependencia.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useExportTree.js` | Trae la jerarquía completa (con `content_md` y `updated_at` de cada hoja) desde los services: `loadSubjectTree(subjectId)` / `loadCareerTree(careerId)` |
| `src/lib/export/toSingleMarkdown.js` | Árbol → string Markdown único (funciones puras: `subjectTreeToMarkdown`, `careerTreeToMarkdown`) |
| `src/lib/export/toZip.js` | Árbol → `Blob` `.zip` (funciones puras salvo el constructor de `jszip`, que recibe como parámetro: `subjectTreeToZip(JSZip, subject)`, `careerTreeToZip(JSZip, career)`) |
| `src/lib/export/frontmatter.js` | `buildFrontmatter({ subjectName, unitName, topicName, date })` — arma el bloque YAML de cada hoja del `.zip` |
| `src/lib/export/download.js` | `buildExportFilename(name, extension)` + `downloadBlob(filename, blob)` / `downloadTextFile(filename, content)` |
| `src/components/features/export/ExportDialog.jsx` | Modal: elegir **formato** (`.md` / `.zip`) y, si se abre desde una materia, **alcance** (esta materia / toda la carrera); dispara la descarga |

## Flujo de uso (implementado)

1. El usuario abre "Exportar" desde el header de `CareerMapPage` o `SubjectMapPage`.
2. Elige **formato** (`.md` único / `.zip` con carpetas) y, si viene de una materia,
   **alcance** (esta materia / toda la carrera); desde una carrera el alcance es siempre
   "toda la carrera".
3. `useExportTree` trae el árbol completo con `content_md` de cada hoja.
4. Según el formato:
   - `.md`: `toSingleMarkdown.js` arma el string; `download.js` lo descarga.
   - `.zip`: se importa `jszip` con `import()` dinámico, `toZip.js` arma el `Blob` con la
     estructura de carpetas y el frontmatter de cada hoja; `download.js` lo descarga.

**Numeración de las unidades:** el prefijo `01 - `, `02 - `… sale del **índice en la lista
ya ordenada** (posición 1, 2, 3…), no del campo `position` crudo de la base — así no
importa si `position` tiene huecos por materias/unidades borradas.

**Campo `fecha` del frontmatter:** se usa `sheets.updated_at` (última edición de la hoja),
recortado a `AAAA-MM-DD`.

## Restricciones

- El export es **solo lectura**: nunca modifica datos.
- Se genera **en el cliente**; no hay endpoint de export.
- Se libera la URL del blob (`revokeObjectURL`) después de descargar.
- `jszip` se importa con **`import()` dinámico**, para no cargarlo en el bundle inicial de
  quien nunca exporta.

## RAG / embeddings

**Fuera de alcance en esta etapa.** El terreno queda preparado (contenido en Markdown,
chunkeable por hoja), pero **no se implementa vectorización**.

## Pendiente

- [ ] Export de una sola hoja.
- [ ] Incluir/excluir hojas vacías.
- [ ] Índice de contenidos al principio del `.md` único.
