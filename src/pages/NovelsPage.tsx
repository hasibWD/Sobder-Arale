import React, { useEffect, useState } from 'react';
import { Novel } from '../types';
import { getPublishedNovels } from '../services/literatureService';
import { NovelCard } from '../components/public/NovelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { BookOpen } from 'lucide-react';

interface NovelsPageProps {
  navigate: (path: string) => void;
}

export const NovelsPage: React.FC<NovelsPageProps> = ({ navigate }) => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadNovels() {
      try {
        setLoading(true);
        const data = await getPublishedNovels();
        if (isMounted) {
          setNovels(data);
        }
      } catch (err) {
        console.error('Error fetching novels:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadNovels();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-[#E8DEC8] pb-8 space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn">
          <BookOpen className="w-4 h-4" />
          <span>দীর্ঘ আখ্যান ও চরিত্রচিত্রণ</span>
        </div>
        <h1 className="font-serif-bn text-3xl sm:text-4xl font-bold text-[#2C2621]">
          উপন্যাস ও ধারাবাহিক আখ্যান
        </h1>
        <p className="font-serif-bn text-base text-[#6F6052] max-w-2xl">
          জীবনের বিস্তার, জটিল সমীকরণ ও সমাজ বাস্তবতার প্রেক্ষাপটে নির্মিত সুদীর্ঘ উপন্যাস। প্রতিটি উপন্যাসের অধ্যায় ক্রমানুসারে সাজানো রয়েছে।
        </p>
      </div>

      {/* Novels List */}
      {loading ? (
        <LoadingSpinner message="উপন্যাসসমূহ সংকলন করা হচ্ছে..." />
      ) : novels.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {novels.map((novel) => (
            <NovelCard
              key={novel.id}
              novel={novel}
              onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="এখনও কোনো উপন্যাস প্রকাশিত হয়নি"
          description="লেখক তাঁর নতুন উপন্যাস নিয়ে কাজ করছেন। অধ্যায়সমূহ খুব শীঘ্রই নিয়মিত বিরতিতে প্রকাশিত হবে।"
          icon="book"
        />
      )}
    </div>
  );
};
