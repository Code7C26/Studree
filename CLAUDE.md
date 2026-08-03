# Studree — Reglas para IA (Método AInnovate v2)

> **ATENCIÓN IA:** Este proyecto usa **Documentation-Driven Development**.
> **ANTES** de escribir CUALQUIER línea de código, DEBES leer los docs relevantes.
> Documento completo del método: `metodo_ainnovate.md` (raíz del proyecto).

## Contexto del Proyecto

- **Studree**: plataforma web para organizar materias de estudio como **árboles
  conceptuales interactivos** (Study + Tree).
- **Stack:** React 18 + Vite + **JavaScript (JSDoc, NO TypeScript)** + TailwindCSS +
  React Flow (`@xyflow/react`) + React Router DOM.
- **Persistencia:** `localStorage` (sin backend ni base de datos remota aún).
- **Diseño:** modo oscuro principal, **acento verde**, minimalista.

## Protocolo Obligatorio (antes de cada cambio)

1. LEER `docs/01-project-overview.md` (visión, stack, estado)
2. LEER `docs/02-architecture.md` (estructura, convenciones, ADRs)
3. IDENTIFICAR qué feature se modifica
4. LEER `docs/features/[feature].md`
5. Si NO existe doc para la feature → **CREARLO antes de codear**
6. Si se toca el modelo de datos → LEER `docs/DB_SCHEMA.md`
7. Si se toca services/API → LEER `docs/API_DOCS.md`
8. Si se toca seguridad / datos del usuario / env → LEER `docs/03-security.md`
9. ANTES de implementar una feature → revisar `docs/SKILLS.md`

## Los 12 Mandamientos del Vibe Coding (INVIOLABLES)

| # | Mandamiento | Regla |
|---|-------------|-------|
| I | NO ALUCINARÁS | Solo implementar exactamente lo pedido. Ante duda → PREGUNTAR |
| II | SEPARARÁS LÓGICA DE ESTILOS | Lógica de negocio en `services/`+`hooks/`; presentación (Tailwind) en componentes |
| III | DOCUMENTARÁS CADA CAMBIO | Ningún cambio sin su doc correspondiente |
| IV | ACTUALIZARÁS EL CHANGELOG | Cada request que toque código → nueva entrada en `CHANGELOG.md` |
| V | DOCUMENTARÁS EL MODELO DE DATOS | Cada cambio de datos → `docs/DB_SCHEMA.md` |
| VI | SEGUIRÁS LA ESTRUCTURA | Respetar la estructura de `docs/02-architecture.md`. No crear carpetas sin permiso |
| VII | USARÁS EL SISTEMA DE ESTILOS | Respetar `tailwind.config.js`. NO inventar colores/tamaños fuera del design system |
| VIII | PROTEGERÁS CREDENCIALES | Nada hardcodeado. En frontend `VITE_*` es PÚBLICO: jamás secretos ahí |
| IX | TIPARÁS CON JSDoc | Este proyecto usa JavaScript + JSDoc (NO TypeScript, ver ADR-002). Tipar props y retornos |
| X | VALIDARÁS ANTES DE ENTREGAR | Checklist: build ok, funciona, docs + CHANGELOG, sin deps extra, sin secretos |
| XI | MANTENDRÁS CONSISTENCIA | Leer archivos existentes y seguir SUS convenciones |
| XII | COMUNICARÁS CON CLARIDAD | Resumen de acciones al terminar |

## 4 Leyes de Operación

1. **LEER ANTES DE ACTUAR** — Consultar docs antes de cualquier cambio.
2. **NO ROMPER LO QUE FUNCIONA** — Si hay conflicto con la arquitectura: detenerse,
   advertir, explicar impacto y pedir autorización.
3. **DOCUMENTACIÓN CONTINUA** — Actualizar docs + CHANGELOG después de cada cambio.
4. **SEGURIDAD** — Nunca deploy/push/cambios destructivos sin confirmación explícita.

## Documentación del Proyecto

| Doc | Cuándo leerlo |
|-----|--------------|
| `docs/01-project-overview.md` | SIEMPRE (visión, stack, estado) |
| `docs/02-architecture.md` | SIEMPRE (estructura, convenciones, ADRs) |
| `docs/03-security.md` | Si se toca datos del usuario, env, (futuro) auth |
| `docs/04-deployment.md` | Si se toca deploy/build |
| `docs/DB_SCHEMA.md` | Si se toca el modelo de datos / localStorage |
| `docs/API_DOCS.md` | Si se toca services/API |
| `docs/SKILLS.md` | ANTES de implementar cualquier feature nueva |
| `docs/features/*.md` | El doc de la feature que se modifica |

## Tabla de Lookup

> Cuando se modifica un archivo, leer primero el doc correspondiente.
> _(La IA agrega entradas aquí conforme se crean features.)_

| Archivo que se modifica | Doc que se debe leer primero |
|------------------------|------------------------------|
| `src/services/*.service.js` | `docs/API_DOCS.md` + `docs/DB_SCHEMA.md` |
| `src/constants/*` (claves de storage) | `docs/DB_SCHEMA.md` |
| `tailwind.config.js` / `src/index.css` / `constants/palette.js` | `docs/02-architecture.md` (sistema de estilos) |
| `features/folders/**` · `features/subjects/**` · `useFolders` · `useSubjects` | `docs/features/folders-and-subjects.md` |
| `features/conceptMap/**` · `useConceptMap` · `lib/treeLayout.js` | `docs/features/concept-map.md` |
| `features/resources/**` · `useResources` · `resources.service.js` · `constants/resourceTypes.js` | `docs/features/resources.md` |
| `src/components/**` (otros) | `docs/features/[feature].md` |
| `.env*` | `docs/03-security.md` |
