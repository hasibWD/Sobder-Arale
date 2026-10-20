import React, { useState } from 'react';
import { useAuth } from '../../firebase/authContext';
import { Feather, Lock, Mail, ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { loginWithEmail, loginWithGoogle, authError, clearAuthError, isConfigured } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('ইমেইল ও পাসওয়ার্ড উভয়ই আবশ্যক', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (result.success) {
      showToast('সাফল্যের সাথে লগইন হয়েছে!', 'success');
      navigate('/admin');
    }
  };

  const handleGoogleSubmit = async () => {
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.success) {
      showToast('গুগল দিয়ে লগইন সফল হয়েছে!', 'success');
      navigate('/admin');
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
          <span>ওয়েবসাইটে ফিরে যান</span>
        </button>

        {/* Brand Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#F2E8DC] border border-[#DFCBB5] flex items-center justify-center text-[#8C4A32]">
            <Feather className="w-7 h-7 transform -rotate-12" />
          </div>
          <h2 className="font-serif-bn text-2xl font-bold text-[#2C2621]">
            লেখক ও প্রশাসক প্রবেশ
          </h2>
          <p className="font-serif-bn text-xs text-[#7A6B5D]">
            শব্দের আড়ালে • নিয়ন্ত্রণ প্যানেল
          </p>
        </div>

        {/* Strict Security Notice */}
        <div className="p-3.5 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] text-xs font-serif-bn text-[#5A4B3D] flex items-start space-x-2.5">
          <ShieldAlert className="w-4 h-4 text-[#8C4A32] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-[#2C2621]">নিরাপত্তা সতর্কতা:</span>
            <p className="leading-relaxed">
              এখানে কোনো সাধারণ দর্শক স্বয়ংক্রিয়ভাবে প্রশাসক হিসেবে নিবন্ধন করতে পারবেন না। শুধুমাত্র ডাটাবেজের অনুমোদিত প্রশাসক তালিকায় (<code className="bg-[#EFE5D5] px-1 py-0.5 rounded text-[11px]">admins/&#123;uid&#125;</code>) অন্তর্ভুক্ত অ্যাকাউন্টই লগইন করতে পারবে।
            </p>
          </div>
        </div>

        {/* Unconfigured Alert if .env missing */}
        {!isConfigured && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-serif-bn text-amber-800 space-y-1">
            <p className="font-semibold">ফায়ারবেস কী এখনও সেট করা হয়নি:</p>
            <p className="text-[11px] leading-relaxed">
              লগইন সক্রিয় করতে আপনার প্রজেক্টের <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code> ফাইলে ফায়ারবেস কনফিগারেশন যুক্ত করুন। নিচে বিস্তারিত সেটআপ নির্দেশিকা দেওয়া রয়েছে।
            </p>
          </div>
        )}

        {/* Error message */}
        {authError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-serif-bn text-red-800">
            {authError}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 font-serif-bn">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#4A3F35]">
              প্রশাসক ইমেইল
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
                placeholder="author@shobderarale.com"
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
            {isSubmitting ? 'যাচাই করা হচ্ছে...' : 'ইমেইল দিয়ে প্রবেশ করুন'}
          </button>
        </form>

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
          <span>গুগল অ্যাকাউন্ট দিয়ে প্রবেশ</span>
        </button>

        {/* Local / Instant Author Mode Entry */}
        <div className="pt-2 border-t border-[#DFCBB5]">
          <button
            type="button"
            onClick={() => {
              const { enableAuthorMode } = useAuth();
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              navigate('/write');
            }}
            className="w-full py-2.5 rounded-xl bg-[#FAF3E7] border border-[#DFCBB5] font-serif-bn text-xs font-bold text-[#8C4A32] hover:bg-[#F2E8DC] transition-colors flex items-center justify-center space-x-2"
          >
            <Feather className="w-4 h-4 transform -rotate-12" />
            <span>সরাসরি লেখালিখি স্টুডিওতে যান ও পোস্ট করুন →</span>
          </button>
        </div>

        {/* Setup guide jump */}
        <div className="text-center pt-1">
          <button
            onClick={() => navigate('/admin/guide')}
            className="text-xs font-serif-bn text-[#8C4A32] hover:underline"
          >
            প্রথমবার কনফিগারেশন ও অ্যাডমিন অনুমোদন নির্দেশিকা →
          </button>
        </div>
      </div>
    </div>
  );
};
