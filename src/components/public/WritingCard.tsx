import React, { useState, useEffect } from 'react';
import { Post } from '../../types';
import { formatBengaliDate, getPostTypeLabel, toBengaliNumber } from '../../utils/bengaliUtils';
import { Clock, Calendar, ArrowRight, Tag, Heart } from 'lucide-react';
import { bookmarkProgressService } from '../../services/bookmarkProgressService';

interface WritingCardProps {
  post: Post;
  onClick: () => void;
}

export const WritingCard: React.FC<WritingCardProps> = ({ post, onClick }) => {
  const isPoem = post.type === 'poem';
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(bookmarkProgressService.isFavourite(post.id));
    const unsub = bookmarkProgressService.subscribe(() => {
      setIsFav(bookmarkProgressService.isFavourite(post.id));
    });
    return unsub;
  }, [post.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = bookmarkProgressService.toggleFavourite({
      id: post.id,
      type: post.type as any,
      title: post.title,
      slug: post.slug,
      url: `/read/${post.type}/${post.slug}`,
      excerpt: post.excerpt || post.body.slice(0, 140),
    });
    setIsFav(updated);
  };

  return (
    <article
      onClick={onClick}
      className="group relative bg-[#FAF7F2] rounded-2xl border border-[#E8DEC8] p-6 sm:p-7 hover:border-[#8C4A32]/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Type Badge & Reading time / Date & Favorite */}
        <div className="flex items-center justify-between text-xs text-[#7A6B5D] font-serif-bn gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#F2E8DC] text-[#8C4A32] font-medium border border-[#DFCBB5]/60">
              {getPostTypeLabel(post.type)}
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {post.readingTimeMinutes && !isPoem && (
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 opacity-70" />
                <span>{toBengaliNumber(post.readingTimeMinutes)} মিনিট পাঠ</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 opacity-70" />
              <span>{formatBengaliDate(post.publishedAt || post.createdAt)}</span>
            </span>

            <button
              onClick={handleToggleFav}
              className={`p-1 rounded-full transition-all hover:scale-110 ${
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
        </div>

        {/* Title */}
        <h3 className="font-serif-bn text-xl sm:text-2xl font-bold text-[#2C2621] group-hover:text-[#8C4A32] transition-colors leading-tight">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p
          className={`font-serif-bn text-[#5A4B3D] text-sm sm:text-base leading-relaxed line-clamp-3 ${
            isPoem ? 'italic border-l border-[#8C4A32]/30 pl-3 py-0.5' : ''
          }`}
        >
          {post.excerpt || post.body.slice(0, 160)}
        </p>
      </div>

      {/* Footer Tags & Read Action */}
      <div className="mt-5 pt-4 border-t border-[#EFE5D5] flex items-center justify-between flex-wrap gap-2 text-xs font-serif-bn">
        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
          {post.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center text-[#7A6B5D] bg-[#F5EDE1] px-2 py-0.5 rounded text-[11px]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <span className="inline-flex items-center space-x-1 text-[#8C4A32] font-semibold group-hover:translate-x-1 transition-transform">
          <span>পড়ুন</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
};
