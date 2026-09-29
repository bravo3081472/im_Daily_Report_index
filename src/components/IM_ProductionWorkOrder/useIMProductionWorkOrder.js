import { computed, ref, reactive, onMounted, watch } from "vue";
import * as bootstrap from "bootstrap";
import Chart from "chart.js/auto";
import {
  前端_取得_成型機台資料,
  前端_新增_成型機台資料,
  前端_更新_成型機台資料,
  前端_刪除_成型機台資料,
  前端_取得_人員資料_清單,
  前端_新增_人員資料,
  前端_更新_人員資料,
  前端_刪除_人員資料,
  前端_取得_不良原因_清單,
  前端_新增_不良原因,
  前端_更新_不良原因,
  前端_刪除_不良原因,
  前端_取得_成型製令工單,
  前端_新增_成型製令,
  前端_更新_成型製令,
  前端_刪除_成型製令,
  前端_取得_日報資料_清單,
  前端_取得_日報資料,
  前端_新增_日報資料,
  前端_更新_日報資料,
  前端_刪除_日報資料,
  前端_取得_日報產量統計,
} from "@/components/apis/通用.js";

const TARGET_DEPARTMENT = "成型課";

// 取得「本地時間」的今天日期 YYYY-MM-DD
// （原本用 toISOString() 是 UTC，台灣早上 8 點前會變成前一天）
export const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// 製令進度統計：由已儲存的日報計算上月 / 本月 / 累計產量與每日明細
// （原本這些數字只存在瀏覽器記憶體，重新整理就歸零）
const monthKeyOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildOrderProgressMap = (reportRows = []) => {
  const now = new Date();
  const thisMonthKey = monthKeyOf(now);
  const lastMonthKey = monthKeyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const map = new Map();

  // reportRows 已依日期、id 由新到舊排序
  reportRows.forEach((row) => {
    const orderNo = String(row.order_no ?? "");
    if (!orderNo) return;
    const date = String(row.report_date ?? "").slice(0, 10);
    const monthKey = date.slice(0, 7);
    const total = Number(row.total_output_qty) || 0;

    if (!map.has(orderNo)) {
      map.set(orderNo, {
        lastMonthQty: 0,
        thisMonthQty: 0,
        latestAccum: Number(row.today_accum_qty) || 0,
        sumOutput: 0,
        byDate: new Map(),
      });
    }
    const stat = map.get(orderNo);
    stat.sumOutput += total;
    if (monthKey === thisMonthKey) stat.thisMonthQty += total;
    if (monthKey === lastMonthKey) stat.lastMonthQty += total;

    const hours = (row.im_daily_report_shift || []).reduce(
      (sum, s) => sum + (Number(s.actual_hours) || 0),
      0
    );
    const day = stat.byDate.get(date) || {
      date,
      machineIds: [],
      dayQty: 0,
      nightQty: 0,
      defectQty: 0,
      totalHours: 0,
      effList: [],
    };
    const machineId = String(row.machine_id ?? "");
    if (machineId && !day.machineIds.includes(machineId)) day.machineIds.push(machineId);
    day.dayQty += Number(row.day_output_qty) || 0;
    day.nightQty += Number(row.night_output_qty) || 0;
    day.defectQty += (Number(row.day_defect_qty) || 0) + (Number(row.night_defect_qty) || 0);
    day.totalHours += hours;
    if (Number(row.avg_efficiency) > 0) day.effList.push(Number(row.avg_efficiency));
    stat.byDate.set(date, day);
  });

  const result = new Map();
  map.forEach((stat, orderNo) => {
    result.set(orderNo, {
      lastMonthQty: stat.lastMonthQty,
      thisMonthQty: stat.thisMonthQty,
      // 以最新一筆日報的「今日累計」為準；沒有填時改用日報產量加總
      accumQty: stat.latestAccum > 0 ? stat.latestAccum : stat.sumOutput,
      dailyRecords: Array.from(stat.byDate.values()).map((d) => ({
        date: d.date,
        machineId: d.machineIds.join(", ") || "-",
        dayQty: d.dayQty,
        nightQty: d.nightQty,
        defectQty: d.defectQty,
        totalHours: Number(d.totalHours.toFixed(2)),
        efficiency:
          d.effList.length > 0
            ? Number((d.effList.reduce((a, b) => a + b, 0) / d.effList.length).toFixed(1))
            : 0,
      })),
    });
  });
  return result;
};

const normalizeMachine = (machine = {}, fallbackIndex = 0) => {
  const machineNo = String(
    machine.Machine_Number ??
      machine.Machine_id ??
      machine.id ??
      String(fallbackIndex + 1).padStart(2, "0")
  );

  return {
    apiId: machine.id ?? null,
    Machine_id: machineNo,
    Machine_Number: machineNo,
    Machine_Name: String(machine.Machine_Name ?? machine.name ?? ""),
    Machine_Sort: String(machine.Machine_Sort ?? ""),
    Brand: String(machine.Brand ?? ""),
    Specification: String(machine.Specification ?? ""),
    tonnage: Number(machine.Tonnes ?? machine.tonnage) || 100,
    Tonnes: String(machine.Tonnes ?? machine.tonnage ?? 100),
  };
};

// 員工資料標準化函數
// 將原始員工資料轉換為統一格式，便於在應用中使用
const normalizeEmployee = (employee = {}, fallbackIndex = 0) => ({
  apiId: employee.id ?? null, // 員工ID
  empId: String(employee.emp_id ?? employee.empId ?? ""), // 員工編號
  name: String(employee.name ?? ""), // 員工姓名
  isAuto: employee.isAuto ?? employee.emp_id === "99" ?? false, // 是否自動生成
  department: String(employee.department ?? TARGET_DEPARTMENT), // 部門
  unit: String(employee.unit ?? ""), // 單位
  roleTitle: String(employee.role_title ?? ""), // 職稱
  phone: String(employee.phone ?? ""), // 電話
  email: String(employee.email ?? ""), // 電子郵件
  isActive:
    employee.is_active === undefined || employee.is_active === null
      ? 1
      : Number(employee.is_active), // 是否啟用
  remark: String(employee.remark ?? ""), // 備註
});

// 不良原因標準化函數
// 將原始不良原因資料轉換為統一格式，便於在應用中使用
const normalizeDefect = (defect = {}, fallbackIndex = 0) => ({
  apiId: defect.id ?? null, // 不良ID
  defectCode: String(defect.defect_code ?? defect.defectCode ?? ""), // 不良代碼
  reason: String(defect.defect_reason ?? defect.reason ?? ""), // 不良原因
  isActive:
    defect.is_active === undefined || defect.is_active === null
      ? 1
      : Number(defect.is_active), // 是否啟用
  sortOrder: Number(defect.sort_order ?? fallbackIndex + 1), // 排序順序
  remark: String(defect.remark ?? ""), // 備註
});

// 成型製令工單標準化函數
// 將原始成型製令工單資料轉換為統一格式，便於在應用中使用
const normalizeWorkOrder = (order = {}, fallbackIndex = 0) => ({
  apiId: order.idWorkOrder ?? null, // 工單ID
  orderNo: String(order.Production_Number ?? order.orderNo ?? ""), // 製令號碼
  partNo: String(order.Master_Parts_Number ?? order.partNo ?? ""), // 材料號碼
  rawMaterial: String(order.Component_Number ?? order.rawMaterial ?? ""), // 原材料
  spec: String(order.Product_Name_Specification ?? order.spec ?? ""), // 規格
  dueDate: String(order.Reserve_Completion_Day ?? order.dueDate ?? ""), // 到期日
  moldNo: String(order.Mold_Number ?? order.moldNo ?? ""), // 模具編號
  cavities: Number(order.Number_Of_Holes ?? order.cavities) || 1, // 模穴數
  stdCycle: Number(order.Cycle ?? order.stdCycle) || 20, // 標準循環時間
  targetQty: Number(order.Production_Quantity ?? order.targetQty) || 0, // 目標數量
  unitUsage: Number(order.Unit_Dosage ?? order.unitUsage) || 0, // 單位用量
  lastMonthQty: Number(order.lastMonthQty) || 0, // 上月產出數
  thisMonthQty: Number(order.thisMonthQty) || 0, // 本月產出數
  accumQty: Number(order.accumQty) || 0, // 累計產出數
  dailyRecords: Array.isArray(order.dailyRecords) ? order.dailyRecords : [], // 每日記錄
});

// 日期輸入值標準化函數
// 將各種格式的日期輸入轉換為統一的 YYYY-MM-DD 格式，便於在應用中使用
const normalizeDateInputValue = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) return raw.replace(/\//g, "-");

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10).replace(/\//g, "-");

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 顯示用日期格式化函數
// 將標準化的日期值轉換為 YYYY/MM/DD 格式，便於在應用中顯示
const formatDisplayDate = (value) => {
  const normalized = normalizeDateInputValue(value);
  return normalized ? normalized.replace(/-/g, "/") : "";
};

// 顯示用日期時間格式化函數
// 將各種格式的日期時間值轉換為 YYYY/MM/DD HH:MM:SS 格式，便於在應用中顯示
const formatDisplayDateTime = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(raw)) {
    return formatDisplayDate(raw);
  }

  // 如果輸入的日期時間格式為 YYYY-MM-DD 或 YYYY/MM/DD，則直接使用顯示用日期格式化函數處理
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
};

const parseReportDate = (value) => {
  const normalized = normalizeDateInputValue(value);
  return normalized ? new Date(`${normalized}T00:00:00`) : null;
};

// 日報資料標準化函數
// 將原始日報資料轉換為統一格式，便於在應用中使用
const normalizeDailyReport = (report = {}, fallbackIndex = 0) => ({
  id: report.id ?? Date.now() + fallbackIndex,
  prodDate: formatDisplayDate(report.report_date ?? report.prodDate ?? ""),
  prodDateTime: formatDisplayDateTime(
    report.created_at ??
      report.createdAt ??
      report.updated_at ??
      report.updatedAt ??
      report.report_date ??
      report.prodDate ??
      ""
  ),
  machineId: String(report.machine_id ?? report.machineId ?? ""),
  orderNo: String(report.order_no ?? report.orderNo ?? ""),
  partNo: String(report.part_no ?? report.partNo ?? ""),
  dayOutput: Number(report.day_output_qty ?? report.dayOutput) || 0,
  dayDefect: Number(report.day_defect_qty ?? report.dayDefect) || 0,
  nightOutput: Number(report.night_output_qty ?? report.nightOutput) || 0,
  nightDefect: Number(report.night_defect_qty ?? report.nightDefect) || 0,
  totalOutput: Number(report.total_output_qty ?? report.totalOutput) || 0,
  prevAccum: Number(report.prev_accum_qty ?? report.prevAccum) || 0,
  todayAccum: Number(report.today_accum_qty ?? report.todayAccum) || 0,
  remaining: Number(report.remaining_target_qty ?? report.remaining) || 0,
  avgEfficiency: Number(report.avg_efficiency ?? report.avgEfficiency) || 0,
  defectsText: String(report.defects_text ?? report.defectsText ?? ""),
});

/**
 * 不良項目紀錄
 * @typedef {Object} DefectEntry
 * @property {string} code - 不良原因代碼
 * @property {number} qty - 不良數量
 */

/**
 * 單一班別（早班／夜班）的日報資料
 * @typedef {Object} ShiftReportForm
 * @property {string} empIds - 該班別作業人員工號（可多筆，以逗號等分隔）
 * @property {number} [prevMolds] - 前次（交接時）模具/模次數，僅早班使用
 * @property {number} curMolds - 目前模具/模次數
 * @property {number} actualCycle - 實際生產週期（秒）
 * @property {number} goodQty - 良品數量
 * @property {number} unprocessedQty - 未處理（待加工）數量
 * @property {number} setupQty - 試模/調機數量
 * @property {number} pendingQty - 待判定數量
 * @property {number} planHours - 計畫生產工時
 * @property {number} actualHours - 實際生產工時
 * @property {number} downtimeHours - 停機工時
 * @property {DefectEntry[]} defects - 不良原因與數量清單
 */

/**
 * 日報表單預設資料結構
 * @typedef {Object} ReportForm
 * @property {string} prodDate - 生產日期（預設為今天，格式 YYYY-MM-DD）
 * @property {string} machineId - 機台編號
 * @property {string} orderNo - 製令單號
 * @property {number} prevAccumQty - 前日累計生產數量
 * @property {ShiftReportForm} dayShift - 早班（白班）日報資料
 * @property {ShiftReportForm} nightShift - 夜班日報資料
 */

/**
 * 建立日報表單的預設值
 * @returns {ReportForm} 日報表單預設資料
 */
const createDefaultReportForm = () => ({
  prodDate: todayLocal(), // 生產日期，預設今天
  machineId: "", // 機台編號
  orderNo: "", // 製令單號
  prevAccumQty: 0, // 前日累計生產數量
  dayShift: {
    empIds: "", // 早班作業人員工號
    prevMolds: 0, // 前次模具/模次數
    curMolds: 0, // 目前模具/模次數
    actualCycle: 0, // 實際生產週期（秒）
    goodQty: 0, // 良品數量
    unprocessedQty: 0, // 未處理數量
    setupQty: 0, // 試模/調機數量
    pendingQty: 0, // 待判定數量
    planHours: 0, // 計畫生產工時
    actualHours: 0, // 實際生產工時
    downtimeHours: 0, // 停機工時
    defects: [{ code: "", qty: 0 }], // 不良原因與數量清單
  },
  nightShift: {
    empIds: "", // 夜班作業人員工號
    curMolds: 0, // 目前模具/模次數
    actualCycle: 0, // 實際生產週期（秒）
    goodQty: 0, // 良品數量
    unprocessedQty: 0, // 未處理數量
    setupQty: 0, // 試模/調機數量
    pendingQty: 0, // 待判定數量
    planHours: 0, // 計畫生產工時
    actualHours: 0, // 實際生產工時
    downtimeHours: 0, // 停機工時
    defects: [{ code: "", qty: 0 }], // 不良原因與數量清單
  },
});

// 注入成型日報表單組合式函數
// 提供對注入成型日報表單的操作和狀態管理，包括機台、員工、不良原因、製令工單等相關資料的管理
export function useIMProductionWorkOrder(options = {}) {
  const { enableCharts = false, clearInputOnMounted = false } = options;

  const chartTimeRange = ref("day");
  const orderSearch = ref("");

  const machines = ref([]);
  const employees = ref([]);
  const defectTypes = ref([]);
  const workOrders = ref([]);
  const dailyReports = ref([]);
  const editingReportId = ref(null);

  const reportForm = reactive(createDefaultReportForm());

  const activeDetailOrder = ref(null);
  const machineForm = reactive({
    apiId: null,
    id: "",
    name: "",
    machineSort: "",
    brand: "",
    specification: "",
    tonnage: 100,
    isEdit: false,
  });
  const employeeForm = reactive({
    empId: "",
    name: "",
    isAuto: false,
    isEdit: false,
  });
  const defectForm = reactive({ defectCode: "", reason: "", isEdit: false });
  const workOrderForm = reactive({
    // 編輯欄位
    orderNo: "",
    partNo: "",
    spec: "",
    rawMaterial: "",
    moldNo: "",
    cavities: 1,
    stdCycle: 20,
    targetQty: 1000,
    dueDate: "",
    unitUsage: 10,
    // 唯讀欄位（後端計算，不送回）
    lastMonthQty: 0,
    thisMonthQty: 0,
    accumQty: 0,
    // 狀態
    isEdit: false,
  });

  const selectedOrderDetails = computed(() => {
    return (
      workOrders.value.find((o) => o.orderNo === reportForm.orderNo) || null
    );
  });

  /**
   * @var {import("vue").ComputedRef<number>} cavities - 穴數
   * @description 從選中的工單明細中獲取模穴數，默認為 1。
   */
  const cavities = computed(() => selectedOrderDetails.value?.cavities || 1);

  /**
   * @var {import("vue").ComputedRef<number>} stdCycle - 標準生產週期
   * @description 從選中的工單明細中獲取標準生產週期，默認為 20 秒。
   */
  const stdCycle = computed(() => selectedOrderDetails.value?.stdCycle || 20);

  /**
   * @var {import("vue").ComputedRef<number>} moldDivisor - 模具分母
   * @description 1 / 計算相同模具和相同到期日的工單數量的總數
   */
  const moldDivisor = computed(() => {
    const current = selectedOrderDetails.value;
    if (!current) return 1;
    const sameMoldAndDueDate = workOrders.value.filter(
      (order) =>
        String(order.moldNo || "") === String(current.moldNo || "") &&
        String(order.dueDate || "") === String(current.dueDate || "")
    ).length;
    if (sameMoldAndDueDate <= 0) return 1;
    return Number((1 / sameMoldAndDueDate).toFixed(4));
  });

  /**
   * @var {Function} translateEmps - 將員工 ID 字串轉換為姓名列表
   * @description 接收以逗號分隔的員工 ID 字串，返回對應的姓名列表，格式為 "姓名(ID)"。
   */
  const translateEmps = (idsStr) => {
    if (!idsStr) return "";
    const ids = idsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const names = ids.map((id) => {
      const found = employees.value.find((e) => e.empId === id);
      return found ? `${found.name}(${id})` : id;
    });
    return names.join(", ");
  };

  // 計算公式: 日班作業人員名稱 = 將 empIds 轉換為姓名列表
  const dayShiftEmpNames = computed(() =>
    translateEmps(reportForm.dayShift.empIds)
  );
  // 計算公式: 夜班作業人員名稱 = 將 empIds 轉換為姓名列表
  const nightShiftEmpNames = computed(() =>
    translateEmps(reportForm.nightShift.empIds)
  );

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftMolds - 日班實際生產模數
   * @description 日班本班模數 = 當前模數 - 前次模數（不小於 0）
   */
  const dayShiftMolds = computed(() =>
    Math.max(
      0,
      (reportForm.dayShift.curMolds || 0) - (reportForm.dayShift.prevMolds || 0)
    )
  );
  const nightShiftMolds = computed(() =>
    Math.max(
      0,
      (reportForm.nightShift.curMolds || 0) - nightShiftPrevMolds.value
    )
  );

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftMachineOutput - 日班機台產出數
   * @description 日班機台產出數 = 日班本班模數 × 穴數
   */
  const dayShiftMachineOutput = computed(
    () => dayShiftMolds.value * cavities.value
  );
  const nightShiftMachineOutput = computed(
    () => nightShiftMolds.value * cavities.value
  );

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftTotalDefects - 日班不良數
   * @description 日班不良數 = 各類不良數量之和
   */
  const dayShiftTotalDefects = computed(() =>
    reportForm.dayShift.defects.reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0
    )
  );
  const nightShiftTotalDefects = computed(() =>
    reportForm.nightShift.defects.reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0
    )
  );

  /**
   * @var {import("vue").ComputedRef<string>} dayShiftDefectString - 日班不良描述字串
   * @description 將日班各類不良轉換為描述字串，格式為 "原因,數量；..."
   */
  const dayShiftDefectString = computed(() => {
    return reportForm.dayShift.defects
      .filter((d) => d.code && d.qty > 0)
      .map((d) => {
        const reason =
          defectTypes.value.find((t) => t.defectCode === d.code)?.reason ||
          d.code;
        return `${reason},${d.qty}`;
      })
      .join("；");
  });
  const nightShiftDefectString = computed(() => {
    return reportForm.nightShift.defects
      .filter((d) => d.code && d.qty > 0)
      .map((d) => {
        const reason =
          defectTypes.value.find((t) => t.defectCode === d.code)?.reason ||
          d.code;
        return `${reason},${d.qty}`;
      })
      .join("；");
  });

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftOutputQty - 日班已產出數
   * @description 已產出數 = 機台產出數 - 不良數 - 調(洗)模數量 - 待判定
   */
  const dayShiftOutputQty = computed(() => {
    return (
      dayShiftMachineOutput.value -
      dayShiftTotalDefects.value -
      (Number(reportForm.dayShift.setupQty) || 0) -
      (Number(reportForm.dayShift.pendingQty) || 0)
    );
  });
  const nightShiftOutputQty = computed(() => {
    return (
      nightShiftMachineOutput.value -
      nightShiftTotalDefects.value -
      (Number(reportForm.nightShift.setupQty) || 0) -
      (Number(reportForm.nightShift.pendingQty) || 0)
    );
  });

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftUnreportedQty - 日班未報數
   * @description 未報數 = 如果員工編號包含 "99" 則為 0，否則為 機台產出數 - (良品 + 未處理 + 不良 + 調(洗)模 + 待判定)
   */
  const dayShiftUnreportedQty = computed(() => {
    if (reportForm.dayShift.empIds.includes("99")) return 0;
    const totalAccounted =
      (Number(reportForm.dayShift.goodQty) || 0) +
      (Number(reportForm.dayShift.unprocessedQty) || 0) +
      dayShiftTotalDefects.value +
      (Number(reportForm.dayShift.setupQty) || 0) +
      (Number(reportForm.dayShift.pendingQty) || 0);
    return Math.max(0, dayShiftMachineOutput.value - totalAccounted);
  });
  const nightShiftUnreportedQty = computed(() => {
    if (reportForm.nightShift.empIds.includes("99")) return 0;
    const totalAccounted =
      (Number(reportForm.nightShift.goodQty) || 0) +
      (Number(reportForm.nightShift.unprocessedQty) || 0) +
      nightShiftTotalDefects.value +
      (Number(reportForm.nightShift.setupQty) || 0);
    return Math.max(0, nightShiftMachineOutput.value - totalAccounted);
  });

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftEfficiency - 日班機台效率
   * @description 計算公式: 日班機台效率 = 標準週期(selectedOrderDetails.stdCycle) / 實際週期(reportForm.dayShift.actualCycle) * 100
   */
  const dayShiftEfficiency = computed(() => {
    const actualCycle = Number(reportForm.dayShift.actualCycle) || 0;
    // 實際週期不大於0時，效率為0（避免除以零）
    if (actualCycle <= 0) return 0;
    // 機台效率 = 標準週期 / 實際週期 * 100
    const eff = (stdCycle.value / actualCycle) * 100;
    return Number(eff.toFixed(1));
  });
  const nightShiftEfficiency = computed(() => {
    const actualCycle = Number(reportForm.nightShift.actualCycle) || 0;
    // 實際週期不大於0時，效率為0（避免除以零）
    if (actualCycle <= 0) return 0;
    // 機台效率 = 標準週期 / 實際週期 * 100
    const eff = (stdCycle.value / actualCycle) * 100;
    return Number(eff.toFixed(1));
  });

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftScheduleAccuracy - 日班排程準確度
   * @description 計算公式: 日班排程準確度 = min(計畫工時, 實際工時) / max(計畫工時, 實際工時) * 100
   * 不管是「超時」還是「提早完成」，只要與計畫不符，統統算作「不準確」
   */
  const dayShiftScheduleAccuracy = computed(() => {
    const plan = Number(reportForm.dayShift.planHours) || 0;
    const actual = Number(reportForm.dayShift.actualHours) || 0;
    if (plan <= 0 || actual <= 0) return 0;
    const accuracy = (Math.min(plan, actual) / Math.max(plan, actual)) * 100;
    return Number(accuracy.toFixed(1));
  });
  const nightShiftScheduleAccuracy = computed(() => {
    const plan = Number(reportForm.nightShift.planHours) || 0;
    const actual = Number(reportForm.nightShift.actualHours) || 0;
    if (plan <= 0 || actual <= 0) return 0;
    const accuracy = (Math.min(plan, actual) / Math.max(plan, actual)) * 100;
    return Number(accuracy.toFixed(1));
  });

  /**
   * @var {import("vue").ComputedRef<number>} dayShiftDefectRate - 日班不良率
   * @description 計算公式: 日班不良率 = 不良數 / 機台產出數 * 100
   */
  const dayShiftDefectRate = computed(() => {
    if (dayShiftMachineOutput.value <= 0) return 0;
    return Number(
      (
        (dayShiftTotalDefects.value / dayShiftMachineOutput.value) *
        100
      ).toFixed(2)
    );
  });
  const nightShiftDefectRate = computed(() => {
    if (nightShiftMachineOutput.value <= 0) return 0;
    return Number(
      (
        (nightShiftTotalDefects.value / nightShiftMachineOutput.value) *
        100
      ).toFixed(2)
    );
  });

  /**
   * @var {import("vue").ComputedRef<number>} nightShiftPrevMolds - 夜班前模數
   * @description 夜班前模數 = 日班本班模數的當前值，如果不存在則取前次模數，默認為 0。
   */
  const nightShiftPrevMolds = computed(
    () => reportForm.dayShift.curMolds || reportForm.dayShift.prevMolds || 0
  );

  /**
   * @var {import("vue").ComputedRef<number>} dailyTotalOutputQty - 本日產出數
   * @description 計算公式: 本日產出數 = 日班產出數 + 夜班產出數
   */
  const dailyTotalOutputQty = computed(
    () => dayShiftOutputQty.value + nightShiftOutputQty.value
  );

  /**
   * @var {import("vue").ComputedRef<number>} todayAccumQty - 本日累計產出數
   * @description 計算公式: 本日累計產出數 = 前次累計產出數 + 本日產出數
   */
  const todayAccumQty = computed(
    () => (Number(reportForm.prevAccumQty) || 0) + dailyTotalOutputQty.value
  );

  /**
   * @var {import("vue").ComputedRef<number>} remainingTargetQty - 剩餘目標數量
   * @description 計算公式: 剩餘目標數量 = 目標數量 - 本日累計產出數
   */
  const remainingTargetQty = computed(() => {
    const target = selectedOrderDetails.value?.targetQty || 0;
    return target - todayAccumQty.value;
  });

  /**
   * @var {import("vue").ComputedRef<number>} dailyCombinedEfficiency - 本日綜合效率
   * @description 採用 OEE（設備綜合效率）概念，計算公式: 本日綜合效率 = 稼動率 × 性能效率 × 良率
   * - 稼動率（Availability） = (本日總實際工時 - 本日總停機工時) / 本日總計畫工時
   *   → 反映扣除停機後，機台實際有在運轉的工時佔計畫工時的比例
   * - 性能效率（Performance） = (標準循環時間 * 本日總產出數) / (本日總實際運轉工時 * 3600)，上限 100%
   *   → 用扣除停機後的「實際運轉工時」取代單純的實際工時，避免停機時間拉低週期效率的假象；
   *     超過 100% 代表工時或停機工時填寫異常，故夾在 100% 上限
   * - 良率（Quality） = 本日總良品數 / 本日總產出數
   *   → 讓不良品產出不會被計入有效效率；其中「本日總良品數」= 良品 + 未處理 + 調(洗)模 + 待判定，
   *     因為未處理／調模／待判定尚待人員判定，暫不計入不良
   * 計畫工時或運轉工時為 0 時，對應項目視為 0，避免除以零
   */
  const dailyCombinedEfficiency = computed(() => {
    const totalPlanHours =
      (Number(reportForm.dayShift.planHours) || 0) +
      (Number(reportForm.nightShift.planHours) || 0);
    const totalActHours =
      (Number(reportForm.dayShift.actualHours) || 0) +
      (Number(reportForm.nightShift.actualHours) || 0);
    const totalDowntimeHours =
      (Number(reportForm.dayShift.downtimeHours) || 0) +
      (Number(reportForm.nightShift.downtimeHours) || 0);
    const totalOutput =
      dayShiftMachineOutput.value + nightShiftMachineOutput.value;
    // 良品數採計 良品 + 未處理 + 調(洗)模 + 待判定，因為這幾類仍待人員判定，暫不視為不良
    const totalGoodQty =
      (Number(reportForm.dayShift.goodQty) || 0) +
      (Number(reportForm.dayShift.unprocessedQty) || 0) +
      (Number(reportForm.dayShift.setupQty) || 0) +
      (Number(reportForm.dayShift.pendingQty) || 0) +
      (Number(reportForm.nightShift.goodQty) || 0) +
      (Number(reportForm.nightShift.unprocessedQty) || 0) +
      (Number(reportForm.nightShift.setupQty) || 0) +
      (Number(reportForm.nightShift.pendingQty) || 0);

    // 實際運轉工時 = 實際工時 - 停機工時（不可小於 0）
    const runningHours = Math.max(0, totalActHours - totalDowntimeHours);

    // 稼動率：實際運轉工時佔計畫工時的比例
    const availability =
      totalPlanHours > 0 ? Math.min(1, runningHours / totalPlanHours) : 0;

    // 性能效率：以標準週期換算的理論運轉時間佔實際運轉時間的比例，超過 100% 通常代表工時填寫異常，故上限夾在 1
    const performance =
      runningHours > 0
        ? Math.min(1, (stdCycle.value * totalOutput) / (runningHours * 3600))
        : 0;

    // 良率：良品數佔總產出數的比例
    const quality = totalOutput > 0 ? totalGoodQty / totalOutput : 0;

    if (totalPlanHours <= 0 || runningHours <= 0 || totalOutput <= 0) return 0;

    const oee = availability * performance * quality * 100;
    return Number(oee.toFixed(1));
  });

  /**
   * @var {import("vue").ComputedRef<number>} dailyScheduleAccuracy - 本日排程準確率
   * @description 計算公式: 本日排程準確率 = min(本日計劃工時, 本日實際工時) / max(本日計劃工時, 本日實際工時) * 100
   */
  const dailyScheduleAccuracy = computed(() => {
    const totalPlan =
      (Number(reportForm.dayShift.planHours) || 0) +
      (Number(reportForm.nightShift.planHours) || 0);
    const totalActual =
      (Number(reportForm.dayShift.actualHours) || 0) +
      (Number(reportForm.nightShift.actualHours) || 0);
    if (totalPlan <= 0 || totalActual <= 0) return 0;
    const accuracy =
      (Math.min(totalPlan, totalActual) / Math.max(totalPlan, totalActual)) *
      100;
    return Number(accuracy.toFixed(1));
  });

  /**
   * @var {import("vue").ComputedRef<Object>} kpiStats - 關鍵績效指標統計
   * @description 包含總產出數、總不良數、良率、不良率、有效訂單數、完成訂單數、訂單總數、訂單完成率、平均效率等統計數據
   */
  const kpiStats = computed(() => {
    const totalOutput =
      dailyReports.value.reduce((s, r) => s + r.totalOutput, 0);
    const totalDefects =
      dailyReports.value.reduce(
        (s, r) => s + (r.dayDefect + r.nightDefect),
        0
      );
    const goodRate =
      totalOutput > 0
        ? (100 - (totalDefects / totalOutput) * 100).toFixed(1)
        : "100.0";
    const defectRate =
      totalOutput > 0
        ? ((totalDefects / totalOutput) * 100).toFixed(2)
        : "0.00";
    const activeOrders = workOrders.value.filter(
      (o) => o.accumQty < o.targetQty
    ).length;
    const completedOrders = workOrders.value.filter(
      (o) => o.accumQty >= o.targetQty
    ).length;
    const totalOrders = workOrders.value.length;
    const orderCompletionRate =
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    const efficiencyRows = dailyReports.value
      .map((r) => Number(r.avgEfficiency) || 0)
      .filter((v) => v > 0);
    const avgEfficiency =
      efficiencyRows.length > 0
        ? Number(
            (
              efficiencyRows.reduce((sum, value) => sum + value, 0) /
              efficiencyRows.length
            ).toFixed(1)
          )
        : 0;

    const defectReasonCounter = new Map();
    dailyReports.value.forEach((report) => {
      String(report.defectsText || "")
        .split("；")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((entry) => {
          const [reasonText, qtyText] = entry.split(",");
          const reason = String(reasonText || "").trim();
          const qty = Number(qtyText) || 0;
          if (!reason) return;
          defectReasonCounter.set(
            reason,
            (defectReasonCounter.get(reason) || 0) + qty
          );
        });
    });

    let topDefectReason = "無資料";
    let topQty = 0;
    defectReasonCounter.forEach((qty, reason) => {
      if (qty > topQty) {
        topQty = qty;
        topDefectReason = `${reason} (${qty})`;
      }
    });

    return {
      totalOutput,
      totalDefects,
      goodRate,
      defectRate,
      avgEfficiency,
      topDefectReason,
      activeOrders,
      completedOrders,
      orderCompletionRate,
    };
  });

  const getReportsByTimeRange = (range) => {
    const rows = dailyReports.value || [];
    if (rows.length === 0) return [];

    const dated = rows
      .map((report) => ({ report, dateObj: parseReportDate(report.prodDate) }))
      .filter((x) => x.dateObj);
    if (dated.length === 0) return [];

    if (range === "day") {
      const latestDate = dated.reduce(
        (max, x) => (!max || x.dateObj > max ? x.dateObj : max),
        null
      );
      const key = `${latestDate.getFullYear()}-${String(
        latestDate.getMonth() + 1
      ).padStart(2, "0")}-${String(latestDate.getDate()).padStart(2, "0")}`;
      return dated
        .filter((x) => normalizeDateInputValue(x.report.prodDate) === key)
        .map((x) => x.report);
    }

    const latestDate = dated.reduce(
      (max, x) => (!max || x.dateObj > max ? x.dateObj : max),
      null
    );
    const latestMonthKey = `${latestDate.getFullYear()}-${String(
      latestDate.getMonth() + 1
    ).padStart(2, "0")}`;
    return dated
      .filter(
        (x) =>
          normalizeDateInputValue(x.report.prodDate).slice(0, 7) ===
          latestMonthKey
      )
      .map((x) => x.report);
  };

  // 機台產量與效率圖表數據構建函數
  // 根據指定的時間範圍，生成機台的產量與效率數據，用於圖表顯示
  const buildMachineChartSeries = (range) => {
    const periodReports = getReportsByTimeRange(range);
    const labels = machines.value.map(
      (m) => `${m.Machine_id}號機 (${m.tonnage}T)`
    );
    const outputs = [];
    const efficiencies = [];

    machines.value.forEach((machine) => {
      const rows = periodReports.filter(
        (r) => String(r.machineId) === String(machine.Machine_id)
      );
      const output = rows.reduce(
        (sum, r) => sum + (Number(r.totalOutput) || 0),
        0
      );
      const effRows = rows
        .map((r) => Number(r.avgEfficiency) || 0)
        .filter((v) => v > 0);
      const eff =
        effRows.length > 0
          ? Number(
              (effRows.reduce((sum, v) => sum + v, 0) / effRows.length).toFixed(
                1
              )
            )
          : 0;
      outputs.push(output);
      efficiencies.push(eff);
    });

    return { labels, outputs, efficiencies };
  };

  // 不良原因帕累托圖數據構建函數
  // 根據指定的時間範圍，生成不良原因的帕累托圖數據，用於圖表顯示
  const buildDefectParetoSeries = (range) => {
    const periodReports = getReportsByTimeRange(range);
    const counter = new Map();

    periodReports.forEach((report) => {
      String(report.defectsText || "")
        .split("；")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((entry) => {
          const [reasonText, qtyText] = entry.split(",");
          const reason = String(reasonText || "").trim();
          const qty = Number(qtyText) || 0;
          if (!reason || qty <= 0) return;
          counter.set(reason, (counter.get(reason) || 0) + qty);
        });
    });

    const sorted = Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const labels = sorted.map((x) => x[0]);
    const values = sorted.map((x) => x[1]);
    const total = values.reduce((sum, v) => sum + v, 0);
    let accum = 0;
    const cumulative = values.map((v) => {
      accum += v;
      return total > 0 ? Number(((accum / total) * 100).toFixed(1)) : 0;
    });

    return { labels, values, cumulative };
  };

  // 最新日報日期計算函數
  // 計算最新的日報日期，便於在應用中顯示最新的日報資訊
  const latestReportDateKey = computed(() => {
    const dated = dailyReports.value
      .map((report) => normalizeDateInputValue(report.prodDate))
      .filter(Boolean)
      .sort();
    return dated.length > 0 ? dated[dated.length - 1] : "";
  });

  // 過濾製令工單計算函數
  // 根據用戶輸入的搜索條件，過濾製令工單列表，便於在應用中快速查找相關工單
  const filteredWorkOrders = computed(() => {
    if (!orderSearch.value) return workOrders.value;
    const q = orderSearch.value.toLowerCase();
    return workOrders.value.filter(
      (o) =>
        o.orderNo.toLowerCase().includes(q) ||
        o.partNo.toLowerCase().includes(q) ||
        o.spec.toLowerCase().includes(q)
    );
  });

  // 機台資料獲取函數
  // 從後端獲取成型機台資料，並進行標準化處理，便於在應用中使用
  const fetchMachines = async () => {
    try {
      const res = await 前端_取得_成型機台資料();
      const rows = Array.isArray(res?.data) ? res.data : [];
      machines.value = rows.map((machine, index) =>
        normalizeMachine(machine, index)
      );
    } catch (error) {
      console.error("[ fetchMachines ]", error);
      machines.value = [];
      alert("讀取成型機台資料失敗，請稍後再試。");
    }
  };

  // 員工資料獲取函數
  // 從後端獲取指定部門的員工資料，並進行標準化處理，便於在應用中使用
  const fetchEmployees = async () => {
    try {
      const res = await 前端_取得_人員資料_清單({
        department: TARGET_DEPARTMENT,
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      employees.value = rows.map((employee, index) =>
        normalizeEmployee(employee, index)
      );
    } catch (error) {
      console.error("[ fetchEmployees ]", error);
      employees.value = [];
      alert("讀取人員資料失敗，請稍後再試。");
    }
  };

  // 不良原因資料獲取函數
  // 從後端獲取不良原因資料，並進行標準化處理，便於在應用中使用
  const fetchDefects = async () => {
    try {
      const res = await 前端_取得_不良原因_清單();
      const rows = Array.isArray(res?.data) ? res.data : [];
      defectTypes.value = rows.map((defect, index) =>
        normalizeDefect(defect, index)
      );
    } catch (error) {
      console.error("[ fetchDefects ]", error);
      defectTypes.value = [];
      alert("讀取不良原因資料失敗，請稍後再試。");
    }
  };

  // 製令工單資料獲取函數
  // 從後端獲取成型製令工單資料，並進行標準化處理，便於在應用中使用
  const fetchWorkOrders = async () => {
    try {
      const [res, statRes] = await Promise.all([
        前端_取得_成型製令工單(),
        前端_取得_日報產量統計(),
      ]);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const progressMap = buildOrderProgressMap(
        Array.isArray(statRes?.data) ? statRes.data : []
      );
      workOrders.value = rows.map((order, index) => {
        const normalized = normalizeWorkOrder(order, index);
        const progress = progressMap.get(normalized.orderNo);
        return progress ? { ...normalized, ...progress } : normalized;
      });
    } catch (error) {
      console.error("[ fetchWorkOrders ]", error);
      workOrders.value = [];
      alert("讀取製令資料失敗，請稍後再試。");
    }
  };

  const refreshMasterData = async () => {
    await Promise.all([
      fetchMachines(),
      fetchEmployees(),
      fetchDefects(),
      fetchWorkOrders(),
    ]);

    if (!machines.value.some((m) => m.Machine_id === reportForm.machineId)) {
      reportForm.machineId = machines.value[0]?.Machine_id || "";
    }
    if (!workOrders.value.some((o) => o.orderNo === reportForm.orderNo)) {
      reportForm.orderNo = workOrders.value[0]?.orderNo || "";
      reportForm.prevAccumQty = workOrders.value[0]?.accumQty || 0;
    }
  };

  // 日報資料獲取函數
  // 從後端獲取日報資料，並進行標準化處理，便於在應用中使用
  const fetchDailyReports = async () => {
    try {
      const res = await 前端_取得_日報資料_清單();
      const rows = Array.isArray(res?.data) ? res.data : [];
      dailyReports.value = rows.map((report, index) =>
        normalizeDailyReport(report, index)
      );
    } catch (error) {
      console.error("[ fetchDailyReports ]", error);
      dailyReports.value = [];
      alert("讀取日報資料失敗，請稍後再試。");
    }
  };

  // 日報表單重填函數
  // 根據指定的日報明細，將數據填充到日報表單中，便於用戶查看和編輯
  const refillReportForm = (detail = {}) => {
    const dayShift =
      (detail.shifts || []).find((s) => s.shift_type === "day") || {};
    const nightShift =
      (detail.shifts || []).find((s) => s.shift_type === "night") || {};
    const dayDefects = (detail.defects || [])
      .filter((d) => d.shift_type === "day")
      .map((d) => ({
        code: String(d.defect_code ?? ""),
        qty: Number(d.defect_qty) || 0,
      }));
    const nightDefects = (detail.defects || [])
      .filter((d) => d.shift_type === "night")
      .map((d) => ({
        code: String(d.defect_code ?? ""),
        qty: Number(d.defect_qty) || 0,
      }));

    reportForm.prodDate = normalizeDateInputValue(detail.report_date ?? "");
    reportForm.machineId = String(detail.machine_id ?? "");
    reportForm.orderNo = String(detail.order_no ?? "");
    reportForm.prevAccumQty = Number(detail.prev_accum_qty) || 0;

    reportForm.dayShift.empIds = String(dayShift.emp_ids ?? "");
    reportForm.dayShift.prevMolds = Number(dayShift.prev_molds) || 0;
    reportForm.dayShift.curMolds = Number(dayShift.cur_molds) || 0;
    reportForm.dayShift.actualCycle =
      Number(dayShift.actual_cycle ?? dayShift.actualCycle) || 0;
    reportForm.dayShift.goodQty = Number(dayShift.good_qty) || 0;
    reportForm.dayShift.unprocessedQty = Number(dayShift.unprocessed_qty) || 0;
    reportForm.dayShift.setupQty = Number(dayShift.setup_qty) || 0;
    reportForm.dayShift.pendingQty = Number(dayShift.pending_qty) || 0;
    reportForm.dayShift.planHours = Number(dayShift.plan_hours) || 0;
    reportForm.dayShift.actualHours = Number(dayShift.actual_hours) || 0;
    reportForm.dayShift.downtimeHours = Number(dayShift.downtime_hours) || 0;
    reportForm.dayShift.defects = dayDefects;

    reportForm.nightShift.empIds = String(nightShift.emp_ids ?? "");
    reportForm.nightShift.curMolds = Number(nightShift.cur_molds) || 0;
    reportForm.nightShift.actualCycle =
      Number(nightShift.actual_cycle ?? nightShift.actualCycle) || 0;
    reportForm.nightShift.goodQty = Number(nightShift.good_qty) || 0;
    reportForm.nightShift.unprocessedQty =
      Number(nightShift.unprocessed_qty) || 0;
    reportForm.nightShift.setupQty = Number(nightShift.setup_qty) || 0;
    reportForm.nightShift.pendingQty = Number(nightShift.pending_qty) || 0;
    reportForm.nightShift.planHours = Number(nightShift.plan_hours) || 0;
    reportForm.nightShift.actualHours = Number(nightShift.actual_hours) || 0;
    reportForm.nightShift.downtimeHours =
      Number(nightShift.downtime_hours) || 0;
    reportForm.nightShift.defects = nightDefects;

    if (reportForm.dayShift.defects.length === 0) {
      reportForm.dayShift.defects = [{ code: "", qty: 0 }];
    }
    if (reportForm.nightShift.defects.length === 0) {
      reportForm.nightShift.defects = [{ code: "", qty: 0 }];
    }
  };

  // 加載日報資料以供編輯
  // 根據指定的日報ID，從後端獲取日報資料，並將其填充到日報表單中，便於用戶查看和修改
  const loadDailyReportForEdit = async (id) => {
    try {
      const res = await 前端_取得_日報資料({ id: String(id) });
      const detail = res?.data;
      if (!detail || !detail.id) {
        alert("找不到對應的日報資料。");
        return;
      }
      refillReportForm(detail);
      editingReportId.value = detail.id;
      alert(`已回填日報資料，可直接修改後儲存。`);
    } catch (error) {
      console.error("[ loadDailyReportForEdit ]", error);
      alert("讀取單筆日報資料失敗，請稍後再試。");
    }
  };

  // 顯示 Bootstrap 模態框
  // 根據指定的模態框ID，顯示對應的 Bootstrap 模態框
  const showBootstrapModal = (id) => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  };

  // 隱藏 Bootstrap 模態框
  // 根據指定的模態框ID，隱藏對應的 Bootstrap 模態框
  const hideBootstrapModal = (id) => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  };

  let efficiencyChartInstance = null;
  let paretoChartInstance = null;

  // 初始化圖表
  // 根據當前的時間範圍，初始化機台效率圖表和不良原因帕累托圖表
  const initCharts = () => {
    if (!enableCharts) return;

    const effCtx = document.getElementById("machineEfficiencyChart");
    const paretoCtx = document.getElementById("defectParetoChart");

    if (effCtx) {
      const machineSeries = buildMachineChartSeries(chartTimeRange.value);
      if (efficiencyChartInstance) efficiencyChartInstance.destroy();
      efficiencyChartInstance = new Chart(effCtx, {
        type: "bar",
        data: {
          labels: machineSeries.labels,
          datasets: [
            {
              label: "產能 (pcs)",
              data: machineSeries.outputs,
              backgroundColor: "rgba(30, 58, 138, 0.75)",
              yAxisID: "y",
            },
            {
              label: "機台稼動效率 (%)",
              data: machineSeries.efficiencies,
              type: "line",
              borderColor: "#10b981",
              backgroundColor: "#10b981",
              tension: 0.3,
              borderWidth: 3,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: { display: true, text: "生產數量 (pcs)" },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              min: 50,
              max: 100,
              title: { display: true, text: "稼動效率 (%)" },
              grid: { drawOnChartArea: false },
            },
          },
        },
      });
    }

    if (paretoCtx) {
      const paretoSeries = buildDefectParetoSeries(chartTimeRange.value);
      if (paretoChartInstance) paretoChartInstance.destroy();
      paretoChartInstance = new Chart(paretoCtx, {
        type: "bar",
        data: {
          labels: paretoSeries.labels,
          datasets: [
            {
              label: "不良數量 (pcs)",
              data: paretoSeries.values,
              backgroundColor: "rgba(239, 68, 68, 0.75)",
              yAxisID: "y",
            },
            {
              label: "累計佔比 (%)",
              data: paretoSeries.cumulative,
              type: "line",
              borderColor: "#f59e0b",
              backgroundColor: "#f59e0b",
              borderWidth: 2,
              tension: 0.1,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: { display: true, text: "不良件數 (pcs)" },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              min: 0,
              max: 100,
              title: { display: true, text: "累積百分比 (%)" },
              grid: { drawOnChartArea: false },
            },
          },
        },
      });
    }
  };

  // 設置圖表的時間範圍
  // 根據指定的時間範圍，更新機台效率圖表和不良原因帕累托圖表的數據
  const setChartTimeRange = (range) => {
    chartTimeRange.value = range;
    if (efficiencyChartInstance) {
      const machineSeries = buildMachineChartSeries(range);
      efficiencyChartInstance.data.labels = machineSeries.labels;
      efficiencyChartInstance.data.datasets[0].data = machineSeries.outputs;
      efficiencyChartInstance.data.datasets[1].data =
        machineSeries.efficiencies;
      efficiencyChartInstance.update();
    }

    if (paretoChartInstance) {
      const paretoSeries = buildDefectParetoSeries(range);
      paretoChartInstance.data.labels = paretoSeries.labels;
      paretoChartInstance.data.datasets[0].data = paretoSeries.values;
      paretoChartInstance.data.datasets[1].data = paretoSeries.cumulative;
      paretoChartInstance.update();
    }
  };

  // 處理選擇的訂單
  // 當用戶選擇訂單時，更新日報表單中的累計數量字段
  const onOrderSelected = () => {
    const ord = selectedOrderDetails.value;
    if (ord) {
      reportForm.prevAccumQty = ord.accumQty || 0;
    }
  };

  // 處理班次人員的添加、移除和選擇狀態
  // 包括添加員工到班次、獲取已選員工、檢查員工是否被選中、移除員工、切換員工選擇狀態以及清空所有員工
  const appendEmp = (shift, empId) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    const current = target.empIds
      ? target.empIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (!current.includes(empId)) {
      current.push(empId);
      target.empIds = current.join(", ");
    }
  };

  const getSelectedEmps = (shift) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    if (!target || !target.empIds) return [];
    const ids = target.empIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return ids.map((id) => {
      const found = employees.value.find((e) => e.empId === id);
      return {
        empId: id,
        name: found ? found.name : id,
        isAutomation: id === "99",
      };
    });
  };

  const isEmpSelected = (shift, empId) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    if (!target || !target.empIds) return false;
    const ids = target.empIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return ids.includes(empId);
  };

  const removeEmp = (shift, empId) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    if (!target) return;
    const current = target.empIds
      ? target.empIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const updated = current.filter((id) => id !== empId);
    target.empIds = updated.join(", ");
  };

  const toggleEmp = (shift, empId) => {
    if (isEmpSelected(shift, empId)) {
      removeEmp(shift, empId);
    } else {
      appendEmp(shift, empId);
    }
  };

  const clearAllEmps = (shift) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    if (target) target.empIds = "";
  };

  const addDefectRow = (shift) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    target.defects.push({ code: "", qty: 0 });
  };

  const removeDefectRow = (shift, idx) => {
    const target =
      shift === "day" ? reportForm.dayShift : reportForm.nightShift;
    target.defects.splice(idx, 1);
  };

  const saveDailyReport = async () => {
    if (!reportForm.orderNo || !reportForm.machineId) {
      alert("請先選取機台與製令單號！");
      return;
    }

    const newReport = {
      id: Date.now(),
      prodDate: reportForm.prodDate,
      machineId: reportForm.machineId,
      orderNo: reportForm.orderNo,
      partNo: selectedOrderDetails.value?.partNo || "",
      dayOutput: dayShiftOutputQty.value,
      dayDefect: dayShiftTotalDefects.value,
      nightOutput: nightShiftOutputQty.value,
      nightDefect: nightShiftTotalDefects.value,
      totalOutput: dailyTotalOutputQty.value,
      prevAccum: reportForm.prevAccumQty,
      todayAccum: todayAccumQty.value,
      remaining: remainingTargetQty.value,
      avgEfficiency: dailyCombinedEfficiency.value,
      defectsText: [dayShiftDefectString.value, nightShiftDefectString.value]
        .filter(Boolean)
        .join("；"),
    };

    const payload = {
      report_date: newReport.prodDate,
      machine_id: newReport.machineId,
      order_no: newReport.orderNo,
      part_no: newReport.partNo,
      day_output_qty: newReport.dayOutput,
      day_defect_qty: newReport.dayDefect,
      night_output_qty: newReport.nightOutput,
      night_defect_qty: newReport.nightDefect,
      total_output_qty: newReport.totalOutput,
      prev_accum_qty: newReport.prevAccum,
      today_accum_qty: newReport.todayAccum,
      remaining_target_qty: newReport.remaining,
      avg_efficiency: newReport.avgEfficiency,
      defects_text: newReport.defectsText,
      shifts: [
        {
          shift_type: "day",
          emp_ids: reportForm.dayShift.empIds,
          prev_molds: Number(reportForm.dayShift.prevMolds) || 0,
          cur_molds: Number(reportForm.dayShift.curMolds) || 0,
          actual_cycle: Number(reportForm.dayShift.actualCycle) || 0,
          good_qty: Number(reportForm.dayShift.goodQty) || 0,
          unprocessed_qty: Number(reportForm.dayShift.unprocessedQty) || 0,
          setup_qty: Number(reportForm.dayShift.setupQty) || 0,
          pending_qty: Number(reportForm.dayShift.pendingQty) || 0,
          plan_hours: Number(reportForm.dayShift.planHours) || 0,
          actual_hours: Number(reportForm.dayShift.actualHours) || 0,
          downtime_hours: Number(reportForm.dayShift.downtimeHours) || 0,
        },
        {
          shift_type: "night",
          emp_ids: reportForm.nightShift.empIds,
          prev_molds: Number(nightShiftPrevMolds.value) || 0,
          cur_molds: Number(reportForm.nightShift.curMolds) || 0,
          actual_cycle: Number(reportForm.nightShift.actualCycle) || 0,
          good_qty: Number(reportForm.nightShift.goodQty) || 0,
          unprocessed_qty: Number(reportForm.nightShift.unprocessedQty) || 0,
          setup_qty: Number(reportForm.nightShift.setupQty) || 0,
          pending_qty: Number(reportForm.nightShift.pendingQty) || 0,
          plan_hours: Number(reportForm.nightShift.planHours) || 0,
          actual_hours: Number(reportForm.nightShift.actualHours) || 0,
          downtime_hours: Number(reportForm.nightShift.downtimeHours) || 0,
        },
      ],
      defects: [
        ...reportForm.dayShift.defects
          .filter((d) => d.code && Number(d.qty) > 0)
          .map((d) => ({
            shift_type: "day",
            defect_code: d.code,
            defect_reason:
              defectTypes.value.find((t) => t.defectCode === d.code)?.reason ||
              d.code,
            defect_qty: Number(d.qty) || 0,
          })),
        ...reportForm.nightShift.defects
          .filter((d) => d.code && Number(d.qty) > 0)
          .map((d) => ({
            shift_type: "night",
            defect_code: d.code,
            defect_reason:
              defectTypes.value.find((t) => t.defectCode === d.code)?.reason ||
              d.code,
            defect_qty: Number(d.qty) || 0,
          })),
      ],
    };

    if (editingReportId.value) {
      payload.id = String(editingReportId.value);
    }

    try {
      if (editingReportId.value) {
        await 前端_更新_日報資料(payload);
      } else {
        await 前端_新增_日報資料(payload);
      }
      // 重新讀取日報與製令進度（進度改由資料庫中的日報計算）
      await Promise.all([fetchDailyReports(), fetchWorkOrders()]);

      editingReportId.value = null;

      alert(
        `日報表${payload.id ? "更新" : "儲存"}成功！本日總產出: ${
          dailyTotalOutputQty.value
        } pcs，今日累計: ${todayAccumQty.value} pcs`
      );
    } catch (error) {
      console.error("[ saveDailyReport ]", error);
      alert(`日報表${payload.id ? "更新" : "儲存"}失敗，請稍後再試。`);
    }
  };

  const deleteReport = async (id) => {
    if (confirm("確定要刪除此筆日報記錄嗎？")) {
      try {
        await 前端_刪除_日報資料({ id: String(id) });
        await Promise.all([fetchDailyReports(), fetchWorkOrders()]);
        if (editingReportId.value === id) {
          editingReportId.value = null;
        }
      } catch (error) {
        console.error("[ deleteReport ]", error);
        alert("刪除日報資料失敗，請稍後再試。");
      }
    }
  };

  const resetReportForm = () => {
    editingReportId.value = null;
    reportForm.prodDate = todayLocal();
    reportForm.machineId = "";
    reportForm.orderNo = "";
    reportForm.prevAccumQty = 0;
    reportForm.dayShift.empIds = "";
    reportForm.dayShift.goodQty = 0;
    reportForm.dayShift.unprocessedQty = 0;
    reportForm.dayShift.setupQty = 0;
    reportForm.dayShift.pendingQty = 0;
    reportForm.dayShift.prevMolds = 0;
    reportForm.dayShift.curMolds = 0;
    reportForm.dayShift.actualCycle = 0;
    reportForm.dayShift.planHours = 0;
    reportForm.dayShift.actualHours = 0;
    reportForm.dayShift.downtimeHours = 0;
    reportForm.dayShift.defects = [{ code: "", qty: 0 }];
    reportForm.nightShift.empIds = "";
    reportForm.nightShift.goodQty = 0;
    reportForm.nightShift.unprocessedQty = 0;
    reportForm.nightShift.setupQty = 0;
    reportForm.nightShift.pendingQty = 0;
    reportForm.nightShift.curMolds = 0;
    reportForm.nightShift.actualCycle = 0;
    reportForm.nightShift.planHours = 0;
    reportForm.nightShift.actualHours = 0;
    reportForm.nightShift.downtimeHours = 0;
    reportForm.nightShift.defects = [{ code: "", qty: 0 }];
  };

  const showOrderDetailModal = (order) => {
    activeDetailOrder.value = order;
    const modal = new bootstrap.Modal(
      document.getElementById("orderDetailModal")
    );
    modal.show();
  };

  const openMachineModal = (m = null) => {
    if (m) {
      machineForm.apiId = m.apiId ?? null;
      machineForm.id = m.Machine_id;
      machineForm.name = m.Machine_Name;
      machineForm.machineSort = m.Machine_Sort || "";
      machineForm.brand = m.Brand || "";
      machineForm.specification = m.Specification || "";
      machineForm.tonnage = m.tonnage;
      machineForm.isEdit = true;
    } else {
      machineForm.apiId = null;
      machineForm.id = String(machines.value.length + 1).padStart(2, "0");
      machineForm.name = "";
      machineForm.machineSort = "單色成型機";
      machineForm.brand = "";
      machineForm.specification = "";
      machineForm.tonnage = 150;
      machineForm.isEdit = false;
    }
    showBootstrapModal("machineModal");
  };

  const saveMachine = async () => {
    if (!machineForm.id || !machineForm.name) return;
    const fallbackId = Number.parseInt(String(machineForm.id), 10);
    const resolvedId =
      machineForm.apiId ?? (Number.isNaN(fallbackId) ? undefined : fallbackId);
    const payload = {
      id: machineForm.isEdit ? resolvedId : undefined,
      Machine_Number: machineForm.id,
      Machine_Name: machineForm.name,
      Machine_Sort: machineForm.machineSort,
      Brand: machineForm.brand,
      Specification: machineForm.specification,
      Tonnes: String(Number(machineForm.tonnage) || 0),
    };

    try {
      if (machineForm.isEdit) {
        await 前端_更新_成型機台資料(payload);
      } else {
        await 前端_新增_成型機台資料(payload);
      }

      await fetchMachines();
      hideBootstrapModal("machineModal");
    } catch (error) {
      console.error("[ saveMachine ]", error);
      alert("儲存機台資料失敗，請稍後再試。");
    }
  };

  const deleteMachine = async (id, options = {}) => {
    const { skipConfirm = false } = options;
    if (skipConfirm || confirm(`確定要刪除 ${id} 號機台資料嗎？`)) {
      const target = machines.value.find((m) => m.Machine_id === id);
      const payload = target?.apiId
        ? { id: target.apiId }
        : { Machine_Number: id };

      try {
        await 前端_刪除_成型機台資料(payload);
        await fetchMachines();
      } catch (error) {
        console.error("[ deleteMachine ]", error);
        alert("刪除機台資料失敗，請稍後再試。");
      }
    }
  };

  const openEmployeeModal = (e = null) => {
    if (e) {
      const isExisting = employees.value.some((item) => item.empId === e.empId);
      employeeForm.empId = e.empId;
      employeeForm.name = e.name || (e.empId === "99" ? "自動" : "");
      employeeForm.isAuto = Boolean(e.isAuto) || e.empId === "99";
      employeeForm.isEdit = isExisting;
    } else {
      employeeForm.empId = `E0${employees.value.length + 1}`;
      employeeForm.name = "";
      employeeForm.isAuto = false;
      employeeForm.isEdit = false;
    }
    showBootstrapModal("employeeModal");
  };

  const saveEmployee = async () => {
    if (!employeeForm.empId || !employeeForm.name) return;

    const target = employees.value.find((e) => e.empId === employeeForm.empId);
    const shouldUpdate = employeeForm.isEdit && Boolean(target);
    const payload = {
      id: target?.apiId,
      emp_id: employeeForm.empId,
      name: employeeForm.name,
      department: TARGET_DEPARTMENT,
      unit: target?.unit || "",
      role_title: target?.roleTitle || "",
      phone: target?.phone || "",
      email: target?.email || "",
      is_active: 1,
      remark: "",
    };

    try {
      if (shouldUpdate) {
        await 前端_更新_人員資料(payload);
      } else {
        await 前端_新增_人員資料(payload);
      }
      await fetchEmployees();
      hideBootstrapModal("employeeModal");
    } catch (error) {
      console.error("[ saveEmployee ]", error);
      alert("儲存人員資料失敗，請稍後再試。");
    }
  };

  const deleteEmployee = async (empId, options = {}) => {
    const { skipConfirm = false } = options;
    if (skipConfirm || confirm(`確定要刪除員工 [${empId}] 嗎？`)) {
      const target = employees.value.find((e) => e.empId === empId);
      const payload = target?.apiId ? { id: target.apiId } : { emp_id: empId };
      try {
        await 前端_刪除_人員資料(payload);
        await fetchEmployees();
      } catch (error) {
        console.error("[ deleteEmployee ]", error);
        alert("刪除人員資料失敗，請稍後再試。");
      }
    }
  };

  const openDefectModal = (d = null) => {
    if (d) {
      defectForm.defectCode = d.defectCode;
      defectForm.reason = d.reason;
      defectForm.isEdit = true;
    } else {
      defectForm.defectCode = `D0${defectTypes.value.length + 1}`;
      defectForm.reason = "";
      defectForm.isEdit = false;
    }
    showBootstrapModal("defectModal");
  };

  const saveDefect = async () => {
    if (!defectForm.defectCode || !defectForm.reason) return;

    const target = defectTypes.value.find(
      (d) => d.defectCode === defectForm.defectCode
    );
    const payload = {
      id: target?.apiId,
      defect_code: defectForm.defectCode,
      defect_reason: defectForm.reason,
      is_active: 1,
      sort_order: target?.sortOrder || defectTypes.value.length + 1,
      remark: "",
    };

    try {
      if (defectForm.isEdit) {
        await 前端_更新_不良原因(payload);
      } else {
        await 前端_新增_不良原因(payload);
      }
      await fetchDefects();
      hideBootstrapModal("defectModal");
    } catch (error) {
      console.error("[ saveDefect ]", error);
      alert("儲存不良原因失敗，請稍後再試。");
    }
  };

  const deleteDefect = async (code, options = {}) => {
    const { skipConfirm = false } = options;
    if (skipConfirm || confirm(`確定要刪除不良原因 [${code}] 嗎？`)) {
      const target = defectTypes.value.find((d) => d.defectCode === code);
      const payload = target?.apiId
        ? { id: target.apiId }
        : { defect_code: code };
      try {
        await 前端_刪除_不良原因(payload);
        await fetchDefects();
      } catch (error) {
        console.error("[ deleteDefect ]", error);
        alert("刪除不良原因失敗，請稍後再試。");
      }
    }
  };

  const openWorkOrderModal = (o = null) => {
    if (o) {
      // 編輯模式：複製所有欄位（包含唯讀欄位 lastMonthQty, thisMonthQty, accumQty）
      Object.assign(workOrderForm, o, { isEdit: true });
    } else {
      // 新增模式：初始化所有欄位，包含唯讀欄位為 0
      Object.assign(workOrderForm, {
        orderNo: `MO-2026080${workOrders.value.length + 1}`,
        partNo: "",
        spec: "",
        rawMaterial: "",
        moldNo: "",
        cavities: 2,
        stdCycle: 25,
        targetQty: 5000,
        dueDate: todayLocal(),
        unitUsage: 50,
        lastMonthQty: 0,
        thisMonthQty: 0,
        accumQty: 0,
        isEdit: false,
      });
    }
    showBootstrapModal("workOrderModal");
  };

  const saveWorkOrder = async () => {
    if (!workOrderForm.orderNo || !workOrderForm.partNo) return;

    const target = workOrders.value.find(
      (o) => o.orderNo === workOrderForm.orderNo
    );
    // 統一使用前端欄位名稱，後端再轉成資料庫欄位
    const payload = {
      idWorkOrder: target?.apiId == null ? undefined : String(target.apiId),
      orderNo: String(workOrderForm.orderNo ?? ""),
      partNo: String(workOrderForm.partNo ?? ""),
      rawMaterial: String(workOrderForm.rawMaterial ?? ""),
      spec: String(workOrderForm.spec ?? ""),
      dueDate: String(workOrderForm.dueDate ?? ""),
      moldNo: String(workOrderForm.moldNo ?? ""),
      cavities: Number(workOrderForm.cavities) || 1,
      stdCycle: Number(workOrderForm.stdCycle) || 20,
      targetQty: Number(workOrderForm.targetQty) || 0,
      unitUsage: Number(workOrderForm.unitUsage) || 0,
    };

    try {
      if (workOrderForm.isEdit) {
        await 前端_更新_成型製令(payload);
      } else {
        await 前端_新增_成型製令(payload);
      }
      await fetchWorkOrders();
      hideBootstrapModal("workOrderModal");
    } catch (error) {
      console.error("[ saveWorkOrder ]", error);
      alert("儲存製令資料失敗，請稍後再試。");
    }
  };

  const deleteWorkOrder = async (orderNo, options = {}) => {
    const { skipConfirm = false } = options;
    if (skipConfirm || confirm(`確定要刪除製令 [${orderNo}] 嗎？`)) {
      const target = workOrders.value.find((o) => o.orderNo === orderNo);
      const payload = { idWorkOrder: String(target?.apiId ?? "") };
      try {
        await 前端_刪除_成型製令(payload);
        await fetchWorkOrders();
      } catch (error) {
        console.error("[ deleteWorkOrder ]", error);
        alert("刪除製令資料失敗，請稍後再試。");
      }
    }
  };

  const isPastDue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getMachineCurrentOrder = (machineId) => {
    const reportRows = dailyReports.value
      .filter((r) => String(r.machineId) === String(machineId))
      .sort((a, b) => {
        const at = parseReportDate(a.prodDate)?.getTime() || 0;
        const bt = parseReportDate(b.prodDate)?.getTime() || 0;
        return bt - at;
      });

    if (reportRows.length > 0) {
      const latest = reportRows[0];
      return {
        orderNo: latest.orderNo || "-",
        partNo: latest.partNo || "-",
        efficiency: Number(latest.avgEfficiency) || 0,
      };
    }

    const order = workOrders.value[0];
    return {
      orderNo: order?.orderNo || "-",
      partNo: order?.partNo || "-",
      efficiency: 0,
    };
  };

  const getMachineRuntimeInfo = (machineId) => {
    const current = getMachineCurrentOrder(machineId);
    const reportOnLatestDate = dailyReports.value.find(
      (r) =>
        String(r.machineId) === String(machineId) &&
        normalizeDateInputValue(r.prodDate) === latestReportDateKey.value
    );

    if (!reportOnLatestDate) {
      return {
        statusText: "待機",
        statusClass: "bg-secondary",
        orderNo: "-",
        partNo: "-",
        efficiency: 0,
      };
    }

    return {
      statusText: "生產中",
      statusClass: "bg-success",
      orderNo: current.orderNo || "-",
      partNo: current.partNo || "-",
      efficiency: Number(current.efficiency) || 0,
    };
  };

  onMounted(async () => {
    await refreshMasterData();
    await fetchDailyReports();
    if (clearInputOnMounted) {
      resetReportForm();
    }
    if (enableCharts) {
      initCharts();
    }
  });

  watch(
    [machines, dailyReports],
    () => {
      if (enableCharts && efficiencyChartInstance && paretoChartInstance) {
        setChartTimeRange(chartTimeRange.value);
      }
    },
    { deep: true }
  );

  return {
    chartTimeRange,
    orderSearch,
    machines,
    employees,
    defectTypes,
    workOrders,
    dailyReports,
    editingReportId,
    reportForm,
    activeDetailOrder,
    machineForm,
    employeeForm,
    defectForm,
    workOrderForm,
    selectedOrderDetails,
    moldDivisor,
    dayShiftEmpNames,
    nightShiftEmpNames,
    dayShiftMolds,
    dayShiftMachineOutput,
    dayShiftTotalDefects,
    dayShiftDefectString,
    dayShiftOutputQty,
    dayShiftUnreportedQty,
    dayShiftEfficiency,
    dayShiftScheduleAccuracy,
    dayShiftDefectRate,
    nightShiftPrevMolds,
    nightShiftMolds,
    nightShiftMachineOutput,
    nightShiftTotalDefects,
    nightShiftDefectString,
    nightShiftOutputQty,
    nightShiftUnreportedQty,
    nightShiftEfficiency,
    nightShiftScheduleAccuracy,
    nightShiftDefectRate,
    dailyTotalOutputQty,
    todayAccumQty,
    remainingTargetQty,
    dailyCombinedEfficiency,
    dailyScheduleAccuracy,
    kpiStats,
    filteredWorkOrders,
    setChartTimeRange,
    onOrderSelected,
    appendEmp,
    getSelectedEmps,
    isEmpSelected,
    removeEmp,
    toggleEmp,
    clearAllEmps,
    addDefectRow,
    removeDefectRow,
    saveDailyReport,
    deleteReport,
    loadDailyReportForEdit,
    fetchDailyReports,
    resetReportForm,
    showOrderDetailModal,
    openMachineModal,
    saveMachine,
    deleteMachine,
    openEmployeeModal,
    saveEmployee,
    deleteEmployee,
    openDefectModal,
    saveDefect,
    deleteDefect,
    openWorkOrderModal,
    saveWorkOrder,
    deleteWorkOrder,
    isPastDue,
    getMachineCurrentOrder,
    getMachineRuntimeInfo,
  };
}
