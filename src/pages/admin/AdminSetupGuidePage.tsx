import React, { useState } from 'react';
import { Shield, ArrowLeft, Terminal, Key, Database, Globe, CheckCircle2, Copy, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface AdminSetupGuidePageProps {
  navigate: (path: string) => void;
}

export const AdminSetupGuidePage: React.FC<AdminSetupGuidePageProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    showToast(`${label} ক্লিপবোর্ডে কপি করা হয়েছে!`, 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const sqlSchemaScript = `-- ==========================================
-- শব্দের আড়ালে (Shobder Arale) - Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com/dashboard)
-- ==========================================

-- 1. Posts Table (কবিতা, ছোটগল্প, প্রবন্ধ, অনুভূতির খাতা)
CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  type VARCHAR(64) NOT NULL, -- 'poem', 'story', 'essay', 'thought'
  excerpt TEXT,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(128) DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'published', 'draft'
  reading_time_minutes INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 2. Novels Table (উপন্যাস)
CREATE TABLE IF NOT EXISTS novels (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  synopsis TEXT,
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'completed'
  chapter_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Chapters Table (উপন্যাসের অধ্যায়সমূহ)
CREATE TABLE IF NOT EXISTS chapters (
  id VARCHAR(128) PRIMARY KEY,
  novel_id VARCHAR(128) NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  chapter_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'published', 'draft'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 4. Author Profile Table (লেখক ও স্বত্বাধিকারীর পরিচিতি)
CREATE TABLE IF NOT EXISTS author_profile (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'main',
  display_name VARCHAR(256) NOT NULL,
  bio TEXT,
  photo_url TEXT,
  philosophy TEXT,
  email VARCHAR(256),
  location VARCHAR(256),
  social_links JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast reader queries
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts(type, status);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
`;

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
          <Database className="w-4 h-4" />
          <span>সুপাবেজ (Supabase) ক্লাউড ব্যাকএন্ড গাইড</span>
        </div>
        <h1 className="text-3xl font-bold text-[#2C2621]">
          "শব্দের আড়ালে" সুপাবেজ (Supabase) সংযোগ ও পরিচালনা নির্দেশিকা
        </h1>
        <p className="text-sm text-[#6F6052] leading-relaxed">
          আপনার ব্যক্তিগত সাহিত্য পোর্টালটি শতভাগ নির্ভরযোগ্য, হাই-পারফরম্যান্স PostgreSQL ডাটাবেজ ও আধুনিক সুপাবেজ ক্লাউড আর্কিটেকচারে পরিচালিত হচ্ছে। নিচের সহজ ধাপগুলো অনুসরণ করে আপনার ব্যক্তিগত সুপাবেজ প্রজেক্ট সংযুক্ত করুন।
        </p>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-8 text-sm text-[#3E3228] leading-relaxed">
        {/* Step 1 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">১</span>
              <h2>সুপাবেজে নতুন প্রজেক্ট তৈরি করুন</h2>
            </div>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-xs text-[#8C4A32] hover:underline font-sans"
            >
              <span>supabase.com/dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#8C4A32] underline font-semibold">
              Supabase Dashboard
            </a>-এ প্রবেশ করে <strong>New project</strong> বোতামে ক্লিক করুন। আপনার পছন্দমতো নাম (যেমন: <code className="bg-[#EFE5D5] px-1.5 py-0.5 rounded text-xs">shobder-arale</code>) এবং একটি শক্তিশালী ডাটাবেজ পাসওয়ার্ড দিন।
          </p>
        </section>

        {/* Step 2 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">২</span>
            <h2>ডাটাবেজ কানেকশন স্ট্রিং সংগ্রহ করুন</h2>
          </div>
          <p>
            সুপাবেজ প্রজেক্ট ওপেন করে বামপাশের <strong>Project Settings &gt; Database</strong> মেনুতে যান। নিচের দিকে <strong>Connection string &gt; URI</strong> ট্যাব নির্বাচন করুন এবং কানেকশন স্ট্রিং কপি করুন:
          </p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-3 rounded-xl font-mono text-xs overflow-x-auto select-all">
            postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
          </div>
          <p className="text-xs text-[#7A6B5D]">
            * মনে রাখবেন, <code>[YOUR-PASSWORD]</code> অংশে প্রজেক্ট তৈরির সময় দেয়া আসল ডাটাবেজ পাসওয়ার্ডটি প্রতিস্থাপন করতে হবে।
          </p>
        </section>

        {/* Step 3 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৩</span>
            <h2>API ক্রেডেনশিয়াল (URL ও Anon Key) সংগ্রহ</h2>
          </div>
          <p>
            <strong>Project Settings &gt; API</strong> মেনু থেকে <strong>Project URL</strong> এবং <strong>Project API Keys (anon public)</strong> কপি করুন:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-[#EFE5D5]/60 p-3 rounded-xl border border-[#DFD3C2]">
              <span className="text-[#8C4A32] font-bold block mb-1">SUPABASE_URL</span>
              <span className="text-[#5A4F44]">https://xyzcompany.supabase.co</span>
            </div>
            <div className="bg-[#EFE5D5]/60 p-3 rounded-xl border border-[#DFD3C2]">
              <span className="text-[#8C4A32] font-bold block mb-1">SUPABASE_ANON_KEY</span>
              <span className="text-[#5A4F44]">eyJhbGciOiJIUzI1NiIsInR5cCI...</span>
            </div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
              <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৪</span>
              <h2>SQL স্কিমা রান করুন (One-Click Copy)</h2>
            </div>
            <button
              onClick={() => copyToClipboard(sqlSchemaScript, 'SQL Schema')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8C4A32] text-white text-xs hover:bg-[#723925] transition-colors"
            >
              {copiedKey === 'SQL Schema' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'SQL Schema' ? 'কপি হয়েছে' : 'SQL স্ক্রিপ্ট কপি করুন'}</span>
            </button>
          </div>
          <p>
            সুপাবেজ ড্যাশবোর্ডের বামপাশের <strong>SQL Editor</strong> মেনুতে যান। <em>New query</em> বাটনে ক্লিক করে নিচের স্ক্রিপ্টটি পেস্ট করে <strong>Run</strong> করুন:
          </p>
          <div className="relative">
            <pre className="bg-[#2C2621] text-[#E2DDD5] p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-64 leading-relaxed">
              {sqlSchemaScript}
            </pre>
          </div>
        </section>

        {/* Step 5 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৫</span>
            <h2>পরিবেশ চলক (.env) সংরক্ষণ</h2>
          </div>
          <p>আপনার প্রোজেক্টে নিচের পরিবেশ চলকগুলো প্রদান করুন:</p>
          <div className="bg-[#2C2621] text-[#E2DDD5] p-4 rounded-xl font-mono text-xs space-y-1.5 overflow-x-auto">
            <div className="text-emerald-400"># Supabase Database URL (Drizzle ORM & Database Pool)</div>
            <div>SUPABASE_DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"</div>
            <div className="text-emerald-400 pt-2"># Supabase API Credentials</div>
            <div>SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"</div>
            <div>SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</div>
            <div>VITE_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"</div>
            <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</div>
          </div>
        </section>

        {/* Step 6 */}
        <section className="bg-[#FAF7F2] p-6 rounded-2xl border border-[#DFD3C2] space-y-3 shadow-sm">
          <div className="flex items-center space-x-2.5 text-[#8C4A32] font-bold text-base">
            <span className="w-6 h-6 rounded-full bg-[#EFE5D5] flex items-center justify-center text-xs">৬</span>
            <h2>সংযোগ যাচাই ও পরিচালনা</h2>
          </div>
          <p>
            সার্ভার চালু হওয়ার পর <code>/api/supabase-status</code> কল করে অথবা ড্যাশবোর্ডের সংযোগ ব্যাজ দেখে সংযোগ নিশ্চিত হতে পারেন।
          </p>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>জিরো-কনফিগারেশন লোকাল সিংক সক্রিয়</span>
            </div>
            <p>
              সুপাবেজ সংযোগ দেওয়ার আগ পর্যন্ত বা সংযোগ চলাকালীন সমস্ত সাহিত্য তাৎক্ষণিকভাবে সংরক্ষিত ও প্রদর্শিত হয়। ফলে ডেটা হারানোর কোনো সম্ভাবনা নেই।
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
