import React, { useEffect, useState, useRef } from 'react';
import { Post, ReadingTheme, FontSize } from '../types';
import { getPostBySlug, getPublishedPosts, deletePost, togglePostStatus } from '../services/literatureService';
import { useToast } from '../components/common/Toast';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ReadingToolbar } from '../components/public/ReadingToolbar';
import { formatBengaliDate, getPostTypeLabel, toBengaliNumber } from '../utils/bengaliUtils';
import { ArrowLeft, Feather, Calendar, Clock, Sparkles, Trash2, Eye, EyeOff, Edit, ShieldAlert, CheckCircle, Heart, Bookmark, RotateCcw } from 'lucide-react';
import { CommentsSection } from '../components/comments/CommentsSection';
import { bookmarkProgressService, ReadingProgressItem } from '../services/bookmarkProgressService';
import { ReadingProgressBar } from '../components/common/ReadingProgressBar';

interface WritingDetailPageProps {
  type: string;
  slug: string;
  navigate: (path: string) => void;
}

export const WritingDetailPage: React.FC<WritingDetailPageProps> = ({ type, slug, navigate }) => {
  const { showToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ReadingTheme>('ivory');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Favourites & Reading Progress States
  const [isFav, setIsFav] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [savedProgress, setSavedProgress] = useState<ReadingProgressItem | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const articleRef = useRef<HTMLElement>(null);


  useEffect(() => {
    let isMounted = true;
    async function loadPost() {
      try {
        setLoading(true);
        const data = await getPostBySlug(slug);
        if (!data) {
          if (isMounted) setPost(null);
          return;
        }

        if (isMounted) setPost(data);

        // Fetch related posts of same type
        const allSameType = await getPublishedPosts(data.type, undefined, 5);
        if (isMounted) {
          setRelatedPosts(allSameType.filter((p) => p.id !== data.id).slice(0, 2));
        }
      } catch (err) {
        console.error('Error fetching post:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPost();

    const handleLiteratureUpdated = (e: any) => {
      // If the event relates to posts, reload
      if (!e.detail || e.detail.type === 'post') {
        loadPost();
      }
    };

    window.addEventListener('literature_updated', handleLiteratureUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('literature_updated', handleLiteratureUpdated);
    };
  }, [slug]);

  // Sync favourites and reading progress on post load (MUST run before any conditional returns)
  useEffect(() => {
    if (!post) return;

    // Check favourite status
    setIsFav(bookmarkProgressService.isFavourite(post.id));

    // Check existing progress
    const prior = bookmarkProgressService.getProgress(post.id);
    if (prior && prior.scrollY > 250 && prior.percentage >= 5) {
      setSavedProgress(prior);
      setShowResumeBanner(true);
      setCurrentProgress(prior.percentage);
    } else {
      setSavedProgress(null);
      setShowResumeBanner(false);
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
  }, [post]);

  if (loading) {
    return <LoadingSpinner message="পাণ্ডুলিপি খোলা হচ্ছে..." />;
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <EmptyState
          title="লেখাটি পাওয়া যায়নি"
          description="হয়তো লেখাটির শিরোনাম বা ঠিকানা পরিবর্তিত হয়েছে অথবা এখনও প্রকাশিত হয়নি।"
          icon="alert"
          actionText="হোমপেজে ফিরে যান"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  const handleToggleFavourite = () => {
    if (!post) return;
    const newState = bookmarkProgressService.toggleFavourite({
      id: post.id,
      type: post.type as any,
      title: post.title,
      slug: post.slug,
      url: window.location.pathname,
      excerpt: post.excerpt || post.body.slice(0, 120),
    });
    setIsFav(newState);
    if (newState) {
      showToast('লেখাটি আপনার পছন্দের তালিকায় যুক্ত হয়েছে!', 'success');
    } else {
      showToast('পছন্দের তালিকা থেকে সরানো হয়েছে', 'info');
    }
  };

  const isPoem = post?.type === 'poem';

  const paragraphs = post?.body
    ? post.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    : [];

  const handleMarkParagraph = (index: number, paraText: string) => {
    if (!post) return;
    const el = document.getElementById(`writing-para-${index}`);
    const targetScrollY = el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - 120) : window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollHeight > 0
      ? Math.min(100, Math.max(1, Math.round((targetScrollY / scrollHeight) * 100)))
      : Math.round(((index + 1) / Math.max(1, paragraphs.length)) * 100);

    const item: ReadingProgressItem = {
      id: post.id,
      type: post.type as any,
      title: post.title,
      slug: post.slug,
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
    showToast(`📌 ${isPoem ? 'স্তবক' : 'অনুচ্ছেদ'} ${toBengaliNumber(index + 1)} পর্যন্ত পড়া চিহ্নিত করা হয়েছে (${toBengaliNumber(pct)}%)`, 'success');
  };

  const handleClearMark = () => {
    if (!post) return;
    bookmarkProgressService.removeProgress(post.id);
    setSavedProgress(null);
    setShowResumeBanner(false);
    showToast('পড়ার চিহ্ন মুছে ফেলা হয়েছে', 'info');
  };

  const handleManualBookmark = () => {
    if (!post || paragraphs.length === 0) return;
    // Find closest paragraph/stanza in viewport
    let closestIndex = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const el = document.getElementById(`writing-para-${i}`);
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
        const el = document.getElementById(`writing-para-${savedProgress.lastParagraphIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-[#8C4A32]', 'ring-offset-4', 'bg-amber-100/40');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-[#8C4A32]', 'ring-offset-4', 'bg-amber-100/40');
          }, 3500);
          setShowResumeBanner(false);
          showToast(`চিহ্নিত ${isPoem ? 'স্তবকে' : 'অনুচ্ছেদে'} নিয়ে যাওয়া হয়েছে!`, 'success');
          return;
        }
      }
      window.scrollTo({
        top: savedProgress.scrollY,
        behavior: 'smooth',
      });
      setShowResumeBanner(false);
      showToast('চিহ্নিত অবস্থানে নিয়ে যাওয়া হয়েছে!', 'success');
    }
  };

  // Font size classes
  const fontSizes: Record<FontSize, string> = {
    sm: isPoem ? 'text-base sm:text-lg leading-loose' : 'text-sm sm:text-base leading-relaxed',
    base: isPoem ? 'text-lg sm:text-xl leading-loose' : 'text-base sm:text-lg leading-loose',
    lg: isPoem ? 'text-xl sm:text-2xl leading-loose' : 'text-lg sm:text-xl leading-loose',
    xl: isPoem ? 'text-2xl sm:text-3xl leading-loose' : 'text-xl sm:text-2xl leading-loose',
  };

  // Theme container classes
  const themeClasses: Record<ReadingTheme, string> = {
    ivory: 'bg-[#FAF7F2] text-[#2C2621]',
    paper: 'bg-[#F4EEDE] text-[#261F1A]',
    night: 'bg-[#171614] text-[#E2DDD5]',
  };

  const handleHidePost = async () => {
    if (!post) return;
    try {
      setIsActionLoading(true);
      await togglePostStatus(post.id, 'draft');
      setPost({ ...post, status: 'draft' });
      showToast('লেখাটি সফলভাবে হাইড/লুকানো হয়েছে! সাধারণ পাঠকেরা এটি আর দেখতে পারবে না।', 'success');
    } catch {
      showToast('লেখাটি হাইড করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublishPost = async () => {
    if (!post) return;
    try {
      setIsActionLoading(true);
      await togglePostStatus(post.id, 'published');
      setPost({ ...post, status: 'published' });
      showToast('লেখাটি সফলভাবে সবার জন্য প্রকাশিত হয়েছে!', 'success');
    } catch {
      showToast('লেখাটি প্রকাশ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      setIsActionLoading(true);
      await deletePost(post.id);
      showToast(`"${post.title}" লেখাটি সফলভাবে মুছে ফেলা হয়েছে`, 'success');
      setShowDeleteModal(false);
      navigate(isPoem ? '/poems' : '/stories');
    } catch {
      showToast('লেখাটি মুছতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Subtle Top Reading Progress Bar */}
      <ReadingProgressBar
        title={post.title}
        theme={theme}
      />

      <article ref={articleRef} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Breadcrumb back navigation & quick favorite toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(isPoem ? '/poems' : '/stories')}
            className="inline-flex items-center space-x-2 text-xs font-serif-bn opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isPoem ? 'সকল কবিতায় ফিরুন' : 'সকল গল্পে ফিরুন'}</span>
          </button>

          <button
            onClick={handleToggleFavourite}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif-bn transition-all border ${
              isFav
                ? 'bg-rose-50 border-rose-300 text-rose-600 font-semibold shadow-xs'
                : 'border-[#DFCBB5] text-[#5C4F43] hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{isFav ? 'পছন্দের তালিকায় সংরক্ষিত' : 'পছন্দ করুন'}</span>
          </button>
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
                  আপনি এই লেখার {typeof savedProgress.lastParagraphIndex === 'number' ? `${toBengaliNumber(savedProgress.lastParagraphIndex + 1)} নং ${isPoem ? 'স্তবক' : 'অনুচ্ছেদ'} (` : ''}প্রায় {toBengaliNumber(savedProgress.percentage)}%{typeof savedProgress.lastParagraphIndex === 'number' ? ')' : ''} পর্যন্ত পড়া চিহ্নিত করে রেখেছিলেন
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

        {/* Header of Writing */}
        <header className="space-y-4 text-center border-b border-[#DFCBB5]/50 pb-8">
          <div className="flex items-center justify-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-[#8C4A32] text-white text-xs font-serif-bn font-medium">
              {getPostTypeLabel(post.type)}
            </span>
          </div>

          <h1 className="font-serif-bn text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {post.title}
          </h1>

          <div className="flex items-center justify-center space-x-4 text-xs font-serif-bn opacity-70 flex-wrap gap-2">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatBengaliDate(post.publishedAt || post.createdAt)}</span>
            </span>
            {post.readingTimeMinutes && !isPoem && (
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{toBengaliNumber(post.readingTimeMinutes)} মিনিট পাঠ</span>
              </span>
            )}
          </div>
        </header>

        {/* Reading Controls Toolbar */}
        <ReadingToolbar
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          title={post.title}
          isFavourite={isFav}
          onToggleFavourite={handleToggleFavourite}
          onSaveBookmark={handleManualBookmark}
          isMarked={!!savedProgress}
          markedPercentage={savedProgress?.percentage}
          markedParagraphNumber={typeof savedProgress?.lastParagraphIndex === 'number' ? savedProgress.lastParagraphIndex + 1 : undefined}
          onClearBookmark={handleClearMark}
          readingProgressPercent={currentProgress > 0 ? currentProgress : undefined}
        />

        {/* Content Body with interactive stanza / paragraph marking */}
        <div className={`font-serif-bn py-8 ${fontSizes[fontSize]}`}>
          {isPoem ? (
            /* Poem Stanzas Preservation: poetic centering or left-indent */
            <div className="poem-body max-w-xl mx-auto space-y-6">
              {paragraphs.map((stanza, i) => {
                const isMarked = savedProgress?.lastParagraphIndex === i;
                return (
                  <div
                    key={i}
                    id={`writing-para-${i}`}
                    className={`group relative rounded-xl transition-all duration-300 ${
                      isMarked
                        ? 'bg-[#8C4A32]/10 border-l-4 border-[#8C4A32] pl-5 pr-3 py-3 shadow-xs'
                        : 'hover:bg-[#8C4A32]/5 p-2 rounded-lg border-l-2 border-[#8C4A32]/30 pl-5'
                    }`}
                  >
                    {isMarked && (
                      <div className="flex items-center justify-between text-xs font-serif-bn text-[#8C4A32] font-semibold mb-2 bg-[#8C4A32]/10 px-3 py-1.5 rounded-lg border border-[#8C4A32]/20">
                        <div className="flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5 fill-[#8C4A32]" />
                          <span>আপনার পড়া এই স্তবক ({toBengaliNumber(i + 1)}) পর্যন্ত চিহ্নিত রয়েছে</span>
                        </div>
                        <button
                          onClick={handleClearMark}
                          className="text-[11px] underline opacity-75 hover:opacity-100 hover:text-rose-600 transition-colors"
                        >
                          চিহ্ন সরান
                        </button>
                      </div>
                    )}

                    <div className="whitespace-pre-line py-1 tracking-wide">
                      {stanza.trim()}
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={() => handleMarkParagraph(i, stanza)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-serif-bn transition-all ${
                          isMarked
                            ? 'text-[#8C4A32] font-semibold bg-[#8C4A32]/15'
                            : 'opacity-0 group-hover:opacity-100 focus:opacity-100 sm:opacity-0 max-sm:opacity-75 text-[#7A6B5D] hover:text-[#8C4A32] hover:bg-[#8C4A32]/10'
                        }`}
                        title="এই স্তবক পর্যন্ত পড়া হয়েছে চিহ্নিত করুন"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-[#8C4A32]' : ''}`} />
                        <span>{isMarked ? 'চিহ্নিত স্থান' : 'এই পর্যন্ত পড়া মার্ক করুন'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Story / Prose Paragraphs with inline paragraph markers */
            <div className="prose-bengali space-y-6">
              {paragraphs.map((paragraph, i) => {
                const isMarked = savedProgress?.lastParagraphIndex === i;
                return (
                  <div
                    key={i}
                    id={`writing-para-${i}`}
                    className={`group relative mb-6 rounded-xl transition-all duration-300 ${
                      isMarked
                        ? 'bg-[#8C4A32]/10 border-l-4 border-[#8C4A32] pl-4 sm:pl-5 pr-3 py-3 shadow-xs'
                        : 'hover:bg-[#8C4A32]/5 p-2 sm:p-2.5 -mx-2 sm:-mx-2.5 rounded-lg'
                    }`}
                  >
                    {isMarked && (
                      <div className="flex items-center justify-between text-xs font-serif-bn text-[#8C4A32] font-semibold mb-2 bg-[#8C4A32]/10 px-3 py-1.5 rounded-lg border border-[#8C4A32]/20">
                        <div className="flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5 fill-[#8C4A32]" />
                          <span>আপনার পড়া এই অনুচ্ছেদ ({toBengaliNumber(i + 1)}) পর্যন্ত চিহ্নিত রয়েছে</span>
                        </div>
                        <button
                          onClick={handleClearMark}
                          className="text-[11px] underline opacity-75 hover:opacity-100 hover:text-rose-600 transition-colors"
                        >
                          চিহ্ন সরান
                        </button>
                      </div>
                    )}

                    <p className="whitespace-pre-line text-justify leading-relaxed">
                      {paragraph.trim()}
                    </p>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={() => handleMarkParagraph(i, paragraph)}
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
          )}
        </div>

        {/* Author sign-off / ornament */}
        <div className="pt-8 text-center border-t border-[#DFCBB5]/50">
          <div className="ornament-line text-[#8C4A32] text-sm font-serif-bn">
            <Feather className="w-4 h-4 transform -rotate-12" />
          </div>
          <p className="font-serif-bn text-xs opacity-60 mt-3">
            শব্দের আড়ালে • লেখকের স্বকীয় সৃষ্টি
          </p>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-2 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-[#EFE5D5]/60 text-xs font-serif-bn opacity-80"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Related Writings */}
        {relatedPosts.length > 0 && (
          <section className="pt-12 border-t border-[#DFCBB5]/50 space-y-6">
            <div className="flex items-center space-x-2 text-sm font-serif-bn font-bold text-[#8C4A32]">
              <Sparkles className="w-4 h-4" />
              <span>আরও কিছু নির্বাচিত {getPostTypeLabel(post.type)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => navigate(`/read/${rel.type}/${rel.slug}`)}
                  className="p-5 rounded-2xl border border-[#DFCBB5]/80 bg-[#FAF7F2]/40 hover:bg-[#F2E8DC]/50 transition-all cursor-pointer space-y-2 group"
                >
                  <span className="text-[11px] font-serif-bn opacity-60">
                    {formatBengaliDate(rel.publishedAt || rel.createdAt)}
                  </span>
                  <h4 className="font-serif-bn text-base font-bold group-hover:text-[#8C4A32] transition-colors leading-snug">
                    {rel.title}
                  </h4>
                  <p className="text-xs font-serif-bn opacity-75 line-clamp-2">
                    {rel.excerpt || rel.body.slice(0, 100)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lightweight Reader Reflections / Comments Section (No login required) */}
        <CommentsSection postId={post.id} postTitle={post.title} />
      </article>

      {/* Delete Confirmation Modal for Admin */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="লেখাটি চিরতরে মুছে ফেলতে চান?"
        message={`"${post?.title || 'এই লেখাটি'}" স্থায়ীভাবে ডাটাবেজ থেকে মুছে ফেলা হবে। সাধারণ পাঠক বা অ্যাডমিন কেউই পরবর্তীতে এটি আর দেখতে পাবে না। আপনি কি নিশ্চিত?`}
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="বাতিল"
        onConfirm={handleDeletePost}
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
