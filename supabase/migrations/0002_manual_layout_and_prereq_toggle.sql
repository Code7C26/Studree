-- ============================================================================
-- Studree — 0002: posiciones manuales en los canvas + correlativas opcionales
-- Fuente de verdad del modelo: docs/DB_SCHEMA.md (ADR-012, ADR-013).
--
-- Cómo aplicarlo (DESPUÉS de 0001_init.sql):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
--
-- Es idempotente (`if not exists`): se puede correr más de una vez sin romper nada.
-- No toca RLS: las columnas nuevas quedan cubiertas por las políticas `_owner`
-- ya existentes de cada tabla (son por fila, no por columna).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Carreras: ¿usa correlativas? (ADR-013)
--    No todo es una carrera universitaria: un curso o un organizador personal no
--    tiene correlativas. `false` oculta toda la UI de correlativas de esa carrera.
--    Default `true` para que las carreras ya creadas se comporten igual que antes.
-- ----------------------------------------------------------------------------

alter table careers
  add column if not exists uses_prerequisites boolean not null default true;

-- ----------------------------------------------------------------------------
-- 2. Posiciones manuales de los nodos (ADR-012, reemplaza a ADR-008)
--    NULL = el nodo no fue acomodado a mano → lo posiciona dagre.
--    Son coordenadas del lienzo de React Flow (esquina superior izquierda).
-- ----------------------------------------------------------------------------

-- Nodo de la materia en el canvas de CARRERA.
alter table subjects add column if not exists pos_x double precision;
alter table subjects add column if not exists pos_y double precision;

-- Nodo raíz (la propia materia) en el canvas de MATERIA.
alter table subjects add column if not exists map_x double precision;
alter table subjects add column if not exists map_y double precision;

-- Nodos de unidad y tema en el canvas de MATERIA.
alter table units  add column if not exists pos_x double precision;
alter table units  add column if not exists pos_y double precision;
alter table topics add column if not exists pos_x double precision;
alter table topics add column if not exists pos_y double precision;
