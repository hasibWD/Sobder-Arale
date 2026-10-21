import React, { useEffect, useState } from 'react';
import { Post } from '../types';
import { getPublishedPosts } from '../services/literatureService';
import { WritingCard } from '../components/public/WritingCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Feather, Search, Tag, X } from 'lucide-react';
import { toBengaliNumber } from '../utils/bengaliUtils';

interface PoetryPageProps {
  navigate: (path: string) => void;
}

export const PoetryPage: React.FC<PoetryPageProps> = ({ navigate }) => {
  const [poems, setPoems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    let isMounted = true;
    async function loadPoems() {
      try {
        setLoading(true);
        const data = await getPublishedPosts('poem', undefined, 100);
        if (isMounted) {
          setPoems(data);
        }
      } catch (err) {
        console.error('Error fetching poems:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPoems();
    return () => {
      isMounted = false;
    };
  }, []);

  // Collect all unique tags across poems
  const allTags = Array.from(
    new Set(poems.flatMap((p) => p.tags || []).filter(Boolean))
  );

  // Filter poems based on search query and selected tag
  const filteredPoems = poems.filter((poem) => {
    const matchesQuery =
      searchQuery.trim() === '' ||
      poem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poem.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poem.body.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || (poem.tags && poem.tags.includes(selectedTag));

    return matchesQuery && matchesTag;
  });

  const displayedPoems = filteredPoems.slice(0, visibleCount);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E8DEC8] pb-8 space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn">
          <Feather className="w-4 h-4 transform -rotate-12" />
          <span>পঙ্‌ক্তি ও ছন্দের জলছবি</span>
        </div>
        <h1 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621]">
          কবিতাগুচ্ছ
        </h1>
        <p className="font-serif-bn text-base text-[#6F6052] max-w-2xl">
          হৃদয়ের গভীরতম ক্ষতের উপশম কিংবা ভালোবাসার নিভৃত উচ্চারণ—এখানে প্রতিটি কবিতা এক একটি রক্তক্ষরণের অথবা প্রশান্তির গল্প।
        </p>
      </div>

      {/* Search and Tag Filtering Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C4A32] absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কবিতার শিরোনাম বা পঙ্‌ক্তি দিয়ে খুঁজুন..."
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
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none font-serif-bn text-xs">
            <span className="text-[#7A6B5D] shrink-0 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>বিষয়বস্তু:</span>
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full transition-colors shrink-0 ${
                selectedTag === null
                  ? 'bg-[#8C4A32] text-white font-medium'
                  : 'bg-[#F2E8DC] text-[#5A4B3D] hover:bg-[#EBDDCB]'
              }`}
            >
              সব ({toBengaliNumber(poems.length)})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full transition-colors shrink-0 ${
                  selectedTag === tag
                    ? 'bg-[#8C4A32] text-white font-medium'
                    : 'bg-[#F2E8DC] text-[#5A4B3D] hover:bg-[#EBDDCB]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Poetry Content Grid */}
      {loading ? (
        <LoadingSpinner message="কবিতাগুলো পৃষ্ঠাভুক্ত করা হচ্ছে..." />
      ) : displayedPoems.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedPoems.map((poem) => (
              <WritingCard
                key={poem.id}
                post={poem}
                onClick={() => navigate(`/read/poem/${poem.slug}`)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {filteredPoems.length > visibleCount && (
            <div className="text-center pt-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="px-6 py-2.5 rounded-xl border border-[#CDBEAA] bg-[#FAF7F2] font-serif-bn text-sm text-[#3E3228] hover:bg-[#F2E8DC] hover:border-[#8C4A32] transition-colors"
              >
                আরও কবিতা দেখুন ({toBengaliNumber(filteredPoems.length - visibleCount)}টি বাকি)
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title={searchQuery || selectedTag ? 'কোনো কবিতা মেলেনি' : 'এখনও কোনো কবিতা প্রকাশিত হয়নি'}
          description={
            searchQuery || selectedTag
              ? 'অন্য কোনো শব্দ বা ট্যাগ দিয়ে অনুসন্ধান করে দেখতে পারেন।'
              : 'লেখক শীঘ্রই নতুন কবিতার পঙ্‌ক্তিমালায় সাজিয়ে তুলবেন এই প্রাঙ্গণ।'
          }
          icon="feather"
        />
      )}
    </div>
  );
};
