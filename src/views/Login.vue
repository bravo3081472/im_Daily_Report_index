<template>
  <div class="login-page">
    <div class="login-card mes-card">
      <div class="login-header">
        <i class="bi bi-cpu-fill text-info fs-2"></i>
        <div>
          <div class="fw-bold fs-5 text-white">塑膠射出 MES 管理系統</div>
          <div class="small text-info-emphasis login-subtitle">射出成型課 生產日報</div>
        </div>
      </div>

      <form class="p-4" @submit.prevent="handleLogin" novalidate>
        <div class="mb-3">
          <label for="login-username" class="form-label fw-semibold small">帳號</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-person"></i></span>
            <input id="login-username" v-model.trim="username" type="text" class="form-control"
              autocomplete="username" placeholder="請輸入帳號" :disabled="loading" autofocus>
          </div>
        </div>

        <div class="mb-3">
          <label for="login-password" class="form-label fw-semibold small">密碼</label>
          <div class="input-group">
            <span class="input-group-text"><i class="bi bi-lock"></i></span>
            <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'"
              class="form-control" autocomplete="current-password" placeholder="請輸入密碼" :disabled="loading">
            <button class="btn btn-outline-secondary" type="button" :title="showPassword ? '隱藏密碼' : '顯示密碼'"
              @click="showPassword = !showPassword">
              <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small d-flex align-items-center gap-2" role="alert">
          <i class="bi bi-exclamation-circle"></i>{{ errorMessage }}
        </div>

        <button type="submit" class="btn btn-primary w-100 fw-semibold" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          {{ loading ? '登入中…' : '登入' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { signIn } from '@/lib/auth';

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  if (!username.value || !password.value) {
    errorMessage.value = '請輸入帳號與密碼';
    return;
  }

  loading.value = true;
  try {
    await signIn(username.value, password.value);
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/InjectionMolding_Index/IM_Dashboard';
    router.replace(redirect);
  } catch (error) {
    console.error('[ login ]', error);
    errorMessage.value =
      error?.status === 400 || /invalid/i.test(error?.message || '')
        ? '帳號或密碼錯誤'
        : '登入失敗，請稍後再試';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
}

.login-card {
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
}

.login-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: #0f172a;
}

.login-subtitle {
  color: #7dd3fc !important;
}
</style>
