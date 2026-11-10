# Feature: Celular, PWA y lectura sin señal

> **Estado:** En desarrollo (Fase 16, 2026-11-10)
> **ADRs:** ADR-025 (celular primero, foto a hoja y PWA sin dependencias), ADR-007 (cache optimista)
> **Spec:** `docs/superpowers/specs/2026-11-10-fase-16-celular-camara-design.md`
> **Archivos clave:** `src/hooks/useIsMobile.js`, `src/pages/SubjectFolderPage.jsx`,
> `src/hooks/useFolder.js`, `public/manifest.webmanifest`, `public/sw.js`, `src/main.jsx`

---

## Qué hace

- Adapta la Carpeta y los diálogos al teléfono con el breakpoint `md` (768 px).
- Permite instalar Studree como PWA y abrir el shell sin conexión.
- Muestra las hojas ya guardadas de una materia cuando no hay red, con un aviso y "Reintentar".

## Pendiente de completar en el cierre de la fase

Decisiones, archivos y verificación manual en un teléfono.
