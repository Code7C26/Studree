-- ============================================================================
-- 0013 — Fase 17: cambio de plan por el checkout simulado
--
-- Feature: docs/features/plans.md
-- Modelo: docs/DB_SCHEMA.md · Seguridad: docs/03-security.md (revisión de esta función)
--
-- ADITIVA e idempotente: no borra datos ni toca políticas. `user_plans` sigue SIN
-- política de escritura: el único camino para cambiar el plan desde la app es esta
-- función, que solo escribe la fila de quien la llama.
-- ⚠️ Solo para la demo: antes de cobrar de verdad, el plan lo cambia el webhook de un
--    procesador de pagos y esta función se borra.
-- ============================================================================

create or replace function simulate_plan_change(p_plan text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Un invitado (sesión anónima) primero guarda su cuenta: no hay a quién "cobrarle".
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'guest cannot change plan' using errcode = '42501';
  end if;

  if p_plan is null or p_plan not in ('free', 'premium') then
    raise exception 'invalid plan' using errcode = '22023';
  end if;

  insert into user_plans (user_id, plan)
  values (uid, p_plan)
  on conflict (user_id) do update set plan = excluded.plan;

  return p_plan;
end;
$$;

revoke all on function simulate_plan_change(text) from public;
revoke all on function simulate_plan_change(text) from anon;
grant execute on function simulate_plan_change(text) to authenticated;
