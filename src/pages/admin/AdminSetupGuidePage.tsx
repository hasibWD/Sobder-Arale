import React from 'react';
import { Feather, Shield, ArrowLeft, Terminal, Key, Database, Globe, CheckCircle2 } from 'lucide-react';

interface AdminSetupGuidePageProps {
  navigate: (path: string) => void;
}

export const AdminSetupGuidePage: React.FC<AdminSetupGuidePageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 font-serif-bn">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/admin')}
        className="inline-flex items-center space-x-1.5 text-xs text-[#7A6B5D] hover:text-[#8C4A32] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>ড্যাশবোর্ডে ফিরুন</span>
      </button>

      {/* Header */}
      <div className="border-b border-[#DFCBB5] pb-6 space-y-2">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-semibold">
          <Shield className="w-4 h-4" />
          <span>প্রোডাকশন ডেপ্লয়মেন্ট ও নিরাপত্তা গাইড</span>
        </div>
        <h1 className="text-3xl font-bold text-[#2C2621]">
          "শব্দের আড়ালে" পূর্ণাঙ্গ ফায়ারবেস সেটআপ নির্দেশিকা
        </h1>
        <p className="text-sm text-[#6F6052] leading-relaxed">
          নিচের ১০টি ধাপ অনুসরণ করে আপনার ব্যক্তিগত সাহিত্য পোর্টালটি গুগল ক্লাউড ফায়ারস্টোর ও ফায়ারবেস হোস্টিংয়ে শতভাগ সুরক্ষিত অবস্থায় চালু করুন।
        </p>
      </div>

      {/* 10 Step Detailed Guide */}
      <div className="space-y-8 text-sm text-[#3E3228] leading-relaxed">
        {/* Step 1 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">১</span>
            <h2>প্রকল্পের ডিপেনডেন্সি ইনস্টল</h2>
          </div>
          <p>টার্মিনালে প্রজেক্ট ডিরেক্টরিতে গিয়ে প্রয়োজনীয় সমস্ত প্যাকেজ ইনস্টল করুন:</p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3 rounded-xl font-mono text-xs overflow-x-auto">
            npm install
          </div>
        </section>

        {/* Step 2 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">২</span>
            <h2>ফায়ারবেস প্রজেক্ট তৈরি</h2>
          </div>
          <p>
            <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-[#8C4A32] underline font-semibold">
              Firebase Console
            </a>-এ লগইন করুন এবং <strong>Add project</strong>-এ ক্লিক করে আপনার প্রজেক্টের নাম (যেমন: <code className="bg-[#EFE5D5] px-1 rounded">shobder-arale</code>) দিয়ে তৈরি করুন।
          </p>
        </section>

        {/* Step 3 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৩</span>
            <h2>Web App রেজিস্ট্রেশন ও কনফিগ সংগ্রহ</h2>
          </div>
          <p>
            প্রজেক্টের মূল পাতায় Web আইকনে (<strong>&lt;/&gt;</strong>) ক্লিক করে অ্যাপের নাম দিন। এরপর যে <code>firebaseConfig</code> স্ক্রিপ্ট প্রদর্শিত হবে সেখান থেকে <code className="bg-[#EFE5D5] px-1 rounded">apiKey</code>, <code className="bg-[#EFE5D5] px-1 rounded">projectId</code> ইত্যাদি মান কপি করুন।
          </p>
        </section>

        {/* Step 4 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৪</span>
            <h2>Authentication সক্রিয়করণ</h2>
          </div>
          <p>
            বামপাশের মেনু থেকে <strong>Build &gt; Authentication &gt; Get started</strong> নির্বাচন করুন।
            <strong>Sign-in method</strong> ট্যাবে গিয়ে:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>Email/Password</strong> চালু (Enable) করুন।</li>
            <li>(ঐচ্ছিক) <strong>Google</strong> প্রোভাইডার চালু করতে পারেন।</li>
            <li><strong>Users</strong> ট্যাবে গিয়ে স্বত্বাধিকারীর ব্যক্তিগত ইমেইল এবং শক্তিশালী পাসওয়ার্ড দিয়ে আপনার অ্যাডমিন অ্যাকাউন্ট তৈরি করুন।</li>
          </ul>
        </section>

        {/* Step 5 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৫</span>
            <h2>Cloud Firestore ডাটাবেজ তৈরি</h2>
          </div>
          <p>
            মেনু থেকে <strong>Build &gt; Firestore Database &gt; Create database</strong> নির্বাচন করুন। আপনার নিকটস্থ লোকেশন নির্বাচন করুন।
          </p>
        </section>

        {/* Step 6 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৬</span>
            <h2>এনভায়রনমেন্ট ভেরিয়েবল (.env) ফাইল তৈরি</h2>
          </div>
          <p>
            প্রজেক্ট রুটে <code>.env.example</code> ফাইলটি কপি করে <code>.env</code> নামে একটি নতুন ফাইল তৈরি করুন এবং মানগুলো বসান:
          </p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3.5 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
            <div>VITE_FIREBASE_API_KEY="AIzaSy..."</div>
            <div>VITE_FIREBASE_AUTH_DOMAIN="shobder-arale.firebaseapp.com"</div>
            <div>VITE_FIREBASE_PROJECT_ID="shobder-arale"</div>
            <div>VITE_FIREBASE_STORAGE_BUCKET="shobder-arale.appspot.com"</div>
            <div>VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"</div>
            <div>VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"</div>
          </div>
        </section>

        {/* Step 7 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৭</span>
            <h2>লোকাল ডেভেলপমেন্ট সার্ভার চালু</h2>
          </div>
          <p>টার্মিনাল থেকে অ্যাপ চালিয়ে যাচাই করুন:</p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3 rounded-xl font-mono text-xs overflow-x-auto">
            npm run dev
          </div>
        </section>

        {/* Step 8 - CRITICAL ADMIN SETUP */}
        <section className="bg-[#FAF5EC] p-6 rounded-2xl border-2 border-[#8C4A32]/40 space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#8C4A32] text-white flex items-center justify-center text-xs">৮</span>
            <h2>নিরাপদ প্রথম প্রশাসক অনুমোদন (Secure Admin Bootstrap)</h2>
          </div>
          <p className="font-semibold text-red-800">
            জরুরি নিরাপত্তা নিয়ম: এই ওয়েবসাইটে কোনো পাবলিক রেজিস্ট্রেশন দিয়ে অ্যাডমিন হওয়া যায় না।
          </p>
          <p>
            Firebase Console &gt; Authentication &gt; Users-এ আপনার অ্যাকাউন্টের <strong>User UID</strong> কপি করুন (যেমন: <code>Vb9x4K...</code>)।
          </p>
          <p>
            এরপর <strong>Firestore Database &gt; Data</strong>-তে গিয়ে <strong>Start collection</strong> চাপুন:
          </p>
          <div className="bg-white p-3.5 rounded-xl border border-[#DFCBB5] text-xs font-mono space-y-1">
            <div>Collection ID: <strong>admins</strong></div>
            <div>Document ID: <strong>&lt;আপনার_কপি_করা_UID&gt;</strong></div>
            <div>Field: <strong>role</strong> (string) = <strong>"owner"</strong></div>
            <div>Field: <strong>email</strong> (string) = <strong>"your-email@example.com"</strong></div>
          </div>
          <p className="text-xs text-[#7A6B5D]">
            এর ফলে ফায়ারস্টোর সিকিউরিটি রুলস আপনার এই আইডিকে একক স্বত্বাধিকারী হিসেবে স্বীকৃতি দেবে।
          </p>
        </section>

        {/* Step 9 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৯</span>
            <h2>জিরো-ট্রাস্ট Firestore Security Rules ডেপ্লয়</h2>
          </div>
          <p>
            প্রজেক্টের <code>firestore.rules</code> ফাইলটিতে শতভাগ দুর্ভেদ্য রুলস রয়েছে যা সাধারণ পাঠকদের শুধুমাত্র <code>status == 'published'</code> লেখা পড়তে দেয় এবং সব ধরনের পরিবর্তন শুধু মালিকের জন্যই উন্মুক্ত রাখে। এটি ডেপ্লয় করতে চালান:
          </p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3 rounded-xl font-mono text-xs overflow-x-auto">
            firebase deploy --only firestore:rules
          </div>
        </section>

        {/* Step 10 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">১০</span>
            <h2>Firebase Hosting-এ প্রোডাকশন ডেপ্লয়</h2>
          </div>
          <p>প্রথমে প্রজেক্টের প্রোডাকশন বিল্ড তৈরি করুন এবং এরপর হোস্টিংয়ে ডেপ্লয় করুন:</p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3.5 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
            <div>npm run build</div>
            <div>firebase deploy --only hosting</div>
          </div>
          <p className="text-xs text-emerald-800 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>আপনার সাহিত্য পোর্টাল "শব্দের আড়ালে" এখন বিশ্বজুড়ে পাঠকদের জন্য উন্মুক্ত!</span>
          </p>
        </section>
      </div>

      {/* Back button */}
      <div className="pt-6 border-t border-[#DFCBB5] text-center">
        <button
          onClick={() => navigate('/admin')}
          className="px-6 py-2.5 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors"
        >
          ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    </div>
  );
};
