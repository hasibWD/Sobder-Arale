import React, { useEffect, useState, useRef } from 'react';
import { Novel, Chapter, ReadingTheme, FontSize } from '../types';
import { getNovelBySlugOrId, getPublishedChapters, deleteChapter, saveChapter } from '../services/literatureService';
import { useToast } from '../components/common/Toast';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ReadingToolbar } from '../components/public/ReadingToolbar';
import { toBengaliNumber, formatBengaliDate } from '../utils/bengaliUtils';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Heart,
  Bookmark,
  RotateCcw,
} from 'lucide-react';
import { CommentsSection } from '../components/comments/CommentsSection';
import { bookmarkProgressService, ReadingProgressItem } from '../services/bookmarkProgressService';
import { ReadingProgressBar } from '../components/common/ReadingProgressBar';

interface NovelReadingPageProps {
  novelIdentifier: string;
  chapterIdentifier: string;
  navigate: (path: string) => void;
}

export const NovelReadingPage: React.FC<NovelReadingPageProps> = ({
  novelIdentifier,
  chapterIdentifier,
  navigate,
}) => {
  const { showToast } = useToast();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ReadingTheme>('ivory');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Favourites & Reading Progress States
  const [isFav, setIsFav] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [savedProgress, setSavedProgress] = useState<ReadingProgressItem | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const novelData = await getNovelBySlugOrId(novelIdentifier);
        if (!novelData) {
          if (isMounted) setNovel(null);
          return;
        }
        if (isMounted) setNovel(novelData);

        const publishedChapters = await getPublishedChapters(novelData.id);
        if (isMounted) {
          setChapters(publishedChapters);

          // Find requested chapter by ID or by chapter number
          const found = publishedChapters.find(
            (c) =>
              c.id === chapterIdentifier ||
              String(c.chapterNumber) === chapterIdentifier
          );

          if (found) {
            setCurrentChapter(found);
          } else if (publishedChapters.length > 0) {
            setCurrentChapter(publishedChapters[0]);
          } else {
            setCurrentChapter(null);
          }
        }
      } catch (err) {
        console.error('Error loading novel chapter reading page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [novelIdentifier, chapterIdentifier]);

  // Sync favourites and reading progress on chapter load (MUST run before any conditional returns)
  useEffect(() => {
    if (!currentChapter || !novel) return;

    const chapterKey = `chapter-${currentChapter.id}`;
    // Check favourite status (check chapter or novel)
    setIsFav(
      bookmarkProgressService.isFavourite(chapterKey) ||
      bookmarkProgressService.isFavourite(novel.id)
    );

    // Check existing progress for this chapter
    const prior = bookmarkProgressService.getProgress(chapterKey);
    if (prior && prior.scrollY > 250 && prior.percentage >= 5) {
      setSavedProgress(prior);
      setShowResumeBanner(true);
      setCurrentProgress(prior.percentage);
    } else {
      setShowResumeBanner(false);
      setSavedProgress(null);
      setCurrentProgress(0);
    }

    // Scroll listener for real-time progress bar only (does NOT auto-save)
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.min(100, Math.max(1, Math.round((window.scrollY / scrollHeight) * 100)));
      setCurrentProgress(pct);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentChapter, novel]);

  if (loading) {
    return <LoadingSpinner message="অধ্যায়টি প্রস্তুত করা হচ্ছে..." />;
  }

  if (!novel || !currentChapter) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <EmptyState
          title="অধ্যায়টি পাওয়া যায়নি"
          description="হয়তো এই অধ্যায়টি এখনও প্রকাশিত হয়নি বা সংশোধন করা হচ্ছে।"
          icon="alert"
          actionText="উপন্যাসের সূচিপত্রে ফিরুন"
          onAction={() => navigate(`/novels/${novelIdentifier}`)}
        />
      </div>
    );
  }

  // Calculate previous and next chapter from strictly ordered published chapters
  const currentIndex = chapters.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  const handleToggleChapterStatus = async () => {
    if (!novel || !currentChapter) return;
    try {
      setIsActionLoading(true);
      const newStatus = currentChapter.status === 'published' ? 'draft' : 'published';
      await saveChapter(novel.id, currentChapter.id, {
        title: currentChapter.title,
        chapterNumber: currentChapter.chapterNumber,
        body: currentChapter.body,
        status: newStatus,
      });
      setCurrentChapter({ ...currentChapter, status: newStatus });
      showToast(
        newStatus === 'published'
          ? `অধ্যায়টি সবার জন্য উন্মুক্ত ও প্রকাশিত হয়েছে!`
          : `অধ্যায়টি সাধারণ পাঠকদের থেকে হাইড/লুকানো হয়েছে!`,
        'success'
      );
    } catch {
      showToast('অবস্থা পরিবর্তন ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!novel || !currentChapter) return;
    try {
      setIsActionLoading(true);
      await deleteChapter(novel.id, currentChapter.id);
      showToast(`অধ্যায়টি সফলভাবে মুছে ফেলা হয়েছে`, 'success');
      setShowDeleteModal(false);
      navigate(`/novels/${novel.slug || novel.id}`);
    } catch {
      showToast('অধ্যায় মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleFavourite = () => {
    if (!novel || !currentChapter) return;
    const chapterKey = `chapter-${currentChapter.id}`;
    const newState = bookmarkProgressService.toggleFavourite({
      id: chapterKey,
      type: 'chapter',
      title: `অধ্যায় ${toBengaliNumber(currentChapter.chapterNumber)}: ${currentChapter.title}`,
      slug: currentChapter.id,
      url: window.location.pathname,
      category: `উপন্যাস: ${novel.title}`,
      excerpt: currentChapter.body.slice(0, 120),
    });
    setIsFav(newState);
    if (newState) {
      showToast('উপন্যাসের এই অধ্যায়টি পছন্দের তালিকায় যুক্ত হয়েছে!', 'success');
    } else {
      showToast('পছন্দের তালিকা থেকে সরানো হয়েছে', 'info');
    }
  };

  const paragraphs = currentChapter?.body
    ? currentChapter.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    : [];

  const handleMarkParagraph = (index: number, paraText: string) => {
    if (!novel || !currentChapter) return;
    const chapterKey = `chapter-${currentChapter.id}`;
    const el = document.getElementById(`novel-para-${index}`);
    const targetScrollY = el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 120) : window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollHeight > 0
      ? Math.min(100, Math.max(1, Math.round((targetScrollY / scrollHeight) * 100)))
      : Math.round(((index + 1) / Math.max(1, paragraphs.length)) * 100);

    const item: ReadingProgressItem = {
      id: chapterKey,
      type: 'chapter',
      title: `অধ্যায় ${toBengaliNumber(currentChapter.chapterNumber)}: ${currentChapter.title}`,
      parentTitle: `উপন্যাস: ${novel.title}`,
      slug: currentChapter.id,
      url: window.location.pathname,
      percentage: pct,
      scrollY: targetScrollY,
      lastParagraphIndex: index,
      markedTextSnippet: paraText.slice(0, 100),
      isManualMarker: true,
      updatedAt: Date.now(),
    };

    bookmarkProgressService.saveProgress(item);
    setSavedProgress(item);
    showToast(`📌 অনুচ্ছেদ ${toBengaliNumber(index + 1)} পর্যন্ত পড়া চিহ্নিত করা হয়েছে (${toBengaliNumber(pct)}%)`, 'success');
  };

  const handleClearMark = () => {
    if (!novel || !currentChapter) return;
    const chapterKey = `chapter-${currentChapter.id}`;
    bookmarkProgressService.removeProgress(chapterKey);
    setSavedProgress(null);
    setShowResumeBanner(false);
    showToast('পড়ার চিহ্ন মুছে ফেলা হয়েছে', 'info');
  };

  const handleManualBookmark = () => {
    if (!novel || !currentChapter || paragraphs.length === 0) return;
    // Find closest paragraph in viewport
    let closestIndex = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const el = document.getElementById(`novel-para-${i}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 30 && rect.top <= window.innerHeight * 0.55) {
          closestIndex = i;
          break;
        } else if (rect.top < 30) {
          closestIndex = i;
        }
      }
    }
    const paraText = paragraphs[closestIndex] || '';
    handleMarkParagraph(closestIndex, paraText);
  };

  const handleResumeReading = () => {
    if (savedProgress) {
      if (typeof savedProgress.lastParagraphIndex === 'number') {
        const el = document.getElementById(`novel-para-${savedProgress.lastParagraphIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#8C4A32]', 'ring-offset-4', 'bg-amber-100/40');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#8C4A32]', 'ring-offset-4', 'bg-amber-100/40');
          }, 3500);
          setShowResumeBanner(false);
          showToast('চিহ্নিত অনুচ্ছেদে নিয়ে যাওয়া হয়েছে!', 'success');
          return;
        }
      }
      window.scrollTo({
        top: savedProgress.scrollY,
        behavior: 'smooth',
      });
      setShowResumeBanner(false);
      showToast('চিহ্নিত স্থানে নিয়ে যাওয়া হয়েছে!', 'success');
    }
  };

  // Font size classes
  const fontSizes: Record<FontSize, string> = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-loose',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  };

  // Theme container classes
  const themeClasses: Record<ReadingTheme, string> = {
    ivory: 'bg-[#FAF7F2] text-[#2C2621]',
    paper: 'bg-[#F4EEDE] text-[#261F1A]',
    night: 'bg-[#171614] text-[#E2DDD5]',
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Subtle Top Reading Progress Bar */}
      <ReadingProgressBar
        title={`অধ্যায় ${toBengaliNumber(currentChapter.chapterNumber)}: ${currentChapter.title}`}
        theme={theme}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb & Chapter Drawer Trigger & Quick Fav */}
        <div className="flex items-center justify-between border-b border-[#DFCBB5]/40 pb-4 text-xs font-serif-bn">
          <button
            onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
            className="flex items-center space-x-1.5 opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>উপন্যাসের সূচিপত্র</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleFavourite}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif-bn transition-all border ${
                isFav
                  ? 'bg-rose-50 border-rose-300 text-rose-600 font-semibold shadow-xs'
                  : 'border-[#DFCBB5] text-[#5C4F43] hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="hidden sm:inline">{isFav ? 'পছন্দের তালিকায় সংরক্ষিত' : 'পছন্দ করুন'}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setChapterMenuOpen(!chapterMenuOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#DFCBB5]/50 hover:bg-[#EFE5D5]/50 transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                <span>
                  অধ্যায়: {toBengaliNumber(currentChapter.chapterNumber)} / {toBengaliNumber(chapters.length)}
                </span>
              </button>

              {/* Chapter Selection Dropdown */}
              {chapterMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-[#DFCBB5] bg-[#FAF7F2] text-[#2C2621] shadow-2xl p-2 z-30">
                  <div className="text-[11px] font-bold px-2 py-1 text-[#8C4A32] border-b border-[#E8DEC8] mb-1">
                    অধ্যায় নির্বাচন করুন
                  </div>
                  {chapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setChapterMenuOpen(false);
                        navigate(`/novels/${novel.slug || novel.id}/chapters/${ch.id}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-serif-bn truncate transition-colors ${
                        ch.id === currentChapter.id
                          ? 'bg-[#8C4A32] text-white font-semibold'
                          : 'hover:bg-[#F2E8DC]'
                      }`}
                    >
                      {toBengaliNumber(ch.chapterNumber)}. {ch.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resume Reading Notice Banner if prior marked reading progress exists */}
        {showResumeBanner && savedProgress && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/10 via-[#8C4A32]/10 to-amber-700/10 border border-[#8C4A32]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#8C4A32] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bookmark className="w-4 h-4 fill-white" />
              </div>
              <div className="space-y-0.5">
                <p className="font-serif-bn text-sm font-semibold text-[#8C4A32]">
                  পূর্বে পড়া চিহ্নিত স্থান
                </p>
                <p className="font-serif-bn text-xs text-[#5C4F43]">
                  আপনি এই অধ্যায়ের {typeof savedProgress.lastParagraphIndex === 'number' ? `${toBengaliNumber(savedProgress.lastParagraphIndex + 1)} নং অনুচ্ছেদ (` : ''}প্রায় {toBengaliNumber(savedProgress.percentage)}%{typeof savedProgress.lastParagraphIndex === 'number' ? ')' : ''} পর্যন্ত পড়া চিহ্নিত করে রেখেছিলেন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleResumeReading}
                className="px-4 py-1.5 rounded-lg bg-[#8C4A32] text-white font-serif-bn text-xs font-medium hover:bg-[#733B26] transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>চিহ্নিত স্থানে যান</span>
              </button>
              <button
                onClick={handleClearMark}
                className="px-2.5 py-1.5 rounded-lg text-xs font-serif-bn text-[#7A6B5D] hover:bg-[#DFCBB5]/40 hover:text-rose-600 transition-colors"
                title="পড়ার চিহ্ন মুছে ফেলুন"
              >
                চিহ্ন মুছুন
              </button>
            </div>
          </div>
        )}

        {/* Novel and Chapter Title */}
        <div className="text-center space-y-3 py-4">
          <span className="text-xs font-serif-bn text-[#8C4A32] tracking-wider uppercase">
            উপন্যাস: {novel.title}
          </span>
          <h1 className="font-serif-bn text-3xl sm:text-4xl font-extrabold tracking-tight">
            অধ্যায় {toBengaliNumber(currentChapter.chapterNumber)}: {currentChapter.title}
          </h1>
          {currentChapter.publishedAt && (
            <p className="text-xs font-serif-bn opacity-60">
              প্রকাশিত: {formatBengaliDate(currentChapter.publishedAt)}
            </p>
          )}
        </div>

        {/* Reading Controls Toolbar */}
        <ReadingToolbar
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          title={`${novel.title} - অধ্যায় ${toBengaliNumber(currentChapter.chapterNumber)}`}
          isFavourite={isFav}
          onToggleFavourite={handleToggleFavourite}
          onSaveBookmark={handleManualBookmark}
          isMarked={!!savedProgress}
          markedPercentage={savedProgress?.percentage}
          markedParagraphNumber={typeof savedProgress?.lastParagraphIndex === 'number' ? savedProgress.lastParagraphIndex + 1 : undefined}
          onClearBookmark={handleClearMark}
          readingProgressPercent={currentProgress > 0 ? currentProgress : undefined}
        />

        {/* Chapter Body with interactive paragraph reading bookmarks */}
        <div className={`font-serif-bn prose-bengali py-6 ${fontSizes[fontSize]}`}>
          {paragraphs.map((para, index) => {
            const isMarked = savedProgress?.lastParagraphIndex === index;
            return (
              <div
                key={index}
                id={`novel-para-${index}`}
                className={`group relative mb-6 rounded-xl transition-all duration-300 ${
                  isMarked
                    ? 'bg-[#8C4A32]/10 border-l-4 border-[#8C4A32] pl-4 sm:pl-5 pr-3 py-3 shadow-xs'
                    : 'hover:bg-[#8C4A32]/5 p-2 sm:p-2.5 -mx-2 sm:-mx-2.5 rounded-lg'
                }`}
              >
                {/* Marked banner on top of the marked paragraph */}
                {isMarked && (
                  <div className="flex items-center justify-between text-xs font-serif-bn text-[#8C4A32] font-semibold mb-2 bg-[#8C4A32]/10 px-3 py-1.5 rounded-lg border border-[#8C4A32]/20">
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5 fill-[#8C4A32]" />
                      <span>
                        আপনার পড়া এই অনুচ্ছেদ ({toBengaliNumber(index + 1)}) পর্যন্ত চিহ্নিত রয়েছে
                      </span>
                    </div>
                    <button
                      onClick={handleClearMark}
                      className="text-[11px] underline opacity-75 hover:opacity-100 hover:text-rose-600 transition-colors"
                    >
                      চিহ্ন সরান
                    </button>
                  </div>
                )}

                <p className="whitespace-pre-line leading-relaxed text-justify">
                  {para.trim()}
                </p>

                {/* Paragraph bookmark button */}
                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => handleMarkParagraph(index, para)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-serif-bn transition-all ${
                      isMarked
                        ? 'text-[#8C4A32] font-semibold bg-[#8C4A32]/15'
                        : 'opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-0 max-sm:opacity-75 text-[#7A6B5D] hover:text-[#8C4A32] hover:bg-[#8C4A32]/10'
                    }`}
                    title="এই অনুচ্ছেদ পর্যন্ত পড়া হয়েছে চিহ্নিত করুন"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-[#8C4A32]' : ''}`} />
                    <span>{isMarked ? 'চিহ্নিত স্থান' : 'এই পর্যন্ত পড়া মার্ক করুন'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Previous and Next Chapter Navigation */}
        <div className="pt-10 border-t border-[#DFCBB5]/50 flex items-center justify-between gap-4 font-serif-bn">
          {prevChapter ? (
            <button
              onClick={() => navigate(`/novels/${novel.slug || novel.id}/chapters/${prevChapter.id}`)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-[#DFCBB5] hover:bg-[#EFE5D5]/50 transition-colors text-left text-xs sm:text-sm"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <div>
                <span className="text-[10px] block opacity-60">পূর্ববর্তী অধ্যায়</span>
                <span className="font-semibold line-clamp-1">{prevChapter.title}</span>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextChapter ? (
            <button
              onClick={() => navigate(`/novels/${novel.slug || novel.id}/chapters/${nextChapter.id}`)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#8C4A32] text-white hover:bg-[#723925] transition-colors text-right text-xs sm:text-sm shadow-sm"
            >
              <div>
                <span className="text-[10px] block text-[#F2E8DC]/80">পরবর্তী অধ্যায়</span>
                <span className="font-semibold line-clamp-1">{nextChapter.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <div className="text-xs font-serif-bn opacity-70 italic">
              এটিই সর্বশেষ প্রকাশিত অধ্যায়
            </div>
          )}
        </div>

        {/* Lightweight Reader Reflections / Comments Section (No login required) */}
        <CommentsSection postId={currentChapter.id} postTitle={`${novel.title} - ${currentChapter.title}`} />
      </div>

      {/* Delete Confirmation Modal for Admin */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="অধ্যায়টি চিরতরে মুছে ফেলতে চান?"
        message={`"${currentChapter?.title || 'এই অধ্যায়টি'}" স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?`}
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="বাতিল"
        onConfirm={handleDeleteChapter}
        onCancel={() => setShowDeleteModal(false)}
        isProcessing={isActionLoading}
      />
      {/* Floating Quick Mark Button */}
      <button
        onClick={handleManualBookmark}
        className="fixed bottom-6 right-6 z-40 px-3.5 py-2.5 rounded-full bg-[#8C4A32] text-white hover:bg-[#733B26] shadow-lg flex items-center gap-2 text-xs font-serif-bn font-medium transition-all hover:scale-105 active:scale-95 border border-white/20"
        title="বর্তমান স্থান পর্যন্ত পড়া মার্ক করে রাখুন"
      >
        <Bookmark className={`w-4 h-4 ${savedProgress ? 'fill-amber-300 text-amber-300' : ''}`} />
        <span>{savedProgress ? 'পড়ার স্থান পরিবর্তন' : 'এই পর্যন্ত মার্ক করুন'}</span>
      </button>
    </div>
  );
};
