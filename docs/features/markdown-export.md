# Feature: Export a Markdown (para IA / segundo cerebro)

> **Estado:** ✅ Implementado (2026-09-28) · 3 niveles, "todo", "Copiar para IA" (2026-10-14)
> **Archivos clave:** `src/lib/export/`, `src/hooks/useExportTree.js`,
> `src/components/features/export/ExportDialog.jsx`
> **Dependencias:** `jszip` (cargada con `import()` dinámico, no va en el bundle inicial)

---

## Descripción

Exporta el contenido de una materia, una carrera o **todas las carreras** a Markdown, para
pegarlo en una IA (Claude, ChatGPT, Gemini) o importarlo a Obsidian.

Gracias al ADR-011 (Markdown como fuente de verdad) el export no convierte formatos: lee
`sheets.content_md` y lo arma.

## Dónde se abre y qué alcance ofrece

| Desde | Alcances |
|-------|----------|
| Panel de carreras (`/carreras`) → **Exportar todo** | Todas mis carreras |
| Canvas de carrera → **Exportar** | Toda la carrera · Todas mis carreras |
| Canvas de materia → **Exportar** | Esta materia · Toda la carrera · Todas mis carreras |

## Salidas

| Botón | Qué hace |
|-------|----------|
| **📋 Copiar para IA** | Copia el `.md` único al portapapeles con un **preámbulo** que explica qué es, la estructura de headings y que `[[Título]]` es un link a otra hoja. Es lo más rápido para pegar en un chat. |
| **Descargar `.md`** | Un solo archivo (`studree-<nombre>-<AAAA-MM-DD>.md`) |
| **Descargar `.zip`** | Carpetas con un `.md` por hoja y frontmatter (`studree-<nombre>-<fecha>.zip`) |

## 1. `.md` único

La jerarquía va como **headings**:

| Alcance | `#` | `##` | `###` | `####` |
|---------|-----|------|-------|--------|
| Materia | materia | hoja | contenido | |
| Carrera | carrera | materia | hoja | contenido |
| Todo | "Mis apuntes" | carrera | materia | hoja |

```markdown
# Licenciatura en Biología

## Genética

### Leyes de Mendel

#### Primera ley        ← en la hoja era "# Primera ley"
Contenido… ver [[Herencia ligada al sexo]]
```

**Headings de las hojas corridos de nivel (2026-10-14).** Un `# Intro` dentro de una hoja
quedaba al mismo nivel que la carrera, y una IA leía mal la estructura. Ahora
`shiftHeadings` los corre para que queden **debajo** del heading de la hoja, con tope
`######`, y **sin tocar los bloques de código** (```` ``` ```` y `~~~`). Solo afecta al
export: el dato guardado no cambia.

## 2. `.zip`

```
Licenciatura en Biología/
└── Genética/
    ├── Leyes de Mendel.md
    └── Resumen.md
```

Con "todo", todo va dentro de una carpeta `Studree/`.

```markdown
---
carrera: "Licenciatura en Biología"
materia: "Genética"
fecha: 2026-08-24
---

Contenido de la hoja…
```

- Los nombres se **sanitizan** (se quitan `/ \ : * ? " < > |`; vacío → "Sin título").
- Los nombres se **deduplican sin distinguir mayúsculas** dentro de cada carpeta
  (`Resumen.md`, `resumen (2).md`). Antes dos hojas o temas con el mismo nombre se
  pisaban (Windows y macOS no distinguen mayúsculas en los paths).
- `fecha` = `sheets.updated_at` (última edición). Si no hay, el campo se omite.
- El frontmatter se arma a mano (`frontmatter.js`): 3 campos, no justifica `js-yaml`.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useExportTree.js` | Trae el árbol con `content_md`: `loadSubjectTree(id)`, `loadCareerTree(id)`, `loadAllTree()` (consultas con `IN`, paginadas) |
| `src/lib/export/toSingleMarkdown.js` | `shiftHeadings`, `subjectTreeToMarkdown`, `careerTreeToMarkdown`, `allTreeToMarkdown`, `withAiPreamble` (puras) |
| `src/lib/export/toZip.js` | `uniqueName`, `subjectTreeToZip`, `careerTreeToZip`, `allTreeToZip` (reciben el constructor de JSZip) |
| `src/lib/export/frontmatter.js` | `buildFrontmatter({ careerName, subjectName, date })` |
| `src/lib/export/download.js` | `buildExportFilename`, `downloadBlob`, `downloadTextFile` |
| `src/components/features/export/ExportDialog.jsx` | Modal: alcance, formato, descargar / copiar para IA |

## Restricciones

- El export es **solo lectura**: nunca modifica datos.
- Se genera **en el cliente**; no hay endpoint de export.
- Se libera la URL del blob (`revokeObjectURL`) después de descargar.
- `jszip` se importa con **`import()` dinámico**.
- Si el navegador no deja escribir en el portapapeles, se avisa y se sugiere descargar.

## RAG / embeddings

**Fuera de alcance en esta etapa.** El contenido queda chunkeable por hoja.

## Pendiente

- [ ] Export de una sola hoja.
- [ ] Incluir/excluir hojas vacías.
- [ ] Índice de contenidos al principio del `.md` único.
