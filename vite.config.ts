import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const insforgeUrl =
    env.VITE_INSFORGE_URL ||
    env.NEXT_PUBLIC_INSFORGE_URL ||
    env.INSFORGE_URL ||
    process.env.VITE_INSFORGE_URL ||
    process.env.NEXT_PUBLIC_INSFORGE_URL ||
    'https://rymjr9pc.ap-southeast.insforge.app';
  const insforgeAnonKey =
    env.VITE_INSFORGE_ANON_KEY ||
    env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    env.INSFORGE_ANON_KEY ||
    process.env.VITE_INSFORGE_ANON_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'anon_bcc9e73237e3714c94355dde26838ee003aacfa2202c91efb294964b63d85396';

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      '__INSFORGE_URL__': JSON.stringify(insforgeUrl),
      '__INSFORGE_ANON_KEY__': JSON.stringify(insforgeAnonKey),
      'process.env.VITE_INSFORGE_URL': JSON.stringify(insforgeUrl),
      'process.env.VITE_INSFORGE_ANON_KEY': JSON.stringify(insforgeAnonKey),
      'process.env.NEXT_PUBLIC_INSFORGE_URL': JSON.stringify(insforgeUrl),
      'process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY': JSON.stringify(insforgeAnonKey),
      '__SUPABASE_URL__': JSON.stringify(supabaseUrl),
      '__SUPABASE_ANON_KEY__': JSON.stringify(supabaseAnonKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
