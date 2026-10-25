import { createClient, createAdminClient, InsForgeClient } from '@insforge/sdk';

declare const __INSFORGE_URL__: string | undefined;
declare const __INSFORGE_ANON_KEY__: string | undefined;

function resolveEnv(name: string): string {
  // 1. Vite define globals
  if (name === 'INSFORGE_URL' && typeof __INSFORGE_URL__ !== 'undefined' && __INSFORGE_URL__) {
    return __INSFORGE_URL__;
  }
  if (name === 'INSFORGE_ANON_KEY' && typeof __INSFORGE_ANON_KEY__ !== 'undefined' && __INSFORGE_ANON_KEY__) {
    return __INSFORGE_ANON_KEY__;
  }

  // 2. import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (name === 'INSFORGE_URL') {
        const val =
          import.meta.env.VITE_INSFORGE_URL ||
          import.meta.env.NEXT_PUBLIC_INSFORGE_URL ||
          import.meta.env.INSFORGE_URL;
        if (val) return val;
      }
      if (name === 'INSFORGE_ANON_KEY') {
        const val =
          import.meta.env.VITE_INSFORGE_ANON_KEY ||
          import.meta.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
          import.meta.env.INSFORGE_ANON_KEY;
        if (val) return val;
      }
    }
  } catch {}

  // 3. process.env (Node / SSR)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val =
        process.env[name] ||
        process.env[`VITE_${name}`] ||
        process.env[`NEXT_PUBLIC_${name}`];
      if (val) return val;
    }
  } catch {}

  // 4. Default project credentials from .insforge/project.json & .env.local
  if (name === 'INSFORGE_URL') return 'https://rymjr9pc.ap-southeast.insforge.app';
  if (name === 'INSFORGE_ANON_KEY') {
    return 'anon_bcc9e73237e3714c94355dde26838ee003aacfa2202c91efb294964b63d85396';
  }

  return '';
}

export const insforgeUrl = resolveEnv('INSFORGE_URL');
export const insforgeAnonKey = resolveEnv('INSFORGE_ANON_KEY');
export const insforgeApiKey =
  (typeof process !== 'undefined' && process.env && process.env.INSFORGE_API_KEY) ||
  'ik_e9bf1feed4f9c44a0632ea6a534a0aea';

// Standard client for browser and SSR
export const insforge: InsForgeClient = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});

// Admin client for server-side privileged tasks
export const insforgeAdmin =
  typeof window === 'undefined'
    ? createAdminClient({
        baseUrl: insforgeUrl,
        apiKey: insforgeApiKey,
      })
    : insforge;

export function isInsforgeConfigured(): boolean {
  return Boolean(insforgeUrl && insforgeAnonKey);
}

export function getInsforgeDetails() {
  return {
    isConfigured: isInsforgeConfigured(),
    url: insforgeUrl,
    appkey: 'rymjr9pc',
    region: 'ap-southeast',
  };
}
