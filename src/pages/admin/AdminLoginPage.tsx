import React, { useState } from 'react';
import { useAuth } from '../../firebase/authContext';
import { Feather, Lock, Mail, ShieldAlert, ArrowLeft, KeyRound, Key } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
  redirectAfter?: string;
  message?: string;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  navigate,
  redirectAfter = '/admin',
  message,
}) => {
  const { loginWithEmailOrKey, loginWithGoogle, authError, clearAuthError, isConfigured } = useAuth();
  const { showToast } = useToast();

  const [loginMode, setLoginMode] = useState<'credentials' | 'passcode'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('ইমেইল ও পাসওয়ার্ড উভয়ই প্রদান করুন', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmailOrKey(email, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('অ্যাডমিন হিসেবে সফলভাবে লগইন হয়েছে!', 'success');
      navigate(redirectAfter);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      showToast('অ্যাডমিন পাসকোড প্রদান করুন', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmailOrKey(passcode);
    setIsSubmitting(false);

    if (result.success) {
      showToast('অ্যাডমিন অথেনটিকেশন সফল!', 'success');
      navigate(redirectAfter);
    }
  };

  const handleGoogleSubmit = async () => {
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.success) {
      showToast('গুগল দিয়ে অ্যাডমিন লগইন সফল হয়েছে!', 'success');
      navigate(redirectAfter);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-[#FAF7F2] rounded-3xl border border-[#DFD3C2] p-8 shadow-xl space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-1.5 text-xs font-serif-bn text-[#7A6B5D] hover:text-[#8C4A32] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ওয়েবসাইটে ফিরে যান (পাঠক ভিউ)</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F2E8DC] border border-[#DFCBB5] flex items-center justify-center text-[#8C4A32]">
            <Feather className="w-7 h-7 transform -rotate-12" />
          </div>
          <h2 className="font-serif-bn text-2xl font-bold text-[#2C2621]">
            শুধুমাত্র অ্যাডমিন লগইন
          </h2>
          <p className="font-serif-bn text-xs text-[#7A6B5D]">
            শব্দের আড়ালে • স্বত্বাধিকারী নিয়ন্ত্রণকক্ষ
          </p>
        </div>

        {/* Custom prompt message if redirected from /write */}
        {message && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-serif-bn text-amber-900 leading-relaxed">
            {message}
          </div>
        )}

        {/* Security Rule Notice */}
        <div className="p-3.5 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] text-xs font-serif-bn text-[#5A4B3D] flex items-start space-x-2.5">
          <ShieldAlert className="w-4 h-4 text-[#8C4A32] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-[#2C2621]">কঠোর নিরাপত্তা নিয়মাবলী:</span>
            <p className="leading-relaxed">
              এই ওয়েবসাইটে সাধারণ পাঠকদের কোনো অ্যাকাউন্ট বা লগইনের প্রয়োজন নেই; তাঁরা যেকোনো লেখা মুক্তমনে পড়তে পারবেন। শুধুমাত্র সাইট স্বত্বাধিকারীই লগইন করে নতুন পোস্ট লিখতে ও পরিচালনা করতে পারবেন।
            </p>
          </div>
        </div>

        {/* Error message */}
        {authError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-serif-bn text-red-800">
            {authError}
          </div>
        )}

        {/* Login Method Toggle */}
        <div className="flex border-b border-[#DFCBB5] font-serif-bn text-xs">
          <button
            type="button"
            onClick={() => {
              setLoginMode('credentials');
              clearAuthError();
            }}
            className={`flex-1 py-2 text-center font-semibold transition-colors border-b-2 ${
              loginMode === 'credentials'
                ? 'border-[#8C4A32] text-[#8C4A32]'
                : 'border-transparent text-[#7A6B5D] hover:text-[#2C2621]'
            }`}
          >
            অ্যাডমিন ইমেইল ও পাসওয়ার্ড
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('passcode');
              clearAuthError();
            }}
            className={`flex-1 py-2 text-center font-semibold transition-colors border-b-2 ${
              loginMode === 'passcode'
                ? 'border-[#8C4A32] text-[#8C4A32]'
                : 'border-transparent text-[#7A6B5D] hover:text-[#2C2621]'
            }`}
          >
            মাস্টার পাসকোড / কি
          </button>
        </div>

        {loginMode === 'credentials' ? (
          /* Email / Password Form */
          <form onSubmit={handleCredentialsSubmit} className="space-y-4 font-serif-bn">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#4A3F35]">
                অ্যাডমিন ইমেইল
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C4A32] absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearAuthError();
                  }}
                  required
                  placeholder="hasibulhasan2087@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#4A3F35]">
                গোপন পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C4A32] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearAuthError();
                  }}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-semibold hover:bg-[#723925] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'অ্যাডমিন প্রবেশ'}
            </button>
          </form>
        ) : (
          /* Master Passcode Form */
          <form onSubmit={handlePasscodeSubmit} className="space-y-4 font-serif-bn">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#4A3F35]">
                অ্যাডমিন মাস্টার পাসকোড (Master Key)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[#8C4A32] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    clearAuthError();
                  }}
                  required
                  placeholder="admin1234 বা মাস্টার কি"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
                />
              </div>
              <p className="text-[11px] text-[#7A6B5D]">
                ডিফল্ট মাস্টার পাসকোড: <code className="bg-[#EFE5D5] px-1 py-0.5 rounded">admin1234</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-semibold hover:bg-[#723925] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'পাসকোড দিয়ে প্রবেশ করুন'}
            </button>
          </form>
        )}

        {isConfigured && (
          <>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#DFD3C2]" />
              <span className="flex-shrink mx-3 text-xs text-[#7A6B5D] font-serif-bn">অথবা</span>
              <div className="flex-grow border-t border-[#DFD3C2]" />
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl border border-[#DFCBB5] bg-white font-serif-bn text-sm text-[#4A3F35] hover:bg-[#F2E8DC] transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-[#8C4A32]" />
              <span>গুগল দিয়ে অ্যাডমিন ভেরিফিকেশন</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
