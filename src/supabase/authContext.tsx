import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../db/supabaseClient';

// Allowed Admin Email List (Site owner)
export const ALLOWED_ADMIN_EMAILS = [
  'hasibulhasan2087@gmail.com',
  'admin@shobderarale.com',
  'author@shobderarale.com',
];

// Admin master secret passcodes
export const ADMIN_MASTER_PASSCODES = ['admin1234', 'shobderarale', 'admin@2026'];

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    // If Supabase is configured, initialize session and auth listener
    if (supabase && isConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser?.email) {
          const userEmail = currentUser.email.toLowerCase();
          if (ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
            setIsAdmin(true);
            localStorage.setItem(ADMIN_SESSION_KEY, 'true');
          }
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser?.email) {
            const userEmail = currentUser.email.toLowerCase();
            if (ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
              setIsAdmin(true);
              localStorage.setItem(ADMIN_SESSION_KEY, 'true');
            } else {
              // Strictly restrict: General readers cannot gain admin access
              await supabase?.auth.signOut();
              setUser(null);
              setIsAdmin(false);
              localStorage.removeItem(ADMIN_SESSION_KEY);
            }
          } else {
            const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
            setIsAdmin(hasLocalSession);
          }
          setIsLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local session verification
      const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
      setIsAdmin(hasLocalSession);
      setIsLoading(false);
    }
  }, [isConfigured]);

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
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    }

    // 2. Email Verification against allowlist
    const isOwnerEmail = ALLOWED_ADMIN_EMAILS.some((e) => trimmedId === e.toLowerCase());

    // 3. Supabase Auth Login if Supabase is active
    if (supabase && isConfigured && trimmedPass) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedId,
          password: trimmedPass,
        });

        if (error) {
          throw error;
        }

        const userEmail = data.user?.email?.toLowerCase();
        if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
          setUser(data.user);
          setIsAdmin(true);
          localStorage.setItem(ADMIN_SESSION_KEY, 'true');
          return { success: true };
        } else {
          // Deny access to non-admin accounts
          await supabase.auth.signOut();
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem(ADMIN_SESSION_KEY);
          const err =
            'অনুমতি অস্বীকৃত: আপনি এই ওয়েবসাইটের স্বত্বাধিকারী বা অনুমোদিত প্রশাসক নন। সাধারণ পাঠকেরা শুধুমাত্র লেখা পড়তে পারবেন।';
          setAuthError(err);
          return { success: false, error: err };
        }
      } catch (err: unknown) {
        let message = 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।';
        if (err instanceof Error) {
          if (
            err.message.includes('Invalid login credentials') ||
            err.message.includes('user-not-found') ||
            err.message.includes('wrong-password')
          ) {
            message = 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
          }
        }
        setAuthError(message);
        return { success: false, error: message };
      }
    }

    // 4. Fallback password check for owner email
    if (isOwnerEmail && trimmedPass) {
      setIsAdmin(true);
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
    if (!supabase || !isConfigured) {
      const err =
        'সুপাবেজ ক্লাউড কনফিগারেশন সক্রিয় নয়। অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড বা কি দিয়ে লগইন করুন।';
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      let message = 'গুগল সাইন-ইন ব্যর্থ হয়েছে।';
      if (err instanceof Error) message = err.message;
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    if (supabase && isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
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
