import React from 'react';
import { Post } from '../../types';
import { formatBengaliDate, getPostTypeLabel, toBengaliNumber } from '../../utils/bengaliUtils';
import { Clock, Calendar, ArrowRight, Tag } from 'lucide-react';

interface WritingCardProps {
  post: Post;
  onClick: () => void;
}

export const WritingCard: React.FC<WritingCardProps> = ({ post, onClick }) => {
  const isPoem = post.type === 'poem';

  return (
    <article
      onClick={onClick}
      className="group relative bg-[#FAF7F2] rounded-2xl border border-[#E8DEC8] p-6 sm:p-7 hover:border-[#8C4A32]/50 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Type Badge & Reading time / Date */}
        <div className="flex items-center justify-between text-xs text-[#7A6B5D] font-serif-bn gap-2 flex-wrap">
          <span className="inline-block px-2.5 py-1 rounded-full bg-[#F2E8DC] text-[#8C4A32] font-medium border border-[#DFCBB5]/60">
            {getPostTypeLabel(post.type)}
          </span>
          <div className="flex items-center space-x-3">
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
