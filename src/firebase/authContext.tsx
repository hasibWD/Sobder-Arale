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

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  enableAuthorMode: () => void;
  disableAuthorMode: () => void;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isLoading: true,
  isConfigured: false,
  loginWithEmail: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  enableAuthorMode: () => {},
  disableAuthorMode: () => {},
  logout: async () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('shobder_arale_author_active') === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!auth || !isConfigured) {
      // Check if local author session exists
      const localAuthor = localStorage.getItem('shobder_arale_author_active') === 'true';
      setIsAdmin(localAuthor);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const adminStatus = await checkIsAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
          if (adminStatus) {
            localStorage.setItem('shobder_arale_author_active', 'true');
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        const localAuthor = localStorage.getItem('shobder_arale_author_active') === 'true';
        setIsAdmin(localAuthor);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  const clearAuthError = () => setAuthError(null);

  const enableAuthorMode = () => {
    localStorage.setItem('shobder_arale_author_active', 'true');
    setIsAdmin(true);
  };

  const disableAuthorMode = () => {
    localStorage.removeItem('shobder_arale_author_active');
    setIsAdmin(false);
  };

  const loginWithEmail = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      // Local author access fallback
      enableAuthorMode();
      return { success: true };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const isOwner = await checkIsAdmin(userCredential.user.uid);
      if (!isOwner) {
        await firebaseSignOut(auth);
        setUser(null);
        disableAuthorMode();
        const err = 'অনুমতি অস্বীকৃত: আপনি এই ওয়েবসাইটের স্বত্বাধিকারী বা অনুমোদিত প্রশাসক নন।';
        setAuthError(err);
        return { success: false, error: err };
      }
      enableAuthorMode();
      return { success: true };
    } catch (err: unknown) {
      let message = 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করে পুনরায় চেষ্টা করুন।';
      if (err instanceof Error) {
        if (err.message.includes('user-not-found') || err.message.includes('wrong-password') || err.message.includes('invalid-credential')) {
          message = 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
        } else if (err.message.includes('too-many-requests')) {
          message = 'অতিরিক্ত বার ভুল চেষ্টা করার জন্য সাময়িকভাবে এক্সেস স্থগিত করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।';
        }
      }
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      enableAuthorMode();
      return { success: true };
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const isOwner = await checkIsAdmin(userCredential.user.uid);
      if (!isOwner) {
        await firebaseSignOut(auth);
        setUser(null);
        disableAuthorMode();
        const err = 'অনুমতি অস্বীকৃত: আপনি এই ওয়েবসাইটের স্বত্বাধিকারী বা অনুমোদিত প্রশাসক নন।';
        setAuthError(err);
        return { success: false, error: err };
      }
      enableAuthorMode();
      return { success: true };
    } catch (err: unknown) {
      let message = 'গুগল সাইন-ইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      if (err instanceof Error && err.message.includes('popup-closed-by-user')) {
        message = 'লগইন উইন্ডোটি বন্ধ করা হয়েছে।';
      }
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
    disableAuthorMode();
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        isConfigured,
        loginWithEmail,
        loginWithGoogle,
        enableAuthorMode,
        disableAuthorMode,
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
