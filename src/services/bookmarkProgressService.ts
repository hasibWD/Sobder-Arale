export interface ReadingProgressItem {
  id: string;
  type: 'poem' | 'story' | 'essay' | 'novel' | 'chapter' | 'book';
  title: string;
  slug: string;
  url: string;
  parentTitle?: string;
  percentage: number;
  scrollY: number;
  lastParagraphIndex?: number;
  updatedAt: number;
}

export interface FavouriteItem {
  id: string;
  type: 'poem' | 'story' | 'essay' | 'novel' | 'chapter' | 'book';
  title: string;
  slug: string;
  url: string;
  category?: string;
  excerpt?: string;
  addedAt: number;
}

const PROGRESS_STORAGE_KEY = 'shobder_arale_reading_progress_v1';
const FAVOURITES_STORAGE_KEY = 'shobder_arale_favourites_v1';
const EVENT_NAME = 'literature_bookmark_updated';

function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export const bookmarkProgressService = {
  // Reading Progress Methods
  getAllProgress(): ReadingProgressItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!data) return [];
      const parsed: ReadingProgressItem[] = JSON.parse(data);
      return Array.isArray(parsed)
        ? parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        : [];
    } catch {
      return [];
    }
  },

  getProgress(id: string): ReadingProgressItem | null {
    const list = this.getAllProgress();
    return list.find((item) => item.id === id) || null;
  },

  saveProgress(item: Omit<ReadingProgressItem, 'updatedAt'>) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getAllProgress().filter((p) => p.id !== item.id);
      const updatedItem: ReadingProgressItem = {
        ...item,
        percentage: Math.min(100, Math.max(1, Math.round(item.percentage))),
        updatedAt: Date.now(),
      };
      // Keep up to 50 reading records
      const updatedList = [updatedItem, ...list].slice(0, 50);
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updatedList));
      notifyChange();
    } catch (err) {
      console.warn('Failed to save reading progress', err);
    }
  },

  removeProgress(id: string) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getAllProgress().filter((p) => p.id !== id);
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(list));
      notifyChange();
    } catch (err) {
      console.warn('Failed to remove reading progress', err);
    }
  },

  clearAllProgress() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    notifyChange();
  },

  // Favourites Methods
  getAllFavourites(): FavouriteItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(FAVOURITES_STORAGE_KEY);
      if (!data) return [];
      const parsed: FavouriteItem[] = JSON.parse(data);
      return Array.isArray(parsed)
        ? parsed.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
        : [];
    } catch {
      return [];
    }
  },

  isFavourite(id: string): boolean {
    const list = this.getAllFavourites();
    return list.some((item) => item.id === id);
  },

  addFavourite(item: Omit<FavouriteItem, 'addedAt'>) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getAllFavourites().filter((f) => f.id !== item.id);
      const newFav: FavouriteItem = {
        ...item,
        addedAt: Date.now(),
      };
      localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify([newFav, ...list]));
      notifyChange();
    } catch (err) {
      console.warn('Failed to save favourite', err);
    }
  },

  removeFavourite(id: string) {
    if (typeof window === 'undefined') return;
    try {
      const list = this.getAllFavourites().filter((f) => f.id !== id);
      localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(list));
      notifyChange();
    } catch (err) {
      console.warn('Failed to remove favourite', err);
    }
  },

  toggleFavourite(item: Omit<FavouriteItem, 'addedAt'>): boolean {
    const exists = this.isFavourite(item.id);
    if (exists) {
      this.removeFavourite(item.id);
      return false;
    } else {
      this.addFavourite(item);
      return true;
    }
  },

  clearAllFavourites() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(FAVOURITES_STORAGE_KEY);
    notifyChange();
  },

  subscribe(callback: () => void) {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENT_NAME, callback);
    return () => {
      window.removeEventListener(EVENT_NAME, callback);
    };
  },
};
