<template>
  <div class="container-fluid px-4 py-3">
    <div class="mes-card p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h5 class="fw-bold mb-1 text-dark">
            <i class="bi bi-calendar3-week text-info me-2"></i>31 天製令每日生產趨勢
          </h5>
          <p class="text-muted small mb-0">每筆製令於最近 31 天的每日產量，滑鼠懸停可查看詳細資料</p>
        </div>
        <div class="small text-muted">資料範圍：最近 31 天</div>
      </div>

      <div class="row g-3">
        <div v-for="order in ordersWithTrend" :key="order.orderNo" class="col-12">
          <div class="border rounded-3 p-3 bg-light-subtle">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <div class="fw-bold text-primary">{{ order.orderNo }}</div>
                <div class="small text-muted">{{ order.partNo }} / {{ order.spec }}</div>
              </div>
              <div class="small text-muted">
                合計：{{ getTotalQty(order.dailyTrend).toLocaleString() }} pcs
              </div>
            </div>

            <div class="day-grid" :style="{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }">
              <div v-for="day in order.dailyTrend" :key="day.date" class="day-cell"
                :style="{ background: getCellColor(day.qty, order.maxQty) }" :title="getToolTipText(day)">
                <span class="day-label">{{ day.label }}</span>
                <span class="day-qty">{{ day.qty }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useIMProductionWorkOrder } from './useIMProductionWorkOrder';

const { workOrders } = useIMProductionWorkOrder();

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getLast31Days = () => {
  const today = new Date();
  return Array.from({ length: 31 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (30 - index));
    return date;
  });
};

const getTotalQty = (days = []) =>
  days.reduce((sum, day) => sum + (Number(day.qty) || 0), 0);

const getCellColor = (qty, maxQty = 1) => {
  if (!qty) return '#f8fafc';
  const intensity = Math.min(0.95, 0.2 + (qty / maxQty) * 0.8);
  return `rgba(37, 99, 235, ${intensity})`;
};

const getToolTipText = (day) => {
  const lines = [
    `${day.date}`,
    `本日產量：${Number(day.qty || 0).toLocaleString()} pcs`,
    `日班：${Number(day.dayQty || 0).toLocaleString()} pcs`,
    `夜班：${Number(day.nightQty || 0).toLocaleString()} pcs`,
    `不良數：${Number(day.defectQty || 0).toLocaleString()} pcs`,
    `機台：${day.machineId ? `${day.machineId}號機` : '無資料'}`,
    `效率：${Number(day.efficiency || 0).toFixed(1)}%`
  ];
  return lines.join('\n');
};

const ordersWithTrend = computed(() => {
  const last31Days = getLast31Days();

  return workOrders.value.map((order) => {
    const recordsMap = new Map();

    (order.dailyRecords || []).forEach((record) => {
      const key = String(record.date || '').slice(0, 10);
      if (!key) return;
      recordsMap.set(key, {
        date: key,
        dayQty: Number(record.dayQty || 0),
        nightQty: Number(record.nightQty || 0),
        defectQty: Number(record.defectQty || 0),
        machineId: record.machineId || '-',
        efficiency: Number(record.efficiency || 0),
        qty: Number(record.dayQty || 0) + Number(record.nightQty || 0),
      });
    });

    const dailyTrend = last31Days.map((date) => {
      const key = formatDateKey(date);
      const record = recordsMap.get(key) || {
        date: key,
        dayQty: 0,
        nightQty: 0,
        defectQty: 0,
        machineId: '-',
        efficiency: 0,
      };

      return {
        date: key,
        label: String(date.getDate()).padStart(2, '0'),
        qty: Number(record.dayQty || 0) + Number(record.nightQty || 0),
        dayQty: Number(record.dayQty || 0),
        nightQty: Number(record.nightQty || 0),
        defectQty: Number(record.defectQty || 0),
        machineId: record.machineId || '-',
        efficiency: Number(record.efficiency || 0),
      };
    });

    const maxQty = Math.max(1, ...dailyTrend.map((item) => Number(item.qty || 0)));

    return {
      ...order,
      dailyTrend,
      maxQty,
    };
  });
});
</script>

<style scoped>
.day-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.day-cell {
  min-height: 78px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0.35rem 0.2rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  color: #0f172a;
}

.day-cell:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}

.day-label {
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.8;
}

.day-qty {
  font-size: 0.8rem;
  font-weight: 700;
}
</style>

<style scoped>
@import "./IM_ProductionWorkOrder.css";
</style>
