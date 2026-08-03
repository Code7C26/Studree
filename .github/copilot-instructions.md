# Studree — Reglas para IA / GitHub Copilot (Método AInnovate v2)

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
| II | SEPARARÁS LÓGICA DE ESTILOS | Lógica en `services/`+`hooks/`; presentación (Tailwind) en componentes |
| III | DOCUMENTARÁS CADA CAMBIO | Ningún cambio sin su doc correspondiente |
| IV | ACTUALIZARÁS EL CHANGELOG | Cada request que toque código → nueva entrada en `CHANGELOG.md` |
| V | DOCUMENTARÁS EL MODELO DE DATOS | Cada cambio de datos → `docs/DB_SCHEMA.md` |
| VI | SEGUIRÁS LA ESTRUCTURA | Respetar `docs/02-architecture.md`. No crear carpetas sin permiso |
| VII | USARÁS EL SISTEMA DE ESTILOS | Respetar `tailwind.config.js`. NO inventar valores |
| VIII | PROTEGERÁS CREDENCIALES | Nada hardcodeado. En frontend `VITE_*` es PÚBLICO: jamás secretos ahí |
| IX | TIPARÁS CON JSDoc | JavaScript + JSDoc (NO TypeScript, ver ADR-002). Tipar props y retornos |
| X | VALIDARÁS ANTES DE ENTREGAR | Checklist: build ok, funciona, docs + CHANGELOG, sin deps/secretos extra |
| XI | MANTENDRÁS CONSISTENCIA | Leer archivos existentes y seguir SUS convenciones |
| XII | COMUNICARÁS CON CLARIDAD | Resumen de acciones al terminar |

## 4 Leyes de Operación

1. **LEER ANTES DE ACTUAR** — Consultar docs antes de cualquier cambio.
2. **NO ROMPER LO QUE FUNCIONA** — Conflicto con la arquitectura: detenerse, advertir, pedir permiso.
3. **DOCUMENTACIÓN CONTINUA** — Actualizar docs + CHANGELOG después de cada cambio.
4. **SEGURIDAD** — Nunca deploy/push/cambios destructivos sin confirmación explícita.

## Documentación del Proyecto

| Doc | Cuándo leerlo |
|-----|--------------|
| `docs/01-project-overview.md` | SIEMPRE |
| `docs/02-architecture.md` | SIEMPRE |
| `docs/03-security.md` | Datos del usuario, env, (futuro) auth |
| `docs/04-deployment.md` | Deploy/build |
| `docs/DB_SCHEMA.md` | Modelo de datos / localStorage |
| `docs/API_DOCS.md` | services/API |
| `docs/SKILLS.md` | ANTES de cada feature |
| `docs/features/*.md` | El doc de la feature que se modifica |
