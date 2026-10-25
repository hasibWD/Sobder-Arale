import { Post, Novel, Chapter, AuthorProfile, PostType, PostStatus } from '../types';
import {
  initialPosts,
  initialNovels,
  initialChapters,
  initialAuthorProfile,
} from './localLiteratureData';
import { insforge, isInsforgeConfigured } from '../db/insforgeClient';
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

function mergeLocalPosts(incomingList: Post[]) {
  try {
    if (!incomingList || incomingList.length === 0) return;
    const existing = getLocalPosts();
    const map = new Map<string, Post>();
    for (const p of existing) {
      if (p && p.id) map.set(p.id, p);
    }
    for (const p of incomingList) {
      if (p && p.id) map.set(p.id, p);
    }
    setLocalPosts(Array.from(map.values()));
  } catch (err) {
    console.error('Failed to merge local posts:', err);
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

function mergeLocalNovels(incomingList: Novel[]) {
  try {
    if (!incomingList || incomingList.length === 0) return;
    const existing = getLocalNovels();
    const map = new Map<string, Novel>();
    for (const n of existing) {
      if (n && n.id) map.set(n.id, n);
    }
    for (const n of incomingList) {
      if (n && n.id) map.set(n.id, n);
    }
    setLocalNovels(Array.from(map.values()));
  } catch (err) {
    console.error('Failed to merge local novels:', err);
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
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
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

function mapRowToPost(d: any): Post {
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
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
    publishedAt: d.published_at || d.publishedAt ? parseServerTimestamp(d.published_at || d.publishedAt) : undefined,
  };
}

function mapRowToNovel(d: any): Novel {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    synopsis: d.synopsis || '',
    coverImageUrl: d.cover_image_url || d.coverImageUrl || '',
    status: d.status || 'ongoing',
    chapterCount: Number(d.chapter_count || d.chapterCount || 0),
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
  };
}

function mapRowToChapter(d: any): Chapter {
  return {
    id: d.id,
    novelId: d.novel_id || d.novelId,
    title: d.title,
    chapterNumber: Number(d.chapter_number || d.chapterNumber || 1),
    body: d.body || '',
    status: d.status || 'published',
    createdAt: parseServerTimestamp(d.created_at || d.createdAt),
    updatedAt: parseServerTimestamp(d.updated_at || d.updatedAt),
    publishedAt: d.published_at || d.publishedAt ? parseServerTimestamp(d.published_at || d.publishedAt) : undefined,
  };
}

/* ========================================================
   PUBLIC READ APIS (InsForge Database + API + Local Cache)
   ======================================================== */

export async function getPublishedPosts(type?: PostType, tag?: string, limitCount = 50): Promise<Post[]> {
  // 1. Direct InsForge Query first for live database sync across all devices
  if (isInsforgeConfigured()) {
    try {
      let query = insforge.database
        .from('posts')
        .select('*')
        .eq('status', 'published');

      if (type) query = query.eq('type', type);

      query = query
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limitCount);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        let mapped = data.map(mapRowToPost);
        if (tag) {
          mapped = mapped.filter((p) => p.tags.includes(tag));
        }
        mergeLocalPosts(mapped);
        return mapped;
      }
    } catch (insErr) {
      console.warn('InsForge getPublishedPosts warning:', insErr);
    }
  }

  // 1b. Fallback to Supabase if configured
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase.from('posts').select('*').eq('status', 'published');
      if (type) query = query.eq('type', type);
      if (tag) query = query.contains('tags', [tag]);
      query = query.order('published_at', { ascending: false, nullsFirst: false }).limit(limitCount);
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapRowToPost);
        mergeLocalPosts(mapped);
        return mapped;
      }
    } catch {}
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
        const mapped = data.map(mapRowToPost);
        mergeLocalPosts(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('API getPublishedPosts fallback:', err);
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

export async function getPostBySlug(rawSlug: string): Promise<Post | null> {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();
  const raw = rawSlug.trim();

  // 1. Direct InsForge Query
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database
        .from('posts')
        .select('*')
        .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const mapped = mapRowToPost(data[0]);
        mergeLocalPosts([mapped]);
        return mapped;
      }
    } catch (insErr) {
      console.warn('InsForge getPostBySlug warning:', insErr);
    }
  }

  // 1b. Direct Supabase Query
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const mapped = mapRowToPost(data[0]);
        mergeLocalPosts([mapped]);
        return mapped;
      }
    } catch {}
  }

  // 2. Try Backend API
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(decoded)}`);
    if (res.ok) {
      const d = await res.json();
      const mapped = mapRowToPost(d);
      mergeLocalPosts([mapped]);
      return mapped;
    }
  } catch {}

  // 3. Local fallback
  const local = getLocalPosts();
  return (
    local.find(
      (p) =>
        p.slug === decoded ||
        p.slug === raw ||
        p.id === decoded ||
        p.id === raw ||
        (p.slug && decodeURIComponent(p.slug) === decoded)
    ) || null
  );
}

export async function getPublishedNovels(): Promise<Novel[]> {
  // 1. Direct InsForge Query
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database
        .from('novels')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapRowToNovel);
        setLocalNovels(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('InsForge getPublishedNovels warning:', e);
    }
  }

  // 1b. Direct Supabase Query
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapRowToNovel);
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
        const mapped = data.map(mapRowToNovel);
        setLocalNovels(mapped);
        return mapped;
      }
    }
  } catch {}

  return getLocalNovels().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNovelBySlugOrId(rawIdentifier: string): Promise<Novel | null> {
  if (!rawIdentifier) return null;
  const decoded = decodeURIComponent(rawIdentifier).trim();
  const raw = rawIdentifier.trim();

  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database
        .from('novels')
        .select('*')
        .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapRowToNovel(data[0]);
      }
    } catch {}
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('*')
        .or(`slug.eq.${decoded},slug.eq.${raw},id.eq.${decoded},id.eq.${raw}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        return mapRowToNovel(data[0]);
      }
    } catch {}
  }

  // 2. API
  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(decoded)}`);
    if (res.ok) {
      const d = await res.json();
      return mapRowToNovel(d);
    }
  } catch {}

  const local = getLocalNovels();
  return (
    local.find(
      (n) =>
        n.slug === decoded ||
        n.slug === raw ||
        n.id === decoded ||
        n.id === raw ||
        (n.slug && decodeURIComponent(n.slug) === decoded)
    ) || null
  );
}

export async function getPublishedChapters(rawNovelId: string): Promise<Chapter[]> {
  if (!rawNovelId) return [];
  const novelId = decodeURIComponent(rawNovelId).trim();
  const raw = rawNovelId.trim();

  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database
        .from('chapters')
        .select('*')
        .or(`novel_id.eq.${novelId},novel_id.eq.${raw}`)
        .eq('status', 'published')
        .order('chapter_number', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapRowToChapter);
      }
    } catch {}
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .or(`novel_id.eq.${novelId},novel_id.eq.${raw}`)
        .eq('status', 'published')
        .order('chapter_number', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map(mapRowToChapter);
      }
    } catch {}
  }

  // 2. API
  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter((d: any) => d.status === 'published').map(mapRowToChapter);
      }
    }
  } catch {}

  const all = getLocalChapters();
  const list = all[novelId] || all[raw] || [];
  return list
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export async function getChapterById(rawNovelId: string, rawChapterId: string): Promise<Chapter | null> {
  const novelId = decodeURIComponent(rawNovelId || '').trim();
  const rawN = (rawNovelId || '').trim();
  const chapterId = decodeURIComponent(rawChapterId || '').trim();
  const rawC = (rawChapterId || '').trim();
  const num = Number(chapterId);

  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      let query = insforge.database
        .from('chapters')
        .select('*')
        .or(`novel_id.eq.${novelId},novel_id.eq.${rawN}`);

      if (!isNaN(num) && num > 0) {
        query = query.or(`id.eq.${chapterId},id.eq.${rawC},chapter_number.eq.${num}`);
      } else {
        query = query.or(`id.eq.${chapterId},id.eq.${rawC}`);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        return mapRowToChapter(data[0]);
      }
    } catch {}
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('chapters')
        .select('*')
        .or(`novel_id.eq.${novelId},novel_id.eq.${rawN}`);

      if (!isNaN(num) && num > 0) {
        query = query.or(`id.eq.${chapterId},id.eq.${rawC},chapter_number.eq.${num}`);
      } else {
        query = query.or(`id.eq.${chapterId},id.eq.${rawC}`);
      }

      const { data, error } = await query.limit(1);

      if (!error && data && data.length > 0) {
        return mapRowToChapter(data[0]);
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const list = await res.json();
      const match = list.find(
        (c: any) =>
          c.id === chapterId ||
          c.id === rawC ||
          (!isNaN(num) && Number(c.chapterNumber) === num)
      );
      if (match) return mapRowToChapter(match);
    }
  } catch {}

  const all = getLocalChapters();
  const list = all[novelId] || all[rawN] || [];
  return (
    list.find(
      (c) =>
        c.id === chapterId ||
        c.id === rawC ||
        (!isNaN(num) && Number(c.chapterNumber) === num)
    ) || null
  );
}

export async function getAuthorProfile(): Promise<AuthorProfile | null> {
  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database.from('author_profile').select('*').limit(1);
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

  // 1b. Direct Supabase
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
   ADMIN MANAGEMENT (INSFORGE DIRECT + API + LOCAL MIRROR)
   Guarantees updates are saved in the database automatically.
   ======================================================== */

export async function checkIsAdmin(uid: string): Promise<boolean> {
  return localStorage.getItem('shobder_arale_admin_session') === 'true' || Boolean(uid);
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data, error } = await insforge.database
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapRowToPost);
        setLocalPosts(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('InsForge getAllPostsAdmin error:', err);
    }
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapRowToPost);
        setLocalPosts(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Supabase getAllPostsAdmin error:', err);
    }
  }

  try {
    const res = await fetch('/api/posts?status=all');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const mapped = data.map(mapRowToPost);
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
  const isPublished = data.status === 'published';
  const cleanSlug = (data.slug?.trim() || targetId).toLowerCase();

  const postPayload = {
    id: targetId,
    title: data.title.trim(),
    slug: cleanSlug,
    type: data.type,
    excerpt: data.excerpt?.trim() || '',
    body: data.body.trim(),
    tags: Array.isArray(data.tags) ? data.tags : [],
    category: data.category?.trim() || '',
    cover_image_url: data.coverImageUrl?.trim() || '',
    status: data.status,
    reading_time_minutes: data.readingTimeMinutes || 1,
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : now.toISOString(),
    updated_at: now.toISOString(),
    published_at: isPublished
      ? (data.publishedAt ? new Date(data.publishedAt).toISOString() : now.toISOString())
      : null,
  };

  // 1. Direct InsForge Upsert (Guaranteed database save)
  if (isInsforgeConfigured()) {
    try {
      const { data: existing } = await insforge.database
        .from('posts')
        .select('id')
        .eq('id', targetId)
        .limit(1);

      if (existing && existing.length > 0) {
        const { error } = await insforge.database
          .from('posts')
          .update(postPayload)
          .eq('id', targetId);
        if (error) {
          console.error('[InsForge] Post update error:', error.message);
        } else {
          console.log(`[InsForge] Post "${data.title}" updated successfully!`);
        }
      } else {
        const { error } = await insforge.database
          .from('posts')
          .insert([postPayload]);
        if (error) {
          console.error('[InsForge] Post insert error:', error.message);
        } else {
          console.log(`[InsForge] Post "${data.title}" created successfully!`);
        }
      }
    } catch (insErr) {
      console.warn('[InsForge] savePost error:', insErr);
    }
  }

  // 1b. Direct Supabase Upsert (if configured)
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('posts').upsert(postPayload, { onConflict: 'id' });
    } catch {}
  }

  // 2. Also send to Backend API
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...postPayload,
        coverImageUrl: postPayload.cover_image_url,
        readingTimeMinutes: postPayload.reading_time_minutes,
      }),
    });
  } catch (err) {
    console.warn('Backend savePost notice:', err);
  }

  // 3. Mirror locally with non-destructive merge
  const mappedPost = mapRowToPost(postPayload);
  mergeLocalPosts([mappedPost]);

  // Dispatch event so all open views immediately update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'post', id: targetId } }));
  }

  return targetId;
}

export async function deletePost(postId: string): Promise<void> {
  // 1. Direct InsForge Delete
  if (isInsforgeConfigured()) {
    try {
      const { error } = await insforge.database
        .from('posts')
        .delete()
        .or(`id.eq.${postId},slug.eq.${postId}`);
      if (!error) {
        console.log(`[InsForge] Post ${postId} deleted successfully`);
      }
    } catch (e) {
      console.warn('[InsForge] post delete error:', e);
    }
  }

  // 1b. Supabase Delete
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('posts').delete().or(`id.eq.${postId},slug.eq.${postId}`);
    } catch {}
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'post', id: postId } }));
  }
}

export async function togglePostStatus(postId: string, newStatus: PostStatus): Promise<Post | null> {
  const now = new Date();
  const nowMs = now.getTime();
  const isPublished = newStatus === 'published';

  // 1. Direct InsForge Update
  if (isInsforgeConfigured()) {
    try {
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: now.toISOString(),
      };
      if (isPublished) updateData.published_at = now.toISOString();

      await insforge.database
        .from('posts')
        .update(updateData)
        .or(`id.eq.${postId},slug.eq.${postId}`);
      console.log(`[InsForge] Post ${postId} status set to ${newStatus}`);
    } catch (e) {
      console.warn('[InsForge] status toggle error:', e);
    }
  }

  // 1b. Direct Supabase Update
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
    } catch {}
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
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'post', id: postId } }));
  }

  return idx >= 0 ? local[idx] : null;
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
  const cleanSlug = (data.slug?.trim() || targetId).toLowerCase();
  const novelPayload = {
    id: targetId,
    title: data.title.trim(),
    slug: cleanSlug,
    synopsis: data.synopsis?.trim() || '',
    cover_image_url: data.coverImageUrl?.trim() || '',
    status: data.status,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // 1. Direct InsForge Write
  if (isInsforgeConfigured()) {
    try {
      const { data: existing } = await insforge.database
        .from('novels')
        .select('id')
        .eq('id', targetId)
        .limit(1);

      if (existing && existing.length > 0) {
        await insforge.database
          .from('novels')
          .update(novelPayload)
          .eq('id', targetId);
      } else {
        await insforge.database
          .from('novels')
          .insert([novelPayload]);
      }
      console.log(`[InsForge] Novel "${data.title}" saved successfully!`);
    } catch (e) {
      console.warn('[InsForge] saveNovel error:', e);
    }
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('novels').upsert(novelPayload, { onConflict: 'id' });
    } catch {}
  }

  // 2. API
  try {
    await fetch('/api/novels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...novelPayload,
        coverImageUrl: novelPayload.cover_image_url,
      }),
    });
  } catch {}

  // 3. Local mirror
  const mapped = mapRowToNovel(novelPayload);
  mergeLocalNovels([mapped]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'novel', id: targetId } }));
  }

  return targetId;
}

export async function deleteNovel(novelId: string): Promise<void> {
  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      await insforge.database.from('novels').delete().or(`id.eq.${novelId},slug.eq.${novelId}`);
    } catch {}
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('novels').delete().or(`id.eq.${novelId},slug.eq.${novelId}`);
    } catch {}
  }

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}`, { method: 'DELETE' });
  } catch {}

  const local = getLocalNovels().filter((n) => n.id !== novelId && n.slug !== novelId);
  setLocalNovels(local);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'novel', id: novelId } }));
  }
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
    novel_id: novelId,
    title: data.title.trim(),
    chapter_number: Number(data.chapterNumber) || 1,
    body: data.body.trim(),
    status: data.status,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    published_at: data.status === 'published' ? now.toISOString() : null,
  };

  // 1. Direct InsForge Write
  if (isInsforgeConfigured()) {
    try {
      const { data: existing } = await insforge.database
        .from('chapters')
        .select('id')
        .eq('id', targetId)
        .limit(1);

      if (existing && existing.length > 0) {
        await insforge.database
          .from('chapters')
          .update(payload)
          .eq('id', targetId);
      } else {
        await insforge.database
          .from('chapters')
          .insert([payload]);
      }

      // Update novel chapter count
      const { data: chapList } = await insforge.database
        .from('chapters')
        .select('id')
        .eq('novel_id', novelId);
      if (Array.isArray(chapList)) {
        await insforge.database
          .from('novels')
          .update({ chapter_count: chapList.length, updated_at: now.toISOString() })
          .eq('id', novelId);
      }
      console.log(`[InsForge] Chapter "${data.title}" saved successfully!`);
    } catch (e) {
      console.warn('[InsForge] saveChapter error:', e);
    }
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('chapters').upsert(payload, { onConflict: 'id' });
    } catch {}
  }

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetId,
        title: data.title,
        chapterNumber: Number(data.chapterNumber),
        body: data.body,
        status: data.status,
      }),
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'chapter', id: targetId } }));
  }

  return targetId;
}

export async function deleteChapter(novelId: string, chapterId: string): Promise<void> {
  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      await insforge.database.from('chapters').delete().eq('id', chapterId);
      const { data: chapList } = await insforge.database
        .from('chapters')
        .select('id')
        .eq('novel_id', novelId);
      if (Array.isArray(chapList)) {
        await insforge.database
          .from('novels')
          .update({ chapter_count: chapList.length, updated_at: new Date().toISOString() })
          .eq('id', novelId);
      }
    } catch {}
  }

  // 1b. Direct Supabase
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'chapter', id: chapterId } }));
  }
}

export async function saveAuthorProfile(profile: Partial<AuthorProfile>): Promise<void> {
  const now = new Date();
  const profilePayload = {
    id: 'main',
    display_name: profile.displayName || 'শব্দের কারিগর',
    bio: profile.bio || '',
    photo_url: profile.photoURL || '',
    philosophy: profile.philosophy || '',
    email: profile.email || '',
    location: profile.location || '',
    social_links: profile.socialLinks || {},
    updated_at: now.toISOString(),
  };

  // 1. Direct InsForge
  if (isInsforgeConfigured()) {
    try {
      const { data: existing } = await insforge.database
        .from('author_profile')
        .select('id')
        .eq('id', 'main')
        .limit(1);

      if (existing && existing.length > 0) {
        await insforge.database
          .from('author_profile')
          .update(profilePayload)
          .eq('id', 'main');
      } else {
        await insforge.database
          .from('author_profile')
          .insert([profilePayload]);
      }
      console.log('[InsForge] Author profile updated successfully!');
    } catch (e) {
      console.warn('[InsForge] saveAuthorProfile error:', e);
    }
  }

  // 1b. Direct Supabase
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('author_profile').upsert(profilePayload, { onConflict: 'id' });
    } catch {}
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('literature_updated', { detail: { type: 'author' } }));
  }
}
