export type PostType = 'poem' | 'story' | 'essay';

export type PostStatus = 'draft' | 'published';

export type NovelStatus = 'ongoing' | 'completed';

export interface Post {
  id: string;
  title: string;
  slug: string;
  type: PostType;
  excerpt: string;
  body: string;
  tags: string[];
  category?: string;
  coverImageUrl?: string;
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  readingTimeMinutes?: number;
}

export interface Novel {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  coverImageUrl?: string;
  status: NovelStatus;
  createdAt: number;
  updatedAt: number;
  chapterCount?: number;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  chapterNumber: number;
  body: string;
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
}

export interface AuthorProfile {
  id?: string;
  displayName: string;
  bio: string;
  photoURL?: string;
  philosophy?: string;
  email?: string;
  location?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    goodreads?: string;
    website?: string;
  };
  updatedAt?: number;
}

export interface AdminUser {
  uid: string;
  role: 'owner' | 'admin';
  email?: string;
  createdAt?: number;
}

export type ReadingTheme = 'ivory' | 'paper' | 'night';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';
