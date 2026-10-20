import React from 'react';
import { ReadingTheme, FontSize } from '../../types';
import { Share2, Copy, Sun, Moon, BookOpen, Check } from 'lucide-react';
import { useToast } from '../common/Toast';

interface ReadingToolbarProps {
  theme: ReadingTheme;
  setTheme: (theme: ReadingTheme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  title: string;
}

export const ReadingToolbar: React.FC<ReadingToolbarProps> = ({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  title,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const handleShare = async () => {
    const currentUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} | শব্দের আড়ালে`,
          text: `শব্দের আড়ালে সাহিত্য পোর্টাল থেকে পড়ুন: "${title}"`,
          url: currentUrl,
        });
        showToast('শেয়ার করা হয়েছে', 'success');
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast('লেখার লিঙ্ক কপি করা হয়েছে!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('লিঙ্ক কপি করতে সমস্যা হয়েছে', 'error');
    }
  };

  return (
    <div className="py-3 px-4 rounded-xl border border-[#DFD3C2] bg-[#FAF7F2]/80 backdrop-blur-sm flex items-center justify-between flex-wrap gap-4 text-xs font-serif-bn">
      {/* Font Size Adjuster */}
      <div className="flex items-center space-x-1.5">
        <span className="text-[#7A6B5D] hidden sm:inline mr-1">অক্ষরের আকার:</span>
        {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((size) => {
          const labels: Record<FontSize, string> = {
            sm: 'ছোট',
            base: 'মাঝারি',
            lg: 'বড়',
            xl: 'সুবিশাল',
          };
          const isSelected = fontSize === size;
          return (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                isSelected
                  ? 'bg-[#8C4A32] text-white font-semibold'
                  : 'text-[#5A4B3D] hover:bg-[#EFE5D5]'
              }`}
            >
              {labels[size]}
            </button>
          );
        })}
      </div>

      {/* Theme Switcher & Share */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-[#EFE5D5] p-1 rounded-lg">
          <button
            onClick={() => setTheme('ivory')}
            className={`p-1.5 rounded-md transition-all ${
              theme === 'ivory' ? 'bg-[#FAF7F2] text-[#8C4A32] shadow-sm' : 'text-[#7A6B5D]'
            }`}
            title="আইভরি থিম (বইয়ের পাতা)"
            aria-label="আইভরি থিম"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('paper')}
            className={`p-1.5 rounded-md transition-all ${
              theme === 'paper' ? 'bg-[#FAF7F2] text-[#8C4A32] shadow-sm' : 'text-[#7A6B5D]'
            }`}
            title="ভিন্টেজ পেপার থিম"
            aria-label="কাগজ থিম"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('night')}
            className={`p-1.5 rounded-md transition-all ${
              theme === 'night' ? 'bg-[#2C2621] text-[#E2DDD5] shadow-sm' : 'text-[#7A6B5D]'
            }`}
            title="রাত্রিকালীন থিম"
            aria-label="রাত্রিকালীন থিম"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Share and Copy */}
        <button
          onClick={handleCopyLink}
          className="p-2 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors"
          title="লিঙ্ক কপি করুন"
          aria-label="লিঙ্ক কপি করুন"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#8C4A32] hover:text-white hover:border-[#8C4A32] transition-colors"
          title="লেখাটি শেয়ার করুন"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>শেয়ার</span>
        </button>
      </div>
    </div>
  );
};
