import React from 'react';
import { Feather, BookOpen, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: 'feather' | 'book' | 'alert';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'এখনও কোনো লেখা নেই',
  description = 'লেখক শীঘ্রই এখানে তাঁর নতুন সৃষ্টি যোগ করবেন। কিছু সময় পর পুনরায় ঘুরে আসুন।',
  actionText,
  onAction,
  icon = 'feather',
}) => {
  return (
    <div className="my-12 py-16 px-6 max-w-xl mx-auto rounded-2xl border border-dashed border-[#DFD3C2] bg-[#FAF7F2]/60 text-center space-y-4">
      <div className="w-14 h-14 mx-auto rounded-full bg-[#F2E8DC] border border-[#DFCBB5] flex items-center justify-center text-[#8C4A32]">
        {icon === 'feather' && <Feather className="w-6 h-6 transform -rotate-12" />}
        {icon === 'book' && <BookOpen className="w-6 h-6" />}
        {icon === 'alert' && <AlertCircle className="w-6 h-6" />}
      </div>

      <div className="space-y-2">
        <h3 className="font-serif-bn text-xl font-bold text-[#2C2621]">
          {title}
        </h3>
        <p className="font-serif-bn text-sm text-[#6F6052] leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="px-5 py-2 rounded-lg bg-[#8C4A32] text-white font-serif-bn text-sm font-medium hover:bg-[#723925] transition-colors shadow-sm"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};
