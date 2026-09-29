import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/InjectionMolding_Index/IM_Dashboard",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: "/InjectionMolding_Index",
    name: "InjectionMolding_Index",
    component: () => import("@/views/InjectionMolding_Index.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        redirect: "/InjectionMolding_Index/IM_Dashboard",
      },
      {
        path: "IM_Dashboard",
        name: "IM_Dashboard",
        component: () =>
          import("@/components/IM_ProductionWorkOrder/IM_Dashboard.vue"),
        meta: { requiresAuth: false },
      },
      {
        path: "IM_InputProductionWorkOrder",
        name: "生產日報表",
        component: () =>
          import(
            "@/components/IM_ProductionWorkOrder/IM_InputProductionWorkOrder.vue"
          ),
        meta: { requiresAuth: false },
      },
      {
        path: "IM_WorkOrderProgress",
        name: "IM_WorkOrderProgress",
        component: () =>
          import("@/components/IM_ProductionWorkOrder/IM_WorkOrderProgress.vue"),
        meta: { requiresAuth: false },
      },
      {
        path: "IM_MasterData",
        name: "IM_MasterData",
        component: () =>
          import("@/components/IM_ProductionWorkOrder/IM_MasterData.vue"),
        meta: { requiresAuth: false },
      },
      {
        path: "IM_ProductionWorkOrder",
        redirect: "/InjectionMolding_Index/IM_Dashboard",
      },
      {
        path: "IM_WorkOrderResume",
        redirect: "/InjectionMolding_Index/IM_WorkOrderProgress",
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/InjectionMolding_Index/IM_Dashboard",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 登入檢查：未登入一律導向登入頁；已登入再進登入頁則導回首頁
router.beforeEach(async (to) => {
  const needsAuth = to.matched.some((r) => r.meta.requiresAuth);
  const session = await getSession();

  if (needsAuth && !session) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && session) {
    return { path: "/InjectionMolding_Index/IM_Dashboard" };
  }
  return true;
});

// 登入逾期或在其他分頁登出時，自動回到登入頁
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    const current = router.currentRoute.value;
    if (current.matched.some((r) => r.meta.requiresAuth)) {
      router.replace({ path: "/login", query: { redirect: current.fullPath } });
    }
  }
});

export default router;
