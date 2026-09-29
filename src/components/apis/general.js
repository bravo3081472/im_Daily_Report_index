// *=============================================================*
// * 通用 API（改由 supabase-js 直接存取 Supabase，取代原 Node.js 後端）*
// *
// * 匯出的函式名稱與回傳格式 { data } 都和原本 axios 版本相同，
// * 所以元件與 useIMProductionWorkOrder.js 不需要修改呼叫方式。
// *=============================================================*

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------

// 取代後端的 deepEmptyStringToNull：空字串一律轉成 null
const emptyToNull = (value) => {
  if (value === '') return null;
  if (Array.isArray(value)) return value.map(emptyToNull);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, emptyToNull(v)]),
    );
  }
  return value;
};

const hasValue = (value) =>
  value !== undefined && value !== null && String(value) !== '';

// 1 / '1' / true → true，0 / '0' / false → false（資料庫欄位為 boolean）
const toBool = (value) => {
  if (!hasValue(value)) return undefined;
  if (typeof value === 'boolean') return value;
  return String(value) === '1' || String(value).toLowerCase() === 'true';
};

// 只挑出指定欄位（避免把前端多餘欄位送進資料庫）
const pick = (input, columns) =>
  Object.fromEntries(columns.map((col) => [col, input[col] ?? null]));

// 模糊搜尋字串（PostgREST or() 語法需要加雙引號避免逗號、括號造成解析錯誤）
const likeValue = (keyword) =>
  `"%${String(keyword).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;

// 統一錯誤處理：丟出錯誤讓呼叫端的 try/catch 接住
const unwrap = ({ data, error }, label) => {
  if (error) {
    const err = new Error(`[ ${label} ] 失敗：${error.message}`);
    err.details = error;
    throw err;
  }
  return data;
};

const mutationResult = (rows, extra = {}) => ({
  data: {
    status: rows && rows.length > 0 ? 200 : 202,
    message: rows && rows.length > 0 ? 'success' : 'error',
    ...extra,
  },
});

// ---------------------------------------------------------------
// 欄位定義（與原後端 Basic.js 相同）
// ---------------------------------------------------------------
const im_machine_Columns = [
  'Machine_Number',
  'Machine_Name',
  'Machine_Sort',
  'Brand',
  'Specification',
  'Tonnes',
];

const im_production_number_Columns = [
  'Production_Number',
  'Master_Parts_Number',
  'Component_Number',
  'Product_Name_Specification',
  'Reserve_Completion_Day',
  'Mold_Number',
  'Number_Of_Holes',
  'Cycle',
  'Production_Quantity',
  'Unit_Dosage',
];

const personnel_Columns = [
  'emp_id',
  'name',
  'department',
  'unit',
  'role_title',
  'phone',
  'email',
  'is_active',
  'remark',
];

const defect_reason_Columns = [
  'defect_code',
  'defect_reason',
  'is_active',
  'sort_order',
  'remark',
];

const daily_report_Columns = [
  'report_date',
  'machine_id',
  'order_no',
  'part_no',
  'day_output_qty',
  'day_defect_qty',
  'night_output_qty',
  'night_defect_qty',
  'total_output_qty',
  'prev_accum_qty',
  'today_accum_qty',
  'remaining_target_qty',
  'avg_efficiency',
  'defects_text',
];

// 機台編號在資料庫是整數；'01' → 1（與原 MySQL 行為相同）
const toMachineNumber = (value) => {
  if (!hasValue(value)) return null;
  return /^\d+$/.test(String(value).trim()) ? Number(value) : value;
};

// 製令：前端欄位名稱（orderNo...）轉成資料庫欄位名稱
const normalizeProductionNumberInput = (input = {}) => ({
  idWorkOrder: input.idWorkOrder ?? null,
  Production_Number: input.Production_Number ?? input.orderNo ?? null,
  Master_Parts_Number: input.Master_Parts_Number ?? input.partNo ?? null,
  Component_Number: input.Component_Number ?? input.rawMaterial ?? null,
  Product_Name_Specification:
    input.Product_Name_Specification ?? input.spec ?? null,
  Reserve_Completion_Day: input.Reserve_Completion_Day ?? input.dueDate ?? null,
  Mold_Number: input.Mold_Number ?? input.moldNo ?? null,
  Number_Of_Holes: input.Number_Of_Holes ?? input.cavities ?? null,
  Cycle: input.Cycle ?? input.stdCycle ?? null,
  Production_Quantity: input.Production_Quantity ?? input.targetQty ?? null,
  Unit_Dosage: input.Unit_Dosage ?? input.unitUsage ?? null,
});

// =================================================================
// 客戶資料（原系統的共用 API，本專案未使用，保留函式避免匯入錯誤）
// =================================================================
export const 前端_取得_客戶資料 = async () => ({ data: [] });

// =================================================================
// 成型製令工單
// =================================================================
export const 前端_取得_成型製令工單 = async (params = {}) => {
  const input = emptyToNull(params || {});
  let q = supabase
    .from('im_production_number')
    .select('*')
    .order('idWorkOrder', { ascending: false });
  if (input.Production_Number) q = q.eq('Production_Number', input.Production_Number);
  return { data: unwrap(await q, '取得_All_成型製令') };
};

export const 前端_取得_成型製令 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.idWorkOrder && !input.Production_Number) {
    throw new Error('查詢需要 idWorkOrder 或 Production_Number');
  }
  let q = supabase.from('im_production_number').select('*');
  q = input.idWorkOrder
    ? q.eq('idWorkOrder', input.idWorkOrder)
    : q.eq('Production_Number', input.Production_Number);
  return { data: unwrap(await q, '取得_成型製令') };
};

export const 前端_新增_成型製令 = async (params = {}) => {
  const input = normalizeProductionNumberInput(emptyToNull(params || {}));
  const rows = unwrap(
    await supabase
      .from('im_production_number')
      .insert(pick(input, im_production_number_Columns))
      .select('idWorkOrder'),
    '新增_成型製令',
  );
  return mutationResult(rows, { insertId: rows?.[0]?.idWorkOrder });
};

export const 前端_更新_成型製令 = async (params = {}) => {
  const input = normalizeProductionNumberInput(emptyToNull(params || {}));
  const workOrderId = Number(input.idWorkOrder);
  if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
    throw new Error('更新需要 idWorkOrder');
  }
  const rows = unwrap(
    await supabase
      .from('im_production_number')
      .update(pick(input, im_production_number_Columns))
      .eq('idWorkOrder', workOrderId)
      .select('idWorkOrder'),
    '更新_成型製令',
  );
  return mutationResult(rows);
};

export const 前端_刪除_成型製令 = async (params = {}) => {
  const input = normalizeProductionNumberInput(emptyToNull(params || {}));
  const workOrderId = Number(input.idWorkOrder);
  if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
    throw new Error('刪除需要 idWorkOrder');
  }
  const rows = unwrap(
    await supabase
      .from('im_production_number')
      .delete()
      .eq('idWorkOrder', workOrderId)
      .select('idWorkOrder'),
    '刪除_成型製令',
  );
  return mutationResult(rows);
};

// =================================================================
// 人員資料（全公司主檔）
// =================================================================
const toPersonnelRow = (input) => {
  const row = pick(input, personnel_Columns);
  const active = toBool(input.is_active);
  row.is_active = active === undefined ? true : active;
  return row;
};

export const 前端_取得_人員資料_清單 = async (params = {}) => {
  const input = emptyToNull(params || {});
  let q = supabase
    .from('company_personnel')
    .select('*')
    .order('department', { ascending: true })
    .order('unit', { ascending: true })
    .order('name', { ascending: true });
  if (input.department) q = q.eq('department', input.department);
  if (input.unit) q = q.eq('unit', input.unit);
  if (hasValue(input.is_active)) q = q.eq('is_active', toBool(input.is_active));
  if (input.keyword) {
    const v = likeValue(input.keyword);
    q = q.or(`emp_id.ilike.${v},name.ilike.${v},role_title.ilike.${v}`);
  }
  return { data: unwrap(await q, '取得_All_人員資料') };
};

export const 前端_取得_人員資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.id && !input.emp_id) throw new Error('查詢需要 id 或 emp_id');
  let q = supabase.from('company_personnel').select('*');
  q = input.id ? q.eq('id', input.id) : q.eq('emp_id', input.emp_id);
  return { data: unwrap(await q, '取得_人員資料') };
};

export const 前端_新增_人員資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.name || !input.department) {
    throw new Error('name、department 不能為空');
  }
  const rows = unwrap(
    await supabase
      .from('company_personnel')
      .insert(toPersonnelRow(input))
      .select('id'),
    '新增_人員資料',
  );
  return mutationResult(rows, { insertId: rows?.[0]?.id });
};

export const 前端_更新_人員資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id) && !input.emp_id) throw new Error('更新需要 id 或 emp_id');
  let q = supabase.from('company_personnel').update(toPersonnelRow(input));
  q = hasValue(input.id) ? q.eq('id', input.id) : q.eq('emp_id', input.emp_id);
  const rows = unwrap(await q.select('id'), '更新_人員資料');
  return mutationResult(rows);
};

export const 前端_刪除_人員資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.id && !input.emp_id) throw new Error('刪除需要 id 或 emp_id');
  let q = supabase.from('company_personnel').delete();
  q = input.id ? q.eq('id', input.id) : q.eq('emp_id', input.emp_id);
  const rows = unwrap(await q.select('id'), '刪除_人員資料');
  return mutationResult(rows);
};

// =================================================================
// 不良原因資料
// =================================================================
const toDefectRow = (input) => {
  const row = pick(input, defect_reason_Columns);
  const active = toBool(input.is_active);
  row.is_active = active === undefined ? true : active;
  row.sort_order = hasValue(input.sort_order) ? Number(input.sort_order) : 0;
  return row;
};

export const 前端_取得_不良原因_清單 = async (params = {}) => {
  const input = emptyToNull(params || {});
  let q = supabase
    .from('im_company_defect_reason')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('defect_code', { ascending: true })
    .order('defect_reason', { ascending: true });
  if (input.defect_code) q = q.eq('defect_code', input.defect_code);
  if (hasValue(input.is_active)) q = q.eq('is_active', toBool(input.is_active));
  if (input.keyword) {
    const v = likeValue(input.keyword);
    q = q.or(`defect_code.ilike.${v},defect_reason.ilike.${v}`);
  }
  return { data: unwrap(await q, '取得_All_不良原因') };
};

export const 前端_取得_不良原因 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.id && !input.defect_code) throw new Error('查詢需要 id 或 defect_code');
  let q = supabase.from('im_company_defect_reason').select('*');
  q = input.id ? q.eq('id', input.id) : q.eq('defect_code', input.defect_code);
  return { data: unwrap(await q, '取得_不良原因') };
};

export const 前端_新增_不良原因 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.defect_code || !input.defect_reason) {
    throw new Error('defect_code、defect_reason 不能為空');
  }
  const rows = unwrap(
    await supabase
      .from('im_company_defect_reason')
      .insert(toDefectRow(input))
      .select('id'),
    '新增_不良原因',
  );
  return mutationResult(rows, { insertId: rows?.[0]?.id });
};

export const 前端_更新_不良原因 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id) && !input.defect_code) {
    throw new Error('更新需要 id 或 defect_code');
  }
  let q = supabase.from('im_company_defect_reason').update(toDefectRow(input));
  q = hasValue(input.id) ? q.eq('id', input.id) : q.eq('defect_code', input.defect_code);
  const rows = unwrap(await q.select('id'), '更新_不良原因');
  return mutationResult(rows);
};

export const 前端_刪除_不良原因 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.id && !input.defect_code) throw new Error('刪除需要 id 或 defect_code');
  let q = supabase.from('im_company_defect_reason').delete();
  q = input.id ? q.eq('id', input.id) : q.eq('defect_code', input.defect_code);
  const rows = unwrap(await q.select('id'), '刪除_不良原因');
  return mutationResult(rows);
};

// =================================================================
// 日報資料（主表 + 班別明細 + 不良明細）
// 新增 / 更新 / 刪除走資料庫函式，確保三張表同一個交易完成
// =================================================================

// 支援原後端的兩種傳法：shifts/defects 陣列，或 day_shift / night_shift 物件
const listShiftRows = (input) => {
  const rows = Array.isArray(input?.shifts) ? input.shifts : [];
  if (rows.length > 0) return rows;
  const candidates = [];
  if (input?.day_shift) candidates.push({ shift_type: 'day', ...input.day_shift });
  if (input?.night_shift) candidates.push({ shift_type: 'night', ...input.night_shift });
  return candidates;
};

const listDefectRows = (input) => {
  const rows = Array.isArray(input?.defects) ? input.defects : [];
  if (rows.length > 0) return rows;
  const candidates = [];
  (input?.day_shift?.defects || []).forEach((item) =>
    candidates.push({ shift_type: 'day', ...item }),
  );
  (input?.night_shift?.defects || []).forEach((item) =>
    candidates.push({ shift_type: 'night', ...item }),
  );
  return candidates;
};

const buildDailyReportPayload = (input) => ({
  ...(hasValue(input.id) ? { id: String(input.id) } : {}),
  ...pick(input, daily_report_Columns),
  shifts: listShiftRows(input).map((r = {}) => ({
    shift_type: r.shift_type || r.shiftType || 'day',
    emp_ids: r.emp_ids ?? r.empIds ?? '',
    prev_molds: r.prev_molds ?? r.prevMolds ?? 0,
    cur_molds: r.cur_molds ?? r.curMolds ?? 0,
    actual_cycle: r.actual_cycle ?? r.actualCycle ?? 0,
    good_qty: r.good_qty ?? r.goodQty ?? 0,
    unprocessed_qty: r.unprocessed_qty ?? r.unprocessedQty ?? 0,
    setup_qty: r.setup_qty ?? r.setupQty ?? 0,
    pending_qty: r.pending_qty ?? r.pendingQty ?? 0,
    plan_hours: r.plan_hours ?? r.planHours ?? 0,
    actual_hours: r.actual_hours ?? r.actualHours ?? 0,
    downtime_hours: r.downtime_hours ?? r.downtimeHours ?? 0,
  })),
  defects: listDefectRows(input).map((r = {}) => ({
    shift_type: r.shift_type || r.shiftType || 'day',
    defect_code: r.defect_code ?? r.code ?? '',
    defect_reason: r.defect_reason ?? r.reason ?? '',
    defect_qty: r.defect_qty ?? r.qty ?? 0,
  })),
});

export const 前端_取得_日報資料_清單 = async (params = {}) => {
  const input = emptyToNull(params || {});
  let q = supabase
    .from('im_daily_report')
    .select('*')
    .order('report_date', { ascending: false })
    .order('machine_id', { ascending: true });
  if (input.report_date) q = q.eq('report_date', input.report_date);
  if (input.machine_id) q = q.eq('machine_id', input.machine_id);
  if (input.order_no) q = q.eq('order_no', input.order_no);
  if (input.part_no) q = q.eq('part_no', input.part_no);
  if (input.keyword) {
    const v = likeValue(input.keyword);
    q = q.or(
      `machine_id.ilike.${v},order_no.ilike.${v},part_no.ilike.${v},defects_text.ilike.${v}`,
    );
  }
  return { data: unwrap(await q, '取得_All_日報資料') };
};

export const 前端_取得_日報資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  const { id, report_date, machine_id, order_no } = input;
  if (!id && !(report_date && machine_id && order_no)) {
    throw new Error('查詢需要 id 或 report_date + machine_id + order_no');
  }

  let q = supabase.from('im_daily_report').select('*');
  q = id
    ? q.eq('id', id)
    : q.eq('report_date', report_date).eq('machine_id', machine_id).eq('order_no', order_no);
  const reports = unwrap(await q.limit(1), '取得_日報資料');
  const report = reports?.[0] || null;
  if (!report) return { data: null };

  const [shiftRes, defectRes] = await Promise.all([
    supabase
      .from('im_daily_report_shift')
      .select('*')
      .eq('report_id', report.id)
      .order('shift_type', { ascending: true }),
    supabase
      .from('im_daily_report_defect')
      .select('*')
      .eq('report_id', report.id)
      .order('shift_type', { ascending: true })
      .order('defect_code', { ascending: true }),
  ]);

  return {
    data: {
      ...report,
      shifts: unwrap(shiftRes, '取得_日報資料_班別'),
      defects: unwrap(defectRes, '取得_日報資料_不良'),
    },
  };
};

export const 前端_新增_日報資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!input.report_date || !input.machine_id || !input.order_no) {
    throw new Error('report_date、machine_id、order_no 不能為空');
  }
  const payload = buildDailyReportPayload({ ...input, id: undefined });
  const newId = unwrap(
    await supabase.rpc('save_daily_report', { p: payload }),
    '新增_日報資料',
  );
  return { data: { status: 200, message: 'success', insertId: newId } };
};

export const 前端_更新_日報資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id)) throw new Error('更新需要 id');
  unwrap(
    await supabase.rpc('save_daily_report', { p: buildDailyReportPayload(input) }),
    '更新_日報資料',
  );
  return { data: { status: 200, message: 'success' } };
};

export const 前端_刪除_日報資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id)) throw new Error('刪除需要 id');
  const count = unwrap(
    await supabase.rpc('delete_daily_report', { p_id: Number(input.id) }),
    '刪除_日報資料',
  );
  return {
    data: { status: count > 0 ? 200 : 202, message: count > 0 ? 'success' : 'error' },
  };
};

// 製令進度統計用：各日報的產量與班別實際工時
export const 前端_取得_日報產量統計 = async () => {
  const data = unwrap(
    await supabase
      .from('im_daily_report')
      .select(
        'id, report_date, machine_id, order_no, day_output_qty, night_output_qty, day_defect_qty, night_defect_qty, total_output_qty, today_accum_qty, avg_efficiency, im_daily_report_shift(actual_hours)',
      )
      .order('report_date', { ascending: false })
      .order('id', { ascending: false }),
    '取得_日報產量統計',
  );
  return { data };
};

// =================================================================
// 成型機台資料
// =================================================================
const toMachineRow = (input) => ({
  ...pick(input, im_machine_Columns),
  Machine_Number: toMachineNumber(input.Machine_Number),
});

export const 前端_取得_成型機台資料 = async () => {
  const q = supabase
    .from('im_machine')
    .select('*')
    .order('Machine_Number', { ascending: true, nullsFirst: false });
  return { data: unwrap(await q, '取得_All_機台資料') };
};

export const 前端_新增_成型機台資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  const row = toMachineRow(input);
  if (hasValue(input.id)) row.id = Number(input.id);
  const rows = unwrap(
    await supabase.from('im_machine').insert(row).select('id'),
    '新增_機台資料',
  );
  return mutationResult(rows, { insertId: rows?.[0]?.id });
};

export const 前端_更新_成型機台資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id) && !hasValue(input.Machine_Number)) {
    throw new Error('更新需要 id 或 Machine_Number');
  }
  let q = supabase.from('im_machine').update(toMachineRow(input));
  q = hasValue(input.id)
    ? q.eq('id', input.id)
    : q.eq('Machine_Number', toMachineNumber(input.Machine_Number));
  const rows = unwrap(await q.select('id'), '更新_機台資料');
  return mutationResult(rows);
};

export const 前端_刪除_成型機台資料 = async (params = {}) => {
  const input = emptyToNull(params || {});
  if (!hasValue(input.id) && !hasValue(input.Machine_Number)) {
    throw new Error('刪除需要 id 或 Machine_Number');
  }
  let q = supabase.from('im_machine').delete();
  q = hasValue(input.id)
    ? q.eq('id', input.id)
    : q.eq('Machine_Number', toMachineNumber(input.Machine_Number));
  const rows = unwrap(await q.select('id'), '刪除_機台資料');
  return mutationResult(rows);
};

// =================================================================
// 原料物性料管溫度管制及烘料溫管製表（原系統 API，本專案未建此資料表）
// =================================================================
export const 前端_取得_原料物性料管溫度管制及烘料溫管製表 = async () => ({
  data: [],
});
