import React, { useEffect, useState, useRef } from 'react';
import { ReadingTheme } from '../../types';
import { toBengaliNumber } from '../../utils/bengaliUtils';

interface ReadingProgressBarProps {
  /** Optional title of the long-form content being read */
  title?: string;
  /** Theme of the reading page to coordinate aesthetics */
  theme?: ReadingTheme;
  /** Height in pixels (default: 3) */
  height?: number;
  /** Whether to show a discreet floating percentage pill while actively scrolling (default: true) */
  showFloatingBadge?: boolean;
}

export const ReadingProgressBar: React.FC<ReadingProgressBarProps> = ({
  title,
  theme = 'ivory',
  height = 3,
  showFloatingBadge = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const calculateProgress = () => {
      const docElement = document.documentElement;
      const docBody = document.body;
      const scrollTop = window.scrollY || docElement.scrollTop || docBody.scrollTop || 0;
      const totalScrollableHeight = Math.max(
        docElement.scrollHeight,
        docBody.scrollHeight
      ) - window.innerHeight;

      if (totalScrollableHeight <= 0) {
        setProgress(0);
        return;
      }

      const pct = Math.min(100, Math.max(0, (scrollTop / totalScrollableHeight) * 100));
      setProgress(pct);
    };

    const handleScroll = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        calculateProgress();
        setIsScrolling(true);

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 1600);
      });
    };

    // Initial calculation
    calculateProgress();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Recalculate after DOM content shifts or fonts load
    const observer = new ResizeObserver(() => {
      calculateProgress();
    });
    observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Theme-aware gradients and accents
  const getGradientClass = () => {
    switch (theme) {
      case 'night':
        return 'from-amber-600 via-orange-500 to-amber-400';
      case 'paper':
        return 'from-[#733B26] via-[#8C4A32] to-[#B35E3E]';
      case 'ivory':
      default:
        return 'from-[#8C4A32] via-[#A65B40] to-[#C87545]';
    }
  };

  const getGlowColor = () => {
    switch (theme) {
      case 'night':
        return 'rgba(245, 158, 11, 0.7)';
      case 'paper':
        return 'rgba(115, 59, 38, 0.6)';
      case 'ivory':
      default:
        return 'rgba(140, 74, 50, 0.6)';
    }
  };

  const roundedPct = Math.round(progress);
  const showBadge = showFloatingBadge && isScrolling && progress > 2;

  return (
    <>
      {/* Fixed subtle progress bar at the very top edge of viewport */}
      <div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none select-none"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={roundedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="পড়ার অগ্রগতি"
      >
        {/* Faint track line */}
        <div
          className={`w-full h-full ${
            theme === 'night' ? 'bg-white/5' : 'bg-[#8C4A32]/10'
          } backdrop-blur-xs`}
        >
          {/* Animated fill */}
          <div
            className={`h-full bg-gradient-to-r ${getGradientClass()} transition-[width] duration-150 ease-out relative`}
            style={{
              width: `${progress}%`,
              boxShadow: progress > 0 ? `0 0 10px ${getGlowColor()}` : 'none',
            }}
          >
            {/* Subtle luminous pip at the head of the progress bar */}
            {progress > 0 && progress < 100 && (
              <div
                className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-white opacity-90 shadow-xs pointer-events-none"
                style={{
                  boxShadow: `0 0 6px 1px ${getGlowColor()}`,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Subtle floating reading indicator pill that appears during active scroll */}
      {showFloatingBadge && (
        <aside
          className={`fixed top-4 right-4 sm:right-6 z-50 pointer-events-none transition-all duration-300 ease-out font-serif-bn ${
            showBadge
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2'
          }`}
          aria-hidden={!showBadge}
        >
          <div
            className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs shadow-md border backdrop-blur-md flex items-center gap-1.5 transition-colors ${
              theme === 'night'
                ? 'bg-[#1e1c19]/90 text-amber-300 border-amber-500/30'
                : 'bg-[#FAF7F2]/95 text-[#8C4A32] border-[#DFCBB5] shadow-black/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C4A32] dark:bg-amber-400 animate-pulse" />
            <span className="font-medium">
              {progress >= 99 ? 'পাতা সমাপ্ত' : `${toBengaliNumber(roundedPct)}% পাতা`}
            </span>
            {title && (
              <span className="hidden md:inline text-[10px] opacity-60 border-l border-current/20 pl-1.5 max-w-[140px] truncate">
                {title}
              </span>
            )}
          </div>
        </aside>
      )}
    </>
  );
};
