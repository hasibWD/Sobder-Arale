import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // 'poem' | 'story' | 'essay'
  excerpt: text('excerpt').notNull().default(''),
  body: text('body').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  category: text('category').default(''),
  coverImageUrl: text('cover_image_url').default(''),
  status: text('status').notNull().default('published'), // 'draft' | 'published'
  readingTimeMinutes: integer('reading_time_minutes').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  publishedAt: timestamp('published_at'),
});

export const novels = pgTable('novels', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  synopsis: text('synopsis').notNull().default(''),
  coverImageUrl: text('cover_image_url').default(''),
  status: text('status').notNull().default('ongoing'), // 'ongoing' | 'completed'
  chapterCount: integer('chapter_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chapters = pgTable('chapters', {
  id: text('id').primaryKey(),
  novelId: text('novel_id')
    .references(() => novels.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  chapterNumber: integer('chapter_number').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('published'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  publishedAt: timestamp('published_at'),
});

export const authorProfile = pgTable('author_profile', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull().default('শব্দের কারিগর'),
  bio: text('bio').default(''),
  photoURL: text('photo_url').default(''),
  philosophy: text('philosophy').default(''),
  email: text('email').default(''),
  location: text('location').default(''),
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const novelsRelations = relations(novels, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  novel: one(novels, {
    fields: [chapters.novelId],
    references: [novels.id],
  }),
}));
