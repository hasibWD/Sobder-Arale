import React, { useEffect, useState } from 'react';
import { Post, ReadingTheme, FontSize } from '../types';
import { getPostBySlug, getPublishedPosts, deletePost, togglePostStatus } from '../services/literatureService';
import { useAuth } from '../supabase/authContext';
import { useToast } from '../components/common/Toast';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ReadingToolbar } from '../components/public/ReadingToolbar';
import { formatBengaliDate, getPostTypeLabel, toBengaliNumber } from '../utils/bengaliUtils';
import { ArrowLeft, Feather, Calendar, Clock, Sparkles, Trash2, Eye, EyeOff, Edit, ShieldAlert, CheckCircle } from 'lucide-react';
import { CommentsSection } from '../components/comments/CommentsSection';

interface WritingDetailPageProps {
  type: string;
  slug: string;
  navigate: (path: string) => void;
}

export const WritingDetailPage: React.FC<WritingDetailPageProps> = ({ type, slug, navigate }) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ReadingTheme>('ivory');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Breadcrumb back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(isPoem ? '/poems' : '/stories')}
            className="inline-flex items-center space-x-2 text-xs font-serif-bn opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isPoem ? 'সকল কবিতায় ফিরুন' : 'সকল গল্পে ফিরুন'}</span>
          </button>

          {isAdmin && (
            <span className="text-[11px] font-serif-bn text-[#8C4A32] font-semibold bg-[#FAF7F2] border border-[#DFCBB5] px-2.5 py-1 rounded-full">
              অ্যাডমিন মোড সক্রিয়
            </span>
          )}
        </div>

        {/* Dedicated Admin Control Bar (Only for authenticated Admin) */}
        {isAdmin && (
          <div className="bg-[#FAF7F2] border-2 border-[#8C4A32]/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 font-serif-bn text-[#2C2621]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8DEC8]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-[#8C4A32] text-sm">অ্যাডমিন নিয়ন্ত্রণ বার</span>
                <span className="text-xs text-[#7A6B5D]">• লেখা মুছে ফেলা ও হাইড করার পূর্ণ ক্ষমতা</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#5A4B3D]">বর্তমান অবস্থা:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    post.status === 'published'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {post.status === 'published'
                    ? '🟢 প্রকাশিত (সবার জন্য দৃশ্যমান)'
                    : '🟡 লুকানো / খসড়া (সাধারণ পাঠক দেখতে পাবে না)'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                {post.status === 'published' ? (
                  <button
                    onClick={handleHidePost}
                    disabled={isActionLoading}
                    className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                    title="সাধারণ পাঠকদের তালিকা থেকে এই লেখাটি লুকিয়ে ফেলুন"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                    <span>লেখাটি হাইড / খসড়া করুন</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePublishPost}
                    disabled={isActionLoading}
                    className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                    title="লেখাটি পুনরায় সবার জন্য প্রকাশ করুন"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                    <span>লেখাটি আনহাইড / প্রকাশ করুন</span>
                  </button>
                )}

                <button
                  onClick={() => navigate('/admin')}
                  className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white hover:bg-[#F2E8DC] text-[#4A3F35] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <Edit className="w-3.5 h-3.5 text-[#8C4A32]" />
                  <span>অ্যাডমিন ড্যাশবোর্ডে যান</span>
                </button>
              </div>

              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isActionLoading}
                className="px-3.5 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
                title="এই লেখাটি চিরতরে মুছে ফেলুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>লেখাটি মুছে ফেলুন</span>
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
