import React, { useEffect, useState } from 'react';
import { Novel, Chapter } from '../types';
import { getNovelBySlugOrId, getPublishedChapters } from '../services/literatureService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { toBengaliNumber, formatBengaliDate } from '../utils/bengaliUtils';
import { BookOpen, ArrowLeft, ArrowRight, BookMarked, Calendar, CheckCircle2 } from 'lucide-react';

interface NovelDetailPageProps {
  identifier: string;
  navigate: (path: string) => void;
}

export const NovelDetailPage: React.FC<NovelDetailPageProps> = ({ identifier, navigate }) => {
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadNovelData() {
      try {
        setLoading(true);
        const novelData = await getNovelBySlugOrId(identifier);
        if (!novelData) {
          if (isMounted) setNovel(null);
          return;
        }

        if (isMounted) setNovel(novelData);

        const publishedChapters = await getPublishedChapters(novelData.id);
        if (isMounted) {
          setChapters(publishedChapters);
        }
      } catch (err) {
        console.error('Error fetching novel details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNovelData();
    return () => {
      isMounted = false;
    };
  }, [identifier]);

  if (loading) {
    return <LoadingSpinner message="উপন্যাসের পাতা খোলা হচ্ছে..." />;
  }

  if (!novel) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <EmptyState
          title="উপন্যাসটি পাওয়া যায়নি"
          description="হয়তো উপন্যাসটির ঠিকানা পরিবর্তিত হয়েছে অথবা এখনও প্রকাশিত হয়নি।"
          icon="alert"
          actionText="সকল উপন্যাসের তালিকায় ফিরুন"
          onAction={() => navigate('/novels')}
        />
      </div>
    );
  }

  const isCompleted = novel.status === 'completed';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/novels')}
          className="inline-flex items-center space-x-2 text-xs font-serif-bn text-[#7A6B5D] hover:text-[#8C4A32] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সকল উপন্যাসে ফিরে যান</span>
        </button>
      </div>

      {/* Novel Header Card */}
      <div className="bg-[#FAF7F2] rounded-3xl border border-[#DFD3C2] p-6 sm:p-10 shadow-sm flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full sm:w-48 h-64 rounded-2xl bg-[#EFE5D5] border border-[#DFCBB5] shrink-0 overflow-hidden relative shadow-inner flex flex-col items-center justify-center p-4 text-center">
          {novel.coverImageUrl ? (
            <img
              src={novel.coverImageUrl}
              alt={novel.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="space-y-3 text-[#7A6B5D]">
              <BookOpen className="w-10 h-10 mx-auto text-[#8C4A32] opacity-80" />
              <span className="font-serif-bn text-sm block font-semibold text-[#5A4B3D] leading-snug">
                {novel.title}
              </span>
              <span className="text-[11px] text-[#8C4A32] tracking-wider block">
                শব্দের আড়ালে
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center space-x-2.5 flex-wrap">
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-serif-bn font-medium border ${
                isCompleted
                  ? 'bg-stone-100 text-stone-700 border-stone-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {isCompleted ? 'সমাপ্ত উপন্যাস' : 'চলমান উপন্যাস'}
            </span>
            <span className="text-xs font-serif-bn text-[#7A6B5D]">
              মোট {toBengaliNumber(chapters.length)}টি প্রকাশিত অধ্যায়
            </span>
          </div>

          <h1 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621]">
            {novel.title}
          </h1>

          <div className="border-l-2 border-[#8C4A32]/40 pl-4 py-1">
            <p className="font-serif-bn text-sm sm:text-base text-[#5A4B3D] leading-relaxed">
              {novel.synopsis}
            </p>
          </div>

          {chapters.length > 0 && (
            <div className="pt-4">
              <button
                onClick={() => navigate(`/novels/${novel.slug || novel.id}/chapters/${chapters[0].id}`)}
                className="px-6 py-2.5 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm font-medium hover:bg-[#723925] transition-all shadow-sm inline-flex items-center space-x-2"
              >
                <span>প্রথম অধ্যায় থেকে পড়া শুরু করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chapters Index / Table of Contents */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 border-b border-[#E8DEC8] pb-4">
          <BookMarked className="w-5 h-5 text-[#8C4A32]" />
          <h2 className="font-serif-bn text-2xl font-bold text-[#2C2621]">
            অধ্যায় সূচিপত্র ({toBengaliNumber(chapters.length)})
          </h2>
        </div>

        {chapters.length > 0 ? (
          <div className="divide-y divide-[#EFE5D5] bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] overflow-hidden">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => navigate(`/novels/${novel.slug || novel.id}/chapters/${chapter.id}`)}
                className="p-4 sm:p-5 hover:bg-[#F5EDE1] transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <span className="w-8 h-8 rounded-full bg-[#EFE5D5] border border-[#DFCBB5] text-[#8C4A32] font-serif-bn text-xs font-bold flex items-center justify-center shrink-0">
                    {toBengaliNumber(chapter.chapterNumber)}
                  </span>
                  <div>
                    <h3 className="font-serif-bn text-base sm:text-lg font-semibold text-[#2C2621] group-hover:text-[#8C4A32] transition-colors">
                      {chapter.title}
                    </h3>
                    {chapter.publishedAt && (
                      <span className="text-xs text-[#7A6B5D] font-serif-bn flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3 opacity-60" />
                        <span>{formatBengaliDate(chapter.publishedAt)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-serif-bn text-[#8C4A32] group-hover:translate-x-1 transition-transform">
                  <span className="hidden sm:inline">অধ্যায় পড়ুন</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="কোনো অধ্যায় এখনও উন্মুক্ত করা হয়নি"
            description="লেখক এই উপন্যাসের পরবর্তী অধ্যায়গুলোর সম্পাদনা করছেন। শীঘ্রই যুক্ত হবে।"
            icon="book"
          />
        )}
      </div>
    </div>
  );
};
