import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/InjectionMolding_Index/IM_Dashboard",
  },
  {
    path: "/InjectionMolding_Index",
    name: "InjectionMolding_Index",
    component: () => import("@/views/InjectionMolding_Index.vue"),
    meta: { requiresAuth: false },
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

export default router;
