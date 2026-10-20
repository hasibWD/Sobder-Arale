import React from 'react';
import { BookOpen } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'পাতা উল্টানো হচ্ছে...' }) => {
  return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-[#E2D5C3] border-t-[#8C4A32] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-[#8C4A32]">
          <BookOpen className="w-5 h-5 opacity-80" />
        </div>
      </div>
      <p className="font-serif-bn text-sm text-[#7A6B5D] tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
};
