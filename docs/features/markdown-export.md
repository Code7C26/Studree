# Feature: Export a Markdown (para IA / segundo cerebro)

> **Estado:** ✅ Implementado (2026-09-28) · 3 niveles, "todo", "Copiar para IA" (2026-10-14) · hojas por fecha (ADR-017)
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
| **📋 Copiar para IA** | Copia el `.md` único al portapapeles con un **preámbulo** que explica qué es, la estructura de headings, que cada hoja se titula con su fecha y que `[[Tema]]` es un link a un tema. Es lo más rápido para pegar en un chat. |
| **Descargar `.md`** | Un solo archivo (`studree-<nombre>-<AAAA-MM-DD>.md`) |
| **Descargar `.zip`** | Carpetas con un `.md` por hoja y frontmatter (`studree-<nombre>-<fecha>.zip`) |

## 1. `.md` único

La jerarquía va como **headings**. Las hojas no tienen título (ADR-017): su heading es
la **fecha y hora de creación** (`Miércoles 14/10/2026 · 18:30`), en orden cronológico.

| Alcance | `#` | `##` | `###` | `####` |
|---------|-----|------|-------|--------|
| Materia | materia | hoja | contenido | |
| Carrera | carrera | materia | hoja | contenido |
| Todo | "Mis apuntes" | carrera | materia | hoja |

```markdown
# Licenciatura en Biología

## Genética

### Miércoles 14/10/2026 · 18:30

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
    ├── adjuntos/
    │   ├── foto pizarrón.jpg
    │   └── tp.pdf
    ├── 2026-10-13 10-15.md
    └── 2026-10-14 18-30.md
```

**Adjuntos (Fase 13).** El `.zip` lleva los archivos adjuntos de las hojas en
`adjuntos/` dentro de cada materia, y las referencias `adjunto:<id>` del Markdown pasan a
rutas relativas codificadas: `![foto](adjuntos/foto%20pizarr%C3%B3n.jpg)` (espacios, tildes
y paréntesis codificados; Obsidian y el import los decodifican). Dos adjuntos con el mismo
nombre en la materia no se pisan: `a.png`, `a (2).png`. Si un archivo no se pudo descargar,
la referencia queda como texto (`[imagen: …]` / `[archivo: …]`) y el diálogo avisa cuántos
fallaron. Los adjuntos y hojas en la papelera no se exportan.

El `.md` único y "Copiar para IA" no llevan archivos: describen los adjuntos como
`[imagen: nombre]` / `[archivo: nombre]`, sin ningún `adjunto:`.

El archivo se llama como la fecha y hora de creación: el orden alfabético es el
cronológico. Dos hojas del mismo minuto → `2026-10-14 18-30 (2).md`.

Con "todo", todo va dentro de una carpeta `Studree/`.

```markdown
---
carrera: "Licenciatura en Biología"
materia: "Genética"
creada: 2026-10-14T18:30
fecha: 2026-10-15
---

Contenido de la hoja…
```

- Los nombres se **sanitizan** (se quitan `/ \ : * ? " < > |`; vacío → "Sin título").
- Los nombres se **deduplican sin distinguir mayúsculas** dentro de cada carpeta.
- `creada` = `created_at` en hora local; `fecha` = `updated_at` (última edición, se omite
  si no hay).
- El frontmatter se arma a mano (`frontmatter.js`): 4 campos, no justifica `js-yaml`.

## Componentes / Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `src/hooks/useExportTree.js` | Trae el árbol con `content_md`: `loadSubjectTree(id)`, `loadCareerTree(id)`, `loadAllTree()` (consultas con `IN`, paginadas) |
| `src/lib/export/toSingleMarkdown.js` | `shiftHeadings`, `subjectTreeToMarkdown`, `careerTreeToMarkdown`, `allTreeToMarkdown`, `withAiPreamble` (puras) |
| `src/lib/export/toZip.js` | `uniqueName`, `subjectTreeToZip`, `careerTreeToZip`, `allTreeToZip` (reciben el constructor de JSZip) |
| `src/lib/export/frontmatter.js` | `buildFrontmatter({ careerName, subjectName, created, date })` |
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
