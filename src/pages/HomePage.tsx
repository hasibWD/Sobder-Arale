import React, { useEffect, useState } from 'react';
import { Post, Novel } from '../types';
import { getPublishedPosts, getPublishedNovels } from '../services/literatureService';
import { WritingCard } from '../components/public/WritingCard';
import { NovelCard } from '../components/public/NovelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Feather, BookOpen, Sparkles, ArrowRight, BookMarked, PenTool, Bookmark, Clock, RotateCcw } from 'lucide-react';
import { bookmarkProgressService, ReadingProgressItem } from '../services/bookmarkProgressService';
import { toBengaliNumber } from '../utils/bengaliUtils';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [poems, setPoems] = useState<Post[]>([]);
  const [stories, setStories] = useState<Post[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentProgress, setRecentProgress] = useState<ReadingProgressItem | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadHomeContent() {
      try {
        setLoading(true);
        const [recentPoems, recentStories, publishedNovels] = await Promise.all([
          getPublishedPosts('poem', undefined, 4),
          getPublishedPosts('story', undefined, 3),
          getPublishedNovels(),
        ]);

        if (!isMounted) return;

        setPoems(recentPoems);
        setStories(recentStories);
        setNovels(publishedNovels);

        // Pick the first story or poem as featured if available
        if (recentStories.length > 0) {
          setFeaturedPost(recentStories[0]);
        } else if (recentPoems.length > 0) {
          setFeaturedPost(recentPoems[0]);
        } else {
          setFeaturedPost(null);
        }
      } catch (err) {
        console.error('Error fetching home content:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const checkProgress = () => {
      const all = bookmarkProgressService.getAllProgress();
      if (all && all.length > 0) {
        setRecentProgress(all[0]);
      } else {
        setRecentProgress(null);
      }
    };

    loadHomeContent();
    checkProgress();

    const handleLiteratureUpdated = () => {
      loadHomeContent();
    };

    const unsubProgress = bookmarkProgressService.subscribe(() => {
      checkProgress();
    });

    window.addEventListener('literature_updated', handleLiteratureUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('literature_updated', handleLiteratureUpdated);
      unsubProgress();
    };
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* Literary Hero Introduction */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#E8DEC8] text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#DFCBB5_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />

        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#F2E8DC] border border-[#DFCBB5] text-[#8C4A32] text-xs font-serif-bn">
            <Feather className="w-3.5 h-3.5 transform -rotate-12" />
            <span>স্বত্বাধিকারীর নিভৃত সাহিত্য নীড়</span>
          </div>

          <h1 className="font-serif-bn text-4xl sm:text-6xl font-extrabold text-[#2C2621] tracking-tight leading-tight">
            কিছু অনুভূতি <span className="text-[#8C4A32] italic">শব্দেই</span> বেঁচে থাকে…
          </h1>

          <p className="font-serif-bn text-base sm:text-lg text-[#5A4B3D] max-w-2xl mx-auto leading-relaxed">
            নীরবতারও নিজস্ব এক ভাষা থাকে। এখানে সংকলিত হয়েছে আমার হৃদয়ের গোপন কথকতা, ছন্দবদ্ধ কবিতা, বাস্তবতার খেরোখাতা ও উপন্যাসের দীর্ঘ যাত্রা। পাঠকেরা কোনো অ্যাকাউন্ট বা সাইন-ইন ছাড়াই পড়তে পারবেন মুক্তমনে।
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/poems')}
              className="px-5 py-2.5 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-medium hover:bg-[#723925] transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <span>কবিতা পড়ুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/novels')}
              className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#CDBEAA] text-[#3E3228] font-serif-bn text-sm font-medium hover:bg-[#F2E8DC] transition-all flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4 text-[#8C4A32]" />
              <span>উপন্যাস</span>
            </button>
            <button
              onClick={() => navigate('/stories')}
              className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#CDBEAA] text-[#3E3228] font-serif-bn text-sm font-medium hover:bg-[#F2E8DC] transition-all flex items-center space-x-1.5"
            >
              <PenTool className="w-4 h-4 text-[#8C4A32]" />
              <span>ছোটগল্প</span>
            </button>
            <button
              onClick={() => navigate('/books')}
              className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#CDBEAA] text-[#3E3228] font-serif-bn text-sm font-medium hover:bg-[#F2E8DC] transition-all flex items-center space-x-1.5"
            >
              <BookMarked className="w-4 h-4 text-[#8C4A32]" />
              <span>বই ও পিডিএফ</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Continue Reading (যেখান থেকে পড়া শেষ করেছিলেন) Resume Card */}
        {recentProgress && (
          <section className="bg-gradient-to-r from-[#FAF5EC] via-[#F4EBE0] to-[#EFE2D2] border border-[#DFCBB5] rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all hover:border-[#8C4A32]/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8C4A32]/10 text-[#8C4A32] border border-[#8C4A32]/20 font-serif-bn">
                    <Bookmark className="w-3.5 h-3.5" />
                    যেখান থেকে পড়া থামিয়েছিলেন
                  </span>
                  <span className="text-xs text-[#7A6B5D] font-serif-bn">
                    {recentProgress.parentTitle || 'সর্বশেষ পঠিত'}
                  </span>
                </div>

                <h3 className="font-serif-bn text-xl sm:text-2xl font-bold text-[#2C2621]">
                  {recentProgress.title}
                </h3>

                {/* Progress bar */}
                <div className="max-w-md space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-serif-bn text-[#5C4F43]">
                    <span className="flex items-center gap-1 font-semibold text-[#8C4A32]">
                      <Sparkles className="w-3.5 h-3.5" />
                      {toBengaliNumber(recentProgress.percentage)}% পাঠ সম্পন্ন হয়েছে
                    </span>
                  </div>
                  <div className="w-full bg-[#E5D7C5] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#8C4A32] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${recentProgress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-center">
                <button
                  onClick={() => navigate(recentProgress.url)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-semibold hover:bg-[#723925] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>পড়া চালিয়ে যান</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <LoadingSpinner message="সাহিত্যের সম্ভার উন্মোচন করা হচ্ছে..." />
        ) : (
          <>
            {/* Featured Writing (if any) */}
            {featuredPost && (
              <section className="space-y-6">
                <div className="flex items-center space-x-2 text-[#8C4A32] font-serif-bn">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2C2621]">
                    নির্বাচিত রচনা
                  </h2>
                </div>

                <div
                  onClick={() => navigate(`/read/${featuredPost.type}/${featuredPost.slug}`)}
                  className="bg-gradient-to-br from-[#FAF5EC] to-[#F5EBDD] rounded-3xl border border-[#DFCBB5] p-8 sm:p-10 hover:border-[#8C4A32] transition-all cursor-pointer shadow-sm relative overflow-hidden group"
                >
                  <div className="max-w-3xl space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#8C4A32] text-white text-xs font-serif-bn font-medium">
                      বিশেষ আয়োজন • {featuredPost.type === 'poem' ? 'কবিতা' : 'গল্প'}
                    </span>
                    <h3 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621] group-hover:text-[#8C4A32] transition-colors">
                      {featuredPost.title}
                    </h3>
                    <p className="font-serif-bn text-base sm:text-lg text-[#5A4B3D] leading-relaxed line-clamp-3">
                      {featuredPost.excerpt || featuredPost.body.slice(0, 220)}
                    </p>
                    <div className="pt-2">
                      <span className="inline-flex items-center space-x-2 text-[#8C4A32] font-serif-bn font-semibold text-sm group-hover:translate-x-1.5 transition-transform">
                        <span>সম্পূর্ণ রচনাটি পাঠ করুন</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Latest Poems Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif-bn text-2xl sm:text-3xl font-bold text-[#2C2621]">
                    সাম্প্রতিক কবিতা
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7A6B5D] font-serif-bn mt-0.5">
                    অনুভূতি ও ছন্দের মায়াজাল
                  </p>
                </div>
                <button
                  onClick={() => navigate('/poems')}
                  className="inline-flex items-center space-x-1 text-sm font-serif-bn text-[#8C4A32] hover:underline"
                >
                  <span>সব কবিতা</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {poems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {poems.map((poem) => (
                    <WritingCard
                      key={poem.id}
                      post={poem}
                      onClick={() => navigate(`/read/poem/${poem.slug}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="এখনও কোনো কবিতা প্রকাশিত হয়নি"
                  description="লেখক শীঘ্রই নতুন কবিতার পঙ্‌ক্তিমালায় সাজিয়ে তুলবেন এই প্রাঙ্গণ।"
                  icon="feather"
                />
              )}
            </section>

            {/* Recently Updated Novels */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif-bn text-2xl sm:text-3xl font-bold text-[#2C2621]">
                    উপন্যাস ও ধারাবাহিক আখ্যান
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7A6B5D] font-serif-bn mt-0.5">
                    দীর্ঘ কাহিনীর চরিত্র ও চিত্রনাট্য
                  </p>
                </div>
                <button
                  onClick={() => navigate('/novels')}
                  className="inline-flex items-center space-x-1 text-sm font-serif-bn text-[#8C4A32] hover:underline"
                >
                  <span>সকল উপন্যাস</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {novels.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {novels.slice(0, 2).map((novel) => (
                    <NovelCard
                      key={novel.id}
                      novel={novel}
                      onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="কোনো উপন্যাস এখনও শুরু হয়নি"
                  description="চলমান ও সমাপ্ত উপন্যাসের অধ্যায়সমূহ খুব শীঘ্রই এখানে প্রকাশ পাবে।"
                  icon="book"
                />
              )}
            </section>

            {/* Latest Stories Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif-bn text-2xl sm:text-3xl font-bold text-[#2C2621]">
                    সাম্প্রতিক ছোটগল্প
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7A6B5D] font-serif-bn mt-0.5">
                    জীবনের ছোট ছোট চিত্র ও আখ্যান
                  </p>
                </div>
                <button
                  onClick={() => navigate('/stories')}
                  className="inline-flex items-center space-x-1 text-sm font-serif-bn text-[#8C4A32] hover:underline"
                >
                  <span>সব গল্প</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {stories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stories.map((story) => (
                    <WritingCard
                      key={story.id}
                      post={story}
                      onClick={() => navigate(`/read/story/${story.slug}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="এখনও কোনো ছোটগল্প প্রকাশিত হয়নি"
                  description="নতুন জীবনমুখী ও রোমাঞ্চকর গল্পের জন্য অপেক্ষা করুন।"
                  icon="book"
                />
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
