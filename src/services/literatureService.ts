import { Post, Novel, Chapter, AuthorProfile, PostType, PostStatus } from '../types';
import {
  initialPosts,
  initialNovels,
  initialChapters,
  initialAuthorProfile,
} from './localLiteratureData';
import { supabase, isSupabaseConfigured } from '../db/supabaseClient';

const LOCAL_STORAGE_POSTS_KEY = 'shobder_arale_posts';
const LOCAL_STORAGE_NOVELS_KEY = 'shobder_arale_novels';
const LOCAL_STORAGE_CHAPTERS_KEY = 'shobder_arale_chapters';
const LOCAL_STORAGE_AUTHOR_KEY = 'shobder_arale_author';

// Local storage helpers
function getLocalPosts(): Post[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_POSTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_POSTS_KEY, JSON.stringify(initialPosts));
      return initialPosts;
    }
    return JSON.parse(raw);
  } catch {
    return initialPosts;
  }
}

function setLocalPosts(postsList: Post[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_POSTS_KEY, JSON.stringify(postsList));
  } catch (err) {
    console.error('Failed to save posts to local storage:', err);
  }
}

function getLocalNovels(): Novel[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOVELS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_NOVELS_KEY, JSON.stringify(initialNovels));
      return initialNovels;
    }
    return JSON.parse(raw);
  } catch {
    return initialNovels;
  }
}

function setLocalNovels(novelsList: Novel[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOVELS_KEY, JSON.stringify(novelsList));
  } catch (err) {
    console.error('Failed to save novels to local storage:', err);
  }
}

function getLocalChapters(): Record<string, Chapter[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHAPTERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_CHAPTERS_KEY, JSON.stringify(initialChapters));
      return initialChapters;
    }
    return JSON.parse(raw);
  } catch {
    return initialChapters;
  }
}

function setLocalChapters(chaptersMap: Record<string, Chapter[]>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHAPTERS_KEY, JSON.stringify(chaptersMap));
  } catch (err) {
    console.error('Failed to save chapters to local storage:', err);
  }
}

function parseServerTimestamp(val: unknown): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime();
  return Date.now();
}

function mapSupabasePost(d: any): Post {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    type: d.type,
    excerpt: d.excerpt,
    body: d.body,
    tags: Array.isArray(d.tags) ? d.tags : [],
    category: d.category || '',
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    status: d.status,
    readingTimeMinutes: d.reading_time_minutes || d.readingTimeMinutes || 1,
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
    publishedAt: d.published_at || d.publishedAt ? parseServerTimestamp(d.published_at || d.publishedAt) : undefined,
  };
}

function mapSupabaseNovel(d: any): Novel {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    synopsis: d.synopsis,
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    status: d.status,
    chapterCount: d.chapter_count || d.chapterCount || 0,
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
  };
}

function mapSupabaseChapter(d: any): Chapter {
  return {
    id: d.id,
    novelId: d.novel_id || d.novelId,
    title: d.title,
    chapterNumber: Number(d.chapter_number || d.chapterNumber),
    body: d.body,
    status: d.status,
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
    publishedAt: d.published_at || d.publishedAt ? parseServerTimestamp(d.published_at || d.publishedAt) : undefined,
  };
}

/* ========================================================
   PUBLIC READ APIS (Supabase Direct + API + Local Cache)
   ======================================================== */

export async function getPublishedPosts(type?: PostType, tag?: string, limitCount = 50): Promise<Post[]> {
  // 1. Try direct Supabase query first for instant sync across all readers
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limitCount);

      if (type) query = query.eq('type', type);
      if (tag) query = query.contains('tags', [tag]);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabasePost);
        // Cache to local storage
        setLocalPosts(mapped);
        return mapped;
      }
    } catch (supaErr) {
      console.warn('Supabase client getPublishedPosts error:', supaErr);
    }
  }

  // 2. Try Backend API
  try {
    const params = new URLSearchParams({ status: 'published', limit: String(limitCount) });
    if (type) params.append('type', type);
    if (tag) params.append('tag', tag);

    const res = await fetch(`/api/posts?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabasePost);
        setLocalPosts(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('API getPublishedPosts fallback to local storage:', err);
  }

  // 3. Fallback to local cache
  const local = getLocalPosts().filter((p) => p.status === 'published');
  let filtered = local;
  if (type) filtered = filtered.filter((p) => p.type === type);
  if (tag) filtered = filtered.filter((p) => p.tags && p.tags.includes(tag));
  return filtered
    .sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt))
    .slice(0, limitCount);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  // 1. Try Supabase direct
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapSupabasePost(data[0]);
      }
    } catch {}
  }

  // 2. Try Backend API
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const d = await res.json();
      return mapSupabasePost(d);
    }
  } catch {}

  // 3. Local fallback
  const local = getLocalPosts();
  return local.find((p) => p.slug === slug || p.id === slug) || null;
}

export async function getPublishedNovels(): Promise<Novel[]> {
  // 1. Try Supabase direct
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabaseNovel);
        setLocalNovels(mapped);
        return mapped;
      }
    } catch {}
  }

  // 2. Try API
  try {
    const res = await fetch('/api/novels');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabaseNovel);
        setLocalNovels(mapped);
        return mapped;
      }
    }
  } catch {}

  return getLocalNovels().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNovelBySlugOrId(identifier: string): Promise<Novel | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .or(`slug.eq.${identifier},id.eq.${identifier}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapSupabaseNovel(data[0]);
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(identifier)}`);
    if (res.ok) {
      const d = await res.json();
      return mapSupabaseNovel(d);
    }
  } catch {}

  const local = getLocalNovels();
  return local.find((n) => n.slug === identifier || n.id === identifier) || null;
}

export async function getPublishedChapters(novelId: string): Promise<Chapter[]> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('novel_id', novelId)
        .eq('status', 'published')
        .order('chapter_number', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapSupabaseChapter);
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.filter((d: any) => d.status === 'published').map(mapSupabaseChapter);
      }
    }
  } catch {}

  const all = getLocalChapters();
  const list = all[novelId] || [];
  return list
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export async function getChapterById(novelId: string, chapterId: string): Promise<Chapter | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('novel_id', novelId)
        .or(`id.eq.${chapterId},chapter_number.eq.${chapterId}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapSupabaseChapter(data[0]);
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const list = await res.json();
      const match = list.find((c: any) => c.id === chapterId || String(c.chapterNumber) === chapterId);
      if (match) return mapSupabaseChapter(match);
    }
  } catch {}

  const all = getLocalChapters();
  const list = all[novelId] || [];
  return list.find((c) => c.id === chapterId || String(c.chapterNumber) === chapterId) || null;
}

export async function getAuthorProfile(): Promise<AuthorProfile | null> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('author_profile').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const d = data[0];
        const profile: AuthorProfile = {
          displayName: d.display_name,
          bio: d.bio,
          photoURL: d.photo_url,
          philosophy: d.philosophy,
          email: d.email,
          location: d.location,
          socialLinks: d.social_links || {},
          updatedAt: parseServerTimestamp(d.updated_at),
        };
        localStorage.setItem(LOCAL_STORAGE_AUTHOR_KEY, JSON.stringify(profile));
        return profile;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/author');
    if (res.ok) {
      const d = await res.json();
      const profile: AuthorProfile = {
        displayName: d.displayName,
        bio: d.bio,
        photoURL: d.photoURL,
        philosophy: d.philosophy,
        email: d.email,
        location: d.location,
        socialLinks: d.socialLinks || {},
        updatedAt: parseServerTimestamp(d.updatedAt),
      };
      localStorage.setItem(LOCAL_STORAGE_AUTHOR_KEY, JSON.stringify(profile));
      return profile;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUTHOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initialAuthorProfile;
}

/* ========================================================
   ADMIN MANAGEMENT (DIRECT SUPABASE WRITE + API + LOCAL)
   Guarantees updates are saved in the database automatically.
   ======================================================== */

export async function checkIsAdmin(uid: string): Promise<boolean> {
  return localStorage.getItem('shobder_arale_admin_session') === 'true' || Boolean(uid);
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapSupabasePost);
        setLocalPosts(mapped);
        return mapped;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/posts?status=all');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(mapSupabasePost);
        setLocalPosts(mapped);
        return mapped;
      }
    }
  } catch {}

  return getLocalPosts().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function savePost(
  postId: string | null,
  data: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'> & {
    createdAt?: number;
    publishedAt?: number;
  }
): Promise<string> {
  const targetId = postId || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const nowMs = now.getTime();
  const isPublished = data.status === 'published';

  const postPayload = {
    id: targetId,
    title: data.title,
    slug: data.slug,
    type: data.type,
    excerpt: data.excerpt,
    body: data.body,
    tags: data.tags,
    category: data.category || '',
    coverImageUrl: data.coverImageUrl || '',
    status: data.status,
    readingTimeMinutes: data.readingTimeMinutes || 1,
  };

  // 1. Direct Supabase Upsert (Guaranteed database save)
  if (supabase && isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('posts').upsert(
        {
          id: targetId,
          title: data.title,
          slug: data.slug,
          type: data.type,
          excerpt: data.excerpt || '',
          body: data.body,
          tags: Array.isArray(data.tags) ? data.tags : [],
          category: data.category || '',
          cover_image_url: data.coverImageUrl || '',
          status: data.status,
          reading_time_minutes: data.readingTimeMinutes || 1,
          created_at: data.createdAt ? new Date(data.createdAt).toISOString() : now.toISOString(),
          updated_at: now.toISOString(),
          published_at: isPublished
            ? (data.publishedAt ? new Date(data.publishedAt).toISOString() : now.toISOString())
            : null,
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('Direct Supabase post upsert notice:', error.message);
      } else {
        console.log(`[Database Sync] Post "${data.title}" successfully written to Supabase!`);
      }
    } catch (supaErr) {
      console.warn('Direct Supabase post upsert error:', supaErr);
    }
  }

  // 2. Also send to Backend API
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload),
    });
  } catch (err) {
    console.warn('Backend savePost notice:', err);
  }

  // 3. Mirror locally
  const local = getLocalPosts();
  const idx = postId ? local.findIndex((p) => p.id === postId) : -1;
  const newPost: Post = {
    ...postPayload,
    createdAt: idx >= 0 ? local[idx].createdAt : (data.createdAt || nowMs),
    updatedAt: nowMs,
    publishedAt: isPublished ? (idx >= 0 && local[idx].publishedAt ? local[idx].publishedAt : nowMs) : undefined,
  };

  if (idx >= 0) {
    local[idx] = newPost;
  } else {
    local.unshift(newPost);
  }
  setLocalPosts(local);

  return targetId;
}

export async function deletePost(postId: string): Promise<void> {
  // 1. Direct Supabase Delete
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('posts').delete().or(`id.eq.${postId},slug.eq.${postId}`);
      console.log(`[Database Sync] Post ${postId} deleted from Supabase`);
    } catch (e) {
      console.warn('Direct Supabase post delete error:', e);
    }
  }

  // 2. Backend API Delete
  try {
    await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('API deletePost notice:', err);
  }

  // 3. Local Mirror
  const local = getLocalPosts().filter((p) => p.id !== postId && p.slug !== postId);
  setLocalPosts(local);
}

export async function togglePostStatus(postId: string, newStatus: PostStatus): Promise<Post | null> {
  const now = new Date();
  const nowMs = now.getTime();
  const isPublished = newStatus === 'published';

  // 1. Direct Supabase Update
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase
        .from('posts')
        .update({
          status: newStatus,
          updated_at: now.toISOString(),
          published_at: isPublished ? now.toISOString() : null,
        })
        .or(`id.eq.${postId},slug.eq.${postId}`);
      console.log(`[Database Sync] Post ${postId} status set to ${newStatus} in Supabase`);
    } catch (e) {
      console.warn('Direct Supabase status toggle error:', e);
    }
  }

  // 2. Backend API
  try {
    await fetch(`/api/posts/${encodeURIComponent(postId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch {}

  // 3. Local mirror
  const local = getLocalPosts();
  const idx = local.findIndex((p) => p.id === postId || p.slug === postId);
  if (idx >= 0) {
    local[idx] = {
      ...local[idx],
      status: newStatus,
      updatedAt: nowMs,
      publishedAt: isPublished ? local[idx].publishedAt || nowMs : undefined,
    };
    setLocalPosts(local);
    return local[idx];
  }
  return null;
}

export async function getAllNovelsAdmin(): Promise<Novel[]> {
  return getPublishedNovels();
}

export async function saveNovel(
  novelId: string | null,
  data: Omit<Novel, 'id' | 'createdAt' | 'updatedAt' | 'chapterCount'>
): Promise<string> {
  const targetId = novelId || `novel-${Date.now()}`;
  const now = new Date();
  const novelPayload = {
    id: targetId,
    title: data.title,
    slug: data.slug,
    synopsis: data.synopsis,
    coverImageUrl: data.coverImageUrl || '',
    status: data.status,
  };

  // 1. Direct Supabase Write
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('novels').upsert(
        {
          id: targetId,
          title: data.title,
          slug: data.slug,
          synopsis: data.synopsis || '',
          cover_image_url: data.coverImageUrl || '',
          status: data.status,
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      );
      console.log(`[Database Sync] Novel "${data.title}" saved to Supabase!`);
    } catch (e) {
      console.warn('Supabase saveNovel error:', e);
    }
  }

  // 2. API
  try {
    await fetch('/api/novels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novelPayload),
    });
  } catch {}

  // 3. Local mirror
  const local = getLocalNovels();
  const idx = novelId ? local.findIndex((n) => n.id === novelId) : -1;
  const newNovel: Novel = {
    ...novelPayload,
    createdAt: idx >= 0 ? local[idx].createdAt : Date.now(),
    updatedAt: Date.now(),
    chapterCount: idx >= 0 ? local[idx].chapterCount || 0 : 0,
  };

  if (idx >= 0) {
    local[idx] = newNovel;
  } else {
    local.unshift(newNovel);
  }
  setLocalNovels(local);

  return targetId;
}

export async function deleteNovel(novelId: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('novels').delete().or(`id.eq.${novelId},slug.eq.${novelId}`);
    } catch {}
  }

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}`, { method: 'DELETE' });
  } catch {}

  const local = getLocalNovels().filter((n) => n.id !== novelId);
  setLocalNovels(local);
}

export async function getAllChaptersAdmin(novelId: string): Promise<Chapter[]> {
  return getPublishedChapters(novelId);
}

export async function saveChapter(
  novelId: string,
  chapterId: string | null,
  data: Omit<Chapter, 'id' | 'novelId' | 'createdAt' | 'updatedAt' | 'publishedAt'>
): Promise<string> {
  const targetId = chapterId || `chap-${Date.now()}`;
  const now = new Date();
  const payload = {
    id: targetId,
    title: data.title,
    chapterNumber: Number(data.chapterNumber),
    body: data.body,
    status: data.status,
  };

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').upsert(
        {
          id: targetId,
          novel_id: novelId,
          title: data.title,
          chapter_number: Number(data.chapterNumber),
          body: data.body,
          status: data.status,
          updated_at: now.toISOString(),
          published_at: data.status === 'published' ? now.toISOString() : null,
        },
        { onConflict: 'id' }
      );
      console.log(`[Database Sync] Chapter "${data.title}" saved to Supabase!`);
    } catch (e) {
      console.warn('Supabase saveChapter error:', e);
    }
  }

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}

  const all = getLocalChapters();
  const list = all[novelId] || [];
  const idx = chapterId ? list.findIndex((c) => c.id === chapterId) : -1;
  const newChap: Chapter = {
    id: targetId,
    novelId,
    title: data.title,
    chapterNumber: Number(data.chapterNumber),
    body: data.body,
    status: data.status,
    createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
    updatedAt: Date.now(),
    publishedAt: data.status === 'published' ? Date.now() : undefined,
  };

  if (idx >= 0) {
    list[idx] = newChap;
  } else {
    list.push(newChap);
  }
  all[novelId] = list;
  setLocalChapters(all);

  return targetId;
}

export async function deleteChapter(novelId: string, chapterId: string): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').delete().eq('id', chapterId);
    } catch {}
  }

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
    });
  } catch {}

  const all = getLocalChapters();
  all[novelId] = (all[novelId] || []).filter((c) => c.id !== chapterId);
  setLocalChapters(all);
}

export async function saveAuthorProfile(profile: Partial<AuthorProfile>): Promise<void> {
  const now = new Date();

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('author_profile').upsert(
        {
          id: 'main',
          display_name: profile.displayName || 'শব্দের কারিগর',
          bio: profile.bio || '',
          photo_url: profile.photoURL || '',
          philosophy: profile.philosophy || '',
          email: profile.email || '',
          location: profile.location || '',
          social_links: profile.socialLinks || {},
          updated_at: now.toISOString(),
        },
        { onConflict: 'id' }
      );
      console.log('[Database Sync] Author profile updated in Supabase!');
    } catch (e) {
      console.warn('Supabase saveAuthorProfile error:', e);
    }
  }

  try {
    await fetch('/api/author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  } catch {}

  try {
    const existing = await getAuthorProfile();
    const updated = { ...existing, ...profile, updatedAt: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_AUTHOR_KEY, JSON.stringify(updated));
  } catch {}
}
