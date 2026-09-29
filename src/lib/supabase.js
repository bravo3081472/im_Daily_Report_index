import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // 部署時請在 Vercel → Settings → Environment Variables 設定這兩個變數
  console.error(
    '缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY 環境變數，無法連線資料庫。',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');
