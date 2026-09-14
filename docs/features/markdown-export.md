# Feature: Export a Markdown (para IA / segundo cerebro)

> **Estado:** 📋 Documentado — implementación en Fase 6
> **Archivos clave:** `src/lib/export/`, `src/components/features/export/ExportDialog.jsx`
> **Dependencias nuevas:** `jszip` (solo para el export `.zip`)

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
| `src/lib/export/toSingleMarkdown.js` | Árbol → string Markdown único |
| `src/lib/export/toZip.js` | Árbol → blob `.zip` (usa `jszip`) |
| `src/lib/export/frontmatter.js` | Genera el bloque YAML de cada hoja |
| `src/components/features/export/ExportDialog.jsx` | Elegir alcance y formato |

## Flujo de uso

1. El usuario abre "Exportar" desde una carrera o una materia.
2. Elige **alcance** (esta materia / toda la carrera) y **formato** (`.md` / `.zip`).
3. Se genera en el cliente y se descarga con un `Blob` + `URL.createObjectURL`.

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
