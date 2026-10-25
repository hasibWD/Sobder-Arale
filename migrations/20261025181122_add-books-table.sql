-- Migration: add-books-table
-- Description: Create books table for PDF books and literary manuscripts with RLS and public access

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  author TEXT NOT NULL DEFAULT 'শব্দের কারিগর',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'উপন্যাস',
  cover_image_url TEXT DEFAULT '',
  cover_image_key TEXT DEFAULT '',
  pdf_url TEXT NOT NULL,
  pdf_key TEXT DEFAULT '',
  file_size_bytes BIGINT DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  publication_year TEXT DEFAULT '২০২৬',
  status TEXT NOT NULL DEFAULT 'published',
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);

-- Enable RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view published books" ON books;
CREATE POLICY "Public can view published books" ON books
  FOR SELECT
  USING (status = 'published' OR true);

DROP POLICY IF EXISTS "Allow insert books" ON books;
CREATE POLICY "Allow insert books" ON books
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update books" ON books;
CREATE POLICY "Allow update books" ON books
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete books" ON books;
CREATE POLICY "Allow delete books" ON books
  FOR DELETE
  USING (true);

-- Permissions for data API
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON books TO anon, authenticated;

-- Seed initial literary book
INSERT INTO books (
  id,
  title,
  slug,
  author,
  description,
  category,
  cover_image_url,
  pdf_url,
  file_size_bytes,
  page_count,
  publication_year,
  status,
  download_count,
  created_at,
  updated_at,
  published_at
) VALUES (
  'book-1',
  'শব্দের আড়ালে - নির্বাচিত সাহিত্য সংকলন',
  'shobder-arale-nirbachito-shangkolon',
  'শব্দের কারিগর',
  'একাকীত্ব, প্রকৃতি ও মানবমনের গভীর অনুভূতির নির্যাস নিয়ে রচিত কবিতা, ছোটগল্প ও ভাবনার সংকলিত ই-বুক সংস্করণ।',
  'কাব্য ও গদ্য',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
  'https://rymjr9pc.ap-southeast.insforge.app/api/storage/buckets/books/objects/shobder-arale-sample.pdf',
  2485760,
  48,
  '২০২৬',
  'published',
  128,
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
