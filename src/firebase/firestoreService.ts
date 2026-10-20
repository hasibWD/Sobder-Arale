import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';
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

// Helper to get local data safely
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

function setLocalPosts(posts: Post[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_POSTS_KEY, JSON.stringify(posts));
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

function setLocalNovels(novels: Novel[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOVELS_KEY, JSON.stringify(novels));
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

function setLocalChapters(chapters: Record<string, Chapter[]>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHAPTERS_KEY, JSON.stringify(chapters));
  } catch (err) {
    console.error('Failed to save chapters to local storage:', err);
  }
}

function convertTimestamp(val: unknown): number {
  if (!val) return Date.now();
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime();
  if (typeof val === 'object' && 'seconds' in (val as Record<string, unknown>)) {
    return (val as { seconds: number }).seconds * 1000;
  }
  return Date.now();
}

/* ========================================================
   PUBLIC READ APIS (Only published content)
   ======================================================== */

export async function getPublishedPosts(type?: PostType, tag?: string, limitCount = 50): Promise<Post[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const postsRef = collection(db, 'posts');
      let q = query(
        postsRef,
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(limitCount)
      );

      if (type) {
        q = query(
          postsRef,
          where('status', '==', 'published'),
          where('type', '==', type),
          orderBy('publishedAt', 'desc'),
          limit(limitCount)
        );
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const results: Post[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (tag && (!data.tags || !data.tags.includes(tag))) {
            return;
          }
          results.push({
            id: d.id,
            title: data.title || '',
            slug: data.slug || d.id,
            type: data.type || 'poem',
            excerpt: data.excerpt || '',
            body: data.body || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            category: data.category || '',
            coverImageUrl: data.coverImageUrl || '',
            status: data.status || 'published',
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            publishedAt: convertTimestamp(data.publishedAt),
            readingTimeMinutes: data.readingTimeMinutes || 2,
          });
        });
        return results;
      }
    } catch (error) {
      console.warn('Firestore getPublishedPosts fallback to local storage:', error);
    }
  }

  // Local storage fallback
  const localPosts = getLocalPosts().filter((p) => p.status === 'published');
  let filtered = localPosts;
  if (type) {
    filtered = filtered.filter((p) => p.type === type);
  }
  if (tag) {
    filtered = filtered.filter((p) => p.tags && p.tags.includes(tag));
  }
  return filtered
    .sort((a, b) => (b.publishedAt || b.createdAt) - (a.publishedAt || a.createdAt))
    .slice(0, limitCount);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('slug', '==', slug), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          slug: data.slug || d.id,
          type: data.type || 'poem',
          excerpt: data.excerpt || '',
          body: data.body || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          category: data.category || '',
          coverImageUrl: data.coverImageUrl || '',
          status: data.status || 'draft',
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          publishedAt: convertTimestamp(data.publishedAt),
          readingTimeMinutes: data.readingTimeMinutes || 2,
        };
      }
    } catch (error) {
      console.warn('Firestore getPostBySlug fallback:', error);
    }
  }

  // Fallback to local
  const localPosts = getLocalPosts();
  const match = localPosts.find((p) => p.slug === slug || p.id === slug);
  return match || null;
}

export async function getPublishedNovels(): Promise<Novel[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const novelsRef = collection(db, 'novels');
      const q = query(novelsRef, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results: Novel[] = [];
        snap.forEach((d) => {
          const data = d.data();
          results.push({
            id: d.id,
            title: data.title || '',
            slug: data.slug || d.id,
            synopsis: data.synopsis || '',
            coverImageUrl: data.coverImageUrl || '',
            status: data.status || 'ongoing',
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            chapterCount: data.chapterCount || 0,
          });
        });
        return results;
      }
    } catch (error) {
      console.warn('Firestore getPublishedNovels fallback:', error);
    }
  }

  return getLocalNovels().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNovelBySlugOrId(identifier: string): Promise<Novel | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const novelsRef = collection(db, 'novels');
      const q = query(novelsRef, where('slug', '==', identifier), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          slug: data.slug || d.id,
          synopsis: data.synopsis || '',
          coverImageUrl: data.coverImageUrl || '',
          status: data.status || 'ongoing',
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          chapterCount: data.chapterCount || 0,
        };
      }
      const direct = await getDoc(doc(db, 'novels', identifier));
      if (direct.exists()) {
        const data = direct.data();
        return {
          id: direct.id,
          title: data.title || '',
          slug: data.slug || direct.id,
          synopsis: data.synopsis || '',
          coverImageUrl: data.coverImageUrl || '',
          status: data.status || 'ongoing',
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          chapterCount: data.chapterCount || 0,
        };
      }
    } catch (error) {
      console.warn('Firestore getNovelBySlugOrId fallback:', error);
    }
  }

  const localNovels = getLocalNovels();
  return localNovels.find((n) => n.slug === identifier || n.id === identifier) || null;
}

export async function getPublishedChapters(novelId: string): Promise<Chapter[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const chaptersRef = collection(db, `novels/${novelId}/chapters`);
      const q = query(
        chaptersRef,
        where('status', '==', 'published'),
        orderBy('chapterNumber', 'asc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results: Chapter[] = [];
        snap.forEach((d) => {
          const data = d.data();
          results.push({
            id: d.id,
            novelId,
            title: data.title || '',
            chapterNumber: Number(data.chapterNumber) || 1,
            body: data.body || '',
            status: data.status || 'published',
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            publishedAt: convertTimestamp(data.publishedAt),
          });
        });
        return results;
      }
    } catch (error) {
      console.warn('Firestore getPublishedChapters fallback:', error);
    }
  }

  const allChapters = getLocalChapters();
  const list = allChapters[novelId] || [];
  return list
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export async function getChapterById(novelId: string, chapterId: string): Promise<Chapter | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const docSnap = await getDoc(doc(db, `novels/${novelId}/chapters`, chapterId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          novelId,
          title: data.title || '',
          chapterNumber: Number(data.chapterNumber) || 1,
          body: data.body || '',
          status: data.status || 'draft',
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          publishedAt: convertTimestamp(data.publishedAt),
        };
      }
    } catch (error) {
      console.warn('Firestore getChapterById fallback:', error);
    }
  }

  const allChapters = getLocalChapters();
  const list = allChapters[novelId] || [];
  return list.find((c) => c.id === chapterId || String(c.chapterNumber) === chapterId) || null;
}

export async function getAuthorProfile(): Promise<AuthorProfile | null> {
  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(db, 'authors', 'main'));
      if (snap.exists()) {
        const data = snap.data();
        return {
          displayName: data.displayName || '',
          bio: data.bio || '',
          photoURL: data.photoURL || '',
          philosophy: data.philosophy || '',
          email: data.email || '',
          location: data.location || '',
          socialLinks: data.socialLinks || {},
          updatedAt: convertTimestamp(data.updatedAt),
        };
      }
    } catch (error) {
      console.warn('Firestore getAuthorProfile fallback:', error);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUTHOR_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return initialAuthorProfile;
}

/* ========================================================
   ADMIN & AUTHOR MANAGEMENT APIS (With Instant Persistence)
   ======================================================== */

export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (!db || !isFirebaseConfigured() || !uid) {
    // If running in local author mode
    return localStorage.getItem('shobder_arale_author_active') === 'true';
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists() && adminDoc.data()?.role === 'owner';
  } catch (error) {
    console.warn('Admin check warning:', error);
    return localStorage.getItem('shobder_arale_author_active') === 'true';
  }
}

export async function getAllPostsAdmin(): Promise<Post[]> {
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(collection(db, 'posts'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const results: Post[] = [];
        snap.forEach((d) => {
          const data = d.data();
          results.push({
            id: d.id,
            title: data.title || '',
            slug: data.slug || d.id,
            type: data.type || 'poem',
            excerpt: data.excerpt || '',
            body: data.body || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            category: data.category || '',
            coverImageUrl: data.coverImageUrl || '',
            status: data.status || 'draft',
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            publishedAt: convertTimestamp(data.publishedAt),
            readingTimeMinutes: data.readingTimeMinutes || 2,
          });
        });
        return results;
      }
    } catch (error) {
      console.warn('Firestore getAllPostsAdmin fallback:', error);
    }
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
  const nowMs = Date.now();
  const isPublishing = data.status === 'published';
  const targetId = postId || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const localPosts = getLocalPosts();
  const existingIndex = postId ? localPosts.findIndex((p) => p.id === postId) : -1;

  const newPostObj: Post = {
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
    createdAt: existingIndex >= 0 ? localPosts[existingIndex].createdAt : (data.createdAt || nowMs),
    updatedAt: nowMs,
    publishedAt: isPublishing
      ? (existingIndex >= 0 && localPosts[existingIndex].publishedAt ? localPosts[existingIndex].publishedAt : nowMs)
      : undefined,
    readingTimeMinutes: data.readingTimeMinutes || 2,
  };

  if (existingIndex >= 0) {
    localPosts[existingIndex] = newPostObj;
  } else {
    localPosts.unshift(newPostObj);
  }
  setLocalPosts(localPosts);

  // If Firebase is configured, also persist to Firestore
  if (db && isFirebaseConfigured()) {
    try {
      const postRef = doc(db, 'posts', targetId);
      await setDoc(
        postRef,
        {
          title: data.title,
          slug: data.slug,
          type: data.type,
          excerpt: data.excerpt,
          body: data.body,
          tags: data.tags,
          category: data.category || '',
          coverImageUrl: data.coverImageUrl || '',
          status: data.status,
          updatedAt: serverTimestamp(),
          createdAt: newPostObj.createdAt ? Timestamp.fromMillis(newPostObj.createdAt) : serverTimestamp(),
          publishedAt: newPostObj.publishedAt ? Timestamp.fromMillis(newPostObj.publishedAt) : null,
          readingTimeMinutes: data.readingTimeMinutes || 2,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to mirror post to Firestore (persisted locally):', err);
    }
  }

  return targetId;
}

export async function deletePost(postId: string): Promise<void> {
  const localPosts = getLocalPosts().filter((p) => p.id !== postId);
  setLocalPosts(localPosts);

  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn('Failed to delete from Firestore:', err);
    }
  }
}

export async function getAllNovelsAdmin(): Promise<Novel[]> {
  return getPublishedNovels();
}

export async function saveNovel(
  novelId: string | null,
  data: Omit<Novel, 'id' | 'createdAt' | 'updatedAt' | 'chapterCount'>
): Promise<string> {
  const nowMs = Date.now();
  const targetId = novelId || `novel-${Date.now()}`;
  const localNovels = getLocalNovels();
  const existingIndex = novelId ? localNovels.findIndex((n) => n.id === novelId) : -1;

  const novelObj: Novel = {
    id: targetId,
    title: data.title,
    slug: data.slug,
    synopsis: data.synopsis,
    coverImageUrl: data.coverImageUrl || '',
    status: data.status,
    createdAt: existingIndex >= 0 ? localNovels[existingIndex].createdAt : nowMs,
    updatedAt: nowMs,
    chapterCount: existingIndex >= 0 ? localNovels[existingIndex].chapterCount || 0 : 0,
  };

  if (existingIndex >= 0) {
    localNovels[existingIndex] = novelObj;
  } else {
    localNovels.unshift(novelObj);
  }
  setLocalNovels(localNovels);

  if (db && isFirebaseConfigured()) {
    try {
      const novelRef = doc(db, 'novels', targetId);
      await setDoc(novelRef, {
        title: data.title,
        slug: data.slug,
        synopsis: data.synopsis,
        coverImageUrl: data.coverImageUrl || '',
        status: data.status,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to mirror novel to Firestore:', err);
    }
  }

  return targetId;
}

export async function deleteNovel(novelId: string): Promise<void> {
  const localNovels = getLocalNovels().filter((n) => n.id !== novelId);
  setLocalNovels(localNovels);

  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, 'novels', novelId));
    } catch (err) {
      console.warn('Failed to delete novel from Firestore:', err);
    }
  }
}

export async function getAllChaptersAdmin(novelId: string): Promise<Chapter[]> {
  const allChapters = getLocalChapters();
  const list = allChapters[novelId] || [];
  return list.sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export async function saveChapter(
  novelId: string,
  chapterId: string | null,
  data: Omit<Chapter, 'id' | 'novelId' | 'createdAt' | 'updatedAt' | 'publishedAt'>
): Promise<string> {
  const nowMs = Date.now();
  const targetId = chapterId || `chap-${Date.now()}`;
  const allChapters = getLocalChapters();
  const list = allChapters[novelId] || [];
  const existingIdx = chapterId ? list.findIndex((c) => c.id === chapterId) : -1;

  const chapObj: Chapter = {
    id: targetId,
    novelId,
    title: data.title,
    chapterNumber: Number(data.chapterNumber),
    body: data.body,
    status: data.status,
    createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : nowMs,
    updatedAt: nowMs,
    publishedAt: data.status === 'published' ? nowMs : undefined,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = chapObj;
  } else {
    list.push(chapObj);
  }
  allChapters[novelId] = list;
  setLocalChapters(allChapters);

  // Update chapter count on novel
  const localNovels = getLocalNovels();
  const nIdx = localNovels.findIndex((n) => n.id === novelId);
  if (nIdx >= 0) {
    localNovels[nIdx].chapterCount = list.length;
    localNovels[nIdx].updatedAt = nowMs;
    setLocalNovels(localNovels);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const chapterRef = doc(db, `novels/${novelId}/chapters`, targetId);
      await setDoc(chapterRef, {
        title: data.title,
        chapterNumber: Number(data.chapterNumber),
        body: data.body,
        status: data.status,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to mirror chapter to Firestore:', err);
    }
  }

  return targetId;
}

export async function deleteChapter(novelId: string, chapterId: string): Promise<void> {
  const allChapters = getLocalChapters();
  const list = (allChapters[novelId] || []).filter((c) => c.id !== chapterId);
  allChapters[novelId] = list;
  setLocalChapters(allChapters);

  const localNovels = getLocalNovels();
  const nIdx = localNovels.findIndex((n) => n.id === novelId);
  if (nIdx >= 0) {
    localNovels[nIdx].chapterCount = list.length;
    setLocalNovels(localNovels);
  }

  if (db && isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, `novels/${novelId}/chapters`, chapterId));
    } catch (err) {
      console.warn('Failed to delete chapter from Firestore:', err);
    }
  }
}

export async function saveAuthorProfile(profile: Partial<AuthorProfile>): Promise<void> {
  try {
    const existing = await getAuthorProfile();
    const updated = { ...existing, ...profile, updatedAt: Date.now() };
    localStorage.setItem(LOCAL_STORAGE_AUTHOR_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save author locally:', err);
  }

  if (db && isFirebaseConfigured()) {
    try {
      const authorRef = doc(db, 'authors', 'main');
      await setDoc(authorRef, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn('Failed to mirror author to Firestore:', err);
    }
  }
}
