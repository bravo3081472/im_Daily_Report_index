-- =====================================================================
-- 權限收緊：只有登入者（authenticated）可以讀寫資料
-- 未登入的訪客（anon）即使拿到網址與 publishable key 也無法存取
-- 登入帳號在 Supabase → Authentication → Users 管理（目前：admin@mes.local）
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'im_company_defect_reason',
    'im_daily_report',
    'im_daily_report_defect',
    'im_daily_report_shift',
    'im_machine',
    'im_production_number',
    'company_personnel'
  ]
  loop
    execute format('alter policy "allow_all_crud" on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

revoke usage, select on all sequences in schema public from anon;
revoke execute on function public.save_daily_report(jsonb)    from anon, public;
revoke execute on function public.delete_daily_report(bigint) from anon, public;
