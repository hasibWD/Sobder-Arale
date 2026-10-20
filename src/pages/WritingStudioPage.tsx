import React, { useState, useEffect } from 'react';
import { PostType, PostStatus, Novel } from '../types';
import { savePost, saveChapter, getPublishedNovels, saveNovel } from '../firebase/firestoreService';
import { generateSlug, calculateBengaliReadingTime, toBengaliNumber } from '../utils/bengaliUtils';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../firebase/authContext';
import {
  Feather,
  Send,
  Save,
  Eye,
  BookOpen,
  Tag,
  Sparkles,
  ArrowLeft,
  PenTool,
  Clock,
  Layers,
  HelpCircle,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface WritingStudioPageProps {
  navigate: (path: string) => void;
}

export const WritingStudioPage: React.FC<WritingStudioPageProps> = ({ navigate }) => {
  const { showToast } = useToast();
  const { enableAuthorMode } = useAuth();

  const [writingType, setWritingType] = useState<PostType | 'chapter'>('poem');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Novel chapter specific state
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovelId, setSelectedNovelId] = useState<string>('');
  const [newNovelTitle, setNewNovelTitle] = useState('');
  const [newNovelSynopsis, setNewNovelSynopsis] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);

  // Suggested literary tags
  const suggestedTags = ['প্রেম', 'বিরহ', 'স্মৃতি', 'বৃষ্টি', 'নিঃসঙ্গতা', 'জীবনবোধ', 'নদী', 'রাত্রি', 'প্রকৃতি', 'অনুভূতি'];

  useEffect(() => {
    async function loadNovels() {
      const list = await getPublishedNovels();
      setNovels(list);
      if (list.length > 0) {
        setSelectedNovelId(list[0].id);
        setChapterNumber((list[0].chapterCount || 0) + 1);
      }
    }
    loadNovels();
  }, []);

  const handleNovelChange = (novelId: string) => {
    setSelectedNovelId(novelId);
    const n = novels.find((x) => x.id === novelId);
    if (n) {
      setChapterNumber((n.chapterCount || 0) + 1);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(val));
    }
  };

  const handleAddTag = (tag: string) => {
    const current = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!current.includes(tag)) {
      setTagsInput([...current, tag].join(', '));
    }
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const { minutes: readingMinutes } = calculateBengaliReadingTime(body);

  const handleSubmit = async (status: PostStatus) => {
    if (!title.trim()) {
      showToast('অনুগ্রহ করে একটি সুন্দর শিরোনাম প্রদান করুন', 'error');
      return;
    }
    if (!body.trim()) {
      showToast('লেখার মূল অংশ (বিষয়বস্তু) আবশ্যক', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      enableAuthorMode();

      // Case 1: Novel Chapter
      if (writingType === 'chapter') {
        let activeNovelId = selectedNovelId;

        // If author chose to create a new novel on the fly
        if (selectedNovelId === 'new') {
          if (!newNovelTitle.trim()) {
            showToast('নতুন উপন্যাসের নাম প্রদান করুন', 'error');
            setIsSubmitting(false);
            return;
          }
          activeNovelId = await saveNovel(null, {
            title: newNovelTitle.trim(),
            slug: generateSlug(newNovelTitle),
            synopsis: newNovelSynopsis.trim() || `${newNovelTitle} উপন্যাসের আখ্যান।`,
            status: 'ongoing',
          });
        }

        if (!activeNovelId) {
          showToast('কোনো উপন্যাস নির্বাচিত করা হয়নি', 'error');
          setIsSubmitting(false);
          return;
        }

        const chapterId = await saveChapter(activeNovelId, null, {
          title: title.trim(),
          chapterNumber: Number(chapterNumber) || 1,
          body: body.trim(),
          status,
        });

        showToast(
          status === 'published'
            ? 'উপন্যাসের অধ্যায়টি সফলভাবে পোস্ট করা হয়েছে!'
            : 'অধ্যায়টি খসড়া হিসেবে সংরক্ষিত হয়েছে!',
          'success'
        );

        const currentNovel = novels.find((n) => n.id === activeNovelId);
        navigate(`/novels/${currentNovel?.slug || activeNovelId}/chapters/${chapterId}`);
        return;
      }

      // Case 2: Poem, Short Story, or Essay
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const postSlug = (slug.trim() || generateSlug(title)).toLowerCase();

      const newId = await savePost(null, {
        title: title.trim(),
        slug: postSlug,
        type: writingType,
        excerpt: excerpt.trim() || body.slice(0, 160),
        body: body.trim(),
        tags,
        category: category.trim(),
        coverImageUrl: coverImageUrl.trim(),
        status,
        readingTimeMinutes: readingMinutes,
      });

      showToast(
        status === 'published'
          ? 'আপনার লেখাটি সফলভাবে পোস্ট ও প্রকাশিত হয়েছে!'
          : 'লেখাটি খসড়া হিসেবে সংরক্ষিত হয়েছে!',
        'success'
      );

      if (status === 'published') {
        navigate(`/read/${writingType}/${postSlug || newId}`);
      } else {
        navigate('/admin');
      }
    } catch (err) {
      console.error('Error posting writing:', err);
      showToast('পোস্ট সংরক্ষণ করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPoem = writingType === 'poem';

  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-serif-bn transition-all ${zenMode ? 'bg-[#F7F2EA]' : 'bg-[#FAF7F2]'}`}>
      <div className={`mx-auto space-y-6 ${zenMode ? 'max-w-3xl' : 'max-w-5xl'}`}>
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#DFCBB5] gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#F2E8DC] transition-colors"
              title="প্রচ্ছদে ফিরুন"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs text-[#8C4A32] font-semibold">
                <PenTool className="w-3.5 h-3.5" />
                <span>শব্দের কারিগর • সাহিত্য রচনা স্টুডিও</span>
              </div>
              <h1 className="text-2xl font-bold text-[#2C2621]">
                নতুন লেখা লিখুন ও পোস্ট করুন
              </h1>
            </div>
          </div>

          {/* Action Buttons: Preview, Zen Mode, Save Draft, Publish Now */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setZenMode(!zenMode)}
              className="p-2 rounded-xl border border-[#DFCBB5] bg-white text-[#5A4B3D] hover:bg-[#F2E8DC] transition-colors"
              title={zenMode ? 'সাধারণ মোড' : 'একান্ত মনোযোগ মোড (Zen Focus)'}
            >
              {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-[#8C4A32]" />}
            </button>

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
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-[#F5EDE1] text-xs font-semibold text-[#4A3F35] hover:bg-[#EBDDCB] transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>খসড়া রাখুন</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('published')}
              className="px-5 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>পোস্ট ও প্রকাশ করুন</span>
            </button>
          </div>
        </div>

        {/* Writing Type Selector Tabs */}
        {!zenMode && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F2E8DC]/50 p-1.5 rounded-2xl border border-[#DFCBB5]">
            <button
              type="button"
              onClick={() => setWritingType('poem')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                writingType === 'poem'
                  ? 'bg-white text-[#8C4A32] shadow-sm border border-[#DFCBB5]'
                  : 'text-[#6F6052] hover:text-[#2C2621]'
              }`}
            >
              <Feather className="w-3.5 h-3.5 transform -rotate-12" />
              <span>কবিতা (Poem)</span>
            </button>

            <button
              type="button"
              onClick={() => setWritingType('story')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                writingType === 'story'
                  ? 'bg-white text-[#8C4A32] shadow-sm border border-[#DFCBB5]'
                  : 'text-[#6F6052] hover:text-[#2C2621]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>ছোটগল্প (Story)</span>
            </button>

            <button
              type="button"
              onClick={() => setWritingType('essay')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                writingType === 'essay'
                  ? 'bg-white text-[#8C4A32] shadow-sm border border-[#DFCBB5]'
                  : 'text-[#6F6052] hover:text-[#2C2621]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>ব্যক্তিগত রচনা / প্রবন্ধ</span>
            </button>

            <button
              type="button"
              onClick={() => setWritingType('chapter')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 ${
                writingType === 'chapter'
                  ? 'bg-white text-[#8C4A32] shadow-sm border border-[#DFCBB5]'
                  : 'text-[#6F6052] hover:text-[#2C2621]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>উপন্যাসের অধ্যায়</span>
            </button>
          </div>
        )}

        {/* Live Preview View */}
        {showPreview ? (
          <div className="bg-[#FAF7F2] rounded-3xl border border-[#DFD3C2] p-8 sm:p-12 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#DFCBB5]/50 pb-3 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#8C4A32] text-white font-medium">
                লাইভ প্রিভিউ: {writingType === 'poem' ? 'কবিতা' : writingType === 'story' ? 'ছোটগল্প' : writingType === 'chapter' ? 'উপন্যাস অধ্যায়' : 'ব্যক্তিগত রচনা'}
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#8C4A32] hover:underline"
              >
                সম্পাদনায় ফিরে যান
              </button>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2C2621]">
                {title || 'শিরোনামহীন'}
              </h2>
              <div className="flex items-center justify-center space-x-4 text-xs text-[#7A6B5D]">
                <span>{toBengaliNumber(wordCount)} শব্দ</span>
                <span>•</span>
                <span>{toBengaliNumber(readingMinutes)} মিনিট পাঠ</span>
              </div>
            </div>

            <div className="py-6">
              {isPoem ? (
                <div className="poem-body max-w-xl mx-auto space-y-6 text-lg leading-loose">
                  {body.split(/\n\s*\n/).map((stanza, i) => (
                    <div key={i} className="whitespace-pre-line border-l-2 border-[#8C4A32]/40 pl-5 py-1">
                      {stanza.trim() || 'পঙ্‌ক্তিমালা এখানে সাজানো হবে...'}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prose-bengali space-y-6 text-base sm:text-lg leading-relaxed text-justify">
                  {body.split(/\n\s*\n/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p.trim() || 'গল্পের অনুচ্ছেদ এখানে প্রকাশ পাবে...'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Editor Main Area */
          <div className="space-y-6">
            {/* If Novel Chapter: Choose Novel */}
            {writingType === 'chapter' && !zenMode && (
              <div className="p-4 rounded-2xl bg-[#FAF5EB] border border-[#DFCBB5] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#4A3F35]">উপন্যাস নির্বাচন করুন</label>
                    <select
                      value={selectedNovelId}
                      onChange={(e) => handleNovelChange(e.target.value)}
                      className="w-full sm:w-72 px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:ring-1 focus:ring-[#8C4A32]"
                    >
                      {novels.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title} ({toBengaliNumber(n.chapterCount || 0)}টি অধ্যায়)
                        </option>
                      ))}
                      <option value="new">+ নতুন উপন্যাস শুরু করুন</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#4A3F35]">অধ্যায় নম্বর</label>
                    <input
                      type="number"
                      min="1"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                      className="w-24 px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm font-bold text-center focus:ring-1 focus:ring-[#8C4A32]"
                    />
                  </div>
                </div>

                {selectedNovelId === 'new' && (
                  <div className="pt-3 border-t border-[#DFCBB5] space-y-3">
                    <input
                      type="text"
                      value={newNovelTitle}
                      onChange={(e) => setNewNovelTitle(e.target.value)}
                      placeholder="নতুন উপন্যাসের নাম (যেমন: জলজোছনার গান)"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm font-semibold focus:ring-1 focus:ring-[#8C4A32]"
                    />
                    <textarea
                      rows={2}
                      value={newNovelSynopsis}
                      onChange={(e) => setNewNovelSynopsis(e.target.value)}
                      placeholder="উপন্যাসের মূল সারসংক্ষেপ..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs leading-relaxed focus:ring-1 focus:ring-[#8C4A32]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-1.5">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={
                  writingType === 'poem'
                    ? 'কবিতার শিরোনাম (যেমন: মেঘের চিঠি)'
                    : writingType === 'story'
                    ? 'ছোটগল্পের শিরোনাম (যেমন: অচেনা স্টেশনের কফি)'
                    : writingType === 'chapter'
                    ? 'অধ্যায়ের নাম (যেমন: নদীর বাঁকে দেখা)'
                    : 'রচনার শিরোনাম'
                }
                autoFocus
                className="w-full px-5 py-4 rounded-2xl border border-[#DFCBB5] bg-white text-xl sm:text-2xl font-bold text-[#2C2621] placeholder:text-[#A89887] focus:outline-none focus:ring-2 focus:ring-[#8C4A32] shadow-sm"
              />
            </div>

            {/* Main Body Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#7A6B5D] px-1">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 opacity-70" />
                  <span>
                    {toBengaliNumber(wordCount)} শব্দ • {toBengaliNumber(readingMinutes)} মিনিট পাঠ
                  </span>
                </span>
                <span className="opacity-80">
                  {isPoem
                    ? 'প্রতি স্তবকের মাঝে একটি ফাঁকা লাইন দিন'
                    : 'অনুচ্ছেদের মাঝে ফাঁকা লাইন দিন'}
                </span>
              </div>

              <textarea
                rows={zenMode ? 22 : 16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  isPoem
                    ? 'আপনার কবিতার পঙ্‌ক্তিমালা এখানে রচনা করুন...\n\nদ্বিতীয় স্তবক...'
                    : 'গল্প বা অধ্যায়ের কাহিনী এখানে বিস্তার করুন...'
                }
                className="w-full p-5 sm:p-6 rounded-2xl border border-[#DFCBB5] bg-white text-base sm:text-lg leading-relaxed text-[#2C2621] font-serif-bn placeholder:text-[#B3A494] focus:outline-none focus:ring-2 focus:ring-[#8C4A32] shadow-sm"
              />
            </div>

            {/* Excerpt, Tags & Category Drawer (Hidden in Zen Mode) */}
            {!zenMode && writingType !== 'chapter' && (
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#4A3F35]">বিভাগ (Category)</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="যেমন: রোমাঞ্চ, জীবনমুখী, নস্টালজিয়া"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:ring-1 focus:ring-[#8C4A32]"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#4A3F35]">ইউআরএল স্লাগ (Slug)</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="post-slug"
                      className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs font-mono focus:ring-1 focus:ring-[#8C4A32]"
                    />
                  </div>
                </div>

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#4A3F35]">
                    সংক্ষিপ্ত নির্যাস (ভূমিকা - ঐচ্ছিক)
                  </label>
                  <textarea
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="পাঠকদের আকৃষ্ট করার মতো ২-৩ লাইনের ভূমিকা (খালি রাখলে প্রথম লাইনগুলো নেওয়া হবে)"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm leading-relaxed focus:ring-1 focus:ring-[#8C4A32]"
                  />
                </div>

                {/* Tags and Quick Suggestion Pills */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#4A3F35]">
                    ট্যাগসমূহ (কমা দিয়ে পৃথক করুন)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="যেমন: প্রেম, বিরহ, স্মৃতি, নদী"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:ring-1 focus:ring-[#8C4A32]"
                  />

                  <div className="flex items-center space-x-1.5 flex-wrap gap-1 pt-1 text-xs">
                    <span className="text-[#7A6B5D] text-[11px] flex items-center space-x-1 mr-1">
                      <Tag className="w-3 h-3" />
                      <span>প্রস্তাবিত ট্যাগ:</span>
                    </span>
                    {suggestedTags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        className="px-2.5 py-0.5 rounded-full bg-[#EFE5D5] text-[#5A4B3D] hover:bg-[#8C4A32] hover:text-white transition-colors text-[11px]"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Big Action Button */}
            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('draft')}
                className="px-5 py-2.5 rounded-xl border border-[#DFCBB5] bg-[#F5EDE1] font-semibold text-xs text-[#4A3F35] hover:bg-[#EBDDCB] transition-colors"
              >
                খসড়া হিসেবে রাখুন
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('published')}
                className="px-7 py-3 rounded-xl bg-[#8C4A32] text-white font-bold text-sm hover:bg-[#723925] transition-all shadow-md flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'পোস্ট করা হচ্ছে...' : 'এখনই পোস্ট / প্রকাশ করুন'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
