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

  // Sync favourites and reading progress on post load
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
    }

    // Scroll listener for real-time progress & debounced auto-save
    let saveTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const pct = Math.min(100, Math.max(1, Math.round((window.scrollY / scrollHeight) * 100)));
      setCurrentProgress(pct);

      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (window.scrollY > 100) {
          bookmarkProgressService.saveProgress({
            id: post.id,
            type: post.type as any,
            title: post.title,
            slug: post.slug,
            url: window.location.pathname,
            percentage: pct,
            scrollY: window.scrollY,
          });
        }
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(saveTimeout);
    };
  }, [post]);

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

  const handleManualBookmark = () => {
    if (!post) return;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollHeight > 0 ? Math.min(100, Math.max(1, Math.round((window.scrollY / scrollHeight) * 100))) : 100;

    bookmarkProgressService.saveProgress({
      id: post.id,
      type: post.type as any,
      title: post.title,
      slug: post.slug,
      url: window.location.pathname,
      percentage: pct,
      scrollY: window.scrollY,
    });
    showToast(`বুকমার্ক সংরক্ষণ করা হয়েছে (${pct}% পড়া সম্পন্ন)`, 'success');
  };

  const handleResumeReading = () => {
    if (savedProgress) {
      window.scrollTo({
        top: savedProgress.scrollY,
        behavior: 'smooth',
      });
      setShowResumeBanner(false);
      showToast('যেখান থেকে পড়া থামিয়েছিলেন সেখানে নিয়ে যাওয়া হয়েছে!', 'success');
    }
  };

  const isPoem = post.type === 'poem';

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

        {/* Resume Reading Notice Banner if prior reading progress exists */}
        {showResumeBanner && savedProgress && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/10 via-[#8C4A32]/10 to-amber-700/10 border border-[#8C4A32]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#8C4A32] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-serif-bn text-sm font-semibold text-[#8C4A32]">
                  যেখান থেকে পড়া থামিয়েছিলেন সেখান থেকে পড়ুন
                </p>
                <p className="font-serif-bn text-xs text-[#5C4F43]">
                  আপনি পূর্বে এই লেখার প্রায় {toBengaliNumber(savedProgress.percentage)}% পড়েছিলেন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handleResumeReading}
                className="px-4 py-1.5 rounded-lg bg-[#8C4A32] text-white font-serif-bn text-xs font-medium hover:bg-[#733B26] transition-colors shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পড়া চালিয়ে যান</span>
              </button>
              <button
                onClick={() => setShowResumeBanner(false)}
                className="px-2 py-1.5 rounded-lg text-xs font-serif-bn text-[#7A6B5D] hover:bg-[#DFCBB5]/40 transition-colors"
                title="লুকিয়ে রাখুন"
              >
                বাদ দিন
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
          readingProgressPercent={currentProgress > 0 ? currentProgress : undefined}
        />

        {/* Content Body */}
        <div className={`font-serif-bn py-8 ${fontSizes[fontSize]}`}>
          {isPoem ? (
            /* Poem Stanzas Preservation: poetic centering or left-indent */
            <div className="poem-body max-w-xl mx-auto space-y-6">
              {post.body.split(/\n\s*\n/).map((stanza, i) => (
                <div
                  key={i}
                  className="whitespace-pre-line border-l-2 border-[#8C4A32]/30 pl-5 py-1 tracking-wide"
                >
                  {stanza.trim()}
                </div>
              ))}
            </div>
          ) : (
            /* Story / Prose Paragraphs */
            <div className="prose-bengali space-y-6">
              {post.body.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line text-justify leading-relaxed">
                  {paragraph.trim()}
                </p>
              ))}
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
    </div>
  );
};
