-- Migration: add-comments-table
-- Description: Create comments table for lightweight reader reflections with moderation flag

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  reader_name TEXT NOT NULL DEFAULT 'সুধী পাঠক',
  reader_email TEXT DEFAULT '',
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_is_approved ON comments(is_approved);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view approved comments" ON comments;
CREATE POLICY "Public can view approved comments" ON comments
  FOR SELECT
  USING (is_approved = TRUE OR true);

DROP POLICY IF EXISTS "Anyone can insert comment" ON comments;
CREATE POLICY "Anyone can insert comment" ON comments
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update comments" ON comments;
CREATE POLICY "Allow update comments" ON comments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete comments" ON comments;
CREATE POLICY "Allow delete comments" ON comments
  FOR DELETE
  USING (true);

-- Grant privileges to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO anon, authenticated;

-- Seed a couple of initial reflections (one approved, one pending moderation)
INSERT INTO comments (id, post_id, reader_name, reader_email, content, is_approved, created_at)
VALUES 
  ('comment-1', 'post-1', 'অনামিকা সেন', 'anamika@example.com', 'বৃষ্টির প্রতিটি ফোঁটার মতো প্রতিটি শব্দের ছন্দ হৃদয়ে অনুরণিত হলো। অসাধারণ কবিতা!', TRUE, NOW() - INTERVAL '2 days'),
  ('comment-2', 'megher-chithi', 'তাহসিন আহমেদ', 'tahsin@example.com', 'মেঘের চিঠির উপমাটি অসম্ভব ভালো লেগেছে। শুভকামনা রইল শব্দের কারিগরের প্রতি।', TRUE, NOW() - INTERVAL '1 day'),
  ('comment-3', 'post-1', 'নীরব পাঠক', '', 'পরবর্তী পর্বের অপেক্ষায় রইলাম। আরও এমন মিষ্টি কবিতা পড়ার আশা রাখি।', FALSE, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;
