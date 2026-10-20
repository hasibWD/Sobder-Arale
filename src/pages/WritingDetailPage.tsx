import React, { useEffect, useState } from 'react';
import { Post, ReadingTheme, FontSize } from '../types';
import { getPostBySlug, getPublishedPosts } from '../firebase/firestoreService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ReadingToolbar } from '../components/public/ReadingToolbar';
import { WritingCard } from '../components/public/WritingCard';
import { formatBengaliDate, getPostTypeLabel, toBengaliNumber } from '../utils/bengaliUtils';
import { ArrowLeft, Feather, Calendar, Clock, Sparkles } from 'lucide-react';

interface WritingDetailPageProps {
  type: string;
  slug: string;
  navigate: (path: string) => void;
}

export const WritingDetailPage: React.FC<WritingDetailPageProps> = ({ type, slug, navigate }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ReadingTheme>('ivory');
  const [fontSize, setFontSize] = useState<FontSize>('base');

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
    return () => {
      isMounted = false;
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses[theme]}`}>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Breadcrumb back navigation */}
        <div>
          <button
            onClick={() => navigate(isPoem ? '/poems' : '/stories')}
            className="inline-flex items-center space-x-2 text-xs font-serif-bn opacity-70 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isPoem ? 'সকল কবিতায় ফিরুন' : 'সকল গল্পে ফিরুন'}</span>
          </button>
        </div>

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
      </article>
    </div>
  );
};
