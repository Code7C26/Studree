-- ============================================================================
-- Studree — 0012: el color de cada materia pasa a ser el de su carrera
-- Doc: docs/features/careers.md · Modelo: docs/DB_SCHEMA.md
--
-- SOLO DATOS, idempotente. Hasta ahora las materias nacían siempre verdes y no había forma de
-- cambiarles el color, así que cambiar el de la carrera no se veía en la carpeta. Desde la app
-- (2026-11-11) el color de la carrera baja a sus materias al guardarlo y las materias nuevas
-- nacen con él; esto alinea las que ya existían.
-- ============================================================================

update subjects s
set color = c.color
from careers c
where s.career_id = c.id
  and s.color is distinct from c.color;
