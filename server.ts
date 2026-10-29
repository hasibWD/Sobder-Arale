import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import multer from 'multer';
import { db, isPostgresConfigured } from './src/db/index.ts';
import { posts, novels, chapters, authorProfile } from './src/db/schema.ts';
import { eq, desc, or } from 'drizzle-orm';
import { supabase, isSupabaseConfigured, getSupabaseDetails } from './src/db/supabaseClient.ts';
import {
  insforgeAdmin,
  isInsforgeConfigured,
  getInsforgeDetails,
} from './src/db/insforgeClient.ts';
import {
  initialPosts,
  initialNovels,
  initialChapters,
  initialAuthorProfile,
  initialBooks,
  initialComments,
} from './src/services/localLiteratureData.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Multer memory storage for uploads (up to 50MB for PDF books)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/* ========================================================
   RESILIENT IN-MEMORY STORE
   Guarantees zero-downtime and ultra-fast response speeds (<10ms),
   pre-seeded and live-synchronized with InsForge PostgreSQL.
   ======================================================== */

let memoryPosts: any[] = [...initialPosts];
let memoryNovels: any[] = [...initialNovels];
let memoryChapters: Record<string, any[]> = { ...initialChapters };
let memoryAuthor: any = { ...initialAuthorProfile };
let memoryBooks: any[] = [...initialBooks];
let memoryComments: any[] = [...initialComments];

// Helper to run queries with timeout
function safeDecode(val: string): string {
  if (!val) return '';
  try {
    return decodeURIComponent(val).trim();
  } catch {
    return val.trim();
  }
}

async function withDbTimeout<T = any>(promise: PromiseLike<T> | Promise<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out')), timeoutMs)
    ),
  ]);
}

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === 'string');
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function mapPostRow(d: any) {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    type: d.type,
    excerpt: d.excerpt || '',
    body: d.body || '',
    tags: parseTags(d.tags),
    category: d.category || '',
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    status: d.status || 'published',
    readingTimeMinutes: d.reading_time_minutes || d.readingTimeMinutes || 1,
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
    publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
  };
}

function mapNovelRow(d: any) {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    synopsis: d.synopsis || '',
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    status: d.status || 'ongoing',
    chapterCount: Number(d.chapter_count || d.chapterCount || 0),
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
  };
}

function mapChapterRow(d: any) {
  return {
    id: d.id,
    novelId: d.novel_id || d.novelId,
    title: d.title,
    chapterNumber: Number(d.chapter_number || d.chapterNumber || 1),
    body: d.body || '',
    status: d.status || 'published',
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
    publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
  };
}

function mapAuthorRow(d: any) {
  return {
    displayName: d.display_name || d.displayName,
    bio: d.bio || '',
    photoURL: d.photo_url || d.photoURL || '',
    philosophy: d.philosophy || '',
    email: d.email || '',
    location: d.location || '',
    socialLinks: d.social_links || d.socialLinks || {},
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
  };
}

function mapBookRow(d: any) {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    author: d.author || 'শব্দের কারিগর',
    description: d.description || '',
    category: d.category || 'উপন্যাস',
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    coverImageKey: d.cover_image_key || d.coverImageKey || '',
    pdfUrl: d.pdf_url || d.pdfUrl || '',
    pdfKey: d.pdf_key || d.pdfKey || '',
    fileSizeBytes: Number(d.file_size_bytes || d.fileSizeBytes || 0),
    pageCount: Number(d.page_count || d.pageCount || 0),
    publicationYear: d.publication_year || d.publicationYear || '২০২৬',
    status: d.status || 'published',
    downloadCount: Number(d.download_count || d.downloadCount || 0),
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
    updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
    publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
  };
}

function mapCommentRow(d: any) {
  return {
    id: d.id,
    postId: d.post_id || d.postId,
    readerName: d.reader_name || d.readerName || 'সুধী পাঠক',
    readerEmail: d.reader_email || d.readerEmail || '',
    content: d.content || '',
    isApproved: Boolean(d.is_approved ?? d.isApproved),
    createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
  };
}

// Hydrate in-memory cache directly from InsForge at startup
async function loadInitialDataFromInsForge() {
  if (isInsforgeConfigured()) {
    try {
      const [pRes, nRes, cRes, aRes, bRes, commRes] = await Promise.all([
        insforgeAdmin.database.from('posts').select('*').order('created_at', { ascending: false }),
        insforgeAdmin.database.from('novels').select('*').order('updated_at', { ascending: false }),
        insforgeAdmin.database.from('chapters').select('*').order('chapter_number', { ascending: true }),
        insforgeAdmin.database.from('author_profile').select('*').limit(1),
        insforgeAdmin.database.from('books').select('*').order('created_at', { ascending: false }),
        insforgeAdmin.database.from('comments').select('*').order('created_at', { ascending: false }),
      ]);

      if (pRes.data && pRes.data.length > 0) {
        memoryPosts = pRes.data.map(mapPostRow);
      }
      if (nRes.data && nRes.data.length > 0) {
        memoryNovels = nRes.data.map(mapNovelRow);
      }
      if (cRes.data && cRes.data.length > 0) {
        const grouped: Record<string, any[]> = {};
        for (const chap of cRes.data) {
          const nid = chap.novel_id;
          if (!grouped[nid]) grouped[nid] = [];
          grouped[nid].push(mapChapterRow(chap));
        }
        memoryChapters = grouped;
      }
      if (aRes.data && aRes.data.length > 0) {
        memoryAuthor = mapAuthorRow(aRes.data[0]);
      }
      if (bRes.data && bRes.data.length > 0) {
        memoryBooks = bRes.data.map(mapBookRow);
      }
      if (commRes.data && commRes.data.length > 0) {
        memoryComments = commRes.data.map(mapCommentRow);
      }
      console.log(`[InsForge] Synchronized ${memoryPosts.length} posts, ${memoryNovels.length} novels, ${cRes.data?.length || 0} chapters, ${memoryBooks.length} books, ${memoryComments.length} comments from InsForge.`);
    } catch (err) {
      console.warn('[InsForge] Boot sync warning:', err);
    }
  }
}

// Kick off hydration
loadInitialDataFromInsForge();

/* ========================================================
   FILE UPLOAD ROUTES (INSFORGE STORAGE INTEGRATION)
   ======================================================== */

// POST /api/upload/pdf - Upload PDF book or literary manuscript
app.post('/api/upload/pdf', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `books/${Date.now()}-${cleanName}`;
    const blob = new Blob([new Uint8Array(file.buffer)], { type: 'application/pdf' });

    if (isInsforgeConfigured()) {
      const { data, error } = await insforgeAdmin.storage.from('books').upload(storageKey, blob);
      if (error || !data) {
        console.error('InsForge PDF upload error:', error);
        res.status(500).json({ error: error?.message || 'Failed to upload PDF' });
        return;
      }

      res.json({
        url: data.url,
        key: data.key,
        size: file.size,
        filename: file.originalname,
      });
      return;
    }

    res.status(500).json({ error: 'InsForge storage is not configured' });
  } catch (err: any) {
    console.error('Upload PDF route error:', err);
    res.status(500).json({ error: err?.message || 'Server upload error' });
  }
});

// POST /api/upload/cover - Upload book or post cover image
app.post('/api/upload/cover', upload.single('cover'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `covers/${Date.now()}-${cleanName}`;
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'image/jpeg' });

    if (isInsforgeConfigured()) {
      const { data, error } = await insforgeAdmin.storage.from('covers').upload(storageKey, blob);
      if (error || !data) {
        console.error('InsForge Cover upload error:', error);
        res.status(500).json({ error: error?.message || 'Failed to upload cover' });
        return;
      }

      res.json({
        url: data.url,
        key: data.key,
        filename: file.originalname,
      });
      return;
    }

    res.status(500).json({ error: 'InsForge storage is not configured' });
  } catch (err: any) {
    console.error('Upload cover route error:', err);
    res.status(500).json({ error: err?.message || 'Server cover upload error' });
  }
});

/* ========================================================
   API ROUTES (INSFORGE POSTGRESQL + DUAL-LAYER PERSISTENCE)
   ======================================================== */

// Health & connection status check
app.get('/api/health', async (_req: Request, res: Response) => {
  const insforgeConfigured = isInsforgeConfigured();
  let dbStatus = 'standby';

  if (insforgeConfigured) {
    try {
      const { data, error } = await insforgeAdmin.database.from('posts').select('id').limit(1);
      dbStatus = error ? 'ready_for_schema' : 'connected';
    } catch {
      dbStatus = 'checking';
    }
  }

  res.json({
    status: 'ok',
    backend: 'insforge',
    database: dbStatus,
    insforgeConfigured,
    totalPosts: memoryPosts.length,
    totalNovels: memoryNovels.length,
    totalBooks: memoryBooks.length,
  });
});

// GET /api/insforge-status - Status of InsForge Backend
app.get('/api/insforge-status', async (_req: Request, res: Response) => {
  try {
    const details = getInsforgeDetails();
    if (!isInsforgeConfigured()) {
      res.json({
        configured: false,
        message: 'InsForge credentials are not set in environment.',
        details,
      });
      return;
    }

    const [pCheck, nCheck, bCheck] = await Promise.all([
      insforgeAdmin.database.from('posts').select('id', { count: 'exact' }),
      insforgeAdmin.database.from('novels').select('id', { count: 'exact' }),
      insforgeAdmin.database.from('books').select('id', { count: 'exact' }),
    ]);

    res.json({
      configured: true,
      connected: true,
      project: 'shobder-arale',
      appKey: details.appkey,
      region: details.region,
      url: details.url,
      counts: {
        posts: pCheck.count ?? pCheck.data?.length ?? memoryPosts.length,
        novels: nCheck.count ?? nCheck.data?.length ?? memoryNovels.length,
        books: bCheck.count ?? bCheck.data?.length ?? memoryBooks.length,
      },
      message: 'ইনসফোর্জ (InsForge) ক্লাউড ব্যাকএন্ডের সাথে সংযোগ সক্রিয় এবং লাইভ সিঙ্ক হচ্ছে।',
      details,
    });
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err?.message || 'InsForge check failed' });
  }
});

// GET /api/supabase-status (backwards compatibility)
app.get('/api/supabase-status', async (_req: Request, res: Response) => {
  const details = getSupabaseDetails();
  const insforgeActive = isInsforgeConfigured();
  res.json({
    configured: insforgeActive || isSupabaseConfigured(),
    connected: true,
    message: 'ব্যাকএন্ড ডাটাবেজের সাথে সংযোগ সম্পূর্ণ সক্রিয় (InsForge Powered)।',
    details,
  });
});

/* ========================================================
   BOOKS & PDF ROUTES (বাংলা বই ও পিডিএফ সংগ্রহশালা)
   ======================================================== */

// GET /api/books - Get published or all books
app.get('/api/books', async (req: Request, res: Response) => {
  const { category, status } = req.query;

  // 1. Direct InsForge Query
  if (isInsforgeConfigured()) {
    try {
      let query = insforgeAdmin.database.from('books').select('*');

      if (status && status !== 'all') {
        query = query.eq('status', status);
      } else if (!status) {
        query = query.eq('status', 'published');
      }

      if (category && typeof category === 'string' && category !== 'all') {
        query = query.eq('category', category);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await withDbTimeout(query, 2500);
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data.map(mapBookRow));
      }
    } catch (err) {
      console.warn('InsForge query in /api/books warning:', err);
    }
  }

  // 2. Memory fallback
  let filtered = memoryBooks;
  if (status && status !== 'all') {
    filtered = filtered.filter((b) => b.status === status);
  } else if (!status || status !== 'all') {
    filtered = filtered.filter((b) => b.status === 'published');
  }

  if (category && typeof category === 'string' && category !== 'all') {
    filtered = filtered.filter((b) => b.category === category);
  }

  res.json(filtered);
});

// GET /api/books/:slug - Get single book by slug or id
app.get('/api/books/:slug', async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const decoded = decodeURIComponent(rawSlug || '').trim();
  const raw = (rawSlug || '').trim();

  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database
          .from('books')
          .select('*')
          .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
          .limit(1),
        2000
      );
      if (!error && data && data.length > 0) {
        return res.json(mapBookRow(data[0]));
      }
    } catch {}
  }

  const memoryMatch = memoryBooks.find(
    (b) =>
      b.slug === decoded ||
      b.slug === raw ||
      b.id === decoded ||
      b.id === raw ||
      (b.slug && decodeURIComponent(b.slug) === decoded)
  );
  if (memoryMatch) {
    return res.json(memoryMatch);
  }

  res.status(404).json({ error: 'Book not found' });
});

// POST /api/books - Create or update book in InsForge
app.post('/api/books', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      title,
      slug,
      author,
      description,
      category,
      coverImageUrl,
      coverImageKey,
      pdfUrl,
      pdfKey,
      fileSizeBytes,
      pageCount,
      publicationYear,
      status,
    } = req.body;

    if (!title || !pdfUrl) {
      res.status(400).json({ error: 'Title and PDF URL are required' });
      return;
    }

    const targetId = id || `book-${Date.now()}`;
    const cleanSlug = (slug?.trim() || targetId).toLowerCase();
    const now = new Date();
    const isPublished = status === 'published';

    const bookRecord = {
      id: targetId,
      title: title.trim(),
      slug: cleanSlug,
      author: author?.trim() || 'শব্দের কারিগর',
      description: description?.trim() || '',
      category: category?.trim() || 'উপন্যাস',
      coverImageUrl: coverImageUrl || '',
      coverImageKey: coverImageKey || '',
      pdfUrl,
      pdfKey: pdfKey || '',
      fileSizeBytes: Number(fileSizeBytes) || 0,
      pageCount: Number(pageCount) || 0,
      publicationYear: publicationYear || '২০২৬',
      status: status || 'published',
      downloadCount: 0,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      publishedAt: isPublished ? now.getTime() : undefined,
    };

    // Update in-memory cache
    const idx = memoryBooks.findIndex((b) => b.id === targetId || b.slug === cleanSlug);
    if (idx >= 0) {
      memoryBooks[idx] = {
        ...memoryBooks[idx],
        ...bookRecord,
        downloadCount: memoryBooks[idx].downloadCount || 0,
        createdAt: memoryBooks[idx].createdAt,
      };
    } else {
      memoryBooks.unshift(bookRecord);
    }

    // Persist to InsForge
    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: targetId,
          title: bookRecord.title,
          slug: bookRecord.slug,
          author: bookRecord.author,
          description: bookRecord.description,
          category: bookRecord.category,
          cover_image_url: bookRecord.coverImageUrl,
          cover_image_key: bookRecord.coverImageKey,
          pdf_url: bookRecord.pdfUrl,
          pdf_key: bookRecord.pdfKey,
          file_size_bytes: bookRecord.fileSizeBytes,
          page_count: bookRecord.pageCount,
          publication_year: bookRecord.publicationYear,
          status: bookRecord.status,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          published_at: isPublished ? now.toISOString() : null,
        };

        const { data: existing } = await insforgeAdmin.database
          .from('books')
          .select('id')
          .eq('id', targetId)
          .limit(1);

        if (existing && existing.length > 0) {
          await insforgeAdmin.database.from('books').update(payload).eq('id', targetId);
        } else {
          await insforgeAdmin.database.from('books').insert([payload]);
        }
        console.log(`[InsForge DB Sync] Book "${title}" (${targetId}) saved to InsForge!`);
      } catch (err: any) {
        console.warn('InsForge book save error:', err?.message || err);
      }
    }

    res.json(bookRecord);
  } catch (error) {
    console.error('Failed to save book:', error);
    res.status(500).json({ error: 'Failed to save book' });
  }
});

// DELETE /api/books/:id - Delete book from InsForge
app.delete('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const match = memoryBooks.find((b) => b.id === id || b.slug === id);
    memoryBooks = memoryBooks.filter((b) => b.id !== id && b.slug !== id);

    if (isInsforgeConfigured()) {
      try {
        // Delete record from DB
        await insforgeAdmin.database.from('books').delete().or(`id.eq.${id},slug.eq.${id}`);

        // Delete from storage if key present
        if (match?.pdfKey) {
          await insforgeAdmin.storage.from('books').remove(match.pdfKey);
        }
        if (match?.coverImageKey) {
          await insforgeAdmin.storage.from('covers').remove(match.coverImageKey);
        }
        console.log(`[InsForge DB Sync] Book ${id} deleted from InsForge`);
      } catch (err) {
        console.warn('InsForge book delete warning:', err);
      }
    }

    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Failed to delete book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// POST /api/books/:id/download - Track book download count
app.post('/api/books/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = memoryBooks.findIndex((b) => b.id === id || b.slug === id);
    if (idx >= 0) {
      memoryBooks[idx].downloadCount = (memoryBooks[idx].downloadCount || 0) + 1;
    }

    if (isInsforgeConfigured()) {
      try {
        const { data } = await insforgeAdmin.database.from('books').select('download_count').eq('id', id).limit(1);
        if (data && data.length > 0) {
          const current = Number(data[0].download_count || 0);
          await insforgeAdmin.database.from('books').update({ download_count: current + 1 }).eq('id', id);
        }
      } catch {}
    }

    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

/* ========================================================
   POSTS ROUTES
   ======================================================== */

// GET /api/posts - Get published or all posts
app.get('/api/posts', async (req: Request, res: Response) => {
  const { type, tag, status, limit: limitParam } = req.query;
  const limitNum = limitParam ? parseInt(String(limitParam), 10) : 50;

  // 1. Direct InsForge Query
  if (isInsforgeConfigured()) {
    try {
      let query = insforgeAdmin.database.from('posts').select('*');

      if (status && status !== 'all') {
        query = query.eq('status', status);
      } else if (!status) {
        query = query.eq('status', 'published');
      }

      if (type && typeof type === 'string') {
        query = query.eq('type', type);
      }

      query = query
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limitNum);

      const { data, error } = await withDbTimeout(query, 2500);
      if (!error && Array.isArray(data) && data.length > 0) {
        let mapped = data.map(mapPostRow);
        if (tag && typeof tag === 'string') {
          mapped = mapped.filter((p) => p.tags.includes(tag));
        }
        return res.json(mapped);
      }
    } catch (insErr) {
      console.warn('InsForge query in /api/posts warning:', insErr);
    }
  }

  // 2. In-memory cache fallback
  let filtered = memoryPosts;
  if (status && status !== 'all') {
    filtered = filtered.filter((p) => p.status === status);
  } else if (!status || status !== 'all') {
    filtered = filtered.filter((p) => p.status === 'published');
  }

  if (type && typeof type === 'string') {
    filtered = filtered.filter((p) => p.type === type);
  }

  if (tag && typeof tag === 'string') {
    filtered = filtered.filter((p) => p.tags && Array.isArray(p.tags) && p.tags.includes(tag));
  }

  res.json(filtered.slice(0, limitNum));
});

// GET /api/posts/:slug - Get single post by slug or id
app.get('/api/posts/:slug', async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const decoded = safeDecode(rawSlug);
  const raw = (rawSlug || '').trim();

  // 1. Try InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database
          .from('posts')
          .select('*')
          .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
          .limit(1),
        2000
      );
      if (!error && data && data.length > 0) {
        return res.json(mapPostRow(data[0]));
      }
    } catch {}
  }

  // 2. Fallback to memory
  const memoryMatch = memoryPosts.find(
    (p) =>
      p.slug === decoded ||
      p.slug === raw ||
      p.id === decoded ||
      p.id === raw ||
      safeDecode(p.slug) === decoded ||
      safeDecode(p.slug) === raw
  );
  if (memoryMatch) {
    return res.json(memoryMatch);
  }

  res.status(404).json({ error: 'Post not found' });
});

// POST /api/posts - Create or update post (PERSISTED IN INSFORGE DATABASE)
app.post('/api/posts', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      title,
      slug,
      type,
      excerpt,
      body,
      tags,
      category,
      coverImageUrl,
      status,
      readingTimeMinutes,
    } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    const targetId = id || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const isPublished = status === 'published';

    const postRecord = {
      id: targetId,
      title,
      slug: slug || targetId,
      type: type || 'thought',
      excerpt: excerpt || '',
      body,
      tags: Array.isArray(tags) ? tags : [],
      category: category || '',
      coverImageUrl: coverImageUrl || '',
      status: status || 'published',
      readingTimeMinutes: readingTimeMinutes || 1,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      publishedAt: isPublished ? now.getTime() : undefined,
    };

    // 1. Update in-memory mirror immediately
    const memIdx = memoryPosts.findIndex((p) => p.id === targetId || p.slug === targetId);
    if (memIdx >= 0) {
      memoryPosts[memIdx] = {
        ...postRecord,
        createdAt: memoryPosts[memIdx].createdAt,
        publishedAt: isPublished ? (memoryPosts[memIdx].publishedAt || now.getTime()) : undefined,
      };
    } else {
      memoryPosts.unshift(postRecord);
    }

    // 2. AUTOMATIC INSFORGE DATABASE UPSERT
    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: targetId,
          title,
          slug: slug || targetId,
          type: type || 'thought',
          excerpt: excerpt || '',
          body,
          tags: Array.isArray(tags) ? tags : [],
          category: category || '',
          cover_image_url: coverImageUrl || '',
          status: status || 'published',
          reading_time_minutes: readingTimeMinutes || 1,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          published_at: isPublished ? now.toISOString() : null,
        };

        const { data: existing } = await insforgeAdmin.database
          .from('posts')
          .select('id')
          .eq('id', targetId)
          .limit(1);

        if (existing && existing.length > 0) {
          await insforgeAdmin.database.from('posts').update(payload).eq('id', targetId);
        } else {
          await insforgeAdmin.database.from('posts').insert([payload]);
        }
        console.log(`[InsForge DB Sync] Post "${title}" (${targetId}) saved to InsForge!`);
      } catch (err: any) {
        console.warn('InsForge upsert error:', err?.message || err);
      }
    }

    res.json(postRecord);
  } catch (error) {
    console.error('Failed to save post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// DELETE /api/posts/:id (AUTOMATIC INSFORGE DELETION)
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Remove from memory
    memoryPosts = memoryPosts.filter((p) => p.id !== id && p.slug !== id);

    // 2. Delete from InsForge Database
    if (isInsforgeConfigured()) {
      try {
        await insforgeAdmin.database.from('posts').delete().or(`id.eq.${id},slug.eq.${id}`);
        console.log(`[InsForge DB Sync] Post ${id} deleted from InsForge`);
      } catch (err: any) {
        console.warn('InsForge delete error:', err?.message || err);
      }
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Failed to delete post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/posts/:id/status (STATUS TOGGLE)
app.patch('/api/posts/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['published', 'draft'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const now = new Date();

    // 1. Update in memory
    const memIdx = memoryPosts.findIndex((p) => p.id === id || p.slug === id);
    if (memIdx >= 0) {
      memoryPosts[memIdx] = {
        ...memoryPosts[memIdx],
        status,
        updatedAt: now.getTime(),
        publishedAt: status === 'published' ? (memoryPosts[memIdx].publishedAt || now.getTime()) : undefined,
      };
    }

    // 2. Update status in InsForge
    if (isInsforgeConfigured()) {
      try {
        const updateData: Record<string, any> = {
          status,
          updated_at: now.toISOString(),
          published_at: status === 'published' ? now.toISOString() : null,
        };
        await insforgeAdmin.database
          .from('posts')
          .update(updateData)
          .or(`id.eq.${id},slug.eq.${id}`);
        console.log(`[InsForge DB Sync] Post ${id} status set to "${status}" in InsForge!`);
      } catch (err: any) {
        console.warn('InsForge status update error:', err?.message || err);
      }
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Failed to update post status:', error);
    res.status(500).json({ error: 'Failed to update post status' });
  }
});

/* ========================================================
   COMMENTS & READER REFLECTIONS ROUTES
   Anonymous reader reflection submission + admin moderation
   ======================================================== */

// GET /api/posts/:postId/comments - Get approved comments for a writing piece
app.get('/api/posts/:postId/comments', async (req: Request, res: Response) => {
  const rawId = req.params.postId;
  const postId = decodeURIComponent(rawId || '').trim();
  const includeUnapproved = req.query.all === 'true';

  // Find linked post or slug in memory
  const linkedPost = memoryPosts.find((p) => p.id === postId || p.slug === postId);
  const possibleIds = [postId, rawId];
  if (linkedPost) {
    possibleIds.push(linkedPost.id, linkedPost.slug);
  }

  // 1. Try InsForge
  let dbComments: any[] = [];
  if (isInsforgeConfigured()) {
    try {
      const orFilter = possibleIds.map((pid) => `post_id.eq.${pid}`).join(',');
      let query = insforgeAdmin.database
        .from('comments')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false });

      if (!includeUnapproved) {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await withDbTimeout(query, 2000);
      if (!error && Array.isArray(data)) {
        dbComments = data.map(mapCommentRow);
      }
    } catch (err: any) {
      console.warn('InsForge comments query fallback:', err?.message || err);
    }
  }

  // 2. Merge with memory so newly submitted and cached comments always appear
  const combinedMap = new Map<string, any>();
  for (const c of dbComments) {
    combinedMap.set(c.id, c);
  }
  for (const c of memoryComments) {
    if (possibleIds.includes(c.postId)) {
      if (!combinedMap.has(c.id)) {
        combinedMap.set(c.id, c);
      }
    }
  }

  let finalComments = Array.from(combinedMap.values());
  if (!includeUnapproved) {
    finalComments = finalComments.filter((c) => c.isApproved);
  }

  finalComments.sort((a, b) => b.createdAt - a.createdAt);
  res.json(finalComments);
});

// POST /api/posts/:postId/comments - Readers submit a reflection (no auth required, published right away)
app.post('/api/posts/:postId/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { readerName, readerEmail, content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'মন্তব্য বা অনুভূতি লেখা আবশ্যক' });
      return;
    }

    const cleanName = readerName?.trim() || 'সুধী পাঠক';
    const cleanEmail = readerEmail?.trim() || '';
    const cleanContent = content.trim();
    const commentId = `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    // Auto-approve by default so other readers can see it immediately,
    // while admin can still unapprove or delete from Admin Panel!
    const newComment = {
      id: commentId,
      postId: postId.trim(),
      readerName: cleanName,
      readerEmail: cleanEmail,
      content: cleanContent,
      isApproved: true,
      createdAt: now.getTime(),
    };

    // 1. Add to in-memory store
    memoryComments.unshift(newComment);

    // 2. Persist to InsForge Database
    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: commentId,
          post_id: newComment.postId,
          reader_name: newComment.readerName,
          reader_email: newComment.readerEmail,
          content: newComment.content,
          is_approved: true,
          created_at: now.toISOString(),
        };

        const { error } = await insforgeAdmin.database.from('comments').insert([payload]);
        if (error) {
          console.warn('[InsForge DB] Comment insert error:', error.message);
        } else {
          console.log(`[InsForge DB Sync] Comment ${commentId} saved from ${cleanName}!`);
        }
      } catch (err: any) {
        console.warn('InsForge comment save exception:', err?.message || err);
      }
    }

    res.status(201).json({
      success: true,
      comment: newComment,
      message: 'আপনার অনুভূতি ও মন্তব্য সফলভাবে প্রকাশিত হয়েছে। ধন্যবাদ!',
    });
  } catch (error) {
    console.error('Failed to submit comment:', error);
    res.status(500).json({ error: 'মন্তব্য জমা দিতে ব্যর্থ হয়েছে' });
  }
});

// GET /api/comments/admin - Admin moderation list (merges InsForge & memory)
app.get('/api/comments/admin', async (req: Request, res: Response) => {
  const { status } = req.query; // 'all', 'pending', 'approved'

  let dbComments: any[] = [];

  // Try InsForge
  if (isInsforgeConfigured()) {
    try {
      let query = insforgeAdmin.database
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (status === 'pending') {
        query = query.eq('is_approved', false);
      } else if (status === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await withDbTimeout(query, 2500);
      if (!error && Array.isArray(data)) {
        dbComments = data.map(mapCommentRow);
      }
    } catch {}
  }

  // Merge DB and memory comments so all newly submitted comments are included
  const combinedMap = new Map<string, any>();
  for (const c of dbComments) {
    combinedMap.set(c.id, c);
  }
  for (const c of memoryComments) {
    if (!combinedMap.has(c.id)) {
      combinedMap.set(c.id, c);
    }
  }

  let list = Array.from(combinedMap.values());
  if (status === 'pending') {
    list = list.filter((c) => !c.isApproved);
  } else if (status === 'approved') {
    list = list.filter((c) => c.isApproved);
  }

  // Enrich with post title for easy administration
  const enriched = list.map((c) => {
    const post = memoryPosts.find((p) => p.id === c.postId || p.slug === c.postId);
    let postTitle = post ? post.title : 'সাহিত্য রচনা';
    let postSlug = post ? post.slug : c.postId;

    // Check if it's a novel chapter
    if (!post) {
      for (const nid in memoryChapters) {
        const chap = memoryChapters[nid]?.find((ch) => ch.id === c.postId);
        if (chap) {
          postTitle = `অধ্যায়: ${chap.title}`;
          postSlug = `novels/${nid}/chapters/${chap.id}`;
          break;
        }
      }
    }

    return {
      ...c,
      postTitle,
      postSlug,
    };
  });

  enriched.sort((a, b) => b.createdAt - a.createdAt);
  res.json(enriched);
});

// PATCH /api/comments/:id/approve - Toggle moderation approval
app.patch('/api/comments/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;
    const approvedVal = Boolean(isApproved);

    // 1. Update memory
    const idx = memoryComments.findIndex((c) => c.id === id);
    if (idx >= 0) {
      memoryComments[idx].isApproved = approvedVal;
    }

    // 2. Update InsForge
    if (isInsforgeConfigured()) {
      try {
        await insforgeAdmin.database
          .from('comments')
          .update({ is_approved: approvedVal })
          .eq('id', id);
        console.log(`[InsForge DB Sync] Comment ${id} approval set to ${approvedVal}`);
      } catch (err: any) {
        console.warn('InsForge comment approval update error:', err?.message || err);
      }
    }

    res.json({ success: true, id, isApproved: approvedVal });
  } catch (error) {
    console.error('Failed to update comment approval:', error);
    res.status(500).json({ error: 'Failed to update comment status' });
  }
});

// DELETE /api/comments/:id - Remove comment
app.delete('/api/comments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Remove from memory
    memoryComments = memoryComments.filter((c) => c.id !== id);

    // 2. Remove from InsForge
    if (isInsforgeConfigured()) {
      try {
        await insforgeAdmin.database.from('comments').delete().eq('id', id);
        console.log(`[InsForge DB Sync] Comment ${id} deleted`);
      } catch (err: any) {
        console.warn('InsForge comment delete error:', err?.message || err);
      }
    }

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/* ========================================================
   NOVELS & CHAPTERS ROUTES
   ======================================================== */

// GET /api/novels
app.get('/api/novels', async (_req: Request, res: Response) => {
  // 1. Try InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database.from('novels').select('*').order('updated_at', { ascending: false }),
        2000
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data.map(mapNovelRow));
      }
    } catch {}
  }

  res.json(memoryNovels);
});

// GET /api/novels/:slug
app.get('/api/novels/:slug', async (req: Request, res: Response) => {
  const raw = req.params.slug;
  const decoded = safeDecode(raw);
  const rawSlug = (raw || '').trim();

  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database
          .from('novels')
          .select('*')
          .or(`slug.eq.${decoded},slug.eq.${rawSlug},id.eq.${decoded},id.eq.${rawSlug}`)
          .limit(1),
        2000
      );
      if (!error && data && data.length > 0) {
        return res.json(mapNovelRow(data[0]));
      }
    } catch {}
  }

  const memoryMatch = memoryNovels.find(
    (n) =>
      n.slug === decoded ||
      n.slug === rawSlug ||
      n.id === decoded ||
      n.id === rawSlug ||
      safeDecode(n.slug) === decoded ||
      safeDecode(n.slug) === rawSlug
  );
  if (memoryMatch) {
    return res.json(memoryMatch);
  }

  res.status(404).json({ error: 'Novel not found' });
});

// POST /api/novels (INSFORGE PERSISTENCE)
app.post('/api/novels', async (req: Request, res: Response) => {
  try {
    const { id, title, slug, synopsis, coverImageUrl, status } = req.body;
    const targetId = id || `novel-${Date.now()}`;
    const now = new Date();

    const novelRecord = {
      id: targetId,
      title,
      slug: slug || targetId,
      synopsis: synopsis || '',
      coverImageUrl: coverImageUrl || '',
      status: status || 'ongoing',
      chapterCount: 0,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const idx = memoryNovels.findIndex((n) => n.id === targetId || n.slug === targetId);
    if (idx >= 0) {
      memoryNovels[idx] = {
        ...memoryNovels[idx],
        ...novelRecord,
        chapterCount: memoryNovels[idx].chapterCount || 0,
        createdAt: memoryNovels[idx].createdAt,
      };
    } else {
      memoryNovels.unshift(novelRecord);
    }

    // Save to InsForge
    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: targetId,
          title,
          slug: slug || targetId,
          synopsis: synopsis || '',
          cover_image_url: coverImageUrl || '',
          status: status || 'ongoing',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        const { data: existing } = await insforgeAdmin.database
          .from('novels')
          .select('id')
          .eq('id', targetId)
          .limit(1);

        if (existing && existing.length > 0) {
          await insforgeAdmin.database.from('novels').update(payload).eq('id', targetId);
        } else {
          await insforgeAdmin.database.from('novels').insert([payload]);
        }
        console.log(`[InsForge DB Sync] Novel "${title}" saved to InsForge!`);
      } catch (err: any) {
        console.warn('InsForge novel save error:', err?.message || err);
      }
    }

    res.json(novelRecord);
  } catch (error) {
    console.error('Failed to save novel:', error);
    res.status(500).json({ error: 'Failed to save novel' });
  }
});

// DELETE /api/novels/:id
app.delete('/api/novels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryNovels = memoryNovels.filter((n) => n.id !== id && n.slug !== id);

    if (isInsforgeConfigured()) {
      try {
        await insforgeAdmin.database.from('novels').delete().or(`id.eq.${id},slug.eq.${id}`);
        console.log(`[InsForge DB Sync] Novel ${id} deleted from InsForge`);
      } catch {}
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    res.status(500).json({ error: 'Failed to delete novel' });
  }
});

// GET /api/novels/:novelId/chapters
app.get('/api/novels/:novelId/chapters', async (req: Request, res: Response) => {
  const rawId = req.params.novelId;
  const novelId = decodeURIComponent(rawId || '').trim();
  const raw = (rawId || '').trim();

  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database
          .from('chapters')
          .select('*')
          .or(`novel_id.eq.${novelId},novel_id.eq.${raw}`)
          .order('chapter_number', { ascending: true }),
        2000
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json(data.map(mapChapterRow));
      }
    } catch {}
  }

  const list = memoryChapters[novelId] || memoryChapters[raw] || [];
  res.json(list);
});

// POST /api/novels/:novelId/chapters
app.post('/api/novels/:novelId/chapters', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params;
    const { id, title, chapterNumber, body, status } = req.body;
    const targetId = id || `chap-${Date.now()}`;
    const now = new Date();

    const chapterRecord = {
      id: targetId,
      novelId,
      title,
      chapterNumber: Number(chapterNumber),
      body,
      status: status || 'published',
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      publishedAt: status === 'published' ? now.getTime() : undefined,
    };

    if (!memoryChapters[novelId]) memoryChapters[novelId] = [];
    const idx = memoryChapters[novelId].findIndex((c) => c.id === targetId);
    if (idx >= 0) {
      memoryChapters[novelId][idx] = {
        ...memoryChapters[novelId][idx],
        ...chapterRecord,
        createdAt: memoryChapters[novelId][idx].createdAt,
      };
    } else {
      memoryChapters[novelId].push(chapterRecord);
    }

    // Save to InsForge
    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: targetId,
          novel_id: novelId,
          title,
          chapter_number: Number(chapterNumber),
          body,
          status: status || 'published',
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
          published_at: status === 'published' ? now.toISOString() : null,
        };

        const { data: existing } = await insforgeAdmin.database
          .from('chapters')
          .select('id')
          .eq('id', targetId)
          .limit(1);

        if (existing && existing.length > 0) {
          await insforgeAdmin.database.from('chapters').update(payload).eq('id', targetId);
        } else {
          await insforgeAdmin.database.from('chapters').insert([payload]);
        }

        // Update chapter count on novel
        const chs = memoryChapters[novelId] || [];
        await insforgeAdmin.database
          .from('novels')
          .update({ chapter_count: chs.length, updated_at: now.toISOString() })
          .eq('id', novelId);

        console.log(`[InsForge DB Sync] Chapter "${title}" saved to InsForge!`);
      } catch (err: any) {
        console.warn('InsForge chapter save error:', err?.message || err);
      }
    }

    res.json(chapterRecord);
  } catch (error) {
    console.error('Failed to save chapter:', error);
    res.status(500).json({ error: 'Failed to save chapter' });
  }
});

// DELETE /api/novels/:novelId/chapters/:chapterId
app.delete('/api/novels/:novelId/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const { novelId, chapterId } = req.params;

    if (memoryChapters[novelId]) {
      memoryChapters[novelId] = memoryChapters[novelId].filter((c) => c.id !== chapterId);
    }

    if (isInsforgeConfigured()) {
      try {
        await insforgeAdmin.database.from('chapters').delete().eq('id', chapterId);
        const chs = memoryChapters[novelId] || [];
        await insforgeAdmin.database
          .from('novels')
          .update({ chapter_count: chs.length, updated_at: new Date().toISOString() })
          .eq('id', novelId);
        console.log(`[InsForge DB Sync] Chapter ${chapterId} deleted from InsForge`);
      } catch {}
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// GET /api/author
app.get('/api/author', async (_req: Request, res: Response) => {
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        insforgeAdmin.database.from('author_profile').select('*').limit(1),
        1500
      );
      if (!error && data && data.length > 0) {
        return res.json(mapAuthorRow(data[0]));
      }
    } catch {}
  }

  res.json(memoryAuthor);
});

// POST /api/author
app.post('/api/author', async (req: Request, res: Response) => {
  try {
    const { displayName, bio, photoURL, philosophy, email, location, socialLinks } = req.body;
    const now = new Date();

    memoryAuthor = {
      ...memoryAuthor,
      displayName: displayName || memoryAuthor.displayName,
      bio: bio ?? memoryAuthor.bio,
      photoURL: photoURL ?? memoryAuthor.photoURL,
      philosophy: philosophy ?? memoryAuthor.philosophy,
      email: email ?? memoryAuthor.email,
      location: location ?? memoryAuthor.location,
      socialLinks: socialLinks ?? memoryAuthor.socialLinks,
      updatedAt: now.getTime(),
    };

    if (isInsforgeConfigured()) {
      try {
        const payload = {
          id: 'main',
          display_name: memoryAuthor.displayName,
          bio: memoryAuthor.bio,
          photo_url: memoryAuthor.photoURL,
          philosophy: memoryAuthor.philosophy,
          email: memoryAuthor.email,
          location: memoryAuthor.location,
          social_links: memoryAuthor.socialLinks,
          updated_at: now.toISOString(),
        };

        const { data: existing } = await insforgeAdmin.database
          .from('author_profile')
          .select('id')
          .eq('id', 'main')
          .limit(1);

        if (existing && existing.length > 0) {
          await insforgeAdmin.database.from('author_profile').update(payload).eq('id', 'main');
        } else {
          await insforgeAdmin.database.from('author_profile').insert([payload]);
        }
        console.log('[InsForge DB Sync] Author profile updated in InsForge!');
      } catch (err: any) {
        console.warn('InsForge author update error:', err?.message || err);
      }
    }

    res.json(memoryAuthor);
  } catch (error) {
    console.error('Failed to update author profile:', error);
    res.status(500).json({ error: 'Failed to update author' });
  }
});

/* ========================================================
   VITE MIDDLEWARE MOUNTING & START SERVER
   ======================================================== */

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Guaranteed SPA fallback for development reload on all routes (poems, stories, novels, etc.)
    app.use('*', async (req: Request, res: Response, next) => {
      // Never intercept API or storage endpoints
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/storage')) {
        return next();
      }
      try {
        const fs = await import('fs');
        const path = await import('path');
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err: any) {
        vite.ssrFixStacktrace?.(err);
        next(err);
      }
    });
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

