<template>
  <nav class="navbar navbar-expand-lg navbar-dark navbar-mes sticky-top">
    <div class="container-fluid px-4">
      <a class="navbar-brand d-flex align-items-center gap-2" href="#">
        <i class="bi bi-cpu-fill text-info fs-4"></i>
        <div class="brand-text-group">
          <span class="brand-title fw-bold tracking-wide">塑膠射出 MES 管理系統</span>
          <span class="badge bg-info text-dark ms-2" style="font-size: 0.7rem;">PROTOTYPE</span>
        </div>
      </a>
    </div>
    <div class="container-fluid px-4 d-flex flex-column flex-md-row align-items-md-center gap-2">
      <ul class="nav nav-pills nav-mes-tabs flex-grow-1">
        <li class="nav-item" v-for="item in navItems" :key="item.path">
          <button class="nav-link" :class="{ active: route.path === item.path }" @click="goTo(item.path)">
            <i :class="`${item.icon} me-1`"></i>{{ item.label }}
          </button>
        </li>
      </ul>
      <div class="d-flex justify-content-end flex-shrink-0">
        <span class="text-light small d-none d-md-inline border-start ps-3 border-secondary">
          <i class="bi bi-clock me-1"></i> {{ currentTime }}
        </span>
      </div>
    </div>
  </nav>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const navItems = [
  {
    label: '1. 即時視覺化看板',
    path: '/InjectionMolding_Index/IM_Dashboard',
    icon: 'bi bi-speedometer2'
  },
  {
    label: '2. 射出日報表輸入',
    path: '/InjectionMolding_Index/IM_InputProductionWorkOrder',
    icon: 'bi bi-journal-text'
  },
  {
    label: '3. 製令完成進度表',
    path: '/InjectionMolding_Index/IM_WorkOrderProgress',
    icon: 'bi bi-bar-chart-steps'
  },
  {
    label: '4. 基礎資料管理 (CRUD)',
    path: '/InjectionMolding_Index/IM_MasterData',
    icon: 'bi bi-database-gear'
  }
];

const goTo = (path: string) => {
  if (route.path !== path) {
    router.push(path);
  }
};

const currentTime = ref('');
let timerId: number | undefined;

onMounted(() => {
  timerId = window.setInterval(() => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('zh-TW', { hour12: false });
  }, 1000);
  currentTime.value = new Date().toLocaleTimeString('zh-TW', { hour12: false });
});

onBeforeUnmount(() => {
  if (timerId) {
    window.clearInterval(timerId);
  }
});

</script>

<style scoped>
.navbar-mes {
  width: calc(100% + 40px);
  margin: 0 -20px;
}

.navbar>.container-fluid:first-child {
  width: auto;
  max-width: 100%;
  flex: 0 0 auto;
}

.navbar-brand {
  max-width: 30rem;
  min-width: 0;
  flex-shrink: 1;
}

.brand-text-group {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
}

.brand-title {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.nav-mes-tabs {
  min-width: 0;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
}

.nav-mes-tabs .nav-link {
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.35);
  white-space: nowrap;
  font-size: 0.9rem;
}

.nav-mes-tabs .nav-link:hover {
  color: #f8fafc;
  border-color: rgba(56, 189, 248, 0.65);
}

.nav-mes-tabs .nav-link.active {
  color: #0f172a;
  border-color: #22d3ee;
  background: #22d3ee;
  font-weight: 600;
}
</style>
