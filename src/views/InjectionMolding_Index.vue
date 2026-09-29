<template>
  <div class="im-layout">
    <header class="im-layout__header">
      <Navbar />
    </header>
    <main class="im-layout__main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import Navbar from '@/components/IM_ProductionWorkOrder/IM_Navbar.vue';
</script>

<style scoped>
/* 原本使用 el-container / el-header / el-main 版面，改為純 Bootstrap 相容的結構 */
.im-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.im-layout__header {
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 1020;
}

.im-layout__main {
  flex: 1 1 auto;
  padding: 20px 0;
}
</style>
