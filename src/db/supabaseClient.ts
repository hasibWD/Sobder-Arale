import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_ANON_KEY__: string | undefined;

function resolveEnv(name: string): string {
  // 1. Check Vite define globals
  if (name === 'SUPABASE_URL' && typeof __SUPABASE_URL__ !== 'undefined' && __SUPABASE_URL__) {
    return __SUPABASE_URL__;
  }
  if (name === 'SUPABASE_ANON_KEY' && typeof __SUPABASE_ANON_KEY__ !== 'undefined' && __SUPABASE_ANON_KEY__) {
    return __SUPABASE_ANON_KEY__;
  }

  // 2. Check import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (name === 'SUPABASE_URL' && import.meta.env.VITE_SUPABASE_URL) {
        return import.meta.env.VITE_SUPABASE_URL;
      }
      if (name === 'SUPABASE_ANON_KEY' && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return import.meta.env.VITE_SUPABASE_ANON_KEY;
      }
    }
  } catch {}

  // 3. Check process.env
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[name] || process.env[`VITE_${name}`];
      if (val) return val;
    }
  } catch {}

  return '';
}

const supabaseUrl = resolveEnv('SUPABASE_URL');
const supabaseKey = resolveEnv('SUPABASE_ANON_KEY') || resolveEnv('SUPABASE_SERVICE_ROLE_KEY');

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey && supabase);
}

export function getSupabaseDetails() {
  return {
    isConfigured: isSupabaseConfigured(),
    url: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1***') : null,
  };
}
