import React, { useEffect, useState } from 'react';
import { Post, Novel } from '../types';
import { getPublishedPosts, getPublishedNovels } from '../services/literatureService';
import { WritingCard } from '../components/public/WritingCard';
import { NovelCard } from '../components/public/NovelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { toBengaliNumber } from '../utils/bengaliUtils';
import { Search, X, BookOpen, Feather } from 'lucide-react';

interface SearchPageProps {
  navigate: (path: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ navigate }) => {
  const [queryText, setQueryText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAllPublished() {
      try {
        setLoading(true);
        // Only load published posts and novels - zero drafts
        const [publishedPosts, publishedNovels] = await Promise.all([
          getPublishedPosts(undefined, undefined, 100),
          getPublishedNovels(),
        ]);

        if (isMounted) {
          setPosts(publishedPosts);
          setNovels(publishedNovels);
        }
      } catch (err) {
        console.error('Error fetching data for search:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllPublished();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedQuery = queryText.trim().toLowerCase();

  const matchingPosts = normalizedQuery
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(normalizedQuery) ||
          p.excerpt.toLowerCase().includes(normalizedQuery) ||
          p.body.toLowerCase().includes(normalizedQuery) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(normalizedQuery)))
      )
    : [];

  const matchingNovels = normalizedQuery
    ? novels.filter(
        (n) =>
          n.title.toLowerCase().includes(normalizedQuery) ||
          n.synopsis.toLowerCase().includes(normalizedQuery)
      )
    : [];

  const totalResults = matchingPosts.length + matchingNovels.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Search Header */}
      <div className="border-b border-[#E8DEC8] pb-8 space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn">
          <Search className="w-4 h-4" />
          <span>পঙ্‌ক্তি ও লেখার সন্ধান</span>
        </div>
        <h1 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621]">
          সাহিত্য সন্ধান
        </h1>
        <p className="font-serif-bn text-base text-[#6F6052] max-w-2xl">
          পছন্দের কবিতা, ছোটগল্প কিংবা উপন্যাসের যেকোনো শিরোনাম বা শব্দ লিখে খুঁজুন। শুধুমাত্র প্রকাশিত সাহিত্য অনুসন্ধানযোগ্য।
        </p>
      </div>

      {/* Search Input Box */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="w-5 h-5 text-[#8C4A32] absolute left-4 top-3.5" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="যেকোনো বাংলা শব্দ, পঙ্‌ক্তি বা শিরোনাম লিখুন..."
            autoFocus
            className="w-full pl-12 pr-10 py-3 rounded-2xl border border-[#DFCBB5] bg-[#FAF7F2] font-serif-bn text-base text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32] shadow-sm"
          />
          {queryText && (
            <button
              onClick={() => setQueryText('')}
              className="absolute right-4 top-3.5 text-stone-400 hover:text-stone-700"
              aria-label="মুছে ফেলুন"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results Display */}
      {loading ? (
        <LoadingSpinner message="তথ্যসূচি তল্লাশি করা হচ্ছে..." />
      ) : normalizedQuery ? (
        <div className="space-y-10">
          <div className="text-sm font-serif-bn text-[#7A6B5D] border-b border-[#EFE5D5] pb-3">
            <span>"{queryText}" এর জন্য মোট </span>
            <strong className="text-[#8C4A32] font-semibold">{toBengaliNumber(totalResults)}টি</strong>
            <span> ফলাফল পাওয়া গেছে</span>
          </div>

          {totalResults > 0 ? (
            <div className="space-y-12">
              {/* Matching Novels */}
              {matchingNovels.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#8C4A32] font-serif-bn font-bold text-lg">
                    <BookOpen className="w-4 h-4" />
                    <span>উপন্যাস ({toBengaliNumber(matchingNovels.length)})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {matchingNovels.map((novel) => (
                      <NovelCard
                        key={novel.id}
                        novel={novel}
                        onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Posts (Poems / Stories / Essays) */}
              {matchingPosts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[#8C4A32] font-serif-bn font-bold text-lg">
                    <Feather className="w-4 h-4" />
                    <span>কবিতা ও গল্প ({toBengaliNumber(matchingPosts.length)})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchingPosts.map((post) => (
                      <WritingCard
                        key={post.id}
                        post={post}
                        onClick={() => navigate(`/read/${post.type}/${post.slug}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="কোনো ফলাফল মেলেনি"
              description={`"${queryText}" দিয়ে কোনো প্রকাশিত রচনা খুঁজে পাওয়া যায়নি। বানান পরিবর্তন করে বা অন্য শব্দ দিয়ে চেষ্টা করুন।`}
              icon="alert"
            />
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-[#7A6B5D] font-serif-bn space-y-2">
          <Search className="w-10 h-10 mx-auto text-[#8C4A32] opacity-40 mb-3" />
          <p className="text-base">উপরে অনুসন্ধান বক্সে যেকোনো শব্দ লিখে খুঁজুন</p>
          <p className="text-xs opacity-75">যেমন: নদী, বৃষ্টি, প্রেম, নিঃসঙ্গতা, পথ ইত্যাদি</p>
        </div>
      )}
    </div>
  );
};
