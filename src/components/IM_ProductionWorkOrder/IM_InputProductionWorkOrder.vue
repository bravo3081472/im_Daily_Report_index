<!-- *=============================================================* -->
<!-- * 建立加工工單 * -->
<!-- *=============================================================* -->
<template>

  <!-- 主要內容區 -->
  <div class="container-fluid px-4 py-3">
    <!-- ================= 射出日報表輸入系統 ================= -->
    <div class="mb-3 d-flex align-items-center justify-content-between">
      <div class="btn-group">
        <button class="btn btn-sm" :class="activeReportTab === 'input' ? 'btn-primary' : 'btn-outline-primary'"
          @click="activeReportTab = 'input'">
          射出日報表輸入
        </button>
        <button class="btn btn-sm" :class="activeReportTab === 'list' ? 'btn-primary' : 'btn-outline-primary'"
          @click="activeReportTab = 'list'">
          日報表列表
        </button>
      </div>
      <span class="text-muted small">共 {{ dailyReports.length }} 筆日報資料</span>
    </div>

    <div v-if="activeReportTab === 'input'">
      <div class="mes-card p-3 mb-3">
        <div class="row g-3 align-items-center">
          <div class="col-md-3">
            <label class="form-label fw-semibold small mb-1"><i class="bi bi-calendar-event me-1"></i>生產日期</label>
            <div class="prod-date-group">
              <div class="input-group">
                <input type="text" class="form-control" v-model="prodDateText" placeholder="yyyy/mm/dd"
                  inputmode="numeric" maxlength="10" @blur="commitProdDate" @keydown.enter.prevent="commitProdDate">
                <button class="btn btn-outline-secondary" type="button" title="選擇日期" @click="openDatePicker">
                  <i class="bi bi-calendar3"></i>
                </button>
              </div>
              <input ref="datePickerRef" type="date" class="prod-date-picker" tabindex="-1" aria-hidden="true"
                v-model="reportForm.prodDate">
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold small mb-1"><i class="bi bi-hdd-rack me-1"></i>機台選單</label>
            <select class="form-select" v-model="reportForm.machineId">
              <option value="">-- 請選擇機台 --</option>
              <option v-for="m in machines" :key="m.Machine_id" :value="m.Machine_id">
                {{ m.Machine_id }}({{ m.tonnage }}T) - {{ m.Machine_Name }}
              </option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label fw-semibold small mb-1"><i class="bi bi-card-checklist me-1"></i>製令單號</label>
            <select class="form-select" v-model="reportForm.orderNo" @change="onOrderSelected">
              <option value="">-- 請選擇製令 --</option>
              <option v-for="o in workOrders" :key="o.orderNo" :value="o.orderNo">
                {{ o.orderNo }} | {{ o.partNo }} (需求: {{ o.targetQty.toLocaleString() }})
              </option>
            </select>
          </div>
        </div>

        <!-- 製令自動帶入資訊橫幅 (唯讀展示) -->
        <div class="row g-2 mt-2 p-2 rounded bg-light border" v-if="selectedOrderDetails">
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">料號:</span>
            <strong class="text-dark">{{ selectedOrderDetails.partNo }}</strong>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">模號:</span>
            <strong>{{ selectedOrderDetails.moldNo }}</strong>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">穴數 (Cavities):</span>
            <strong class="text-primary">{{ selectedOrderDetails.cavities }} 穴</strong>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">標準週期:</span>
            <strong class="text-info">{{ selectedOrderDetails.stdCycle }} 秒</strong>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">需求日期:</span>
            <span>{{ selectedOrderDetails.dueDate }}</span>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">訂單需求量:</span>
            <strong class="text-success">{{ selectedOrderDetails.targetQty.toLocaleString() }} pcs</strong>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">模次除數:</span>
            <strong class="text-dark">{{ moldDivisor }}</strong>
          </div>
        </div>
      </div>

      <!-- 日班與夜班 雙欄位獨立輸入與平衡計算 -->
      <div class="row g-3">
        <!-- === 日班 (Day Shift) === -->
        <div class="col-lg-6">
          <div class="mes-card p-3 border-top border-4 border-warning h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-sun-fill text-warning me-2"></i>日班生產記錄 (Day Shift)
              </h6>
              <span class="badge bg-warning text-dark">08:00 - 20:00</span>
            </div>

            <!-- 作業人員 (Tag 標籤化呈現與可取消人選) -->
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-semibold mb-0">
                  <i class="bi bi-people-fill text-primary me-1"></i>作業人員 (點選標籤 × 可取消人選)
                </label>
                <span v-if="reportForm.dayShift.empIds.includes('99')" class="badge bg-info text-dark">
                  🤖 自動化機台模式
                </span>
              </div>

              <div class="d-flex align-items-start gap-2 emp-inline-wrap">
                <!-- Tag 標籤呈現區 -->
                <div class="p-2 border rounded-3 bg-white shadow-xs emp-tag-panel" style="min-height: 48px;">
                  <div class="d-flex flex-wrap align-items-center gap-1.5">
                    <span v-for="emp in getSelectedEmps('day')" :key="emp.empId"
                      class="badge d-inline-flex align-items-center gap-1.5 py-1.5 px-2.5 rounded-pill"
                      :class="emp.isAutomation ? 'bg-info-subtle text-info-emphasis border border-info' : 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'"
                      style="font-size: 0.85rem;">
                      <i :class="emp.isAutomation ? 'bi bi-robot text-info' : 'bi bi-person-fill text-primary'"></i>
                      <span class="fw-bold">{{ emp.name }}</span>
                      <small class="opacity-75">({{ emp.empId }})</small>
                      <button type="button" class="btn-close ms-1" style="font-size: 0.6rem; padding: 0.15rem;"
                        @click.stop="removeEmp('day', emp.empId)" :title="`取消 ${emp.name}`" aria-label="取消人選"></button>
                    </span>
                    <span v-if="getSelectedEmps('day').length === 0" class="text-muted small fst-italic py-1 px-1">
                      <i class="bi bi-person-x me-1"></i>尚未選取作業人員，請點擊右側人員清單加入
                    </span>
                  </div>
                </div>

                <!-- 工號手動輸入輔助與完整下拉選單 -->
                <div class="input-group input-group-sm flex-nowrap emp-select-row">
                  <div class="dropdown emp-select-dropdown">
                    <button
                      class="btn btn-outline-primary dropdown-toggle d-inline-flex align-items-center justify-content-center text-nowrap"
                      type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i class="bi bi-person-lines-fill me-1"></i>人員清單
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow" style="min-width: 320px;">
                      <li class="dropdown-header">點選人員即可加入/取消 (Tag 同步)</li>
                      <li v-for="emp in employees" :key="emp.empId">
                        <a class="dropdown-item small d-flex justify-content-between align-items-center flex-nowrap"
                          href="#" @click.prevent="toggleEmp('day', emp.empId)">
                          <span class="text-nowrap me-2 d-inline-flex align-items-center">
                            <i class="bi me-2"
                              :class="isEmpSelected('day', emp.empId) ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'"></i>
                            <strong>{{ emp.empId }}</strong> - {{ emp.name }}
                          </span>
                          <span v-if="isEmpSelected('day', emp.empId)"
                            class="badge bg-success-subtle text-success border border-success-subtle text-nowrap flex-shrink-0">已選取
                            (點擊取消)</span>
                        </a>
                      </li>
                      <li>
                        <hr class="dropdown-divider">
                      </li>
                      <li>
                        <a class="dropdown-item small text-danger" href="#" @click.prevent="clearAllEmps('day')">
                          <i class="bi bi-trash me-1"></i>清空所有人選
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- 模數與產出計算 -->
            <div class="row g-2 mb-3">
              <div class="col-4">
                <label class="form-label small fw-semibold">前班模數</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.dayShift.prevMolds"
                  min="0">
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">本班機台模數</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.dayShift.curMolds"
                  min="0">
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">本班模數(計算)</label>
                <input type="number" class="form-control form-control-sm mes-calc-field" :value="dayShiftMolds"
                  readonly>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold text-primary">日班機台產出數 (=本班模數×穴數)</label>
                <input type="number" class="form-control form-control-sm mes-calc-field text-primary"
                  :value="dayShiftMachineOutput" readonly>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">良品數 (Good Qty)</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.dayShift.goodQty"
                  min="0">
              </div>
            </div>

            <!-- 數量分配 (未處理、調模、待判定) -->
            <div class="row g-2 mb-3">
              <div class="col-4">
                <label class="form-label small">未處理數</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.dayShift.unprocessedQty" min="0">
              </div>
              <div class="col-4">
                <label class="form-label small">調模數量</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.dayShift.setupQty"
                  min="0">
              </div>
              <div class="col-4">
                <label class="form-label small">待判定數</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.dayShift.pendingQty" min="0">
              </div>
            </div>

            <!-- 不良項目動態輸入 -->
            <div class="border rounded p-2 mb-3 bg-light">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small fw-bold text-danger"><i class="bi bi-x-octagon me-1"></i>日班不良項目輸入</span>
                <button class="btn btn-xs btn-outline-danger py-0 px-2 small" @click="addDefectRow('day')">
                  <i class="bi bi-plus"></i> 新增不良原因
                </button>
              </div>
              <div v-for="(item, idx) in reportForm.dayShift.defects" :key="idx"
                class="row g-1 align-items-center mb-1">
                <div class="col-6">
                  <select class="form-select form-select-sm" v-model="item.code">
                    <option value="">選擇原因</option>
                    <option v-for="d in defectTypes" :key="d.defectCode" :value="d.defectCode">
                      {{ d.defectCode }} - {{ d.reason }}
                    </option>
                  </select>
                </div>
                <div class="col-4">
                  <input type="number" class="form-control form-control-sm" v-model.number="item.qty" placeholder="數量"
                    min="1">
                </div>
                <div class="col-2 text-center">
                  <button class="btn btn-sm btn-link text-danger p-0" @click="removeDefectRow('day', idx)"><i
                      class="bi bi-trash"></i></button>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top small">
                <span>不良加總: <strong class="text-danger">{{ dayShiftTotalDefects }}</strong> pcs</span>
                <span class="text-muted text-truncate ms-2" style="max-width: 260px;"
                  :title="dayShiftDefectString">不良內容:
                  {{ dayShiftDefectString || '無' }}</span>
              </div>
            </div>

            <!-- 工時與 KPI -->
            <div class="row g-2 mb-3">
              <div class="col-3">
                <label class="form-label small">計畫工時 (hr)</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.dayShift.planHours"
                  step="0.5" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">實際工時 (hr)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.dayShift.actualHours" step="0.5" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">實際週期 (sec)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.dayShift.actualCycle" step="0.1" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">停機時間 (hr)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.dayShift.downtimeHours" step="0.5" min="0">
              </div>
            </div>

            <!-- 日班 KPI 徽章 -->
            <div class="p-2 rounded bg-white border d-flex justify-content-around text-center">
              <div>
                <div class="text-muted small">日班已產出數</div>
                <strong class="text-dark">{{ dayShiftOutputQty }} pcs</strong>
              </div>
              <div>
                <div class="text-muted small">未報數</div>
                <strong :class="dayShiftUnreportedQty > 0 ? 'text-danger' : 'text-success'">{{ dayShiftUnreportedQty
                }} pcs</strong>
              </div>
              <div>
                <div class="text-muted small">機台效率</div>
                <strong class="text-success">{{ dayShiftEfficiency }}%</strong>
              </div>
              <div>
                <div class="text-muted small">不良率</div>
                <strong class="text-danger">{{ dayShiftDefectRate }}%</strong>
              </div>
              <div>
                <div class="text-muted small">排程準確率</div>
                <strong class="text-primary">{{ dayShiftScheduleAccuracy }}%</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- === 夜班 (Night Shift) === -->
        <div class="col-lg-6">
          <div class="mes-card p-3 border-top border-4 border-dark h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-moon-stars-fill text-dark me-2"></i>夜班生產記錄 (Night
                Shift)</h6>
              <span class="badge bg-dark text-light">20:00 - 08:00</span>
            </div>

            <!-- 作業人員 (Tag 標籤化呈現與可取消人選) -->
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-semibold mb-0">
                  <i class="bi bi-people-fill text-dark me-1"></i>作業人員 (點選標籤 × 可取消人選)
                </label>
                <span v-if="reportForm.nightShift.empIds.includes('99')" class="badge bg-info text-dark">
                  🤖 自動化機台模式
                </span>
              </div>

              <div class="d-flex align-items-start gap-2 emp-inline-wrap">
                <!-- Tag 標籤呈現區 -->
                <div class="p-2 border rounded-3 bg-white shadow-xs emp-tag-panel" style="min-height: 48px;">
                  <div class="d-flex flex-wrap align-items-center gap-1.5">
                    <span v-for="emp in getSelectedEmps('night')" :key="emp.empId"
                      class="badge d-inline-flex align-items-center gap-1.5 py-1.5 px-2.5 rounded-pill"
                      :class="emp.isAutomation ? 'bg-info-subtle text-info-emphasis border border-info' : 'bg-secondary-subtle text-dark border border-secondary-subtle'"
                      style="font-size: 0.85rem;">
                      <i :class="emp.isAutomation ? 'bi bi-robot text-info' : 'bi bi-person-fill text-secondary'"></i>
                      <span class="fw-bold">{{ emp.name }}</span>
                      <small class="opacity-75">({{ emp.empId }})</small>
                      <button type="button" class="btn-close ms-1" style="font-size: 0.6rem; padding: 0.15rem;"
                        @click.stop="removeEmp('night', emp.empId)" :title="`取消 ${emp.name}`"
                        aria-label="取消人選"></button>
                    </span>
                    <span v-if="getSelectedEmps('night').length === 0" class="text-muted small fst-italic py-1 px-1">
                      <i class="bi bi-person-x me-1"></i>尚未選取作業人員，請點擊右側人員清單加入
                    </span>
                  </div>
                </div>

                <!-- 工號手動輸入輔助與完整下拉選單 -->
                <div class="input-group input-group-sm flex-nowrap emp-select-row">
                  <div class="dropdown emp-select-dropdown">
                    <button
                      class="btn btn-outline-dark dropdown-toggle d-inline-flex align-items-center justify-content-center text-nowrap"
                      type="button" data-bs-toggle="dropdown" aria-expanded="false">
                      <i class="bi bi-person-lines-fill me-1"></i>人員清單
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow" style="min-width: 320px;">
                      <li class="dropdown-header">點選人員即可加入/取消 (Tag 同步)</li>
                      <li v-for="emp in employees" :key="emp.empId">
                        <a class="dropdown-item small d-flex justify-content-between align-items-center flex-nowrap"
                          href="#" @click.prevent="toggleEmp('night', emp.empId)">
                          <span class="text-nowrap me-2 d-inline-flex align-items-center">
                            <i class="bi me-2"
                              :class="isEmpSelected('night', emp.empId) ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'"></i>
                            <strong>{{ emp.empId }}</strong> - {{ emp.name }}
                          </span>
                          <span v-if="isEmpSelected('night', emp.empId)"
                            class="badge bg-success-subtle text-success border border-success-subtle text-nowrap flex-shrink-0">已選取
                            (點擊取消)</span>
                        </a>
                      </li>
                      <li>
                        <hr class="dropdown-divider">
                      </li>
                      <li>
                        <a class="dropdown-item small text-danger" href="#" @click.prevent="clearAllEmps('night')">
                          <i class="bi bi-trash me-1"></i>清空所有人選
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- 模數與產出計算 -->
            <div class="row g-2 mb-3">
              <div class="col-4">
                <label class="form-label small fw-semibold">前班模數(抓日班模數)</label>
                <input type="number" class="form-control form-control-sm mes-calc-field" :value="nightShiftPrevMolds"
                  readonly>
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">本班機台模數</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.curMolds" min="0">
              </div>
              <div class="col-4">
                <label class="form-label small fw-semibold">本班模數(計算)</label>
                <input type="number" class="form-control form-control-sm mes-calc-field" :value="nightShiftMolds"
                  readonly>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold text-primary">夜班機台產出數 (=本班模數×穴數)</label>
                <input type="number" class="form-control form-control-sm mes-calc-field text-primary"
                  :value="nightShiftMachineOutput" readonly>
              </div>
              <div class="col-6">
                <label class="form-label small fw-semibold">良品數 (Good Qty)</label>
                <input type="number" class="form-control form-control-sm" v-model.number="reportForm.nightShift.goodQty"
                  min="0">
              </div>
            </div>

            <!-- 數量分配 (未處理、調模、待判定) -->
            <div class="row g-2 mb-3">
              <div class="col-4">
                <label class="form-label small">未處理數</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.unprocessedQty" min="0">
              </div>
              <div class="col-4">
                <label class="form-label small">調模數量</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.setupQty" min="0">
              </div>
              <div class="col-4">
                <label class="form-label small">待判定數</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.pendingQty" min="0">
              </div>
            </div>

            <!-- 不良項目動態輸入 -->
            <div class="border rounded p-2 mb-3 bg-light">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small fw-bold text-danger"><i class="bi bi-x-octagon me-1"></i>夜班不良項目輸入</span>
                <button class="btn btn-xs btn-outline-danger py-0 px-2 small" @click="addDefectRow('night')">
                  <i class="bi bi-plus"></i> 新增不良原因
                </button>
              </div>
              <div v-for="(item, idx) in reportForm.nightShift.defects" :key="idx"
                class="row g-1 align-items-center mb-1">
                <div class="col-6">
                  <select class="form-select form-select-sm" v-model="item.code">
                    <option value="">選擇原因</option>
                    <option v-for="d in defectTypes" :key="d.defectCode" :value="d.defectCode">
                      {{ d.defectCode }} - {{ d.reason }}
                    </option>
                  </select>
                </div>
                <div class="col-4">
                  <input type="number" class="form-control form-control-sm" v-model.number="item.qty" placeholder="數量"
                    min="1">
                </div>
                <div class="col-2 text-center">
                  <button class="btn btn-sm btn-link text-danger p-0" @click="removeDefectRow('night', idx)"><i
                      class="bi bi-trash"></i></button>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-2 pt-1 border-top small">
                <span>不良加總: <strong class="text-danger">{{ nightShiftTotalDefects }}</strong> pcs</span>
                <span class="text-muted text-truncate ms-2" style="max-width: 260px;"
                  :title="nightShiftDefectString">不良內容: {{ nightShiftDefectString || '無' }}</span>
              </div>
            </div>

            <!-- 工時與 KPI -->
            <div class="row g-2 mb-3">
              <div class="col-3">
                <label class="form-label small">計畫工時 (hr)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.planHours" step="0.5" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">實際工時 (hr)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.actualHours" step="0.5" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">實際週期 (sec)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.actualCycle" step="0.1" min="0">
              </div>
              <div class="col-3">
                <label class="form-label small">停機時間 (hr)</label>
                <input type="number" class="form-control form-control-sm"
                  v-model.number="reportForm.nightShift.downtimeHours" step="0.5" min="0">
              </div>
            </div>

            <!-- 夜班 KPI 徽章 -->
            <div class="p-2 rounded bg-white border d-flex justify-content-around text-center">
              <div>
                <div class="text-muted small">夜班已產出數</div>
                <strong class="text-dark">{{ nightShiftOutputQty }} pcs</strong>
              </div>
              <div>
                <div class="text-muted small">未報數</div>
                <strong :class="nightShiftUnreportedQty > 0 ? 'text-danger' : 'text-success'">{{
                  nightShiftUnreportedQty }} pcs</strong>
              </div>
              <div>
                <div class="text-muted small">機台效率</div>
                <strong class="text-success">{{ nightShiftEfficiency }}%</strong>
              </div>
              <div>
                <div class="text-muted small">不良率</div>
                <strong class="text-danger">{{ nightShiftDefectRate }}%</strong>
              </div>
              <div>
                <div class="text-muted small">排程準確率</div>
                <strong class="text-primary">{{ nightShiftScheduleAccuracy }}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 本日全日彙總與數量平衡 (平衡欄位) -->
      <div class="mes-card p-3 my-3 bg-white border-2 border-primary">
        <h6 class="fw-bold text-primary mb-3"><i class="bi bi-calculator me-2"></i>全日數量平衡與累積統計</h6>
        <div class="row g-3 text-center">
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">前日累計數</span>
            <input type="number" class="form-control form-control-sm text-center fw-bold mt-1"
              v-model.number="reportForm.prevAccumQty" min="0">
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">本日產出數 (日+夜已產出)</span>
            <div class="p-1 rounded bg-light border fw-bold text-dark fs-5 mt-1">{{
              dailyTotalOutputQty.toLocaleString() }}</div>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">今日累計數 (前日+本日)</span>
            <div class="p-1 rounded bg-info-subtle border border-info fw-bold text-primary fs-5 mt-1">{{
              todayAccumQty.toLocaleString() }}</div>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">訂單數量</span>
            <div class="p-1 rounded bg-light border fw-bold text-dark fs-5 mt-1">{{ (selectedOrderDetails?.targetQty
              || 0).toLocaleString() }}</div>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">尚欠數 (訂單-今日累計)</span>
            <div class="p-1 rounded fw-bold fs-5 mt-1"
              :class="remainingTargetQty <= 0 ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-danger border border-warning'">
              {{ remainingTargetQty.toLocaleString() }}
            </div>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">全日綜合機台效率</span>
            <div class="p-1 rounded bg-success-subtle border border-success fw-bold text-success fs-5 mt-1">{{
              dailyCombinedEfficiency }}%</div>
          </div>
          <div class="col-6 col-md-2">
            <span class="text-muted small d-block">排程準確率</span>
            <div class="p-1 rounded bg-primary-subtle border border-primary fw-bold text-primary fs-5 mt-1">{{
              dailyScheduleAccuracy }}%</div>
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
          <span v-if="editingReportId" class="align-self-center me-auto text-warning fw-semibold small">
            目前為編輯模式：正在回填修改 ID {{ editingReportId }}
          </span>
          <button class="btn btn-secondary" @click="resetReportForm">清空表單</button>
          <button class="btn btn-primary px-4 fw-bold" @click="saveDailyReport">
            <i class="bi bi-save me-1"></i> {{ editingReportId ? '更新日報表' : '儲存今日射出日報表' }}
          </button>
        </div>
      </div>

      <!-- 歷史日報表快速清單 -->
      <div class="mes-card p-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-clock-history me-2"></i>近期已填寫日報表記錄</h6>
          <span class="text-muted small">共 {{ dailyReports.length }} 筆記錄</span>
        </div>
        <div class="table-responsive">
          <table class="table table-hover table-bordered table-mes mb-0 align-middle">
            <thead>
              <tr>
                <th>日期時間</th>
                <th>機台</th>
                <th>製令單號</th>
                <th>料號</th>
                <th>日班產出 / 不良</th>
                <th>夜班產出 / 不良</th>
                <th>本日總產出</th>
                <th>今日累計</th>
                <th>尚欠數</th>
                <th>平均效率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in dailyReports" :key="r.id">
                <td>{{ r.prodDateTime || r.prodDate }}</td>
                <td><span class="badge bg-secondary">{{ r.machineId }}號機</span></td>
                <td><strong>{{ r.orderNo }}</strong></td>
                <td>{{ r.partNo }}</td>
                <td>{{ r.dayOutput }} / <span class="text-danger">{{ r.dayDefect }}</span></td>
                <td>{{ r.nightOutput }} / <span class="text-danger">{{ r.nightDefect }}</span></td>
                <td class="fw-bold text-primary">{{ r.totalOutput }}</td>
                <td>{{ r.todayAccum }}</td>
                <td>
                  <span :class="r.remaining <= 0 ? 'badge bg-success' : 'text-danger fw-bold'">{{ r.remaining
                  }}</span>
                </td>
                <td><span class="badge bg-success-subtle text-success border border-success">{{ r.avgEfficiency
                }}%</span></td>
                <td>
                  <button class="btn btn-xs btn-outline-primary py-0 px-2 me-1" @click="openReportForEdit(r.id)">
                    <i class="bi bi-arrow-repeat"></i>
                  </button>
                  <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteReport(r.id)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="mes-card p-3">
      <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
        <div>
          <label class="form-label small mb-1">年份</label>
          <select class="form-select form-select-sm" v-model="reportFilterYear">
            <option value="">全部年份</option>
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">月份</label>
          <select class="form-select form-select-sm" v-model="reportFilterMonth">
            <option value="">全部月份</option>
            <option v-for="m in 12" :key="m" :value="String(m).padStart(2, '0')">{{ String(m).padStart(2, '0') }}
            </option>
          </select>
        </div>
        <button class="btn btn-sm btn-outline-secondary" @click="clearReportFilter">
          清除篩選
        </button>
        <span class="text-muted small ms-auto">符合 {{ filteredDailyReports.length }} 筆</span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover table-bordered table-mes mb-0 align-middle">
          <thead>
            <tr>
              <th>日期時間</th>
              <th>機台</th>
              <th>製令單號</th>
              <th>料號</th>
              <th>日班產出 / 不良</th>
              <th>夜班產出 / 不良</th>
              <th>本日總產出</th>
              <th>今日累計</th>
              <th>尚欠數</th>
              <th>平均效率</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredDailyReports" :key="r.id">
              <td>{{ r.prodDateTime || r.prodDate }}</td>
              <td><span class="badge bg-secondary">{{ r.machineId }}號機</span></td>
              <td><strong>{{ r.orderNo }}</strong></td>
              <td>{{ r.partNo }}</td>
              <td>{{ r.dayOutput }} / <span class="text-danger">{{ r.dayDefect }}</span></td>
              <td>{{ r.nightOutput }} / <span class="text-danger">{{ r.nightDefect }}</span></td>
              <td class="fw-bold text-primary">{{ r.totalOutput }}</td>
              <td>{{ r.todayAccum }}</td>
              <td>
                <span :class="r.remaining <= 0 ? 'badge bg-success' : 'text-danger fw-bold'">{{ r.remaining }}</span>
              </td>
              <td><span class="badge bg-success-subtle text-success border border-success">{{ r.avgEfficiency }}%</span>
              </td>
              <td>
                <button class="btn btn-xs btn-outline-primary py-0 px-2 me-1" @click="openReportForEdit(r.id)">
                  <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteReport(r.id)">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
            <tr v-if="filteredDailyReports.length === 0">
              <td colspan="11" class="text-center text-muted py-3">沒有符合條件的日報資料</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from 'vue';
import { useIMProductionWorkOrder } from './useIMProductionWorkOrder';

export default {
  setup() {
    const vm = useIMProductionWorkOrder({ clearInputOnMounted: true });
    const activeReportTab = ref('input');
    const now = new Date();
    const reportFilterYear = ref(String(now.getFullYear()));
    const reportFilterMonth = ref(String(now.getMonth() + 1).padStart(2, '0'));

    // ── 生產日期：畫面一律顯示 yyyy/mm/dd，資料仍以 YYYY-MM-DD 儲存 ──
    const datePickerRef = ref(null);
    const toDisplay = (value) => String(value || '').replace(/-/g, '/');
    const prodDateText = ref(toDisplay(vm.reportForm.prodDate));

    watch(
      () => vm.reportForm.prodDate,
      (value) => { prodDateText.value = toDisplay(value); }
    );

    // 接受 2026/9/29、2026-09-29、20260929 等寫法
    const parseDateText = (text) => {
      const raw = String(text || '').trim();
      let m = raw.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
      if (!m) m = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (!m) return null;
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const date = new Date(y, mo - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const commitProdDate = () => {
      const parsed = parseDateText(prodDateText.value);
      if (parsed) {
        vm.reportForm.prodDate = parsed;
        prodDateText.value = toDisplay(parsed);
      } else {
        // 格式不正確時還原為原本的日期
        prodDateText.value = toDisplay(vm.reportForm.prodDate);
      }
    };

    const openDatePicker = () => {
      const el = datePickerRef.value;
      if (!el) return;
      if (typeof el.showPicker === 'function') {
        try { el.showPicker(); return; } catch (e) { /* 部分瀏覽器不支援，改用 focus */ }
      }
      el.focus();
      el.click();
    };

    const availableYears = computed(() => {
      const years = new Set();
      vm.dailyReports.value.forEach((r) => {
        const y = String(r.prodDate || '').slice(0, 4);
        if (/^\d{4}$/.test(y)) years.add(y);
      });
      return Array.from(years).sort((a, b) => Number(b) - Number(a));
    });

    const filteredDailyReports = computed(() => {
      return vm.dailyReports.value.filter((r) => {
        const dateText = String(r.prodDate || '');
        const year = dateText.slice(0, 4);
        const month = dateText.slice(5, 7);
        const yearMatched = !reportFilterYear.value || year === reportFilterYear.value;
        const monthMatched = !reportFilterMonth.value || month === reportFilterMonth.value;
        return yearMatched && monthMatched;
      });
    });

    const clearReportFilter = () => {
      reportFilterYear.value = '';
      reportFilterMonth.value = '';
    };

    const openReportForEdit = async (id) => {
      await vm.loadDailyReportForEdit(id);
      activeReportTab.value = 'input';
    };

    return {
      ...vm,
      activeReportTab,
      reportFilterYear,
      reportFilterMonth,
      availableYears,
      filteredDailyReports,
      clearReportFilter,
      openReportForEdit,
      datePickerRef,
      prodDateText,
      commitProdDate,
      openDatePicker,
    };
  }
};
</script>

<style scoped>
@import "./IM_ProductionWorkOrder.css";

.prod-date-group {
  position: relative;
}

/* 隱藏的原生日期選擇器，只用來彈出月曆 */
.prod-date-picker {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  border: 0;
  padding: 0;
}

.emp-inline-wrap {
  width: 100%;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0.5rem;
}

.emp-tag-panel {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
}

.emp-select-row {
  flex-wrap: nowrap !important;
  flex: 0 0 132px;
  width: 132px;
}

.emp-select-row .input-group-text,
.emp-select-row .btn {
  white-space: nowrap;
  flex: 0 0 auto;
}

.emp-select-dropdown {
  flex: 0 0 auto;
  width: 100%;
}

.emp-select-dropdown .btn {
  width: 100%;
  min-width: 0;
}

@media (max-width: 768px) {
  .emp-inline-wrap {
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .emp-tag-panel {
    min-width: 240px;
  }
}
</style>
