import React, { useEffect, useState, useRef } from 'react';
import { Post, PostType, PostStatus } from '../../types';
import { getPostBySlug, savePost, getAllPostsAdmin, deletePost } from '../../services/literatureService';
import { generateSlug, getPostTypeLabel, calculateBengaliReadingTime } from '../../utils/bengaliUtils';
import { useToast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  Feather,
  Sparkles,
  Tag,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';

interface AdminWritingEditorPageProps {
  postId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminWritingEditorPage: React.FC<AdminWritingEditorPageProps> = ({
  postId,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPreview, setShowPreview] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<PostType>('poem');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<number | undefined>(undefined);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track initial load & dirty state for autosave
  const isLoadedRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadExistingPost() {
      if (!postId) {
        isLoadedRef.current = true;
        return;
      }
      try {
        setLoading(true);
        const all = await getAllPostsAdmin();
        const found = all.find((p) => p.id === postId);
        if (found) {
          setTitle(found.title);
          setSlug(found.slug);
          setType(found.type);
          setExcerpt(found.excerpt);
          setBody(found.body);
          setTagsInput(found.tags?.join(', ') || '');
          setCategory(found.category || '');
          setCoverImageUrl(found.coverImageUrl || '');
          setStatus(found.status);
          setPublishedAt(found.publishedAt);
        }
      } catch (err) {
        showToast('লেখা লোড করতে সমস্যা হয়েছে', 'error');
      } finally {
        setLoading(false);
        isLoadedRef.current = true;
      }
    }

    loadExistingPost();
  }, [postId]);

  // Handle title change and slug generation
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!postId && (!slug || slug === generateSlug(title))) {
      setSlug(generateSlug(val));
    }
  };

  // Autosave Draft effect
  useEffect(() => {
    if (!isLoadedRef.current || !title.trim() || !body.trim() || isSaving) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      // Only autosave as draft
      if (status === 'published') return;

      try {
        setAutoSaveStatus('saving');
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        const { minutes } = calculateBengaliReadingTime(body);

        await savePost(postId, {
          title: title.trim(),
          slug: slug.trim() || generateSlug(title),
          type,
          excerpt: excerpt.trim() || body.slice(0, 160),
          body: body.trim(),
          tags,
          category: category.trim(),
          coverImageUrl: coverImageUrl.trim(),
          status: 'draft',
          readingTimeMinutes: minutes,
        });

        setAutoSaveStatus('saved');
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 4000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, body, slug, excerpt, type, tagsInput, category, coverImageUrl, status, postId]);

  const handleManualSave = async (targetStatus: PostStatus) => {
    if (!title.trim()) {
      showToast('শিরোনাম প্রদান করা আবশ্যক', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('লেখার মূল অংশ (Body) আবশ্যক', 'error');
      return;
    }

    const currentSlug = (slug.trim() || generateSlug(title)).toLowerCase();

    try {
      setIsSaving(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const { minutes } = calculateBengaliReadingTime(body);

      await savePost(postId, {
        title: title.trim(),
        slug: currentSlug,
        type,
        excerpt: excerpt.trim() || body.slice(0, 160),
        body: body.trim(),
        tags,
        category: category.trim(),
        coverImageUrl: coverImageUrl.trim(),
        status: targetStatus,
        publishedAt: targetStatus === 'published' ? publishedAt || Date.now() : undefined,
        readingTimeMinutes: minutes,
      });

      showToast(
        targetStatus === 'published'
          ? 'লেখাটি সফলভাবে প্রকাশিত হয়েছে!'
          : 'খসড়া হিসেবে সংরক্ষিত হয়েছে!',
        'success'
      );
      onSaved();
    } catch (err: unknown) {
      showToast('সংরক্ষণ ব্যর্থ হয়েছে। তথ্য যাচাই করুন।', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    try {
      setIsDeleting(true);
      await deletePost(postId);
      showToast('লেখাটি সফলভাবে মুছে ফেলা হয়েছে', 'success');
      setShowDeleteModal(false);
      onSaved();
    } catch {
      showToast('লেখা মোছা সম্ভব হয়নি', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="পাণ্ডুলিপি লোড হচ্ছে..." />;
  }

  const isPoem = type === 'poem';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-serif-bn">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DFCBB5] gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#F2E8DC] transition-colors"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#2C2621]">
              {postId ? 'লেখা সম্পাদনা' : 'নতুন সাহিত্য রচনা'}
            </h1>
            <span className="text-xs text-[#7A6B5D]">
              {type === 'poem' ? 'কবিতা' : type === 'story' ? 'ছোটগল্প' : 'ব্যক্তিগত রচনা'}
            </span>
          </div>
        </div>

        {/* Save & Publish Buttons */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-2">
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-[#8C4A32] flex items-center space-x-1 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              <span>স্বয়ংক্রিয় সংরক্ষণ...</span>
            </span>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-emerald-700 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>খসড়া সংরক্ষিত</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs font-semibold text-[#4A3F35] hover:bg-[#F2E8DC] transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-[#8C4A32]" />
            <span>{showPreview ? 'সম্পাদক' : 'প্রিভিউ'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleManualSave('draft')}
            className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-[#F5EDE1] text-xs font-semibold text-[#4A3F35] hover:bg-[#EBDDCB] transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            title="সাধারণ পাঠকদের থেকে খসড়া / লুকানো অবস্থায় সংরক্ষণ করুন"
          >
            <Save className="w-3.5 h-3.5" />
            <span>খসড়া রাখুন</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleManualSave('published')}
            className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            title="সবার পড়ার জন্য উন্মুক্ত ও প্রকাশ করুন"
          >
            <Send className="w-3.5 h-3.5" />
            <span>প্রকাশ করুন</span>
          </button>

          {postId && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-2 rounded-xl border border-red-300 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              title="এই লেখাটি চিরতরে মুছে ফেলুন"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>মুছুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Preview Mode */}
      {showPreview ? (
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#DFD3C2] p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DFCBB5]/50 pb-4 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-[#8C4A32] text-white font-medium">
              লাইভ প্রিভিউ ({getPostTypeLabel(type)})
            </span>
            <button
              onClick={() => setShowPreview(false)}
              className="text-[#8C4A32] hover:underline"
            >
              সম্পাদকে ফিরে যান
            </button>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2C2621]">
              {title || 'শিরোনামহীন'}
            </h1>
            <p className="text-xs text-[#7A6B5D]">
              ইউআরএল স্লাগ: /{slug || 'post-slug'}
            </p>
          </div>

          <div className="py-6">
            {isPoem ? (
              <div className="poem-body max-w-xl mx-auto space-y-6 text-lg leading-loose">
                {body.split(/\n\s*\n/).map((stanza, i) => (
                  <div key={i} className="whitespace-pre-line border-l-2 border-[#8C4A32]/40 pl-5 py-1">
                    {stanza.trim() || 'কবিতার স্তবক...'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="prose-bengali space-y-6 text-base sm:text-lg leading-relaxed text-justify">
                {body.split(/\n\s*\n/).map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p.trim() || 'গল্পের অনুচ্ছেদ...'}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                লেখার শিরোনাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="যেমন: বিষণ্ণ সন্ধ্যার গান / মেঘের চিঠি"
                className="w-full px-4 py-3 rounded-2xl border border-[#DFCBB5] bg-white text-lg font-bold text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#4A3F35]">
                  মূল লেখা (কবিতা বা গল্পের বয়ান) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[#7A6B5D]">
                  {isPoem
                    ? 'প্রতি স্তবকের মাঝে একটি ফাঁকা লাইন দিন'
                    : 'প্যারাগ্রাফের মাঝে ফাঁকা লাইন দিন'}
                </span>
              </div>
              <textarea
                rows={18}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  isPoem
                    ? 'কবিতার পঙ্‌ক্তিমালা এখানে লিখুন...\n\nদ্বিতীয় স্তবক...'
                    : 'গল্পের অনুচ্ছেদ এখানে বিস্তার করুন...'
                }
                className="w-full p-4 rounded-2xl border border-[#DFCBB5] bg-white text-base leading-relaxed text-[#2C2621] font-serif-bn focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                সংক্ষিপ্ত নির্যাস (Excerpt / ভূমিকা)
              </label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="হোমপেজ ও কার্ডে দেখানোর জন্য সংক্ষিপ্ত ভূমিকা (ঐচ্ছিক, ফাঁকা রাখলে লেখার প্রথম অংশ নেওয়া হবে)"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>
          </div>

          {/* Sidebar Settings (1 col) */}
          <div className="space-y-5 bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C4A32] border-b border-[#DFCBB5] pb-2">
              পাবলিকেশন সেটিংস
            </h3>

            {/* Writing Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">লেখার ধরন</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PostType)}
                className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              >
                <option value="poem">কবিতা (Poem)</option>
                <option value="story">ছোটগল্প (Short Story)</option>
                <option value="essay">ব্যক্তিগত রচনা (Essay)</option>
              </select>
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                ইউআরএল স্লাগ (Slug)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="post-slug"
                className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
              <p className="text-[10px] text-[#7A6B5D]">
                ঠিকানা: /read/{type}/{slug || '...'}
              </p>
            </div>

            {/* Category */}
            {!isPoem && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#4A3F35]">বিভাগ (Category)</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="যেমন: রোমাঞ্চ, জীবনমুখী, নস্টালজিয়া"
                  className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
                />
              </div>
            )}

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                ট্যাগসমূহ (কমা দিয়ে পৃথক করুন)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="যেমন: প্রেম, বিরহ, স্মৃতি, বৃষ্টি"
                className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>

            {/* Cover Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                কভার ছবির লিংক (ঐচ্ছিক)
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>

            {/* Publication Status info */}
            <div className="pt-2 text-xs border-t border-[#DFCBB5] text-[#7A6B5D] space-y-1">
              <div>
                বর্তমান অবস্থা:{' '}
                <strong className={status === 'published' ? 'text-emerald-700' : 'text-amber-700'}>
                  {status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="লেখা মুছে ফেলতে চান?"
        message={`"${title || 'এই লেখাটি'}" চিরতরে ডাটাবেজ থেকে মুছে ফেলা হবে। এই সিদ্ধান্ত অপরিবর্তনযোগ্য। নিশ্চিত করুন।`}
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="বাতিল"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isProcessing={isDeleting}
      />
    </div>
  );
};
