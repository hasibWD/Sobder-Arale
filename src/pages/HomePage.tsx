import React, { useEffect, useState } from 'react';
import { Post, Novel } from '../types';
import { getPublishedPosts, getPublishedNovels } from '../services/literatureService';
import { useAuth } from '../supabase/authContext';
import { WritingCard } from '../components/public/WritingCard';
import { NovelCard } from '../components/public/NovelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Feather, BookOpen, Sparkles, ArrowRight, BookMarked, PenTool } from 'lucide-react';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { isAdmin } = useAuth();
  const [poems, setPoems] = useState<Post[]>([]);
  const [stories, setStories] = useState<Post[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

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

    loadHomeContent();

    const handleLiteratureUpdated = () => {
      loadHomeContent();
    };

    window.addEventListener('literature_updated', handleLiteratureUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('literature_updated', handleLiteratureUpdated);
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
            {isAdmin && (
              <button
                onClick={() => navigate('/write')}
                className="px-6 py-2.5 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-bold hover:bg-[#723925] transition-all shadow-md flex items-center space-x-2 ring-2 ring-[#8C4A32]/30 hover:scale-[1.02]"
              >
                <Feather className="w-4 h-4 transform -rotate-12" />
                <span>নতুন লেখা লিখুন ও পোস্ট করুন</span>
              </button>
            )}
            <button
              onClick={() => navigate('/poems')}
              className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#CDBEAA] text-[#3E3228] font-serif-bn text-sm font-medium hover:bg-[#F2E8DC] transition-all flex items-center space-x-1.5"
            >
              <span>কবিতা পড়ুন</span>
              <ArrowRight className="w-4 h-4 text-[#8C4A32]" />
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
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Author Quick Writing Prompt Banner (Admin Only) */}
        {isAdmin && (
          <section className="bg-gradient-to-r from-[#F5EDE1] to-[#FAF3E7] rounded-2xl border border-[#DFCBB5] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-serif-bn">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-white border border-[#DFCBB5] flex items-center justify-center text-[#8C4A32] shrink-0 shadow-sm">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#2C2621]">
                  অ্যাডমিন ড্যাশবোর্ড দ্রুত পোস্ট
                </h3>
                <p className="text-xs sm:text-sm text-[#6F6052]">
                  নতুন কবিতা, গল্প কিংবা উপন্যাসের অধ্যায় রচনা করে সরাসরি পোস্ট করুন।
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/write')}
              className="px-5 py-2.5 rounded-xl bg-[#8C4A32] text-white text-xs sm:text-sm font-bold hover:bg-[#723925] transition-all shadow-sm shrink-0 flex items-center space-x-2"
            >
              <span>লেখালিখি শুরু করুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
