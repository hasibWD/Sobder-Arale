import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { CommentsSection } from '../components/comments/CommentsSection';

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb & Chapter Drawer Trigger */}
        <div className="flex items-center justify-between border-b border-[#DFCBB5]/40 pb-4 text-xs font-serif-bn">
          <button
            onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
            className="flex items-center space-x-1.5 opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>উপন্যাসের সূচিপত্র</span>
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
        />

        {/* Chapter Body with preserved Bengali paragraphs */}
        <div className={`font-serif-bn prose-bengali py-6 ${fontSizes[fontSize]}`}>
          {currentChapter.body.split(/\n\s*\n/).map((para, index) => (
            <p key={index} className="mb-6 whitespace-pre-line leading-relaxed text-justify">
              {para.trim()}
            </p>
          ))}
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
    </div>
  );
};
