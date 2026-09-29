# 塑膠射出 MES 管理系統（im_Daily_Report_index）

射出成型課的生產日報、製令進度、基礎資料管理系統。

- 前端：Vue 3 + Vue Router + Bootstrap 5 + Chart.js（Vite 建置）
- 資料庫：Supabase（PostgreSQL），前端以 `@supabase/supabase-js` 直接存取
- 部署：Vercel（push 到 `main` 自動部署）

原本的 Node.js / Express + MySQL 後端已移除。

## 專案結構

```
src/
├─ main.js                         進入點（載入 Bootstrap、圖示、全域樣式）
├─ App.vue
├─ router/index.ts                 路由
├─ views/InjectionMolding_Index.vue   版面（上方導覽列 + 內容）
├─ lib/supabase.js                 Supabase 連線
└─ components/
   ├─ apis/general.js              所有資料存取（取代原本的後端 API）
   └─ IM_ProductionWorkOrder/      各頁面元件與 useIMProductionWorkOrder.js
supabase/migrations/               資料庫建表與函式（已套用到 Supabase）
```

## 本機開發

```bash
cp .env.example .env.local   # 填入 Supabase URL 與 publishable key
npm install
npm run dev
```

## 環境變數（Vercel → Settings → Environment Variables）

| 名稱 | 說明 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase 專案網址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key（或舊版 anon key） |

## 資料庫

- `001_init_schema.sql`：7 張資料表、`updated_at` 自動更新、權限（RLS）
- `002_daily_report_functions.sql`：`save_daily_report`、`delete_daily_report`，
  讓日報主表、班別明細、不良明細在同一個交易內新增／更新／刪除
- `003_require_login.sql`：只有登入者可以讀寫資料，未登入者無法存取

## 登入

- 帳號：`admin`，密碼：`123456`（實際登入的 email 為 `admin@mes.local`）
- 帳號管理：Supabase → Authentication → Users（新增帳號時 email 用 `名稱@mes.local`，即可用「名稱」登入）
- 建議正式使用前更換為較強的密碼
