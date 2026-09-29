<template>
  <div class="container-fluid px-4 py-3">
    <div class="mes-master-data-shell">
      <div class="mes-master-tabs mes-card">
        <div class="d-flex flex-wrap gap-2 p-2">
          <button v-for="tab in tabs" :key="tab.key" type="button" class="btn btn-sm"
            :class="activeTab === tab.key ? 'btn-primary' : 'btn-outline-secondary'" @click="switchTab(tab.key)">
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="mes-master-panel mes-card p-3">
        <div v-if="activeTab === 'machines'" class="mes-master-table-panel">
          <div class="mes-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <input v-model="searchText" class="form-control form-control-sm mes-search" placeholder="搜尋機台資料..." />
              <select v-model="pageSize" class="form-select form-select-sm mes-page-size">
                <option :value="10">10 / 頁</option>
                <option :value="20">20 / 頁</option>
                <option :value="50">50 / 頁</option>
              </select>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="exportCurrentRows"><i class="bi bi-download"></i>
                匯出</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="selectedRowIds.length === 0"
                @click="deleteSelectedRows"><i class="bi bi-trash"></i> 刪除選取</button>
              <button class="btn btn-sm btn-primary" @click="openMachineModal()"><i class="bi bi-plus"></i>
                新增機台</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px;">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                  </th>
                  <th class="sortable-header" @click="setSort('machines', 'Machine_id')">
                    機台編號
                    <i :class="sortIcon('machines', 'Machine_id')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('machines', 'Machine_Name')">
                    機台名稱
                    <i :class="sortIcon('machines', 'Machine_Name')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('machines', 'tonnage')">
                    機台噸數(T)
                    <i :class="sortIcon('machines', 'tonnage')"></i>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in paginatedMachineRows" :key="m.id">
                  <td><input type="checkbox" :checked="selectedRowIds.includes(m.id)"
                      @change="toggleRowSelection(m.id)" /></td>
                  <td><strong>{{ m.Machine_id }}</strong></td>
                  <td>{{ m.Machine_Name }}</td>
                  <td><span class="badge bg-secondary">{{ m.tonnage }} T</span></td>
                  <td>
                    <button class="btn btn-xs btn-outline-secondary me-1 py-0 px-2" @click="openMachineModal(m)"><i
                        class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteMachine(m.id)"><i
                        class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="paginatedMachineRows.length === 0">
                  <td colspan="5" class="text-center text-muted py-3">沒有符合條件的資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mes-pagination d-flex align-items-center justify-content-between mt-2">
            <span class="text-muted small">共 {{ machineRows.length }} 筆，已選 {{ selectedRowIds.length }} 筆</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" :disabled="currentPage === 1"
                @click="currentPage -= 1">上一頁</button>
              <button class="btn btn-outline-secondary" disabled>{{ currentPage }} / {{ machinePages }}</button>
              <button class="btn btn-outline-secondary" :disabled="currentPage >= machinePages"
                @click="currentPage += 1">下一頁</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'employees'" class="mes-master-table-panel">
          <div class="mes-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <input v-model="searchText" class="form-control form-control-sm mes-search" placeholder="搜尋員工資料..." />
              <select v-model="pageSize" class="form-select form-select-sm mes-page-size">
                <option :value="10">10 / 頁</option>
                <option :value="20">20 / 頁</option>
                <option :value="50">50 / 頁</option>
              </select>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="exportCurrentRows"><i class="bi bi-download"></i>
                匯出</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="selectedRowIds.length === 0"
                @click="deleteSelectedRows"><i class="bi bi-trash"></i> 刪除選取</button>
              <button class="btn btn-sm btn-success" @click="openEmployeeModal()"><i class="bi bi-plus"></i>
                新增員工</button>
              <button class="btn btn-sm btn-info text-white"
                @click="openEmployeeModal({ empId: '99', name: '', isAuto: true })"><i class="bi bi-plus"></i>
                新增自動化機台</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px;">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                  </th>
                  <th class="sortable-header" @click="setSort('employees', 'id')">
                    工號 (empId)
                    <i :class="sortIcon('employees', 'id')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('employees', 'name')">
                    姓名 (name)
                    <i :class="sortIcon('employees', 'name')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('employees', 'type')">
                    類型
                    <i :class="sortIcon('employees', 'type')"></i>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in paginatedEmployeeRows" :key="e.id">
                  <td><input type="checkbox" :checked="selectedRowIds.includes(e.id)"
                      @change="toggleRowSelection(e.id)" /></td>
                  <td><strong>{{ e.id }}</strong></td>
                  <td>{{ e.name }}</td>
                  <td>
                    <span class="badge" :class="e.type === '自動化機台' ? 'bg-info text-dark' : 'bg-light text-dark border'">
                      {{ e.type }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-xs btn-outline-secondary me-1 py-0 px-2" @click="openEmployeeModal(e)"><i
                        class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteEmployee(e.id)"><i
                        class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="paginatedEmployeeRows.length === 0">
                  <td colspan="5" class="text-center text-muted py-3">沒有符合條件的資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mes-pagination d-flex align-items-center justify-content-between mt-2">
            <span class="text-muted small">共 {{ employeeRows.length }} 筆，已選 {{ selectedRowIds.length }} 筆</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" :disabled="currentPage === 1"
                @click="currentPage -= 1">上一頁</button>
              <button class="btn btn-outline-secondary" disabled>{{ currentPage }} / {{ employeePages }}</button>
              <button class="btn btn-outline-secondary" :disabled="currentPage >= employeePages"
                @click="currentPage += 1">下一頁</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'workorders'" class="mes-master-table-panel">
          <div class="mes-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <input v-model="searchText" class="form-control form-control-sm mes-search" placeholder="搜尋製令資料..." />
              <select v-model="pageSize" class="form-select form-select-sm mes-page-size">
                <option :value="10">10 / 頁</option>
                <option :value="20">20 / 頁</option>
                <option :value="50">50 / 頁</option>
              </select>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="exportCurrentRows"><i class="bi bi-download"></i>
                匯出</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="selectedRowIds.length === 0"
                @click="deleteSelectedRows"><i class="bi bi-trash"></i> 刪除選取</button>
              <button class="btn btn-sm btn-info text-white" @click="openWorkOrderModal()"><i class="bi bi-plus"></i>
                新增製令</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px;">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'orderNo')">
                    製令單號
                    <i :class="sortIcon('workorders', 'orderNo')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'partNo')">
                    料號
                    <i :class="sortIcon('workorders', 'partNo')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'spec')">
                    品名規格
                    <i :class="sortIcon('workorders', 'spec')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'rawMaterial')">
                    原料材質
                    <i :class="sortIcon('workorders', 'rawMaterial')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'moldNo')">
                    模號/穴數
                    <i :class="sortIcon('workorders', 'moldNo')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'stdCycle')">
                    標準週期
                    <i :class="sortIcon('workorders', 'stdCycle')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'targetQty')">
                    需求數量
                    <i :class="sortIcon('workorders', 'targetQty')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'dueDate')">
                    預定完工日
                    <i :class="sortIcon('workorders', 'dueDate')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('workorders', 'unitUsage')">
                    單位用量
                    <i :class="sortIcon('workorders', 'unitUsage')"></i>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in paginatedWorkOrderRows" :key="o.id">
                  <td><input type="checkbox" :checked="selectedRowIds.includes(o.orderNo)"
                      @change="toggleRowSelection(o.orderNo)" /></td>
                  <td><strong>{{ o.orderNo }}</strong></td>
                  <td>{{ o.partNo }}</td>
                  <td>{{ o.spec }}</td>
                  <td>{{ o.rawMaterial }}</td>
                  <td>{{ o.moldNo }} ({{ o.cavities }}穴)</td>
                  <td>{{ o.stdCycle }}s</td>
                  <td>{{ o.targetQty.toLocaleString() }}</td>
                  <td>{{ o.dueDate || '-' }}</td>
                  <td>{{ o.unitUsage ?? '-' }} {{ o.unitUsage != null ? 'g/pcs' : '' }}</td>
                  <td>
                    <button class="btn btn-xs btn-outline-secondary me-1 py-0 px-2" @click="openWorkOrderModal(o)"><i
                        class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteWorkOrder(o.orderNo)"><i
                        class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="paginatedWorkOrderRows.length === 0">
                  <td colspan="11" class="text-center text-muted py-3">沒有符合條件的資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mes-pagination d-flex align-items-center justify-content-between mt-2">
            <span class="text-muted small">共 {{ workOrderRows.length }} 筆，已選 {{ selectedRowIds.length }} 筆</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" :disabled="currentPage === 1"
                @click="currentPage -= 1">上一頁</button>
              <button class="btn btn-outline-secondary" disabled>{{ currentPage }} / {{ workOrderPages }}</button>
              <button class="btn btn-outline-secondary" :disabled="currentPage >= workOrderPages"
                @click="currentPage += 1">下一頁</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'defects'" class="mes-master-table-panel">
          <div class="mes-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <input v-model="searchText" class="form-control form-control-sm mes-search" placeholder="搜尋不良原因..." />
              <select v-model="pageSize" class="form-select form-select-sm mes-page-size">
                <option :value="10">10 / 頁</option>
                <option :value="20">20 / 頁</option>
                <option :value="50">50 / 頁</option>
              </select>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <button class="btn btn-sm btn-outline-secondary" @click="exportCurrentRows"><i class="bi bi-download"></i>
                匯出</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="selectedRowIds.length === 0"
                @click="deleteSelectedRows"><i class="bi bi-trash"></i> 刪除選取</button>
              <button class="btn btn-sm btn-danger" @click="openDefectModal()"><i class="bi bi-plus"></i>
                新增不良代號</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 42px;">
                    <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
                  </th>
                  <th class="sortable-header" @click="setSort('defects', 'id')">
                    不良代號 (defectCode)
                    <i :class="sortIcon('defects', 'id')"></i>
                  </th>
                  <th class="sortable-header" @click="setSort('defects', 'reason')">
                    不良原因說明 (reason)
                    <i :class="sortIcon('defects', 'reason')"></i>
                  </th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in paginatedDefectRows" :key="d.id">
                  <td><input type="checkbox" :checked="selectedRowIds.includes(d.id)"
                      @change="toggleRowSelection(d.id)" /></td>
                  <td><span class="badge bg-danger-subtle text-danger border border-danger-subtle">{{ d.id }}</span>
                  </td>
                  <td><strong>{{ d.reason }}</strong></td>
                  <td>
                    <button class="btn btn-xs btn-outline-secondary me-1 py-0 px-2" @click="openDefectModal(d)"><i
                        class="bi bi-pencil"></i></button>
                    <button class="btn btn-xs btn-outline-danger py-0 px-2" @click="deleteDefect(d.id)"><i
                        class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="paginatedDefectRows.length === 0">
                  <td colspan="4" class="text-center text-muted py-3">沒有符合條件的資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mes-pagination d-flex align-items-center justify-content-between mt-2">
            <span class="text-muted small">共 {{ defectRows.length }} 筆，已選 {{ selectedRowIds.length }} 筆</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" :disabled="currentPage === 1"
                @click="currentPage -= 1">上一頁</button>
              <button class="btn btn-outline-secondary" disabled>{{ currentPage }} / {{ defectPages }}</button>
              <button class="btn btn-outline-secondary" :disabled="currentPage >= defectPages"
                @click="currentPage += 1">下一頁</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="machineModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title fw-bold">{{ machineForm.isEdit ? '編輯機台' : '新增機台' }}</h6>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label small">機台編號 (id)</label>
            <input type="text" class="form-control" v-model="machineForm.id" :disabled="machineForm.isEdit"
              placeholder="例如: 07">
          </div>
          <div class="mb-3">
            <label class="form-label small">機台名稱 (name)</label>
            <input type="text" class="form-control" v-model="machineForm.name" placeholder="例如: 全電射出機 7號">
          </div>
          <div class="mb-3">
            <label class="form-label small">機台噸數 (tonnage T)</label>
            <input type="number" class="form-control" v-model.number="machineForm.tonnage" placeholder="例如: 180">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-primary btn-sm" @click="saveMachine">儲存</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="employeeModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title fw-bold">{{ employeeForm.isEdit ? '編輯員工' : '新增員工' }}</h6>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label small">員工工號 (empId)</label>
            <input type="text" class="form-control" v-model="employeeForm.empId" :disabled="employeeForm.isEdit"
              placeholder="例如: E06">
          </div>
          <div class="mb-3">
            <label class="form-label small">員工姓名 (name)</label>
            <input type="text" class="form-control" v-model="employeeForm.name" placeholder="例如: 陳小明">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-success btn-sm" @click="saveEmployee">儲存</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="defectModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title fw-bold">{{ defectForm.isEdit ? '編輯不良代號' : '新增不良代號' }}</h6>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label small">不良代號 (defectCode)</label>
            <input type="text" class="form-control" v-model="defectForm.defectCode" :disabled="defectForm.isEdit"
              placeholder="例如: D09">
          </div>
          <div class="mb-3">
            <label class="form-label small">不良原因說明 (reason)</label>
            <input type="text" class="form-control" v-model="defectForm.reason" placeholder="例如: 結合線/熔合線">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-danger btn-sm" @click="saveDefect">儲存</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="workOrderModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h6 class="modal-title fw-bold">{{ workOrderForm.isEdit ? '編輯製令資料' : '新增製令資料' }}</h6>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small">製令單號 (orderNo)</label>
              <input type="text" class="form-control" v-model="workOrderForm.orderNo" :disabled="workOrderForm.isEdit"
                placeholder="MO-20260807">
            </div>
            <div class="col-md-4">
              <label class="form-label small">料號 (partNo)</label>
              <input type="text" class="form-control" v-model="workOrderForm.partNo" placeholder="PT-88301">
            </div>
            <div class="col-md-4">
              <label class="form-label small">品名規格 (spec)</label>
              <input type="text" class="form-control" v-model="workOrderForm.spec" placeholder="汽車內裝飾蓋">
            </div>
            <div class="col-md-4">
              <label class="form-label small">原料材質 (rawMaterial)</label>
              <input type="text" class="form-control" v-model="workOrderForm.rawMaterial" placeholder="ABS 757 黑色">
            </div>
            <div class="col-md-4">
              <label class="form-label small">模具編號 (moldNo)</label>
              <input type="text" class="form-control" v-model="workOrderForm.moldNo" placeholder="MD-ABS-01">
            </div>
            <div class="col-md-4">
              <label class="form-label small">穴數 (cavities)</label>
              <input type="number" class="form-control" v-model.number="workOrderForm.cavities" min="1">
            </div>
            <div class="col-md-4">
              <label class="form-label small">標準週期 (stdCycle 秒)</label>
              <input type="number" class="form-control" v-model.number="workOrderForm.stdCycle" min="1">
            </div>
            <div class="col-md-4">
              <label class="form-label small">需求生產數量 (targetQty)</label>
              <input type="number" class="form-control" v-model.number="workOrderForm.targetQty" min="1">
            </div>
            <div class="col-md-4">
              <label class="form-label small">預定完工日 (dueDate)</label>
              <input type="date" class="form-control" v-model="workOrderForm.dueDate">
            </div>
            <div class="col-md-4">
              <label class="form-label small">單位用量 (unitUsage g/pcs)</label>
              <input type="number" class="form-control" v-model.number="workOrderForm.unitUsage" step="0.1">
            </div>
            <!-- 唯讀欄位（後端計算，不可編輯） -->
            <div class="col-md-4" v-if="workOrderForm.isEdit">
              <label class="form-label small">上月產出數 (唯讀)</label>
              <input type="number" class="form-control-plaintext" :value="workOrderForm.lastMonthQty" readonly>
            </div>
            <div class="col-md-4" v-if="workOrderForm.isEdit">
              <label class="form-label small">本月產出數 (唯讀)</label>
              <input type="number" class="form-control-plaintext" :value="workOrderForm.thisMonthQty" readonly>
            </div>
            <div class="col-md-4" v-if="workOrderForm.isEdit">
              <label class="form-label small">累計產出數 (唯讀)</label>
              <input type="number" class="form-control-plaintext" :value="workOrderForm.accumQty" readonly>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn btn-info btn-sm text-white" @click="saveWorkOrder">儲存製令</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useIMProductionWorkOrder, todayLocal } from './useIMProductionWorkOrder';

export default {
  setup() {
    const state = useIMProductionWorkOrder();
    const activeTab = ref('machines');
    const searchText = ref('');
    const pageSize = ref(10);
    const currentPage = ref(1);
    const selectedRowIds = ref([]);

    const tabs = [
      { key: 'machines', label: '機台資料管理', icon: 'bi bi-hdd-rack' },
      { key: 'employees', label: '員工資料管理', icon: 'bi bi-person-badge' },
      { key: 'workorders', label: '製令資料管理', icon: 'bi bi-file-earmark-text' },
      { key: 'defects', label: '不良原因項目管理', icon: 'bi bi-bug-fill' }
    ];

    const resetTableState = () => {
      currentPage.value = 1;
      selectedRowIds.value = [];
    };

    const switchTab = (tabKey) => {
      activeTab.value = tabKey;
      resetTableState();
    };

    const normalizeSearch = (value) => String(value ?? '').trim().toLowerCase();

    const sortState = ref({
      machines: { key: 'Machine_id', order: 'asc' },
      employees: { key: 'id', order: 'asc' },
      workorders: { key: 'id', order: 'asc' },
      defects: { key: 'id', order: 'asc' }
    });

    const sortRows = (rows, tabKey) => {
      const { key, order } = sortState.value[tabKey] || {};
      if (!key) return rows;
      const dir = order === 'desc' ? -1 : 1;

      return [...rows].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        const aNum = Number(aVal);
        const bNum = Number(bVal);
        const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);

        if (bothNumeric) {
          return (aNum - bNum) * dir;
        }

        return String(aVal).localeCompare(String(bVal), 'zh-Hant') * dir;
      });
    };

    const setSort = (tabKey, key) => {
      const current = sortState.value[tabKey];
      if (!current || current.key !== key) {
        sortState.value[tabKey] = { key, order: 'asc' };
      } else {
        sortState.value[tabKey] = {
          key,
          order: current.order === 'asc' ? 'desc' : 'asc'
        };
      }
      currentPage.value = 1;
    };

    const sortIcon = (tabKey, key) => {
      const current = sortState.value[tabKey];
      if (!current || current.key !== key) return 'bi bi-arrow-down-up ms-1 text-muted';
      return current.order === 'asc'
        ? 'bi bi-sort-down ms-1 text-primary'
        : 'bi bi-sort-up ms-1 text-primary';
    };

    const machineRows = computed(() =>
      state.machines.value.map((m) => ({
        id: m.Machine_id,
        apiId: m.apiId,
        name: m.Machine_Name,
        Machine_id: m.Machine_id,
        Machine_Name: m.Machine_Name,
        Machine_Sort: m.Machine_Sort,
        Brand: m.Brand,
        Specification: m.Specification,
        tonnage: m.tonnage,
        type: '機台'
      }))
    );

    const employeeRows = computed(() =>
      state.employees.value.map((e) => ({
        id: e.empId,
        name: e.name,
        type: e.isAuto || e.empId === '99' ? '自動化機台' : '作業員'
      }))
    );

    const workOrderRows = computed(() =>
      state.workOrders.value.map((o) => ({
        orderNo: o.orderNo,
        partNo: o.partNo,
        spec: o.spec,
        rawMaterial: o.rawMaterial,
        moldNo: o.moldNo,
        cavities: o.cavities,
        stdCycle: o.stdCycle,
        targetQty: o.targetQty,
        dueDate: o.dueDate,
        unitUsage: o.unitUsage,
        // 唯讀欄位
        lastMonthQty: o.lastMonthQty,
        thisMonthQty: o.thisMonthQty,
        accumQty: o.accumQty,
      }))
    );

    const defectRows = computed(() =>
      state.defectTypes.value.map((d) => ({
        id: d.defectCode,
        reason: d.reason
      }))
    );

    const filterRows = (rows) => {
      const query = normalizeSearch(searchText.value);
      if (!query) return rows;
      return rows.filter((row) =>
        Object.values(row).some((value) => normalizeSearch(value).includes(query))
      );
    };

    const pagedRows = (rows) => {
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize.value));
      if (currentPage.value > totalPages) currentPage.value = totalPages;
      const start = (currentPage.value - 1) * pageSize.value;
      return {
        rows: rows.slice(start, start + pageSize.value),
        totalPages
      };
    };

    const machineFiltered = computed(() =>
      sortRows(filterRows(machineRows.value), 'machines')
    );
    const employeeFiltered = computed(() =>
      sortRows(filterRows(employeeRows.value), 'employees')
    );
    const workOrderFiltered = computed(() =>
      sortRows(filterRows(workOrderRows.value), 'workorders')
    );
    const defectFiltered = computed(() =>
      sortRows(filterRows(defectRows.value), 'defects')
    );

    const machinePageData = computed(() => pagedRows(machineFiltered.value));
    const employeePageData = computed(() => pagedRows(employeeFiltered.value));
    const workOrderPageData = computed(() => pagedRows(workOrderFiltered.value));
    const defectPageData = computed(() => pagedRows(defectFiltered.value));

    const machinePages = computed(() => machinePageData.value.totalPages);
    const employeePages = computed(() => employeePageData.value.totalPages);
    const workOrderPages = computed(() => workOrderPageData.value.totalPages);
    const defectPages = computed(() => defectPageData.value.totalPages);

    const paginatedMachineRows = computed(() => machinePageData.value.rows);
    const paginatedEmployeeRows = computed(() => employeePageData.value.rows);
    const paginatedWorkOrderRows = computed(() => workOrderPageData.value.rows);
    const paginatedDefectRows = computed(() => defectPageData.value.rows);

    const isAllSelected = computed(() => {
      const rowSet = new Set(selectedRowIds.value);
      const rows =
        activeTab.value === 'machines'
          ? paginatedMachineRows.value
          : activeTab.value === 'employees'
            ? paginatedEmployeeRows.value
            : activeTab.value === 'workorders'
              ? paginatedWorkOrderRows.value
              : paginatedDefectRows.value;

      if (!rows.length) return false;
      return rows.every((row) => rowSet.has(row.id));
    });

    const toggleRowSelection = (id) => {
      const exists = selectedRowIds.value.includes(id);
      selectedRowIds.value = exists
        ? selectedRowIds.value.filter((rowId) => rowId !== id)
        : [...selectedRowIds.value, id];
    };

    const toggleSelectAll = (event) => {
      const checked = event.target.checked;
      const rows =
        activeTab.value === 'machines'
          ? paginatedMachineRows.value
          : activeTab.value === 'employees'
            ? paginatedEmployeeRows.value
            : activeTab.value === 'workorders'
              ? paginatedWorkOrderRows.value
              : paginatedDefectRows.value;

      if (checked) {
        const ids = rows.map((row) => row.id);
        selectedRowIds.value = [...new Set([...selectedRowIds.value, ...ids])];
        return;
      }

      selectedRowIds.value = selectedRowIds.value.filter(
        (id) => !rows.some((row) => row.id === id)
      );
    };

    const exportCurrentRows = () => {
      const rows =
        activeTab.value === 'machines'
          ? machineFiltered.value
          : activeTab.value === 'employees'
            ? employeeFiltered.value
            : activeTab.value === 'workorders'
              ? workOrderFiltered.value
              : defectFiltered.value;

      if (!rows.length) return;

      const headers = Object.keys(rows[0]).filter((key) => key !== 'type');
      const csvLines = [headers.join(',')];

      rows.forEach((row) => {
        const values = headers.map((key) => {
          const cell = row[key] ?? '';
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvLines.push(values.join(','));
      });

      const csv = csvLines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab.value}_${todayLocal()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    };

    const deleteSelectedRows = async () => {
      if (!selectedRowIds.value.length) return;
      if (!confirm(`確定要刪除 ${selectedRowIds.value.length} 筆資料嗎？`)) return;

      if (activeTab.value === 'machines') {
        await Promise.all(
          selectedRowIds.value.map((id) =>
            state.deleteMachine(id, { skipConfirm: true })
          )
        );
      }

      if (activeTab.value === 'employees') {
        await Promise.all(
          selectedRowIds.value.map((id) =>
            state.deleteEmployee(id, { skipConfirm: true })
          )
        );
      }

      if (activeTab.value === 'workorders') {
        await Promise.all(
          selectedRowIds.value.map((id) =>
            state.deleteWorkOrder(id, { skipConfirm: true })
          )
        );
      }

      if (activeTab.value === 'defects') {
        await Promise.all(
          selectedRowIds.value.map((id) =>
            state.deleteDefect(id, { skipConfirm: true })
          )
        );
      }

      selectedRowIds.value = [];
      resetTableState();
    };

    return {
      ...state,
      activeTab,
      tabs,
      searchText,
      pageSize,
      currentPage,
      selectedRowIds,
      switchTab,
      setSort,
      sortIcon,
      toggleRowSelection,
      toggleSelectAll,
      exportCurrentRows,
      deleteSelectedRows,
      isAllSelected,
      machineRows,
      employeeRows,
      workOrderRows,
      defectRows,
      paginatedMachineRows,
      paginatedEmployeeRows,
      paginatedWorkOrderRows,
      paginatedDefectRows,
      machinePages,
      employeePages,
      workOrderPages,
      defectPages
    };
  }
};
</script>

<style scoped>
@import "./IM_ProductionWorkOrder.css";

.sortable-header {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
</style>