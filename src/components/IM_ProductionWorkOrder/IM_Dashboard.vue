<template>
  <div class="container-fluid px-4 py-3">
    <div>
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
          <div class="mes-card p-3 border-start border-4 border-primary h-100">
            <div class="text-muted small fw-semibold">本日總產出數</div>
            <div class="d-flex align-items-baseline gap-2 mt-1">
              <span class="fs-3 fw-bold text-dark">{{ kpiStats.totalOutput.toLocaleString() }}</span>
              <span class="text-muted small">pcs</span>
            </div>
            <div class="small text-success mt-1"><i class="bi bi-check2-circle"></i> 良品率 {{ kpiStats.goodRate }}%
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="mes-card p-3 border-start border-4 border-success h-100">
            <div class="text-muted small fw-semibold">平均機台稼動效率</div>
            <div class="d-flex align-items-baseline gap-2 mt-1">
              <span class="fs-3 fw-bold text-success">{{ kpiStats.avgEfficiency }}%</span>
            </div>
            <div class="small text-muted mt-1"><i class="bi bi-speedometer"></i> 目標稼動率 85%</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="mes-card p-3 border-start border-4 border-danger h-100">
            <div class="text-muted small fw-semibold">綜合不良率</div>
            <div class="d-flex align-items-baseline gap-2 mt-1">
              <span class="fs-3 fw-bold text-danger">{{ kpiStats.defectRate }}%</span>
              <span class="text-muted small">({{ kpiStats.totalDefects }} pcs)</span>
            </div>
            <div class="small text-danger mt-1"><i class="bi bi-exclamation-triangle"></i> 主要原因: {{
              kpiStats.topDefectReason }}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="mes-card p-3 border-start border-4 border-info h-100">
            <div class="text-muted small fw-semibold">在製製令 / 達標數</div>
            <div class="d-flex align-items-baseline gap-2 mt-1">
              <span class="fs-3 fw-bold text-primary">{{ kpiStats.activeOrders }} / {{ kpiStats.completedOrders
                }}</span>
              <span class="text-muted small">張製令</span>
            </div>
            <div class="small text-primary mt-1"><i class="bi bi-flag"></i> 達標率 {{ kpiStats.orderCompletionRate }}%
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-lg-7">
          <div class="mes-card p-3 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-graph-up text-primary me-2"></i>機台生產效率與產能分析</h6>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" :class="{ active: chartTimeRange === 'day' }"
                  @click="setChartTimeRange('day')">今日</button>
                <button class="btn btn-outline-secondary" :class="{ active: chartTimeRange === 'month' }"
                  @click="setChartTimeRange('month')">本月</button>
              </div>
            </div>
            <div class="chart-container">
              <canvas id="machineEfficiencyChart"></canvas>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="mes-card p-3 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-pie-chart text-danger me-2"></i>不良原因 Pareto 柏拉圖分析
              </h6>
              <span class="badge bg-danger-subtle text-danger border border-danger-subtle">80/20 改善關鍵</span>
            </div>
            <div class="chart-container">
              <canvas id="defectParetoChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="mes-card p-3">
        <h6 class="fw-bold mb-3"><i class="bi bi-grid-3x3-gap-fill text-secondary me-2"></i>射出機台現場即時狀態</h6>
        <div class="row g-3">
          <div class="col-md-4 col-lg-2" v-for="m in machines" :key="m.Machine_id">
            <div class="p-3 border rounded-3 text-center bg-light">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-dark fs-5">{{ m.Machine_id }}號機</span>
                <span class="badge" :class="getMachineRuntimeInfo(m.Machine_id).statusClass">{{
                  getMachineRuntimeInfo(m.Machine_id).statusText }}</span>
              </div>
              <div class="small text-muted mb-1">{{ m.Machine_Name }} ({{ m.tonnage }}T)</div>
              <div class="p-2 bg-white rounded border text-start small">
                <div>製令: <strong>{{ getMachineRuntimeInfo(m.Machine_id).orderNo }}</strong></div>
                <div>料號: {{ getMachineRuntimeInfo(m.Machine_id).partNo }}</div>
                <div>效率: <span class="text-success fw-bold">{{ getMachineRuntimeInfo(m.Machine_id).efficiency
                    }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useIMProductionWorkOrder } from './useIMProductionWorkOrder';

export default {
  setup() {
    return useIMProductionWorkOrder({ enableCharts: true });
  }
};
</script>

<style scoped>
@import "./IM_ProductionWorkOrder.css";
</style>