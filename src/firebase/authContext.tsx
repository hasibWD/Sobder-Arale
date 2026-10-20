import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';
import { checkIsAdmin } from './firestoreService';

// Known admin email list
const ALLOWED_ADMIN_EMAILS = [
  'hasibulhasan2087@gmail.com',
  'admin@shobderarale.com',
  'author@shobderarale.com',
];

// Admin master secret passcodes
const ADMIN_MASTER_PASSCODES = ['admin1234', 'shobderarale', 'admin@2026'];

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

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    // If running with Firebase Auth configured
    if (auth && isConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          const userEmail = currentUser.email?.toLowerCase();
          const isAllowedEmail = userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail);
          const hasAdminDoc = await checkIsAdmin(currentUser.uid);

          if (isAllowedEmail || hasAdminDoc) {
            setIsAdmin(true);
            localStorage.setItem(ADMIN_SESSION_KEY, 'true');
          } else {
            // Non-admin user signed in: revoke privileges immediately!
            setIsAdmin(false);
            localStorage.removeItem(ADMIN_SESSION_KEY);
          }
        } else {
          // If no Firebase user, check if logged in via master admin key
          const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
          setIsAdmin(hasLocalSession);
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Local session check
      const hasLocalSession = localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
      setIsAdmin(hasLocalSession);
      setIsLoading(false);
    }
  }, [isConfigured]);

  const clearAuthError = () => setAuthError(null);

  const loginWithEmailOrKey = async (identifier: string, pass?: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = (pass || '').trim();

    // 1. Direct Admin Master Key Verification (Allows owner to log in anytime)
    if (ADMIN_MASTER_PASSCODES.includes(trimmedId) || (trimmedPass && ADMIN_MASTER_PASSCODES.includes(trimmedPass))) {
      setIsAdmin(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    }

    // 2. Email Verification against allowlist
    const isOwnerEmail = ALLOWED_ADMIN_EMAILS.some((e) => trimmedId === e.toLowerCase());

    if (auth && isConfigured && trimmedPass) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedId, trimmedPass);
        const userEmail = userCredential.user.email?.toLowerCase();

        if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
          setIsAdmin(true);
          localStorage.setItem(ADMIN_SESSION_KEY, 'true');
          return { success: true };
        }

        const isOwner = await checkIsAdmin(userCredential.user.uid);
        if (!isOwner) {
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          localStorage.removeItem(ADMIN_SESSION_KEY);
          const err = 'অনুমতি অস্বীকৃত: আপনি এই ওয়েবসাইটের স্বত্বাধিকারী বা অনুমোদিত প্রশাসক নন। সাধারণ পাঠকেরা শুধু পড়তে পারবেন।';
          setAuthError(err);
          return { success: false, error: err };
        }

        setIsAdmin(true);
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        return { success: true };
      } catch (err: unknown) {
        let message = 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।';
        if (err instanceof Error) {
          if (err.message.includes('user-not-found') || err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
            message = 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
          }
        }
        setAuthError(message);
        return { success: false, error: message };
      }
    }

    // Fallback password check for owner email
    if (isOwnerEmail && trimmedPass) {
      setIsAdmin(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    }

    const err = 'অনুমতি অস্বীকৃত: শুধুমাত্র এই ওয়েবসাইটের অনুমোদিত স্বত্বাধিকারী/অ্যাডমিন লগইন করতে পারবেন।';
    setAuthError(err);
    return { success: false, error: err };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      const err = 'ফায়ারবেস ক্লাউড কনফিগারেশন সংযুক্ত করা হয়নি। অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড বা কি দিয়ে লগইন করুন।';
      setAuthError(err);
      return { success: false, error: err };
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const userEmail = userCredential.user.email?.toLowerCase();

      if (userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
        setIsAdmin(true);
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
        return { success: true };
      }

      const isOwner = await checkIsAdmin(userCredential.user.uid);
      if (!isOwner) {
        await firebaseSignOut(auth);
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        const err = 'অনুমতি অস্বীকৃত: শুধুমাত্র স্বত্বাধিকারী (' + ALLOWED_ADMIN_EMAILS[0] + ') এই ওয়েবসাইটে লগইন করতে পারবেন।';
        setAuthError(err);
        return { success: false, error: err };
      }

      setIsAdmin(true);
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return { success: true };
    } catch (err: unknown) {
      let message = 'গুগল সাইন-ইন ব্যর্থ হয়েছে।';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    if (auth) {
      try {
        await firebaseSignOut(auth);
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
