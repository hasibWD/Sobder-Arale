import React, { useEffect, useState } from 'react';
import { Post } from '../types';
import { getPublishedPosts } from '../firebase/firestoreService';
import { WritingCard } from '../components/public/WritingCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { PenTool, Search, Tag, X } from 'lucide-react';
import { toBengaliNumber } from '../utils/bengaliUtils';

interface StoriesPageProps {
  navigate: (path: string) => void;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({ navigate }) => {
  const [stories, setStories] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStories() {
      try {
        setLoading(true);
        const data = await getPublishedPosts('story', undefined, 100);
        if (isMounted) {
          setStories(data);
        }
      } catch (err) {
        console.error('Error fetching stories:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStories();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = Array.from(
    new Set(stories.map((s) => s.category).filter(Boolean) as string[])
  );

  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.body.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || story.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E8DEC8] pb-8 space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn">
          <PenTool className="w-4 h-4" />
          <span>ছোটগল্প ও আখ্যান</span>
        </div>
        <h1 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621]">
          ছোটগল্প সম্ভার
        </h1>
        <p className="font-serif-bn text-base text-[#6F6052] max-w-2xl">
          আমাদের চারপাশের চেনা-অচেনা মানুষ, তাঁদের টানাপোড়েন, নিঃশব্দ দীর্ঘশ্বাস ও জীবনের অদ্ভুত মোড় নিয়ে রচিত ছোটগল্পমালা।
        </p>
      </div>

      {/* Filter and Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C4A32] absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="গল্পের শিরোনাম বা চরিত্র নিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DFCBB5] bg-[#FAF7F2] font-serif-bn text-sm text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories if available */}
        {categories.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none font-serif-bn text-xs">
            <span className="text-[#7A6B5D] shrink-0">বিভাগ:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-full transition-colors shrink-0 ${
                selectedCategory === null
                  ? 'bg-[#8C4A32] text-white font-medium'
                  : 'bg-[#F2E8DC] text-[#5A4B3D] hover:bg-[#EBDDCB]'
              }`}
            >
              সব ({toBengaliNumber(stories.length)})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`px-3 py-1 rounded-full transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#8C4A32] text-white font-medium'
                    : 'bg-[#F2E8DC] text-[#5A4B3D] hover:bg-[#EBDDCB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stories Listing Grid */}
      {loading ? (
        <LoadingSpinner message="গল্পগুলো সাজানো হচ্ছে..." />
      ) : filteredStories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => (
            <WritingCard
              key={story.id}
              post={story}
              onClick={() => navigate(`/read/story/${story.slug}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={searchQuery || selectedCategory ? 'কোনো গল্প মেলেনি' : 'এখনও কোনো ছোটগল্প প্রকাশিত হয়নি'}
          description={
            searchQuery || selectedCategory
              ? 'অন্য কোনো শব্দ বা বিভাগে অনুসন্ধান করে দেখতে পারেন।'
              : 'লেখক শীঘ্রই তাঁর ছোটগল্পের খাতা উন্মুক্ত করবেন।'
          }
          icon="book"
        />
      )}
    </div>
  );
};
