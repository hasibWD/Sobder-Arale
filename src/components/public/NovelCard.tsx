import React, { useState, useEffect } from 'react';
import { Novel } from '../../types';
import { toBengaliNumber } from '../../utils/bengaliUtils';
import { BookMarked, ArrowRight, BookOpen, Heart } from 'lucide-react';
import { bookmarkProgressService } from '../../services/bookmarkProgressService';

interface NovelCardProps {
  novel: Novel;
  onClick: () => void;
}

export const NovelCard: React.FC<NovelCardProps> = ({ novel, onClick }) => {
  const isCompleted = novel.status === 'completed';
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(bookmarkProgressService.isFavourite(novel.id));
    const unsub = bookmarkProgressService.subscribe(() => {
      setIsFav(bookmarkProgressService.isFavourite(novel.id));
    });
    return unsub;
  }, [novel.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = bookmarkProgressService.toggleFavourite({
      id: novel.id,
      type: 'novel',
      title: novel.title,
      slug: novel.slug || novel.id,
      url: `/novels/${novel.slug || novel.id}`,
      excerpt: novel.synopsis?.slice(0, 140),
    });
    setIsFav(updated);
  };

  return (
    <article
      onClick={onClick}
      className="group bg-[#FAF7F2] rounded-2xl border border-[#E8DEC8] hover:border-[#8C4A32]/60 hover:shadow-lg transition-all duration-300 p-6 flex flex-col sm:flex-row gap-6 cursor-pointer items-start"
    >
      {/* Novel Cover or Book Motif */}
      <div className="w-full sm:w-36 h-48 sm:h-52 rounded-xl bg-[#EFE5D5] border border-[#DFCBB5] shrink-0 overflow-hidden relative shadow-inner flex flex-col items-center justify-center p-3 text-center">
        {novel.coverImageUrl ? (
          <img
            src={novel.coverImageUrl}
            alt={novel.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="space-y-2 text-[#7A6B5D]">
            <BookOpen className="w-8 h-8 mx-auto text-[#8C4A32] opacity-80" />
            <span className="font-serif-bn text-xs block font-semibold text-[#5A4B3D] line-clamp-2 px-1">
              {novel.title}
            </span>
            <span className="text-[10px] text-[#8C4A32] tracking-wider block">
              শব্দের আড়ালে
            </span>
          </div>
        )}
      </div>

      {/* Novel Details */}
      <div className="flex-1 flex flex-col justify-between h-full space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-2.5 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-serif-bn font-medium border ${
                  isCompleted
                    ? 'bg-stone-100 text-stone-700 border-stone-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {isCompleted ? 'সমাপ্ত উপন্যাস' : 'চলমান উপন্যাস'}
              </span>
              {novel.chapterCount !== undefined && (
                <span className="text-xs font-serif-bn text-[#7A6B5D] flex items-center space-x-1">
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>{toBengaliNumber(novel.chapterCount)}টি অধ্যায়</span>
                </span>
              )}
            </div>

            <button
              onClick={handleToggleFav}
              className={`p-1.5 rounded-full transition-all hover:scale-110 ${
                isFav
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-[#9A8B7D] hover:text-rose-500 hover:bg-[#F2E8DC]'
              }`}
              title={isFav ? 'পছন্দের তালিকা থেকে সরান' : 'পছন্দের তালিকায় যুক্ত করুন'}
              aria-label="পছন্দ করুন"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
            </button>
          </div>

          <h3 className="font-serif-bn text-2xl font-bold text-[#2C2621] group-hover:text-[#8C4A32] transition-colors leading-snug">
            {novel.title}
          </h3>

          <p className="font-serif-bn text-[#5A4B3D] text-sm sm:text-base leading-relaxed line-clamp-3">
            {novel.synopsis}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#EFE5D5]">
          <span className="text-xs font-serif-bn text-[#7A6B5D]">
            সূচিপত্র ও অধ্যায়সমূহ দেখতে ক্লিক করুন
          </span>
          <span className="inline-flex items-center space-x-1 font-serif-bn text-sm text-[#8C4A32] font-semibold group-hover:translate-x-1 transition-transform">
            <span>অধ্যায়সমূহ</span>
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </article>
  );
};
