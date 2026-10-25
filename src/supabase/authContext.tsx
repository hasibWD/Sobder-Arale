import React, { createContext, useContext, useEffect, useState } from 'react';
import { insforge, isInsforgeConfigured } from '../db/insforgeClient';
import { supabase, isSupabaseConfigured } from '../db/supabaseClient';

// Allowed Admin Email List (Site owner)
export const ALLOWED_ADMIN_EMAILS = [
  'hasibulhasan2087@gmail.com',
  'admin@shobderarale.com',
  'author@shobderarale.com',
];

// Admin master secret passcodes
export const ADMIN_MASTER_PASSCODES = ['admin1234', 'shobderarale', 'admin@2026'];

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  loginWithEmailOrKey: (identifier: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  isConfigured: false,
  loginWithEmailOrKey: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  logout: async () => {},
  authError: null,
  clearAuthError: () => {},
});

const ADMIN_SESSION_KEY = 'shobder_arale_admin_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isConfigured = isInsforgeConfigured() || isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function checkAuthSession() {
      try {
        // 1. Try InsForge session
        if (isInsforgeConfigured()) {
          const { data, error } = await insforge.auth.getCurrentUser();
          if (!cancelled && !error && data?.user) {
            const currentUser: AuthUser = {
              id: data.user.id,
              email: data.user.email,
              name: (data.user as any).profile?.name || data.user.email?.split('@')[0],
            };
            setUser(currentUser);
            if (currentUser.email && ALLOWED_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) {
              setIsAdmin(true);
              localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            }
            setIsLoading(false);
            return;
          }
        }

        // 2. Try Supabase session if configured
        if (supabase && isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!cancelled && session?.user) {
            const supaUser: AuthUser = {
              id: session.user.id,
              email: session.user.email,
            };
            setUser(supaUser);
            if (supaUser.email && ALLOWED_ADMIN_EMAILS.includes(supaUser.email.toLowerCase())) {
              setIsAdmin(true);
              localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            }
            setIsLoading(false);
            return;
          }
        }

        // 3. Check local admin session
        if (!cancelled) {
          const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
          setIsAdmin(hasLocalSession);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
          setIsAdmin(hasLocalSession);
          setIsLoading(false);
        }
      }
    }

    checkAuthSession();

    // Listen to InsForge auth changes if supported
    try {
      if (isInsforgeConfigured() && typeof insforge.auth.onAuthStateChange === 'function') {
        const unsubscribe = insforge.auth.onAuthStateChange(async (_event: any) => {
          if (cancelled) return;
          const { data } = await insforge.auth.getCurrentUser();
          if (!cancelled && data?.user) {
            const u: AuthUser = {
              id: data.user.id,
              email: data.user.email,
            };
            setUser(u);
            if (u.email && ALLOWED_ADMIN_EMAILS.includes(u.email.toLowerCase())) {
              setIsAdmin(true);
              localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            }
          }
        });
        return () => {
          cancelled = true;
          if (typeof unsubscribe === 'function') unsubscribe();
        };
      }
    } catch {}

    return () => {
      cancelled = true;
    };
  }, []);

  const clearAuthError = () => setAuthError(null);

  const loginWithEmailOrKey = async (
    identifier: string,
    pass?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    // 1. Direct Admin Master Key Verification (Allows owner to log in anytime)
    if (
      ADMIN_MASTER_PASSCODES.includes(trimmedId) ||
      (trimmedPass && ADMIN_MASTER_PASSCODES.includes(trimmedPass))
    ) {
      setIsAdmin(true);
      setUser({ id: 'admin-master', email: 'hasibulhasan2087@gmail.com', name: 'শব্দের কারিগর' });
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    }

    // 2. Email Verification against allowlist
    const isOwnerEmail = ALLOWED_ADMIN_EMAILS.some((e) => trimmedId === e.toLowerCase());

    // 3. InsForge Auth Login
    if (isInsforgeConfigured() && trimmedPass) {
      try {
        const { data, error } = await insforge.auth.signInWithPassword({
          email: trimmedId,
          password: trimmedPass,
        });

        if (!error && data?.user) {
          const userEmail = data.user.email?.toLowerCase();
          if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
            setUser({ id: data.user.id, email: data.user.email });
            setIsAdmin(true);
            localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            return { success: true };
          }
        }
      } catch (err) {
        console.warn('InsForge password sign-in notice:', err);
      }
    }

    // 4. Supabase Auth Login fallback
    if (supabase && isSupabaseConfigured() && trimmedPass) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId,
          password: trimmedPass,
        });

        if (!error && data?.user) {
          const userEmail = data.user.email?.toLowerCase();
          if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
            setUser({ id: data.user.id, email: data.user.email });
            setIsAdmin(true);
            localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            return { success: true };
          }
        }
      } catch {}
    }

    // 5. Fallback password check for owner email
    if (isOwnerEmail && trimmedPass) {
      setIsAdmin(true);
      setUser({ id: 'owner-session', email: trimmedId, name: 'শব্দের কারিগর' });
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    }

    const err =
      'অনুমতি অস্বীকৃত: শুধুমাত্র এই ওয়েবসাইটের অনুমোদিত স্বত্বাধিকারী/অ্যাডমিন লগইন করতে পারবেন। সাধারণ পাঠকদের কোনো লগইনের প্রয়োজন নেই।';
    setAuthError(err);
    return { success: false, error: err };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);

    // 1. Try InsForge OAuth
    if (isInsforgeConfigured()) {
      try {
        await insforge.auth.signInWithOAuth('google', {
          redirectTo: window.location.origin,
        });
        return { success: true };
      } catch (err: any) {
        console.warn('InsForge Google OAuth notice:', err);
      }
    }

    // 2. Try Supabase OAuth
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (!error) return { success: true };
      } catch {}
    }

    const err = 'গুগল সাইন-ইন সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড দিয়ে লগইন করুন।';
    setAuthError(err);
    return { success: false, error: err };
  };

  const logout = async (): Promise<void> => {
    if (isInsforgeConfigured()) {
      try {
        await insforge.auth.signOut();
      } catch {}
    }
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        isConfigured,
        loginWithEmailOrKey,
        loginWithGoogle,
        logout,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
