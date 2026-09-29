<template>
  <div class="container-fluid px-4 py-3">
    <div class="mes-page-tabs mb-3">
      <button type="button" class="btn" :class="activePage === 'summary' ? 'btn-primary' : 'btn-outline-secondary'"
        @click="activePage = 'summary'">
        製令完成進度追蹤表
      </button>
      <button type="button" class="btn" :class="activePage === 'daily' ? 'btn-primary' : 'btn-outline-secondary'"
        @click="activePage = 'daily'">
        每日本日生產數列表
      </button>
    </div>

    <div v-if="activePage === 'summary'">
      <div class="mes-card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold mb-1 text-dark"><i class="bi bi-list-check text-primary me-2"></i>製令完成進度追蹤表</h5>
            <p class="text-muted small mb-0">即時監控射出工單生產狀態、上月與本月進度及結單判定</p>
          </div>
          <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" v-model="orderSearch" placeholder="搜尋製令/料號...">
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-hover table-bordered table-mes mb-0 align-middle">
            <thead>
              <tr>
                <th>製令單號</th>
                <th>料號 / 規格</th>
                <th>預定完工日</th>
                <th>需求數量</th>
                <th>上月生產量</th>
                <th>本月生產量</th>
                <th>已累積生產量</th>
                <th>結餘未生產</th>
                <th>完成進度</th>
                <th>狀態</th>
                <th>明細操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in filteredWorkOrders" :key="o.orderNo">
                <td><strong class="text-primary">{{ o.orderNo }}</strong></td>
                <td>
                  <div>{{ o.partNo }}</div>
                  <small class="text-muted">{{ o.spec }}</small>
                </td>
                <td>
                  <span :class="isPastDue(o.dueDate) && (o.targetQty - o.accumQty > 0) ? 'text-danger fw-bold' : ''">
                    {{ o.dueDate }}
                  </span>
                </td>
                <td class="fw-bold">{{ o.targetQty.toLocaleString() }}</td>
                <td>{{ o.lastMonthQty.toLocaleString() }}</td>
                <td>{{ o.thisMonthQty.toLocaleString() }}</td>
                <td class="fw-bold text-success">{{ o.accumQty.toLocaleString() }}</td>
                <td>
                  <span :class="(o.targetQty - o.accumQty) <= 0 ? 'text-muted' : 'text-danger fw-bold'">
                    {{ Math.max(0, o.targetQty - o.accumQty).toLocaleString() }}
                  </span>
                </td>
                <td style="min-width: 140px;">
                  <div class="d-flex align-items-center gap-2">
                    <div class="progress flex-grow-1" style="height: 8px;">
                      <div class="progress-bar" :class="o.accumQty >= o.targetQty ? 'bg-success' : 'bg-primary'"
                        :style="{ width: Math.min(100, Math.round(o.accumQty / o.targetQty * 100)) + '%' }"></div>
                    </div>
                    <span class="small fw-semibold">{{ Math.round(o.accumQty / o.targetQty * 100) }}%</span>
                  </div>
                </td>
                <td>
                  <span v-if="o.accumQty >= o.targetQty" class="badge bg-success"><i
                      class="bi bi-check-circle me-1"></i>已完成</span>
                  <span v-else class="badge bg-primary"><i class="bi bi-gear-wide-connected me-1"></i>進行中</span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary py-0 px-2" @click="showOrderDetailModal(o)">
                    <i class="bi bi-calendar-week me-1"></i> 當月每日明細
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else-if="activePage === 'daily'">
      <div class="mes-card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div>
            <h5 class="fw-bold mb-1 text-dark"><i class="bi bi-calendar3-week text-info me-2"></i>31 天每日本日生產數列表</h5>
            <p class="text-muted small mb-0">每筆製令列出最近 31 天的每日生產數，滑鼠移到日期可看詳細紀錄</p>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" :disabled="trendPage <= 1" @click="trendPage -= 1">上一頁</button>
            <button class="btn btn-outline-secondary" disabled>{{ trendPage }} / {{ trendTotalPages }}</button>
            <button class="btn btn-outline-secondary" :disabled="trendPage >= trendTotalPages"
              @click="trendPage += 1">下一頁</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="min-width: 150px;">製令單號</th>
                <th style="min-width: 180px;">料號 / 規格</th>
                <th v-for="day in thirtyOneDayLabels" :key="day.key" class="text-center trend-day-head">
                  {{ day.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in pagedTrendOrders" :key="order.orderNo">
                <td><strong class="text-primary">{{ order.orderNo }}</strong></td>
                <td>
                  <div>{{ order.partNo }}</div>
                  <small class="text-muted">{{ order.spec }}</small>
                </td>
                <td v-for="day in thirtyOneDayLabels" :key="`${order.orderNo}-${day.key}`" class="text-center">
                  <span class="trend-qty" :title="getTrendTooltip(order, day.date)"
                    :class="getTrendQtyClass(order, day.date)">
                    {{ getDailyQty(order, day.date) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="orderDetailModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content" v-if="activeDetailOrder">
        <div class="modal-header bg-light">
          <h6 class="modal-title fw-bold">
            <i class="bi bi-calendar-check text-primary me-2"></i>
            製令每日生產明細記錄: {{ activeDetailOrder.orderNo }} (料號: {{ activeDetailOrder.partNo }})
          </h6>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 mb-3 p-2 bg-light rounded border text-center">
            <div class="col-3">
              <span class="text-muted small">需求數量</span>
              <div class="fw-bold">{{ activeDetailOrder.targetQty.toLocaleString() }}</div>
            </div>
            <div class="col-3">
              <span class="text-muted small">累積已產出</span>
              <div class="fw-bold text-success">{{ activeDetailOrder.accumQty.toLocaleString() }}</div>
            </div>
            <div class="col-3">
              <span class="text-muted small">結餘未生產</span>
              <div class="fw-bold text-danger">{{ Math.max(0, activeDetailOrder.targetQty -
                activeDetailOrder.accumQty).toLocaleString() }}</div>
            </div>
            <div class="col-3">
              <span class="text-muted small">完工比例</span>
              <div class="fw-bold text-primary">{{ Math.round(activeDetailOrder.accumQty /
                activeDetailOrder.targetQty * 100) }}%</div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>生產日期</th>
                  <th>生產機台</th>
                  <th>日班產出 (pcs)</th>
                  <th>夜班產出 (pcs)</th>
                  <th>當日合計</th>
                  <th>不良數</th>
                  <th>生產總工時</th>
                  <th>機台平均稼動</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in activeDetailOrder.dailyRecords" :key="d.date">
                  <td>{{ d.date }}</td>
                  <td>{{ d.machineId }}號機</td>
                  <td>{{ d.dayQty }}</td>
                  <td>{{ d.nightQty }}</td>
                  <td class="fw-bold text-primary">{{ d.dayQty + d.nightQty }}</td>
                  <td class="text-danger">{{ d.defectQty }}</td>
                  <td>{{ d.totalHours }} hr</td>
                  <td><span class="badge bg-success-subtle text-success">{{ d.efficiency }}%</span></td>
                </tr>
                <tr v-if="!activeDetailOrder.dailyRecords || activeDetailOrder.dailyRecords.length === 0">
                  <td colspan="8" class="text-center text-muted py-3">本月尚無日報生產紀錄</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { useIMProductionWorkOrder } from './useIMProductionWorkOrder';

export default {
  setup() {
    const state = useIMProductionWorkOrder();
    const activePage = ref('summary');
    const trendPage = ref(1);
    const trendPageSize = 5;

    const formatDateKey = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getLast31Days = () => {
      const today = new Date();
      const days = [];
      for (let i = 30;i >= 0;i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date);
      }
      return days;
    };

    const thirtyOneDayLabels = computed(() =>
      getLast31Days().map((date) => ({
        key: formatDateKey(date),
        label: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
        date: formatDateKey(date)
      }))
    );

    const getDailyQty = (order, dateKey) => {
      const match = (order.dailyRecords || []).find((row) => String(row.date || '').slice(0, 10) === dateKey);
      if (!match) return 0;
      return Number(match.dayQty || 0) + Number(match.nightQty || 0);
    };

    const getTrendTooltip = (order, dateKey) => {
      const match = (order.dailyRecords || []).find((row) => String(row.date || '').slice(0, 10) === dateKey);
      if (!match) {
        return `${dateKey}\n本日生產數：0 pcs`;
      }
      return `${dateKey}\n本日生產數：${(Number(match.dayQty || 0) + Number(match.nightQty || 0)).toLocaleString()} pcs\n日班：${Number(match.dayQty || 0).toLocaleString()} pcs\n夜班：${Number(match.nightQty || 0).toLocaleString()} pcs\n不良數：${Number(match.defectQty || 0).toLocaleString()} pcs\n機台：${match.machineId || '-'}號機\n效率：${Number(match.efficiency || 0).toFixed(1)}%`;
    };

    const getTrendQtyClass = (order, dateKey) => {
      const qty = getDailyQty(order, dateKey);
      if (!qty) return 'trend-zero';
      if (qty >= 1000) return 'trend-high';
      if (qty >= 500) return 'trend-mid';
      return 'trend-low';
    };

    const trendTotalPages = computed(() =>
      Math.max(1, Math.ceil(state.filteredWorkOrders.value.length / trendPageSize))
    );

    const pagedTrendOrders = computed(() => {
      const start = (trendPage.value - 1) * trendPageSize;
      return state.filteredWorkOrders.value.slice(start, start + trendPageSize);
    });

    return {
      ...state,
      activePage,
      trendPage,
      trendTotalPages,
      pagedTrendOrders,
      thirtyOneDayLabels,
      getDailyQty,
      getTrendTooltip,
      getTrendQtyClass
    };
  }
};
</script>

<style scoped>
.mes-page-tabs {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.6rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.mes-page-tabs .btn {
  min-width: 220px;
  font-weight: 700;
  border-radius: 10px;
  padding: 0.7rem 1.1rem;
  transition: all 0.2s ease;
}

.mes-page-tabs .btn-outline-secondary {
  border-color: #d1d5db;
  color: #475569;
}

.mes-page-tabs .btn-primary {
  box-shadow: 0 4px 10px rgba(13, 110, 253, 0.18);
}

.trend-day-head {
  min-width: 70px;
  font-size: 0.72rem;
  text-align: center;
}

.trend-qty {
  display: inline-flex;
  min-width: 46px;
  justify-content: center;
  padding: 0.3rem 0.4rem;
  border-radius: 0.45rem;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: help;
}

.trend-zero {
  background: #f8fafc;
  color: #64748b;
}

.trend-low {
  background: #e0f2fe;
  color: #075985;
}

.trend-mid {
  background: #dbeafe;
  color: #1d4ed8;
}

.trend-high {
  background: #bfdbfe;
  color: #1e3a8a;
}
</style>

<style scoped>
@import "./IM_ProductionWorkOrder.css";
</style>