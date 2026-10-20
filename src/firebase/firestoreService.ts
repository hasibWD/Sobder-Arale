import { Post, Novel, Chapter, AuthorProfile, PostType } from '../types';
import {
  initialPosts,
  initialNovels,
  initialChapters,
  initialAuthorProfile,
} from '../services/localLiteratureData';

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

/* ========================================================
   PUBLIC READ APIS (Cloud SQL PostgreSQL + Local Fallback)
   ======================================================== */

export async function getPublishedPosts(type?: PostType, tag?: string, limitCount = 50): Promise<Post[]> {
  try {
    const params = new URLSearchParams({ status: 'published', limit: String(limitCount) });
    if (type) params.append('type', type);
    if (tag) params.append('tag', tag);

    const res = await fetch(`/api/posts?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          type: d.type,
          excerpt: d.excerpt,
          body: d.body,
          tags: Array.isArray(d.tags) ? d.tags : [],
          category: d.category || '',
          coverImageUrl: d.coverImageUrl || '',
          status: d.status,
          createdAt: parseServerTimestamp(d.createdAt),
          updatedAt: parseServerTimestamp(d.updatedAt),
          publishedAt: parseServerTimestamp(d.publishedAt),
          readingTimeMinutes: d.readingTimeMinutes || 1,
        }));
      }
    }
  } catch (err) {
    console.warn('API getPublishedPosts fallback to local storage:', err);
  }

  // Fallback to local cache
  const local = getLocalPosts().filter((p) => p.status === 'published');
  let filtered = local;
  if (type) filtered = filtered.filter((p) => p.type === type);
  if (tag) filtered = filtered.filter((p) => p.tags && p.tags.includes(tag));
  return filtered
    .sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt))
    .slice(0, limitCount);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const d = await res.json();
      return {
        id: d.id,
        title: d.title,
        slug: d.slug,
        type: d.type,
        excerpt: d.excerpt,
        body: d.body,
        tags: Array.isArray(d.tags) ? d.tags : [],
        category: d.category || '',
        coverImageUrl: d.coverImageUrl || '',
        status: d.status,
        createdAt: parseServerTimestamp(d.createdAt),
        updatedAt: parseServerTimestamp(d.updatedAt),
        publishedAt: parseServerTimestamp(d.publishedAt),
        readingTimeMinutes: d.readingTimeMinutes || 1,
      };
    }
  } catch (err) {
    console.warn('API getPostBySlug fallback:', err);
  }

  const local = getLocalPosts();
  return local.find((p) => p.slug === slug || p.id === slug) || null;
}

export async function getPublishedNovels(): Promise<Novel[]> {
  try {
    const res = await fetch('/api/novels');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          synopsis: d.synopsis,
          coverImageUrl: d.coverImageUrl || '',
          status: d.status,
          createdAt: parseServerTimestamp(d.createdAt),
          updatedAt: parseServerTimestamp(d.updatedAt),
          chapterCount: d.chapterCount || 0,
        }));
      }
    }
  } catch (err) {
    console.warn('API getPublishedNovels fallback:', err);
  }

  return getLocalNovels().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNovelBySlugOrId(identifier: string): Promise<Novel | null> {
  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(identifier)}`);
    if (res.ok) {
      const d = await res.json();
      return {
        id: d.id,
        title: d.title,
        slug: d.slug,
        synopsis: d.synopsis,
        coverImageUrl: d.coverImageUrl || '',
        status: d.status,
        createdAt: parseServerTimestamp(d.createdAt),
        updatedAt: parseServerTimestamp(d.updatedAt),
        chapterCount: d.chapterCount || 0,
      };
    }
  } catch (err) {
    console.warn('API getNovelBySlugOrId fallback:', err);
  }

  const local = getLocalNovels();
  return local.find((n) => n.slug === identifier || n.id === identifier) || null;
}

export async function getPublishedChapters(novelId: string): Promise<Chapter[]> {
  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data
          .filter((d: any) => d.status === 'published')
          .map((d: any) => ({
            id: d.id,
            novelId: d.novelId || novelId,
            title: d.title,
            chapterNumber: Number(d.chapterNumber),
            body: d.body,
            status: d.status,
            createdAt: parseServerTimestamp(d.createdAt),
            updatedAt: parseServerTimestamp(d.updatedAt),
            publishedAt: parseServerTimestamp(d.publishedAt),
          }));
      }
    }
  } catch (err) {
    console.warn('API getPublishedChapters fallback:', err);
  }

  const all = getLocalChapters();
  const list = all[novelId] || [];
  return list
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export async function getChapterById(novelId: string, chapterId: string): Promise<Chapter | null> {
  try {
    const res = await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`);
    if (res.ok) {
      const list = await res.json();
      const match = list.find((c: any) => c.id === chapterId || String(c.chapterNumber) === chapterId);
      if (match) {
        return {
          id: match.id,
          novelId,
          title: match.title,
          chapterNumber: Number(match.chapterNumber),
          body: match.body,
          status: match.status,
          createdAt: parseServerTimestamp(match.createdAt),
          updatedAt: parseServerTimestamp(match.updatedAt),
          publishedAt: parseServerTimestamp(match.publishedAt),
        };
      }
    }
  } catch (err) {
    console.warn('API getChapterById fallback:', err);
  }

  const all = getLocalChapters();
  const list = all[novelId] || [];
  return list.find((c) => c.id === chapterId || String(c.chapterNumber) === chapterId) || null;
}

export async function getAuthorProfile(): Promise<AuthorProfile | null> {
  try {
    const res = await fetch('/api/author');
    if (res.ok) {
      const d = await res.json();
      return {
        displayName: d.displayName,
        bio: d.bio,
        photoURL: d.photoURL,
        philosophy: d.philosophy,
        email: d.email,
        location: d.location,
        socialLinks: d.socialLinks || {},
        updatedAt: parseServerTimestamp(d.updatedAt),
      };
    }
  } catch (err) {
    console.warn('API getAuthorProfile fallback:', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUTHOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initialAuthorProfile;
}

/* ========================================================
   ADMIN & AUTHOR MANAGEMENT (PostgreSQL + Local Mirror)
   ======================================================== */

export async function checkIsAdmin(uid: string): Promise<boolean> {
  return localStorage.getItem('shobder_arale_author_active') === 'true' || Boolean(uid);
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  try {
    const res = await fetch('/api/posts?status=all');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          type: d.type,
          excerpt: d.excerpt,
          body: d.body,
          tags: Array.isArray(d.tags) ? d.tags : [],
          category: d.category || '',
          coverImageUrl: d.coverImageUrl || '',
          status: d.status,
          createdAt: parseServerTimestamp(d.createdAt),
          updatedAt: parseServerTimestamp(d.updatedAt),
          publishedAt: parseServerTimestamp(d.publishedAt),
          readingTimeMinutes: d.readingTimeMinutes || 1,
        }));
      }
    }
  } catch (err) {
    console.warn('API getAllPostsAdmin fallback:', err);
  }

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
  const nowMs = Date.now();

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

  // 1. Post to PostgreSQL Cloud SQL backend
  try {
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload),
    });
  } catch (err) {
    console.warn('PostgreSQL API savePost error:', err);
  }

  // 2. Mirror locally
  const local = getLocalPosts();
  const idx = postId ? local.findIndex((p) => p.id === postId) : -1;
  const newPost: Post = {
    ...postPayload,
    createdAt: idx >= 0 ? local[idx].createdAt : (data.createdAt || nowMs),
    updatedAt: nowMs,
    publishedAt: data.status === 'published' ? (idx >= 0 && local[idx].publishedAt ? local[idx].publishedAt : nowMs) : undefined,
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
  try {
    await fetch(`/api/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Failed to delete post from API:', err);
  }

  // Remove matching by id or slug from local cache
  const local = getLocalPosts().filter((p) => p.id !== postId && p.slug !== postId);
  setLocalPosts(local);
}

export async function togglePostStatus(postId: string, newStatus: PostStatus): Promise<Post | null> {
  const nowMs = Date.now();
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      console.warn('Failed to update status on server:', await res.text());
    }
  } catch (err) {
    console.warn('Status patch network error:', err);
  }

  // Update in local cache
  const local = getLocalPosts();
  const idx = local.findIndex((p) => p.id === postId || p.slug === postId);
  if (idx >= 0) {
    local[idx] = {
      ...local[idx],
      status: newStatus,
      updatedAt: nowMs,
      publishedAt: newStatus === 'published' ? local[idx].publishedAt || nowMs : undefined,
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
  const novelPayload = {
    id: targetId,
    title: data.title,
    slug: data.slug,
    synopsis: data.synopsis,
    coverImageUrl: data.coverImageUrl || '',
    status: data.status,
  };

  try {
    await fetch('/api/novels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novelPayload),
    });
  } catch (err) {
    console.warn('Failed to save novel to API:', err);
  }

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
  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Failed to delete novel from API:', err);
  }

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
  const payload = {
    id: targetId,
    title: data.title,
    chapterNumber: Number(data.chapterNumber),
    body: data.body,
    status: data.status,
  };

  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Failed to save chapter to API:', err);
  }

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
  try {
    await fetch(`/api/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(chapterId)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to delete chapter from API:', err);
  }

  const all = getLocalChapters();
  all[novelId] = (all[novelId] || []).filter((c) => c.id !== chapterId);
  setLocalChapters(all);
}

export async function saveAuthorProfile(profile: Partial<AuthorProfile>): Promise<void> {
  try {
    await fetch('/api/author', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
  } catch (err) {
    console.warn('Failed to update author to API:', err);
  }

  try {
    const existing = await getAuthorProfile();
    const updated = { ...existing, ...profile, updatedAt: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_AUTHOR_KEY, JSON.stringify(updated));
  } catch {}
}
