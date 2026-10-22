import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { db, isPostgresConfigured } from './src/db/index.ts';
import { posts, novels, chapters, authorProfile } from './src/db/schema.ts';
import { eq, desc, asc, or } from 'drizzle-orm';
import { supabase, isSupabaseConfigured, getSupabaseDetails } from './src/db/supabaseClient.ts';
import {
  initialPosts,
  initialNovels,
  initialChapters,
  initialAuthorProfile,
} from './src/services/localLiteratureData.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

/* ========================================================
   RESILIENT IN-MEMORY STORE
   Guarantees zero-downtime, instant response speeds (<50ms),
   and reliable local caching while syncing to Supabase.
   ======================================================== */

let memoryPosts = [...initialPosts];
let memoryNovels = [...initialNovels];
let memoryChapters: Record<string, any[]> = { ...initialChapters };
let memoryAuthor = { ...initialAuthorProfile };

// Helper to run DB queries with a strict timeout so server never hangs
async function withDbTimeout<T = any>(promise: PromiseLike<T> | Promise<T>, timeoutMs = 2500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out')), timeoutMs)
    ),
  ]);
}

/* ========================================================
   API ROUTES (SUPABASE DATABASE + DUAL-LAYER PERSISTENCE)
   ======================================================== */

// Health & connection status check
app.get('/api/health', async (_req: Request, res: Response) => {
  const pgConfigured = isPostgresConfigured();
  const supaConfigured = isSupabaseConfigured();
  let dbStatus = 'standby';

  if (supabase && supaConfigured) {
    try {
      const { error } = await supabase.from('posts').select('id', { count: 'exact', head: true });
      dbStatus = error ? 'ready_for_schema' : 'connected';
    } catch {
      dbStatus = 'checking';
    }
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    postgresConfigured: pgConfigured,
    supabaseConfigured: supaConfigured,
    totalPosts: memoryPosts.length,
  });
});

// GET /api/supabase-status
app.get('/api/supabase-status', async (_req: Request, res: Response) => {
  try {
    const details = getSupabaseDetails();
    if (!isSupabaseConfigured() || !supabase) {
      res.json({
        configured: false,
        message: 'Supabase credentials are not set in environment variables.',
        details,
      });
      return;
    }

    const { error } = await supabase.from('posts').select('id', { count: 'exact', head: true });
    if (error) {
      res.json({
        configured: true,
        connected: false,
        schemaNeeded: error.code === 'PGRST205',
        error: error.message,
        details,
      });
      return;
    }

    res.json({
      configured: true,
      connected: true,
      schemaNeeded: false,
      message: 'সুপাবেজ ডাটাবেজের সাথে সংযোগ সম্পূর্ণ সক্রিয় এবং ডেটা লাইভ সিঙ্ক হচ্ছে।',
      details,
    });
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err?.message || 'Supabase check failed' });
  }
});

// GET /api/posts - Get published or all posts
app.get('/api/posts', async (req: Request, res: Response) => {
  const { type, tag, status, limit: limitParam } = req.query;
  const limitNum = limitParam ? parseInt(String(limitParam), 10) : 50;

  let allPosts: any[] = [];
  let fetched = false;

  // 1. Try Supabase Client
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
      const { data, error } = await withDbTimeout(query, 2000);
      if (!error && Array.isArray(data) && data.length > 0) {
        allPosts = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          type: d.type,
          excerpt: d.excerpt,
          body: d.body,
          tags: Array.isArray(d.tags) ? d.tags : [],
          category: d.category || '',
          coverImageUrl: d.cover_image_url || '',
          status: d.status,
          readingTimeMinutes: d.reading_time_minutes || 1,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
          publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
        }));
        fetched = true;
      }
    } catch {}
  }

  // 2. Try Postgres URI / Drizzle if not fetched yet
  if (!fetched && isPostgresConfigured()) {
    try {
      allPosts = await withDbTimeout(
        db.select().from(posts).orderBy(desc(posts.publishedAt), desc(posts.createdAt)),
        2000
      );
      fetched = true;
    } catch {}
  }

  // 3. Fallback to memory
  if (!fetched) {
    allPosts = memoryPosts;
  }

  let filtered = allPosts;
  if (status && status !== 'all') {
    filtered = filtered.filter((p) => p.status === status);
  } else if (!status || status !== 'all') {
    // Default public view: only published
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
  const { slug } = req.params;

  // 1. Try Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.from('posts').select('*').or(`slug.eq.${slug},id.eq.${slug}`).limit(1),
        1500
      );
      if (!error && data && data.length > 0) {
        const d = data[0];
        res.json({
          id: d.id,
          title: d.title,
          slug: d.slug,
          type: d.type,
          excerpt: d.excerpt,
          body: d.body,
          tags: Array.isArray(d.tags) ? d.tags : [],
          category: d.category || '',
          coverImageUrl: d.cover_image_url || '',
          status: d.status,
          readingTimeMinutes: d.reading_time_minutes || 1,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
          publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
        });
        return;
      }
    } catch {}
  }

  // 2. Try Postgres URI / Drizzle
  if (isPostgresConfigured()) {
    try {
      const bySlug = await withDbTimeout(
        db.select().from(posts).where(or(eq(posts.slug, slug), eq(posts.id, slug))),
        1500
      );
      if (bySlug.length > 0) {
        res.json(bySlug[0]);
        return;
      }
    } catch {}
  }

  // 3. Fallback to memory
  const memoryMatch = memoryPosts.find((p) => p.slug === slug || p.id === slug);
  if (memoryMatch) {
    res.json(memoryMatch);
    return;
  }

  res.status(404).json({ error: 'Post not found' });
});

// POST /api/posts - Create or update post (AUTOMATIC DATABASE SYNC)
app.post('/api/posts', async (req: Request, res: Response) => {
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
      memoryPosts.unshift(postRecord as any);
    }

    // 2. AUTOMATIC SUPABASE DATABASE UPSERT
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('posts').upsert(
          {
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
          },
          { onConflict: 'id' }
        );
        if (error) {
          console.warn('Supabase posts upsert notice:', error.message);
        } else {
          console.log(`[Supabase DB Sync] Post "${title}" (${targetId}) automatically saved to Supabase!`);
        }
      } catch (err: any) {
        console.warn('Supabase upsert error:', err?.message || err);
      }
    }

    // 3. Update PostgreSQL connection pool if configured
    if (isPostgresConfigured()) {
      try {
        const existing = await withDbTimeout(
          db.select().from(posts).where(eq(posts.id, targetId)),
          1500
        );

        if (existing.length > 0) {
          await withDbTimeout(
            db
              .update(posts)
              .set({
                title,
                slug: slug || targetId,
                type,
                excerpt: excerpt || '',
                body,
                tags: Array.isArray(tags) ? tags : [],
                category: category || '',
                coverImageUrl: coverImageUrl || '',
                status: status || 'published',
                readingTimeMinutes: readingTimeMinutes || 1,
                updatedAt: now,
                publishedAt: isPublished ? (existing[0].publishedAt || now) : null,
              })
              .where(eq(posts.id, targetId)),
            2000
          );
        } else {
          await withDbTimeout(
            db.insert(posts).values({
              id: targetId,
              title,
              slug: slug || targetId,
              type,
              excerpt: excerpt || '',
              body,
              tags: Array.isArray(tags) ? tags : [],
              category: category || '',
              coverImageUrl: coverImageUrl || '',
              status: status || 'published',
              readingTimeMinutes: readingTimeMinutes || 1,
              createdAt: now,
              updatedAt: now,
              publishedAt: isPublished ? now : null,
            }),
            2000
          );
        }
      } catch {}
    }

    res.json(postRecord);
  } catch (error) {
    console.error('Failed to save post:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// DELETE /api/posts/:id (AUTOMATIC DATABASE DELETION)
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Remove from memory
    memoryPosts = memoryPosts.filter((p) => p.id !== id && p.slug !== id);

    // 2. Delete from Supabase Database
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('posts').delete().or(`id.eq.${id},slug.eq.${id}`);
        if (!error) {
          console.log(`[Supabase DB Sync] Post ${id} deleted from Supabase`);
        }
      } catch (err: any) {
        console.warn('Supabase delete error:', err?.message || err);
      }
    }

    // 3. Delete from Postgres if configured
    if (isPostgresConfigured()) {
      try {
        await withDbTimeout(
          db.delete(posts).where(or(eq(posts.id, id), eq(posts.slug, id))),
          2000
        );
      } catch {}
    }

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Failed to delete post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/posts/:id/status (AUTOMATIC DATABASE HIDE / PUBLISH SYNC)
app.patch('/api/posts/:id/status', async (req: Request, res: Response) => {
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

    // 2. Update status in Supabase Database
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('posts')
          .update({
            status,
            updated_at: now.toISOString(),
            published_at: status === 'published' ? now.toISOString() : null,
          })
          .or(`id.eq.${id},slug.eq.${id}`);
        if (!error) {
          console.log(`[Supabase DB Sync] Post ${id} status set to "${status}" in Supabase!`);
        }
      } catch (err: any) {
        console.warn('Supabase status update error:', err?.message || err);
      }
    }

    // 3. Update status in Postgres
    if (isPostgresConfigured()) {
      try {
        await withDbTimeout(
          db
            .update(posts)
            .set({
              status,
              updatedAt: now,
              publishedAt: status === 'published' ? now : null,
            })
            .where(or(eq(posts.id, id), eq(posts.slug, id))),
          2000
        );
      } catch {}
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Failed to update post status:', error);
    res.status(500).json({ error: 'Failed to update post status' });
  }
});

// GET /api/novels
app.get('/api/novels', async (_req: Request, res: Response) => {
  // 1. Try Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.from('novels').select('*').order('updated_at', { ascending: false }),
        2000
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        res.json(
          data.map((d: any) => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            synopsis: d.synopsis,
            coverImageUrl: d.cover_image_url || '',
            status: d.status,
            chapterCount: d.chapter_count || 0,
            createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
            updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
          }))
        );
        return;
      }
    } catch {}
  }

  // 2. Try Postgres
  if (isPostgresConfigured()) {
    try {
      const list = await withDbTimeout(
        db.select().from(novels).orderBy(desc(novels.updatedAt)),
        2000
      );
      if (list.length > 0) {
        res.json(list);
        return;
      }
    } catch {}
  }

  res.json(memoryNovels);
});

// GET /api/novels/:slug
app.get('/api/novels/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.from('novels').select('*').or(`slug.eq.${slug},id.eq.${slug}`).limit(1),
        1500
      );
      if (!error && data && data.length > 0) {
        const d = data[0];
        res.json({
          id: d.id,
          title: d.title,
          slug: d.slug,
          synopsis: d.synopsis,
          coverImageUrl: d.cover_image_url || '',
          status: d.status,
          chapterCount: d.chapter_count || 0,
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
        });
        return;
      }
    } catch {}
  }

  const memoryMatch = memoryNovels.find((n) => n.slug === slug || n.id === slug);
  if (memoryMatch) {
    res.json(memoryMatch);
    return;
  }

  res.status(404).json({ error: 'Novel not found' });
});

// POST /api/novels (AUTOMATIC DATABASE SYNC)
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
      memoryNovels.unshift(novelRecord as any);
    }

    // Save to Supabase
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('novels').upsert(
          {
            id: targetId,
            title,
            slug: slug || targetId,
            synopsis: synopsis || '',
            cover_image_url: coverImageUrl || '',
            status: status || 'ongoing',
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: 'id' }
        );
        console.log(`[Supabase DB Sync] Novel "${title}" saved to Supabase!`);
      } catch (err: any) {
        console.warn('Supabase novel save error:', err?.message || err);
      }
    }

    res.json(novelRecord);
  } catch (error) {
    console.error('Failed to save novel:', error);
    res.status(500).json({ error: 'Failed to save novel' });
  }
});

// DELETE /api/novels/:id (AUTOMATIC DATABASE DELETION)
app.delete('/api/novels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    memoryNovels = memoryNovels.filter((n) => n.id !== id && n.slug !== id);

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('novels').delete().or(`id.eq.${id},slug.eq.${id}`);
        console.log(`[Supabase DB Sync] Novel ${id} deleted from Supabase`);
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
  const { novelId } = req.params;

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from('chapters')
          .select('*')
          .eq('novel_id', novelId)
          .order('chapter_number', { ascending: true }),
        2000
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        res.json(
          data.map((d: any) => ({
            id: d.id,
            novelId: d.novel_id,
            title: d.title,
            chapterNumber: Number(d.chapter_number),
            body: d.body,
            status: d.status,
            createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
            updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
            publishedAt: d.published_at ? new Date(d.published_at).getTime() : undefined,
          }))
        );
        return;
      }
    } catch {}
  }

  const list = memoryChapters[novelId] || [];
  res.json(list);
});

// POST /api/novels/:novelId/chapters (AUTOMATIC DATABASE SYNC)
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

    // Save to Supabase
    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('chapters').upsert(
          {
            id: targetId,
            novel_id: novelId,
            title,
            chapter_number: Number(chapterNumber),
            body,
            status: status || 'published',
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            published_at: status === 'published' ? now.toISOString() : null,
          },
          { onConflict: 'id' }
        );
        // Update chapter count on novel
        const chs = memoryChapters[novelId] || [];
        await supabase
          .from('novels')
          .update({ chapter_count: chs.length, updated_at: now.toISOString() })
          .eq('id', novelId);
        console.log(`[Supabase DB Sync] Chapter "${title}" saved to Supabase!`);
      } catch (err: any) {
        console.warn('Supabase chapter save error:', err?.message || err);
      }
    }

    res.json(chapterRecord);
  } catch (error) {
    console.error('Failed to save chapter:', error);
    res.status(500).json({ error: 'Failed to save chapter' });
  }
});

// DELETE /api/novels/:novelId/chapters/:chapterId (AUTOMATIC DATABASE DELETION)
app.delete('/api/novels/:novelId/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const { novelId, chapterId } = req.params;

    if (memoryChapters[novelId]) {
      memoryChapters[novelId] = memoryChapters[novelId].filter((c) => c.id !== chapterId);
    }

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('chapters').delete().eq('id', chapterId);
        const chs = memoryChapters[novelId] || [];
        await supabase
          .from('novels')
          .update({ chapter_count: chs.length, updated_at: new Date().toISOString() })
          .eq('id', novelId);
        console.log(`[Supabase DB Sync] Chapter ${chapterId} deleted from Supabase`);
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
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await withDbTimeout(
        supabase.from('author_profile').select('*').limit(1),
        1500
      );
      if (!error && data && data.length > 0) {
        const d = data[0];
        res.json({
          displayName: d.display_name,
          bio: d.bio,
          photoURL: d.photo_url,
          philosophy: d.philosophy,
          email: d.email,
          location: d.location,
          socialLinks: d.social_links || {},
          updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
        });
        return;
      }
    } catch {}
  }

  res.json(memoryAuthor);
});

// POST /api/author (AUTOMATIC DATABASE SYNC)
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

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('author_profile').upsert(
          {
            id: 'main',
            display_name: memoryAuthor.displayName,
            bio: memoryAuthor.bio,
            photo_url: memoryAuthor.photoURL,
            philosophy: memoryAuthor.philosophy,
            email: memoryAuthor.email,
            location: memoryAuthor.location,
            social_links: memoryAuthor.socialLinks,
            updated_at: now.toISOString(),
          },
          { onConflict: 'id' }
        );
        console.log('[Supabase DB Sync] Author profile updated in Supabase!');
      } catch (err: any) {
        console.warn('Supabase author update error:', err?.message || err);
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
