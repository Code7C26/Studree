-- ============================================================================
-- 0014 — Mapa de carrera: materias "relacionadas" y año de cada materia
--
-- Feature: docs/features/career-map.md · Modelo: docs/DB_SCHEMA.md
--
-- ADITIVA e idempotente: no borra datos.
-- 1. `prerequisites.kind` acepta 'relacion': una unión sin requisito (línea
--    punteada sin flecha). No bloquea ni entra al layout ni a la validación de
--    ciclos (eso se resuelve en el cliente: subjectStatus.js / dagreLayout.js /
--    prerequisites.service.js).
-- 2. `subjects.year`: año de la carrera (1..10) o NULL = sin año. El mapa
--    arma columnas por año.
-- ============================================================================

alter table prerequisites drop constraint if exists prerequisites_kind_check;
alter table prerequisites
  add constraint prerequisites_kind_check check (kind in ('cursar', 'rendir', 'relacion'));

alter table subjects add column if not exists year smallint;
alter table subjects drop constraint if exists subjects_year_check;
alter table subjects add constraint subjects_year_check check (year is null or year between 1 and 10);
