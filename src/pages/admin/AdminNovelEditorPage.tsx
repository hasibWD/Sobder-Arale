import React, { useEffect, useState } from 'react';
import { Novel, Chapter, NovelStatus, PostStatus } from '../../types';
import {
  getNovelBySlugOrId,
  saveNovel,
  getAllChaptersAdmin,
  saveChapter,
  deleteChapter,
} from '../../services/literatureService';
import { generateSlug, toBengaliNumber } from '../../utils/bengaliUtils';
import { useToast } from '../../components/common/Toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Save,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  BookMarked,
  X,
  Send,
} from 'lucide-react';

interface AdminNovelEditorPageProps {
  novelId: string | null;
  initialChapterId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminNovelEditorPage: React.FC<AdminNovelEditorPageProps> = ({
  novelId,
  initialChapterId,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isSavingNovel, setIsSavingNovel] = useState(false);

  // Novel fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState<NovelStatus>('ongoing');

  // Chapters list
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Active chapter editor modal state
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterBody, setChapterBody] = useState('');
  const [chapterStatus, setChapterStatus] = useState<PostStatus>('published');
  const [isSavingChapter, setIsSavingChapter] = useState(false);

  useEffect(() => {
    async function loadNovelAndChapters() {
      if (!novelId) {
        return;
      }
      try {
        setLoading(true);
        const novelData = await getNovelBySlugOrId(novelId);
        if (novelData) {
          setTitle(novelData.title);
          setSlug(novelData.slug);
          setSynopsis(novelData.synopsis);
          setCoverImageUrl(novelData.coverImageUrl || '');
          setStatus(novelData.status);

          const chs = await getAllChaptersAdmin(novelData.id);
          setChapters(chs);

          if (initialChapterId) {
            const target = chs.find((c) => c.id === initialChapterId);
            if (target) {
              openEditChapter(target);
            }
          }
        }
      } catch (err) {
        showToast('উপন্যাস লোড করতে সমস্যা হয়েছে', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadNovelAndChapters();
  }, [novelId, initialChapterId]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!novelId && (!slug || slug === generateSlug(title))) {
      setSlug(generateSlug(val));
    }
  };

  const handleSaveNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('উপন্যাসের নাম আবশ্যক', 'error');
      return;
    }
    if (!synopsis.trim()) {
      showToast('উপন্যাসের সারসংক্ষেপ আবশ্যক', 'error');
      return;
    }

    try {
      setIsSavingNovel(true);
      const savedId = await saveNovel(novelId, {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        synopsis: synopsis.trim(),
        coverImageUrl: coverImageUrl.trim(),
        status,
      });
      showToast('উপন্যাসটি সফলভাবে সংরক্ষিত হয়েছে!', 'success');
      onSaved();
    } catch {
      showToast('উপন্যাস সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSavingNovel(false);
    }
  };

  // Chapter Modal Helpers
  const openNewChapter = () => {
    setEditingChapterId(null);
    setChapterTitle('');
    setChapterNumber(chapters.length + 1);
    setChapterBody('');
    setChapterStatus('published');
    setChapterModalOpen(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setChapterTitle(chapter.title);
    setChapterNumber(chapter.chapterNumber);
    setChapterBody(chapter.body);
    setChapterStatus(chapter.status);
    setChapterModalOpen(true);
  };

  const handleSaveChapterModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novelId) {
      showToast('অনুগ্রহ করে প্রথমে মূল উপন্যাসটি সংরক্ষণ করুন', 'error');
      return;
    }
    if (!chapterTitle.trim()) {
      showToast('অধ্যায়ের শিরোনাম আবশ্যক', 'error');
      return;
    }
    if (!chapterBody.trim()) {
      showToast('অধ্যায়ের বিষয়বস্তু আবশ্যক', 'error');
      return;
    }

    try {
      setIsSavingChapter(true);
      await saveChapter(novelId, editingChapterId, {
        title: chapterTitle.trim(),
        chapterNumber: Number(chapterNumber),
        body: chapterBody.trim(),
        status: chapterStatus,
      });

      showToast('অধ্যায়টি সংরক্ষিত হয়েছে!', 'success');
      setChapterModalOpen(false);

      // Reload chapters
      const chs = await getAllChaptersAdmin(novelId);
      setChapters(chs);
    } catch {
      showToast('অধ্যায় সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSavingChapter(false);
    }
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    if (!novelId) return;
    if (!window.confirm(`অধ্যায় ${toBengaliNumber(chapter.chapterNumber)} মুছে ফেলতে চান?`)) {
      return;
    }
    try {
      await deleteChapter(novelId, chapter.id);
      showToast('অধ্যায় মুছে ফেলা হয়েছে', 'success');
      const chs = await getAllChaptersAdmin(novelId);
      setChapters(chs);
    } catch {
      showToast('অধ্যায় মোছা সম্ভব হয়নি', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner message="উপন্যাসের তথ্য প্রস্তুত করা হচ্ছে..." />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-serif-bn">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#DFCBB5]">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#F2E8DC] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#2C2621]">
              {novelId ? 'উপন্যাস ও অধ্যায় পরিচালনা' : 'নতুন উপন্যাস সৃষ্টি'}
            </h1>
            <span className="text-xs text-[#7A6B5D]">
              ধারাবাহিক কাহিনী ও অধ্যায় বিন্যাস
            </span>
          </div>
        </div>

        <button
          onClick={handleSaveNovel}
          disabled={isSavingNovel}
          className="px-5 py-2.5 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSavingNovel ? 'সংরক্ষণ...' : 'উপন্যাস সংরক্ষণ করুন'}</span>
        </button>
      </div>

      {/* Novel Master Details Form */}
      <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-2xl border border-[#DFD3C2] space-y-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#2C2621] border-b border-[#DFCBB5] pb-2">
          উপন্যাসের মূল তথ্যাবলী
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">
              উপন্যাসের নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="যেমন: কুয়াশার নদী"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-base font-bold text-[#2C2621] focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">
              ইউআরএল স্লাগ (Slug)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kuyashar-nodi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-xs font-mono focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#4A3F35]">
            সারসংক্ষেপ / প্লট পরিচিতি (Synopsis) <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            placeholder="উপন্যাসের মূল ভাবনা ও পটভূমি বর্ণনা করুন..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm leading-relaxed focus:ring-1 focus:ring-[#8C4A32]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">উপন্যাসের অবস্থা</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as NovelStatus)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:ring-1 focus:ring-[#8C4A32]"
            >
              <option value="ongoing">চলমান (Ongoing)</option>
              <option value="completed">সমাপ্ত (Completed)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">কভার ছবির লিঙ্ক (ঐচ্ছিক)</label>
            <input
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/novel-cover.jpg"
              className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-xs focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>
        </div>
      </div>

      {/* Chapters Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2C2621]">
              অধ্যায় বিন্যাস ও বিষয়বস্তু
            </h2>
            <p className="text-xs text-[#7A6B5D]">
              {novelId
                ? `মোট ${toBengaliNumber(chapters.length)}টি অধ্যায় সাজানো রয়েছে`
                : 'অধ্যায় যুক্ত করতে প্রথমে উপরের উপন্যাসটি সংরক্ষণ করুন'}
            </p>
          </div>

          {novelId && (
            <button
              type="button"
              onClick={openNewChapter}
              className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#8C4A32] text-[#8C4A32] hover:bg-[#8C4A32] hover:text-white transition-colors text-xs font-semibold flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন অধ্যায় যুক্ত করুন</span>
            </button>
          )}
        </div>

        {novelId ? (
          chapters.length > 0 ? (
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] divide-y divide-[#EFE5D5] overflow-hidden">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F5EDE1] transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-8 h-8 rounded-full bg-[#EFE5D5] border border-[#DFCBB5] text-[#8C4A32] font-bold text-xs flex items-center justify-center shrink-0">
                      {toBengaliNumber(ch.chapterNumber)}
                    </span>
                    <div>
                      <h4 className="font-semibold text-base text-[#2C2621]">{ch.title}</h4>
                      <span className="text-xs text-[#7A6B5D]">
                        অবস্থা: {ch.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openEditChapter(ch)}
                      className="p-2 rounded-lg border border-[#DFCBB5] text-[#8C4A32] hover:bg-[#F2E8DC] transition-colors"
                      title="অধ্যায় সম্পাদনা"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChapter(ch)}
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="অধ্যায় মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center rounded-2xl border border-dashed border-[#DFD3C2] bg-[#FAF7F2] text-xs text-[#7A6B5D] space-y-2">
              <BookMarked className="w-8 h-8 mx-auto text-[#8C4A32] opacity-60 mb-2" />
              <p>এই উপন্যাসে এখনও কোনো অধ্যায় নেই।</p>
              <button
                type="button"
                onClick={openNewChapter}
                className="text-[#8C4A32] font-semibold underline"
              >
                প্রথম অধ্যায় যোগ করুন
              </button>
            </div>
          )
        ) : (
          <div className="p-6 text-center rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] text-xs text-[#7A6B5D]">
            অধ্যায় যোগ করতে উপরের ফর্মে উপন্যাসের নাম ও সারসংক্ষেপ দিয়ে "উপন্যাস সংরক্ষণ করুন" বাটনে চাপ দিন।
          </div>
        )}
      </div>

      {/* Chapter Creation & Editing Modal */}
      {chapterModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveChapterModal}
            className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full border border-[#DFD3C2] p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#DFCBB5] pb-3">
              <div className="flex items-center space-x-2 text-[#8C4A32]">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-lg font-bold text-[#2C2621]">
                  {editingChapterId ? 'অধ্যায় সম্পাদনা' : 'নতুন অধ্যায় রচনা'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChapterModalOpen(false)}
                className="text-[#7A6B5D] hover:text-[#2C2621]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-semibold text-[#4A3F35]">অধ্যায় নম্বর</label>
                <input
                  type="number"
                  min="1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:ring-1 focus:ring-[#8C4A32]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-semibold text-[#4A3F35]">
                  অধ্যায়ের নাম / শিরোনাম <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="যেমন: নদীর বাঁকে দেখা / নিশীথ জাগরণ"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm font-semibold focus:ring-1 focus:ring-[#8C4A32]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">
                অধ্যায়ের কাহিনী ও বয়ান <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={12}
                value={chapterBody}
                onChange={(e) => setChapterBody(e.target.value)}
                placeholder="অধ্যায়ের সম্পূর্ণ গল্প এখানে লিখুন (প্যারাগ্রাফের মাঝে ফাঁকা লাইন দিন)..."
                required
                className="w-full p-3.5 rounded-xl border border-[#DFCBB5] bg-white text-sm leading-relaxed text-[#2C2621] focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-[#4A3F35]">অবস্থা:</label>
                <select
                  value={chapterStatus}
                  onChange={(e) => setChapterStatus(e.target.value as PostStatus)}
                  className="px-3 py-1 rounded-lg border border-[#DFCBB5] bg-white text-xs focus:ring-1 focus:ring-[#8C4A32]"
                >
                  <option value="published">প্রকাশিত (পাঠকেরা পড়তে পারবেন)</option>
                  <option value="draft">খসড়া (গোপন থাকবে)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setChapterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFCBB5] text-xs text-[#5A4B3D] hover:bg-[#F2E8DC]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingChapter}
                  className="px-5 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] disabled:opacity-50"
                >
                  {isSavingChapter ? 'সংরক্ষণ...' : 'অধ্যায় সংরক্ষণ করুন'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
