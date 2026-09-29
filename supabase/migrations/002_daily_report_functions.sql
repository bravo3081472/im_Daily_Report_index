-- =====================================================================
-- 日報「主表 + 班別明細 + 不良明細」的交易處理
-- 取代原本 Node.js 後端的 beginTransaction / commit / rollback
-- 前端呼叫：supabase.rpc('save_daily_report', { p: {...} })
--           supabase.rpc('delete_daily_report', { p_id: 123 })
-- =====================================================================

-- ---------------------------------------------------------------------
-- 新增或更新日報（p.id 有值 = 更新，沒有 = 新增），回傳日報 id
-- ---------------------------------------------------------------------
create or replace function public.save_daily_report(p jsonb)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint := nullif(p->>'id', '')::bigint;
begin
  if coalesce(p->>'report_date', '') = ''
     or coalesce(p->>'machine_id', '') = ''
     or coalesce(p->>'order_no', '') = '' then
    raise exception 'report_date、machine_id、order_no 不能為空';
  end if;

  if v_id is null then
    insert into public.im_daily_report (
      report_date, machine_id, order_no, part_no,
      day_output_qty, day_defect_qty, night_output_qty, night_defect_qty,
      total_output_qty, prev_accum_qty, today_accum_qty, remaining_target_qty,
      avg_efficiency, defects_text
    ) values (
      (p->>'report_date')::date, p->>'machine_id', p->>'order_no', p->>'part_no',
      (p->>'day_output_qty')::int, (p->>'day_defect_qty')::int,
      (p->>'night_output_qty')::int, (p->>'night_defect_qty')::int,
      (p->>'total_output_qty')::int, (p->>'prev_accum_qty')::int,
      (p->>'today_accum_qty')::int, (p->>'remaining_target_qty')::int,
      (p->>'avg_efficiency')::numeric, p->>'defects_text'
    )
    returning id into v_id;
  else
    update public.im_daily_report set
      report_date          = (p->>'report_date')::date,
      machine_id           = p->>'machine_id',
      order_no             = p->>'order_no',
      part_no              = p->>'part_no',
      day_output_qty       = (p->>'day_output_qty')::int,
      day_defect_qty       = (p->>'day_defect_qty')::int,
      night_output_qty     = (p->>'night_output_qty')::int,
      night_defect_qty     = (p->>'night_defect_qty')::int,
      total_output_qty     = (p->>'total_output_qty')::int,
      prev_accum_qty       = (p->>'prev_accum_qty')::int,
      today_accum_qty      = (p->>'today_accum_qty')::int,
      remaining_target_qty = (p->>'remaining_target_qty')::int,
      avg_efficiency       = (p->>'avg_efficiency')::numeric,
      defects_text         = p->>'defects_text'
    where id = v_id;

    if not found then
      raise exception '找不到要更新的日報 id=%', v_id;
    end if;

    delete from public.im_daily_report_shift  where report_id = v_id;
    delete from public.im_daily_report_defect where report_id = v_id;
  end if;

  insert into public.im_daily_report_shift (
    report_id, shift_type, emp_ids, prev_molds, cur_molds, actual_cycle,
    good_qty, unprocessed_qty, setup_qty, pending_qty,
    plan_hours, actual_hours, downtime_hours
  )
  select
    v_id,
    coalesce(nullif(s->>'shift_type', ''), 'day'),
    coalesce(s->>'emp_ids', ''),
    coalesce(nullif(s->>'prev_molds', '')::int, 0),
    coalesce(nullif(s->>'cur_molds', '')::int, 0),
    coalesce(nullif(s->>'actual_cycle', '')::numeric, 0),
    coalesce(nullif(s->>'good_qty', '')::int, 0),
    coalesce(nullif(s->>'unprocessed_qty', '')::int, 0),
    coalesce(nullif(s->>'setup_qty', '')::int, 0),
    coalesce(nullif(s->>'pending_qty', '')::int, 0),
    coalesce(nullif(s->>'plan_hours', '')::numeric, 0),
    coalesce(nullif(s->>'actual_hours', '')::numeric, 0),
    coalesce(nullif(s->>'downtime_hours', '')::numeric, 0)
  from jsonb_array_elements(coalesce(p->'shifts', '[]'::jsonb)) as s;

  insert into public.im_daily_report_defect (
    report_id, shift_type, defect_code, defect_reason, defect_qty
  )
  select
    v_id,
    coalesce(nullif(d->>'shift_type', ''), 'day'),
    coalesce(d->>'defect_code', ''),
    coalesce(d->>'defect_reason', ''),
    coalesce(nullif(d->>'defect_qty', '')::int, 0)
  from jsonb_array_elements(coalesce(p->'defects', '[]'::jsonb)) as d;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 刪除日報（先刪明細再刪主表），回傳刪除的主表筆數
-- ---------------------------------------------------------------------
create or replace function public.delete_daily_report(p_id bigint)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.im_daily_report_defect where report_id = p_id;
  delete from public.im_daily_report_shift  where report_id = p_id;
  delete from public.im_daily_report where id = p_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.save_daily_report(jsonb)     to anon, authenticated;
grant execute on function public.delete_daily_report(bigint)  to anon, authenticated;
