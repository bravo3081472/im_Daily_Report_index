import { supabase } from '@/lib/supabase';

// 登入帳號對應的 email 網域：輸入「admin」會以 admin@mes.local 登入
const LOGIN_DOMAIN = 'mes.local';

export const toLoginEmail = (username) => {
  const name = String(username || '').trim();
  return name.includes('@') ? name : `${name}@${LOGIN_DOMAIN}`;
};

export const signIn = async (username, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: toLoginEmail(username),
    password,
  });
  if (error) throw error;
  return data.session;
};

export const signOut = () => supabase.auth.signOut();

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// 顯示用帳號名稱（admin@mes.local → admin）
export const displayName = (session) => {
  const email = session?.user?.email || '';
  return email.endsWith(`@${LOGIN_DOMAIN}`) ? email.split('@')[0] : email;
};
