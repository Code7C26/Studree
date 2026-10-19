-- ============================================================================
-- Studree — 0008: la corrección de pruebas (`quiz_grade`) cuenta como uso de IA
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md
--
-- ADITIVA e idempotente: no borra datos. Solo reemplaza el CHECK de
-- `ai_usage.action` para admitir 'quiz_grade' (balde `grade`, Ruling L).
-- El nombre `ai_usage_action_check` es el que Postgres le puso por defecto al
-- CHECK de columna de la 0007.
-- ============================================================================

alter table ai_usage drop constraint if exists ai_usage_action_check;
alter table ai_usage add constraint ai_usage_action_check check (action in
  ('chat', 'shortcut', 'summary', 'quiz', 'weak_review', 'study_plan', 'gaps', 'connections', 'quiz_grade'));

notify pgrst, 'reload schema';
