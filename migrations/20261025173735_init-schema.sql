-- ==============================================================================
-- শব্দের আড়ালে (Shobder Arale) - InsForge PostgreSQL Database Schema
-- ==============================================================================

-- 1. Posts Table (কবিতা, গল্প, প্রবন্ধ, অনুভূতির খাতা)
CREATE TABLE IF NOT EXISTS public.posts (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  type VARCHAR(64) NOT NULL DEFAULT 'poem', -- 'poem', 'story', 'essay', 'thought'
  excerpt TEXT DEFAULT '',
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(128) DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'published', 'draft'
  reading_time_minutes INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Novels Table (উপন্যাস)
CREATE TABLE IF NOT EXISTS public.novels (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  synopsis TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'completed'
  chapter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chapters Table (উপন্যাসের প্রতিটি অধ্যায়)
CREATE TABLE IF NOT EXISTS public.chapters (
  id VARCHAR(128) PRIMARY KEY,
  novel_id VARCHAR(128) NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  chapter_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'published', -- 'published', 'draft'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Author Profile Table (লেখক ও স্বত্বাধিকারীর বিস্তারিত তথ্য)
CREATE TABLE IF NOT EXISTS public.author_profile (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'main',
  display_name VARCHAR(256) NOT NULL DEFAULT 'শব্দের কারিগর',
  bio TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  philosophy TEXT DEFAULT '',
  email VARCHAR(256) DEFAULT '',
  location VARCHAR(256) DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(256) UNIQUE,
  role VARCHAR(64) DEFAULT 'reader',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON public.posts(type, status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_novels_slug ON public.novels(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON public.chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_num ON public.chapters(novel_id, chapter_number);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grants for runtime roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- RLS Policies
CREATE POLICY "Allow public read access for posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Allow public write access for posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access for novels" ON public.novels FOR SELECT USING (true);
CREATE POLICY "Allow public write access for novels" ON public.novels FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access for chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Allow public write access for chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access for author" ON public.author_profile FOR SELECT USING (true);
CREATE POLICY "Allow public write access for author" ON public.author_profile FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read access for users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public write access for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Initial Seed Data
INSERT INTO public.author_profile (id, display_name, bio, photo_url, philosophy, email, location, social_links)
VALUES (
  'main',
  'শব্দের কারিগর',
  'শব্দের ভেতরের নৈঃশব্দ্য খুঁজি। জীবনের না-বলা কথা, মধ্যরাতের নীরবতা আর স্মৃতির ধূলিকণা নিয়ে আমার সাহিত্যের কারবার। এই নির্জন সাহিত্য আঙিনায় আপনাকে স্বাগতম।',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600',
  'সাহিত্য কোনো প্রদর্শন নয়, সাহিত্য হলো হৃদয়ের নীরব আত্মকথন।',
  'hasibulhasan2087@gmail.com',
  'ঢাকা, বাংলাদেশ',
  '{"facebook": "https://facebook.com", "instagram": "https://instagram.com"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.posts (id, title, slug, type, excerpt, body, tags, category, cover_image_url, status, reading_time_minutes, published_at)
VALUES 
(
  'post-1',
  'মেঘের চিঠি',
  'megher-chithi',
  'poem',
  'আকাশের বুকে ভেসে চলা এক টুকরো মেঘ, হয়তো কোনো দূর প্রবাসের না-বলা কথা বয়ে নিয়ে যায়...',
  E'আকাশের বুক চিরে ভেসে যায় মেঘ,\nকার যেন দীর্ঘশ্বাস, কার যেন ব্যাকুল আবেগ।\nবৃষ্টি হয়ে ঝরে পড়ে তৃষ্ণার্ত ধরণীর গায়,\nএকটি অচেনা চিঠি যেন নিঃশব্দে হারায়।\n\nজানালার ওপারে ভেজা কদম ফুটে থাকে,\nকোনো এক স্মৃতি এসে আলতো করে ডাকে।\nশব্দের আড়ালে জমে থাকা যত কথা,\nআজ তারা পেয়েছে মুক্তি, ভুলেছে নীরবতা।',
  ARRAY['বৃষ্টি', 'মেঘ', 'স্মৃতি', 'প্রেম'],
  'কবিতা',
  'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=800',
  'published',
  1,
  NOW() - INTERVAL '3 days'
),
(
  'post-2',
  'অচেনা স্টেশনের কফি',
  'ochena-stationer-coffee',
  'story',
  'কুয়াশায় ঢাকা এক মধ্যরাতের রেলওয়ে স্টেশন, দুটি মানুষ আর মাটির ভাঁড়ে ধোঁয়া ওঠা কফি...',
  E'ট্রেনটা ছাড়তে তখনো প্রায় আধঘণ্টা বাকি। ঘড়ির কাঁটায় তখন রাত একটা বেজে পনেরো মিনিট। শীতের ঘন কুয়াশায় প্ল্যাটফর্মের সোডিয়াম বাতিগুলোর আলো ঠিকমতো পৌঁছাচ্ছিল না।\n\nছোট চায়ের স্টলটার সামনে দাঁড়িয়েছিলেন একজন প্রৌঢ় ভদ্রলোক। চোখে ভারী ফ্রেমের চশমা, পরনে পুরনো ছাইরঙা ওভারকোট। কাঠের বেঞ্চে বসে থাকা রুদ্রর দিকে তিনি মাটির একটি ভাঁড় বাড়িয়ে দিয়ে বললেন, "এই শীতে চা নয়, এদের তৈরি গরম কফিটা বেশ ভালো। খেয়ে দেখতে পারো।"\n\nরুদ্র কিছুটা ইতস্তত করে ভাঁড়টি হাতে নিল। উষ্ণতার এক মনোরম পরশ তার আঙুলগুলোকে ছুঁয়ে গেল। কফিতে একটা মৃদু চুমুক দিয়ে সে জিজ্ঞেস করল, "আপনি কি এই শহরেই থাকেন?"\n\nভদ্রলোক একটু ম্লান হাসলেন। বললেন, "মানুষ কি কোনো একটি নির্দিষ্ট শহরে থাকতে পারে? আমরা তো আসলে ট্রেনের মতোই কেবল এক স্টেশন থেকে অন্য স্টেশনে ছুটে চলি। কোথাও থামি, আবার ছেড়ে যাই।"\n\nকথাটা রুদ্রর বুকের ভেতরে গিয়ে বিঁধল। জীবনের এক পরম সত্য যেন ওই ছোট্ট রেলওয়ে স্টেশনের ঠাণ্ডা বাতাসে এক মুহূর্তের জন্য মূর্ত হয়ে উঠেছিল। কিছুক্ষণের নীরবতার পর দূরের লাইনে ট্রেনের হুইসেলের শব্দ শোনা গেল।',
  ARRAY['জীবনবোধ', 'গল্প', 'স্মৃতি', 'রাত্রি'],
  'জীবনমুখী',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
  'published',
  3,
  NOW() - INTERVAL '5 days'
),
(
  'post-3',
  'শব্দের নিঃশব্দতা',
  'shobder-nishobdota',
  'thought',
  'সব অনুভূতি প্রকাশ করার জন্য শব্দের প্রয়োজন হয় না; নীরবতাই কখনো কখনো সবচেয়ে স্পষ্ট ভাষা...',
  E'আমরা সারাজীবন কথা বলে যাই। ভাব বিনিময়ের মাধ্যম হিসেবে শব্দকে এত বেশি ব্যবহার করি যে কখনো কখনো শব্দের ভারে মূল অনুভূতিটাই চাপা পড়ে যায়।\n\nঅথচ খুব গভীর কোনো মুহূর্তে, যখন দুটো চোখ এক হয় কিংবা যখন নিঝুম রাতে একা বসে থাকতে থাকতে মনের ভেতর কোনো বিষাদ জেগে ওঠে, তখন কোনো শব্দ পাওয়া যায় না। সেই স্তব্ধতাই কি সবচেয়ে বড় কবিতা নয়?\n\nমানুষের উচিত মাঝে মাঝে শব্দের খোলস ছেড়ে নীরবতার মুখোমুখি হওয়া। কারণ শব্দের আড়ালেই জন্ম নেয় আসল উপলব্ধি।',
  ARRAY['দর্শন', 'চিন্তা', 'নীরবতা'],
  'অনুভূতির খাতা',
  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=800',
  'published',
  2,
  NOW() - INTERVAL '7 days'
),
(
  'post-4',
  'রবীন্দ্রনাথ ও বর্ষার সুর',
  'rabindranath-o-borshar-shur',
  'essay',
  'বাঙালির বর্ষা রবীন্দ্রনাথ ছাড়া অসম্পূর্ণ। আষাঢ়ের ঘনঘটায় কবিগুরুর সুর কীভাবে আমাদের অস্তিত্ব ছুঁয়ে যায়...',
  E'বর্ষা ঋতু কেবল প্রকৃতির রূপান্তর নয়, বাঙালির ভাবজগতের এক অনন্য স্ফুরণ। আর এই ঋতুর রূপকে বাংলা সাহিত্যের রন্ধ্রে রন্ধ্রে অমর করে রেখেছেন রবীন্দ্রনাথ ঠাকুর।\n\n"নীল নবঘনে আষাঢ়গগনে তিল ঠাঁই আর নাহি রে"—এই পঙক্তি উচ্চারিত হওয়া মাত্রই আমাদের দৃষ্টিপটে ভেসে ওঠে কালো মেঘের ঘনঘটা, ঝমঝম বৃষ্টির সুর। রবীন্দ্রনাথ বর্ষাকে দেখেছেন বিরহের প্রতীক হিসেবে, মিলনের ব্যাকুলতা হিসেবে, আবার পরম শান্তির দূত হিসেবেও।\n\nআমাদের আধুনিক যান্ত্রিক জীবনেও যখন বৃষ্টি নামে, তখন অজান্তেই মন গেয়ে ওঠে রবীন্দ্রসঙ্গীত। এ সুর শুধু গানের নয়, আমাদের ঐতিহ্যের এবং আত্মার সুর।',
  ARRAY['রবীন্দ্রনাথ', 'বর্ষা', 'প্রবন্ধ', 'সাহিত্য'],
  'সাহিত্য প্রবন্ধ',
  'https://images.unsplash.com/photo-1428592953211-077101b2021b?auto=format&fit=crop&q=80&w=800',
  'published',
  4,
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.novels (id, title, slug, synopsis, cover_image_url, status, chapter_count)
VALUES (
  'novel-1',
  'কুয়াশার ওপারে নদী',
  'kuyashar-opare-nodi',
  'একটি নিভৃত নদীমাতৃক জনপদ, অতীত স্মৃতির টানাপোড়েন এবং আত্মসন্ধানের এক দীর্ঘ আবেগঘন উপন্যাস। এক যুবকের ফিরে আসা তার শৈশবের ঠিকানায়, যেখানে নদী শুধু বয়ে যায় না, বহু গোপন কথা বুকে চেপে রাখে।',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
  'ongoing',
  2
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.chapters (id, novel_id, title, chapter_number, body, status, published_at)
VALUES 
(
  'chap-1',
  'novel-1',
  'ফিরে আসার গান',
  1,
  E'স্টিমারটা যখন ঘাটে ভিড়ল, তখন ভোরের কুয়াশা বেশ ঘন ছিল। নদীর বুকে হালকা ঢেউয়ের দোলা। অনেক বছর পর এই চেনা গন্ধটা নাকে এল—ভিজে মাটির গন্ধ, শ্যাওলা আর নদীর নিজস্ব এক অদ্ভুত মিষ্টি সুবাস।\n\nশৈশবের ফেলে যাওয়া দিনগুলো যেন ঘাটের কাঠের পাটাতনে বসে অপেক্ষা করছিল। ব্যাগটা কাঁধে ঝুলিয়ে অর্ঘ্য পা বাড়াল মেঠো পথটার দিকে। সামনে তার পুরোনো বাড়ি, যেখানে ফেলে এসেছে তার কিশোরবেলার প্রথম প্রেম আর বাবার রেখে যাওয়া পুরনো ডায়রিটা।\n\nপাখির ডাকে সকালটা ধীরে ধীরে উজ্জ্বল হয়ে উঠছিল। দূরে বটগাছের নিচে দাঁড়িয়ে থাকা অচেনা মুখগুলোর মাঝে সে কি কাউকে খুঁজছিল?',
  'published',
  NOW() - INTERVAL '12 days'
),
(
  'chap-2',
  'novel-1',
  'পুরনো সিন্দুক ও একটি চিঠি',
  2,
  E'চিলেকোঠার ঘরটাতে অনেকদিনের ধুলো জমেছিল। জানালার শার্সি দিয়ে এক চিলতে রোদ এসে পড়েছে ঘরের কোণে রাখা ভারী কাঠের সিন্দুকটার ওপরে।\n\nসিন্দুকটা খুলতেই একটা ক্যাঁচক্যাঁচ শব্দ হলো। ভেতরে মরচে পড়া কিছু তামার মুদ্রা, পুরনো ঘড়ি আর এক তাড়া হলুদ হয়ে যাওয়া কাগজ। অর্ঘ্যের চোখ আটকে গেল নীল ফিতে দিয়ে বাঁধা একটি ছোট খামের ওপর। খামের ওপরে লেখা—"অর্ঘ্যের জন্য, যখন সে সত্য জানার মতো পরিণত হবে।"\n\nহাত কাঁপছিল তার। বাবার হাতের লেখা চিনতে এক মুহূর্তও ভুল হয়নি। কিন্তু কী সেই সত্য যা বাবা জীবিত অবস্থায় কোনোদিন বলে যেতে পারেননি?',
  'published',
  NOW() - INTERVAL '8 days'
)
ON CONFLICT (id) DO NOTHING;
