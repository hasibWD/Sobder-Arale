import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import { posts, novels, chapters, authorProfile, users } from './src/db/schema.ts';
import { eq, desc, asc, and, or } from 'drizzle-orm';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

/* ========================================================
   API ROUTES (POSTGRESQL / DRIZZLE)
   ======================================================== */

// Health & connection status check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const postCount = await db.select().from(posts);
    res.json({ status: 'ok', database: 'connected', totalPosts: postCount.length });
  } catch (error) {
    console.error('Health check database error:', error);
    res.status(500).json({ status: 'error', error: 'Database query failed' });
  }
});

// GET /api/posts - Get published or all posts
app.get('/api/posts', async (req: Request, res: Response) => {
  try {
    const { type, tag, status, limit: limitParam } = req.query;
    const limitNum = limitParam ? parseInt(String(limitParam), 10) : 50;

    const allPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

    let filtered = allPosts;

    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    } else {
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
  } catch (error) {
    console.error('Failed to fetch posts from database:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /api/posts/:slug - Get single post by slug or id
app.get('/api/posts/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const bySlug = await db.select().from(posts).where(eq(posts.slug, slug));
    if (bySlug.length > 0) {
      res.json(bySlug[0]);
      return;
    }

    const byId = await db.select().from(posts).where(eq(posts.id, slug));
    if (byId.length > 0) {
      res.json(byId[0]);
      return;
    }

    res.status(404).json({ error: 'Post not found' });
  } catch (error) {
    console.error('Failed to fetch post by slug:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/posts - Create or update post
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

    const existing = await db.select().from(posts).where(eq(posts.id, targetId));

    if (existing.length > 0) {
      const updated = await db
        .update(posts)
        .set({
          title,
          slug,
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
        .where(eq(posts.id, targetId))
        .returning();

      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(posts)
        .values({
          id: targetId,
          title,
          slug,
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
        })
        .returning();

      res.json(inserted[0]);
    }
  } catch (error) {
    console.error('Failed to save post to database:', error);
    res.status(500).json({ error: 'Failed to save post' });
  }
});

// DELETE /api/posts/:id (Supports both post id or slug)
app.delete('/api/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(posts).where(or(eq(posts.id, id), eq(posts.slug, id)));
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Failed to delete post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PATCH /api/posts/:id/status (Hide / Publish toggle)
app.patch('/api/posts/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['published', 'draft'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    const now = new Date();
    const updated = await db
      .update(posts)
      .set({
        status,
        updatedAt: now,
        publishedAt: status === 'published' ? now : null,
      })
      .where(or(eq(posts.id, id), eq(posts.slug, id)))
      .returning();

    res.json(updated[0] || { success: true });
  } catch (error) {
    console.error('Failed to update post status:', error);
    res.status(500).json({ error: 'Failed to update post status' });
  }
});

// GET /api/novels
app.get('/api/novels', async (_req: Request, res: Response) => {
  try {
    const list = await db.select().from(novels).orderBy(desc(novels.updatedAt));
    res.json(list);
  } catch (error) {
    console.error('Failed to fetch novels:', error);
    res.status(500).json({ error: 'Failed to fetch novels' });
  }
});

// GET /api/novels/:slug
app.get('/api/novels/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const bySlug = await db.select().from(novels).where(eq(novels.slug, slug));
    if (bySlug.length > 0) {
      res.json(bySlug[0]);
      return;
    }
    const byId = await db.select().from(novels).where(eq(novels.id, slug));
    if (byId.length > 0) {
      res.json(byId[0]);
      return;
    }
    res.status(404).json({ error: 'Novel not found' });
  } catch (error) {
    console.error('Failed to fetch novel:', error);
    res.status(500).json({ error: 'Failed to fetch novel' });
  }
});

// POST /api/novels
app.post('/api/novels', async (req: Request, res: Response) => {
  try {
    const { id, title, slug, synopsis, coverImageUrl, status } = req.body;
    const targetId = id || `novel-${Date.now()}`;
    const now = new Date();

    const existing = await db.select().from(novels).where(eq(novels.id, targetId));
    if (existing.length > 0) {
      const updated = await db
        .update(novels)
        .set({
          title,
          slug,
          synopsis: synopsis || '',
          coverImageUrl: coverImageUrl || '',
          status: status || 'ongoing',
          updatedAt: now,
        })
        .where(eq(novels.id, targetId))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(novels)
        .values({
          id: targetId,
          title,
          slug,
          synopsis: synopsis || '',
          coverImageUrl: coverImageUrl || '',
          status: status || 'ongoing',
          chapterCount: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      res.json(inserted[0]);
    }
  } catch (error) {
    console.error('Failed to save novel:', error);
    res.status(500).json({ error: 'Failed to save novel' });
  }
});

// DELETE /api/novels/:id
app.delete('/api/novels/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(novels).where(eq(novels.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete novel:', error);
    res.status(500).json({ error: 'Failed to delete novel' });
  }
});

// GET /api/novels/:novelId/chapters
app.get('/api/novels/:novelId/chapters', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params;
    const chs = await db
      .select()
      .from(chapters)
      .where(eq(chapters.novelId, novelId))
      .orderBy(asc(chapters.chapterNumber));
    res.json(chs);
  } catch (error) {
    console.error('Failed to fetch chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// POST /api/novels/:novelId/chapters
app.post('/api/novels/:novelId/chapters', async (req: Request, res: Response) => {
  try {
    const { novelId } = req.params;
    const { id, title, chapterNumber, body, status } = req.body;
    const targetId = id || `chap-${Date.now()}`;
    const now = new Date();

    const existing = await db.select().from(chapters).where(eq(chapters.id, targetId));
    if (existing.length > 0) {
      const updated = await db
        .update(chapters)
        .set({
          title,
          chapterNumber: Number(chapterNumber),
          body,
          status: status || 'published',
          updatedAt: now,
          publishedAt: status === 'published' ? (existing[0].publishedAt || now) : null,
        })
        .where(eq(chapters.id, targetId))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(chapters)
        .values({
          id: targetId,
          novelId,
          title,
          chapterNumber: Number(chapterNumber),
          body,
          status: status || 'published',
          createdAt: now,
          updatedAt: now,
          publishedAt: status === 'published' ? now : null,
        })
        .returning();

      // Update chapter count on novel
      const allChaps = await db.select().from(chapters).where(eq(chapters.novelId, novelId));
      await db
        .update(novels)
        .set({ chapterCount: allChaps.length, updatedAt: now })
        .where(eq(novels.id, novelId));

      res.json(inserted[0]);
    }
  } catch (error) {
    console.error('Failed to save chapter:', error);
    res.status(500).json({ error: 'Failed to save chapter' });
  }
});

// DELETE /api/novels/:novelId/chapters/:chapterId
app.delete('/api/novels/:novelId/chapters/:chapterId', async (req: Request, res: Response) => {
  try {
    const { novelId, chapterId } = req.params;
    await db.delete(chapters).where(eq(chapters.id, chapterId));
    const allChaps = await db.select().from(chapters).where(eq(chapters.novelId, novelId));
    await db
      .update(novels)
      .set({ chapterCount: allChaps.length, updatedAt: new Date() })
      .where(eq(novels.id, novelId));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// GET /api/author
app.get('/api/author', async (_req: Request, res: Response) => {
  try {
    const authors = await db.select().from(authorProfile);
    if (authors.length > 0) {
      res.json(authors[0]);
    } else {
      res.status(404).json({ error: 'Author profile not found' });
    }
  } catch (error) {
    console.error('Failed to fetch author:', error);
    res.status(500).json({ error: 'Failed to fetch author profile' });
  }
});

// POST /api/author
app.post('/api/author', async (req: Request, res: Response) => {
  try {
    const { displayName, bio, photoURL, philosophy, email, location, socialLinks } = req.body;
    const now = new Date();
    const existing = await db.select().from(authorProfile).where(eq(authorProfile.id, 'main'));

    if (existing.length > 0) {
      const updated = await db
        .update(authorProfile)
        .set({
          displayName: displayName || 'শব্দের কারিগর',
          bio: bio || '',
          photoURL: photoURL || '',
          philosophy: philosophy || '',
          email: email || '',
          location: location || '',
          socialLinks: socialLinks || {},
          updatedAt: now,
        })
        .where(eq(authorProfile.id, 'main'))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db
        .insert(authorProfile)
        .values({
          id: 'main',
          displayName: displayName || 'শব্দের কারিগর',
          bio: bio || '',
          photoURL: photoURL || '',
          philosophy: philosophy || '',
          email: email || '',
          location: location || '',
          socialLinks: socialLinks || {},
          updatedAt: now,
        })
        .returning();
      res.json(inserted[0]);
    }
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
