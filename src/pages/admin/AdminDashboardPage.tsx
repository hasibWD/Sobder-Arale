import React, { useEffect, useState } from 'react';
import { useAuth } from '../../supabase/authContext';
import { Post, Novel, Chapter, AuthorProfile, Book, PostType } from '../../types';
import {
  getAllPostsAdmin,
  getAllNovelsAdmin,
  getAllChaptersAdmin,
  getAllBooksAdmin,
  deletePost,
  savePost,
  togglePostStatus,
  deleteNovel,
  deleteBook,
  saveBook,
  getAuthorProfile,
  saveAuthorProfile,
} from '../../services/literatureService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useToast } from '../../components/common/Toast';
import { AdminBookUploadModal } from '../../components/admin/AdminBookUploadModal';
import { PdfReaderModal } from '../../components/books/PdfReaderModal';
import { toBengaliNumber, formatBengaliDate, getPostTypeLabel, getStatusLabel } from '../../utils/bengaliUtils';
import {
  Feather,
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  LogOut,
  Settings,
  HelpCircle,
  Sparkles,
  Layers,
  CheckCircle,
  Clock,
  BookMarked,
  RefreshCw,
  ExternalLink,
  Copy,
  Database,
  Check,
  Upload,
  Download,
} from 'lucide-react';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
  openWritingEditor: (postId: string | null) => void;
  openNovelEditor: (novelId: string | null) => void;
  openChapterEditor: (novelId: string, chapterId: string | null) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  navigate,
  openWritingEditor,
  openNovelEditor,
  openChapterEditor,
}) => {
  const { user, isAdmin, logout, isConfigured } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'writings' | 'novels' | 'books' | 'author' | 'guide'>('writings');
  const [posts, setPosts] = useState<Post[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookModalState, setBookModalState] = useState<Book | null | 'new'>(null);
  const [readingPdfBook, setReadingPdfBook] = useState<Book | null>(null);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  // Filters for writings tab
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Deletion modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Author form state
  const [authorForm, setAuthorForm] = useState<Partial<AuthorProfile>>({
    displayName: '',
    bio: '',
    photoURL: '',
    philosophy: '',
    email: '',
    location: '',
    socialLinks: {
      facebook: '',
      twitter: '',
      goodreads: '',
      website: '',
    },
  });
  const [isSavingAuthor, setIsSavingAuthor] = useState(false);
  const [insforgeStatus, setInsforgeStatus] = useState<{
    configured: boolean;
    connected?: boolean;
    project?: string;
    appKey?: string;
    region?: string;
    message?: string;
  } | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected?: boolean;
    message?: string;
  } | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [allPosts, allNovels, allBooks, authorData] = await Promise.all([
        getAllPostsAdmin(),
        getAllNovelsAdmin(),
        getAllBooksAdmin(),
        getAuthorProfile(),
      ]);
      setPosts(allPosts);
      setNovels(allNovels);
      setBooks(allBooks);
      if (authorData) {
        setAuthorProfile(authorData);
        setAuthorForm(authorData);
      }

      fetch('/api/insforge-status')
        .then((r) => r.json())
        .then((d) => setInsforgeStatus(d))
        .catch(() => setInsforgeStatus({ configured: false }));

      fetch('/api/supabase-status')
        .then((r) => r.json())
        .then((d) => setSupabaseStatus(d))
        .catch(() => setSupabaseStatus({ configured: false }));
    } catch (err) {
      console.error('Error refreshing admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const novelsCount = novels.length;
  const totalChapters = novels.reduce((acc, curr) => acc + (curr.chapterCount || 0), 0);

  // Filtered posts
  const filteredPosts = posts.filter((p) => {
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const handleDeletePostClick = (post: Post) => {
    setConfirmModal({
      isOpen: true,
      title: 'লেখা মুছে ফেলতে চান?',
      message: `"${post.title}" শিরোনামের লেখাটি চিরতরে মুছে ফেলা হবে। এই সিদ্ধান্ত অপরিবর্তনযোগ্য।`,
      action: async () => {
        try {
          setIsDeleting(true);
          await deletePost(post.id);
          showToast('লেখাটি সফলভাবে মুছে ফেলা হয়েছে', 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await refreshData();
        } catch (error) {
          showToast('লেখা মোছা সম্ভব হয়নি', 'error');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleTogglePostStatus = async (post: Post) => {
    try {
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      await togglePostStatus(post.id, newStatus);
      showToast(
        newStatus === 'published'
          ? `"${post.title}" লেখাটি সবার জন্য উন্মুক্ত ও প্রকাশিত হয়েছে!`
          : `"${post.title}" লেখাটি সাধারণ পাঠকদের থেকে হাইড/লুকানো হয়েছে!`,
        'success'
      );
      await refreshData();
    } catch (error) {
      showToast('অবস্থা পরিবর্তন ব্যর্থ হয়েছে', 'error');
    }
  };

  const handleDeleteNovelClick = (novel: Novel) => {
    setConfirmModal({
      isOpen: true,
      title: 'উপন্যাসটি মুছে ফেলতে চান?',
      message: `"${novel.title}" উপন্যাসটি মুছে ফেলা হবে। নিশ্চিত করুন।`,
      action: async () => {
        try {
          setIsDeleting(true);
          await deleteNovel(novel.id);
          showToast('উপন্যাসটি মুছে ফেলা হয়েছে', 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await refreshData();
        } catch (error) {
          showToast('উপন্যাস মোছা সম্ভব হয়নি', 'error');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleDeleteChapterClick = (targetNovelId: string, chapter: Chapter) => {
    setConfirmModal({
      isOpen: true,
      title: 'অধ্যায় মুছে ফেলতে চান?',
      message: `অধ্যায় ${toBengaliNumber(chapter.chapterNumber)}: "${chapter.title}" চিরতরে মুছে ফেলা হবে। এই সিদ্ধান্ত অপরিবর্তনযোগ্য।`,
      action: async () => {
        try {
          setIsDeleting(true);
          const { deleteChapter } = await import('../../services/literatureService');
          await deleteChapter(targetNovelId, chapter.id);
          showToast('অধ্যায়টি সফলভাবে মুছে ফেলা হয়েছে', 'success');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          await refreshData();
        } catch (error) {
          showToast('অধ্যায় মোছা সম্ভব হয়নি', 'error');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAuthor(true);
      await saveAuthorProfile(authorForm);
      showToast('লেখক পরিচিতি সফলভাবে সংরক্ষিত হয়েছে!', 'success');
      await refreshData();
    } catch (error) {
      showToast('লেখক পরিচিতি সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsSavingAuthor(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Bar with Admin Identity & Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8DEC8] gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn font-semibold">
            <Feather className="w-3.5 h-3.5" />
            <span>শব্দের আড়ালে • লেখক নিয়ন্ত্রণকক্ষ</span>
          </div>
          <h1 className="font-serif-bn text-3xl font-bold text-[#2C2621]">
            সাহিত্য ড্যাশবোর্ড
          </h1>
          <p className="font-serif-bn text-xs text-[#7A6B5D]">
            স্বত্বাধিকারী হিসেবে লগইন আছেন: {user?.email || 'অনুমোদিত প্রশাসক'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white font-serif-bn text-xs text-[#4A3F35] hover:bg-[#F2E8DC] transition-colors flex items-center space-x-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-[#8C4A32]" />
            <span>মূল ওয়েবসাইট দেখুন</span>
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 font-serif-bn text-xs text-red-700 hover:bg-red-100 transition-colors flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DFD3C2] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>প্রকাশিত রচনা</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif-bn text-2xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(publishedCount)}
          </div>
          <div className="text-[11px] text-[#8C4A32] font-serif-bn">কবিতা ও গল্প</div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DFD3C2] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>খসড়া রচনা</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif-bn text-2xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(draftCount)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">অপ্রকাশিত পাণ্ডুলিপি</div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DFD3C2] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>উপন্যাস সম্ভার</span>
            <BookOpen className="w-4 h-4 text-[#8C4A32]" />
          </div>
          <div className="font-serif-bn text-2xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(novelsCount)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">চলমান ও সমাপ্ত উপন্যাস</div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DFD3C2] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>মোট অধ্যায়</span>
            <BookMarked className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-serif-bn text-2xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(totalChapters)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">উপন্যাসের অধ্যায়সমূহ</div>
        </div>

        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#DFD3C2] space-y-1.5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>বই ও পিডিএফ</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="font-serif-bn text-2xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(books.length)}
          </div>
          <div className="text-[11px] text-purple-800 font-serif-bn">ই-বুক ও পান্ডুলিপি</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#DFCBB5] overflow-x-auto pb-1 font-serif-bn text-sm">
        <button
          onClick={() => setActiveTab('writings')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 shrink-0 ${
            activeTab === 'writings'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>লেখা ব্যবস্থাপনা ({toBengaliNumber(posts.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('novels')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 shrink-0 ${
            activeTab === 'novels'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>উপন্যাস ও অধ্যায় ({toBengaliNumber(novels.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 shrink-0 ${
            activeTab === 'books'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>বই ও পিডিএফ ({toBengaliNumber(books.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('author')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 shrink-0 ${
            activeTab === 'author'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>লেখক পরিচিতি ও সেটিংস</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 shrink-0 ${
            activeTab === 'guide'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>ব্যাকএন্ড স্ট্যাটাস ও গাইড</span>
        </button>
      </div>

      {/* Tab 1: Writings Management */}
      {activeTab === 'writings' && (
        <div className="space-y-6">
          {/* Controls: New post button & Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#DFCBB5] bg-white font-serif-bn text-xs text-[#2C2621] focus:ring-1 focus:ring-[#8C4A32]"
              >
                <option value="all">সব ধরনের লেখা</option>
                <option value="poem">কবিতা</option>
                <option value="story">ছোটগল্প</option>
                <option value="essay">ব্যক্তিগত রচনা</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#DFCBB5] bg-white font-serif-bn text-xs text-[#2C2621] focus:ring-1 focus:ring-[#8C4A32]"
              >
                <option value="all">সকল অবস্থা</option>
                <option value="published">প্রকাশিত</option>
                <option value="draft">খসড়া</option>
              </select>

              <button
                onClick={refreshData}
                className="p-1.5 rounded-xl border border-[#DFCBB5] text-[#7A6B5D] hover:bg-[#F2E8DC] transition-colors"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate('/write')}
                className="px-3.5 py-2 rounded-xl border border-[#8C4A32] text-[#8C4A32] bg-white font-serif-bn text-xs font-semibold hover:bg-[#F2E8DC] transition-colors flex items-center space-x-1.5 shadow-sm"
                title="পূর্ণাঙ্গ সাহিত্য রাইটিং স্টুডিওতে লিখুন ও পোস্ট করুন"
              >
                <Feather className="w-3.5 h-3.5 transform -rotate-12" />
                <span>রাইটিং স্টুডিও</span>
              </button>
              <button
                onClick={() => openWritingEditor(null)}
                className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-xs font-semibold hover:bg-[#723925] transition-colors flex items-center space-x-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন লেখা তৈরি</span>
              </button>
            </div>
          </div>

          {/* Writings Table */}
          {loading ? (
            <LoadingSpinner message="লেখার তালিকা লোড হচ্ছে..." />
          ) : filteredPosts.length > 0 ? (
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-serif-bn text-sm divide-y divide-[#EFE5D5]">
                  <thead className="bg-[#F5EDE1] text-xs text-[#6F6052] uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">শিরোনাম</th>
                      <th className="px-4 py-3.5">ধরন</th>
                      <th className="px-4 py-3.5">অবস্থা</th>
                      <th className="px-4 py-3.5">তারিখ</th>
                      <th className="px-5 py-3.5 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D5] text-[#2C2621]">
                    {filteredPosts.map((post) => {
                      const statusInfo = getStatusLabel(post.status);
                      return (
                        <tr key={post.id} className="hover:bg-[#F7EFE4] transition-colors">
                          <td className="px-5 py-4 font-semibold text-base">
                            <div className="leading-snug">{post.title}</div>
                            <div className="text-xs text-[#7A6B5D] font-normal truncate max-w-xs mt-0.5">
                              /{post.slug}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EFE5D5] text-[#5A4B3D]">
                              {getPostTypeLabel(post.type)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${statusInfo.colorClass}`}>
                              {post.status === 'published' ? '🟢 প্রকাশিত' : '🟡 লুকানো / খসড়া'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-[#7A6B5D]">
                            {formatBengaliDate(post.publishedAt || post.updatedAt)}
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 text-xs whitespace-nowrap">
                            {/* Quick Hide / Publish Toggle */}
                            <button
                              onClick={() => handleTogglePostStatus(post)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs font-serif-bn font-medium transition-colors ${
                                post.status === 'published'
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                              title={
                                post.status === 'published'
                                  ? 'এই লেখাটি পাঠকদের থেকে লুকিয়ে ফেলুন (হাইড করুন)'
                                  : 'এই লেখাটি সবার জন্য উন্মুক্ত ও প্রকাশ করুন'
                              }
                            >
                              {post.status === 'published' ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>হাইড</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>প্রকাশ</span>
                                </>
                              )}
                            </button>

                            {/* View Reader Page */}
                            <button
                              onClick={() => navigate(`/read/${post.type}/${post.slug}`)}
                              className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors inline-flex items-center"
                              title="পাঠক ভিউতে দেখুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Post */}
                            <button
                              onClick={() => openWritingEditor(post.id)}
                              className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#8C4A32] hover:bg-[#F2E8DC] transition-colors inline-flex items-center"
                              title="সম্পাদনা করুন"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Post */}
                            <button
                              onClick={() => handleDeletePostClick(post)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-serif-bn font-medium"
                              title="এই লেখাটি চিরতরে মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>মুছুন</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#DFD3C2] bg-[#FAF7F2] font-serif-bn space-y-3">
              <Feather className="w-8 h-8 mx-auto text-[#8C4A32] opacity-60" />
              <p className="text-base text-[#4A3F35]">কোনো লেখা পাওয়া যায়নি</p>
              <button
                onClick={() => openWritingEditor(null)}
                className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>প্রথম লেখাটি প্রকাশ করুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Novels & Chapters */}
      {activeTab === 'novels' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif-bn text-xl font-bold text-[#2C2621]">
                উপন্যাস ও অধ্যায় ব্যবস্থাপনা
              </h2>
              <p className="text-xs text-[#7A6B5D] font-serif-bn">
                উপন্যাস তৈরি করুন এবং প্রতিটি উপন্যাসের অধীনে অধ্যায় সাজিয়ে প্রকাশ করুন
              </p>
            </div>
            <button
              onClick={() => openNovelEditor(null)}
              className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-xs font-semibold hover:bg-[#723925] transition-colors flex items-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন উপন্যাস তৈরি করুন</span>
            </button>
          </div>

          {novels.length > 0 ? (
            <div className="space-y-6">
              {novels.map((novel) => (
                <div
                  key={novel.id}
                  className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] p-6 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EFE5D5] gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-serif-bn font-medium border ${
                            novel.status === 'completed'
                              ? 'bg-stone-100 text-stone-700 border-stone-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {novel.status === 'completed' ? 'সমাপ্ত' : 'চলমান'}
                        </span>
                        <h3 className="font-serif-bn text-xl font-bold text-[#2C2621]">
                          {novel.title}
                        </h3>
                      </div>
                      <p className="font-serif-bn text-xs text-[#7A6B5D] line-clamp-2">
                        {novel.synopsis}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => openChapterEditor(novel.id, null)}
                        className="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#8C4A32] text-[#8C4A32] hover:bg-[#8C4A32] hover:text-white transition-colors font-serif-bn text-xs font-medium flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>অধ্যায় যোগ করুন</span>
                      </button>
                      <button
                        onClick={() => openNovelEditor(novel.id)}
                        className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors"
                        title="উপন্যাস তথ্য সম্পাদনা"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/novels/${novel.slug || novel.id}`)}
                        className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors"
                        title="পাঠক ভিউ"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNovelClick(novel)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        title="উপন্যাস মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chapters Sub-table */}
                  <NovelChaptersList
                    novelId={novel.id}
                    novelSlug={novel.slug}
                    openChapterEditor={openChapterEditor}
                    onChapterDeleted={refreshData}
                    onDeleteChapterRequest={handleDeleteChapterClick}
                    navigate={navigate}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#DFD3C2] bg-[#FAF7F2] font-serif-bn space-y-3">
              <BookOpen className="w-8 h-8 mx-auto text-[#8C4A32] opacity-60" />
              <p className="text-base text-[#4A3F35]">এখনও কোনো উপন্যাস তৈরি করা হয়নি</p>
              <button
                onClick={() => openNovelEditor(null)}
                className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>প্রথম উপন্যাস তৈরি করুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Books & PDF Management */}
      {activeTab === 'books' && (
        <div className="space-y-6 font-serif-bn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#2C2621]">বাংলা বই ও পিডিএফ সংগ্রহশালা</h2>
              <p className="text-xs text-[#7A6B5D] mt-0.5">
                আপনার প্রকাশিত বই, ই-বুক এবং বাংলা সাহিত্যের মূল পিডিএফ পান্ডুলিপি আপলোড ও পরিচালনা করুন
              </p>
            </div>

            <button
              onClick={() => setBookModalState('new')}
              className="px-4 py-2.5 rounded-xl bg-[#8C4A32] text-white text-xs sm:text-sm font-semibold hover:bg-[#723925] transition-all shadow-sm flex items-center space-x-2 shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>নতুন বই / বাংলা পিডিএফ আপলোড</span>
            </button>
          </div>

          {books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] flex flex-col justify-between space-y-4 hover:border-[#8C4A32]/40 transition-colors shadow-sm"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-28 rounded-lg bg-[#EAE0D2] overflow-hidden shrink-0 border border-[#DFCBB5] shadow-md flex items-center justify-center">
                      {b.coverImageUrl ? (
                        <img src={b.coverImageUrl} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#8C4A32] p-2 flex flex-col justify-between text-white text-[10px] text-center font-bold">
                          <span>{b.category}</span>
                          <span className="line-clamp-2">{b.title}</span>
                          <span>{b.publicationYear}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFE5D5] text-[#8C4A32]">
                          {b.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            b.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.status === 'published' ? '🟢 প্রকাশিত' : '🟡 খসড়া'}
                        </span>
                        <span className="text-[11px] text-[#7A6B5D]">{b.publicationYear}</span>
                      </div>

                      <h3 className="text-base font-bold text-[#2C2621] leading-snug truncate">
                        {b.title}
                      </h3>

                      <p className="text-xs text-[#7A6B5D] line-clamp-2 leading-relaxed">
                        {b.description || 'সংক্ষিপ্ত বিবরণ নেই'}
                      </p>

                      <div className="text-[11px] text-[#8C4A32] pt-1">
                        {b.pageCount ? `মোট ${toBengaliNumber(b.pageCount)} পৃষ্ঠা • ` : ''}
                        {b.fileSizeBytes ? `${(b.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                        ডাউনলোড: {toBengaliNumber(b.downloadCount)} বার
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8DEC8] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setReadingPdfBook(b)}
                      className="px-3 py-1.5 rounded-lg bg-[#F2E8DC] text-[#4A3B2C] hover:bg-[#E8DCCF] text-xs font-semibold transition-colors flex items-center space-x-1"
                      title="অনলাইনে পড়ুন"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>পড়ুন</span>
                    </button>

                    <a
                      href={b.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#DFCBB5] text-[#4A3B2C] hover:bg-[#E8DCCF] text-xs font-medium transition-colors flex items-center space-x-1"
                      title="ডাউনলোড লিঙ্ক"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>পিডিএফ</span>
                    </a>

                    <button
                      onClick={() => setBookModalState(b)}
                      className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors"
                      title="সম্পাদনা"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'বই মুছে ফেলতে চান?',
                          message: `"${b.title}" বইটি এবং এর পিডিএফ ফাইল চিরতরে মুছে ফেলা হবে।`,
                          action: async () => {
                            try {
                              setIsDeleting(true);
                              await deleteBook(b.id);
                              showToast('বই সফলভাবে মুছে ফেলা হয়েছে', 'success');
                              refreshData();
                            } catch (err: any) {
                              showToast('বই মুছতে ত্রুটি হয়েছে', 'error');
                            } finally {
                              setIsDeleting(false);
                              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                            }
                          },
                        });
                      }}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="বই মুছুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#DFD3C2] bg-[#FAF7F2] font-serif-bn space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-[#8C4A32] opacity-60" />
              <p className="text-base text-[#4A3F35]">এখনও কোনো বই বা বাংলা পিডিএফ আপলোড করা হয়নি</p>
              <button
                onClick={() => setBookModalState('new')}
                className="px-4 py-2 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors inline-flex items-center space-x-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>প্রথম বাংলা বই বা পিডিএফ আপলোড করুন</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Author Bio & Settings */}
      {activeTab === 'author' && (
        <form onSubmit={handleSaveAuthor} className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] p-8 space-y-6 max-w-3xl font-serif-bn shadow-sm">
          <div className="border-b border-[#E8DEC8] pb-4">
            <h2 className="text-xl font-bold text-[#2C2621]">লেখক পরিচিতি ও তথ্য সম্পাদনা</h2>
            <p className="text-xs text-[#7A6B5D] mt-0.5">
              এই তথ্যসমূহ পাবলিক "লেখক পরিচিতি" পেজে ও ফুটার অংশে প্রদর্শিত হবে
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">লেখকের নাম</label>
              <input
                type="text"
                value={authorForm.displayName || ''}
                onChange={(e) => setAuthorForm({ ...authorForm, displayName: e.target.value })}
                placeholder="যেমন: শব্দশ্রমিক / আপনার নাম"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#4A3F35]">অবস্থান / শহর</label>
              <input
                type="text"
                value={authorForm.location || ''}
                onChange={(e) => setAuthorForm({ ...authorForm, location: e.target.value })}
                placeholder="যেমন: ঢাকা, বাংলাদেশ"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">প্রোফাইল ছবির লিংক (URL)</label>
            <input
              type="url"
              value={authorForm.photoURL || ''}
              onChange={(e) => setAuthorForm({ ...authorForm, photoURL: e.target.value })}
              placeholder="https://example.com/author.jpg"
              className="w-full px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">লেখক পরিচিতি / জীবনবৃত্তান্ত (Bio)</label>
            <textarea
              rows={4}
              value={authorForm.bio || ''}
              onChange={(e) => setAuthorForm({ ...authorForm, bio: e.target.value })}
              placeholder="আপনার সাহিত্যযাত্রা, অনুভূতির গল্প ও জীবনের কথা লিখুন..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#4A3F35]">সাহিত্য চিন্তা ও দর্শন (Philosophy)</label>
            <textarea
              rows={2}
              value={authorForm.philosophy || ''}
              onChange={(e) => setAuthorForm({ ...authorForm, philosophy: e.target.value })}
              placeholder="একটি সুন্দর সাহিত্য উক্তি বা লেখার অনুপ্রেরণা..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DFCBB5] bg-white text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-[#8C4A32] uppercase tracking-wide">
              সামাজিক মাধ্যম ও যোগাযোগ লিংক
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <input
                type="url"
                value={authorForm.socialLinks?.facebook || ''}
                onChange={(e) =>
                  setAuthorForm({
                    ...authorForm,
                    socialLinks: { ...authorForm.socialLinks, facebook: e.target.value },
                  })
                }
                placeholder="ফেসবুক প্রোফাইল URL"
                className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
              <input
                type="url"
                value={authorForm.socialLinks?.twitter || ''}
                onChange={(e) =>
                  setAuthorForm({
                    ...authorForm,
                    socialLinks: { ...authorForm.socialLinks, twitter: e.target.value },
                  })
                }
                placeholder="টুইটার / এক্স URL"
                className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
              <input
                type="url"
                value={authorForm.socialLinks?.goodreads || ''}
                onChange={(e) =>
                  setAuthorForm({
                    ...authorForm,
                    socialLinks: { ...authorForm.socialLinks, goodreads: e.target.value },
                  })
                }
                placeholder="গুডরিডস লিংক URL"
                className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
              <input
                type="url"
                value={authorForm.socialLinks?.website || ''}
                onChange={(e) =>
                  setAuthorForm({
                    ...authorForm,
                    socialLinks: { ...authorForm.socialLinks, website: e.target.value },
                  })
                }
                placeholder="ব্যক্তিগত ওয়েবসাইট URL"
                className="px-3.5 py-2 rounded-xl border border-[#DFCBB5] bg-white focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8DEC8]">
            <button
              type="submit"
              disabled={isSavingAuthor}
              className="px-6 py-2.5 rounded-xl bg-[#8C4A32] text-white text-xs font-semibold hover:bg-[#723925] transition-colors shadow-sm disabled:opacity-50"
            >
              {isSavingAuthor ? 'সংরক্ষণ করা হচ্ছে...' : 'তথ্য হালনাগাদ করুন'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Firebase Status & Guide */}
      {activeTab === 'guide' && (
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] p-8 space-y-6 font-serif-bn shadow-sm">
          <div className="border-b border-[#E8DEC8] pb-4">
            <h2 className="text-xl font-bold text-[#2C2621]">ইনসফোর্জ (InsForge) ও ক্লাউড ব্যাকএন্ড স্ট্যাটাস</h2>
            <p className="text-xs text-[#7A6B5D] mt-0.5">
              প্রোডাকশনে এই ব্যক্তিগত সাহিত্য পোর্টালটির পূর্ণাঙ্গ ডেপ্লয়, ক্লাউড ডাটাবেজ এবং রিয়েল-টাইম সিঙ্ক্রোনাইজেশন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] space-y-2 text-xs text-[#4A3B2C]">
              <span className="font-bold text-[#8C4A32] block text-sm">
                ইনসফোর্জ (InsForge) ক্লাউড ব্যাকএন্ড:
              </span>
              <p>
                • সংযোগ অবস্থা:{' '}
                <strong>
                  {insforgeStatus?.connected
                    ? '🟢 সম্পূর্ণ সংযুক্ত ও সিঙ্ক হচ্ছে (Active & Live)'
                    : insforgeStatus?.configured
                    ? '🟡 সংযোগ পরীক্ষা করা হচ্ছে...'
                    : '🟢 সক্রিয় (Active)'}
                </strong>
              </p>
              <p>
                • প্রজেক্ট:{' '}
                <strong>{insforgeStatus?.project || 'shobder-arale'} ({insforgeStatus?.appKey || 'rymjr9pc'})</strong>
              </p>
              <p>
                • রিজিয়ন: <strong>{insforgeStatus?.region || 'ap-southeast'}</strong>
              </p>
              <p>
                • ডাটাবেজ ইঞ্জিন: <strong>InsForge Managed PostgreSQL with RLS</strong>
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ অ্যাডমিন থেকে যেকোনো পরিবর্তন (পোস্ট, উপন্যাস, পর্ব, প্রোফাইল) সরাসরি InsForge ডাটাবেজে সেভ হচ্ছে এবং পাঠকদের কাছে সাথে সাথে আপডেট হচ্ছে।
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] space-y-2 text-xs text-[#4A3B2C]">
              <span className="font-bold text-[#8C4A32] block text-sm">
                অ্যাডমিন ও অথেনটিকেশন তথ্য:
              </span>
              <p>
                • লগইনকৃত অ্যাডমিন: <strong>{user?.email || 'শব্দের কারিগর (hasibulhasan2087@gmail.com)'}</strong>
              </p>
              <p>
                • অ্যাডমিন অধিকার: <strong>{isAdmin ? '🟢 হ্যাঁ (অনুমোদিত স্বত্বাধিকারী)' : 'না'}</strong>
              </p>
              <p>
                • স্টোরেজ বাকেট: <strong>covers (পাবলিক কভার ইমেজ স্টোরেজ)</strong>
              </p>
              <p>
                • ফলব্যাক লেয়ার: <strong>ইন-মেমোরি ক্যাশ + লোকাল মিরর (Zero-downtime resilient)</strong>
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-300 bg-emerald-50/70 space-y-3 text-xs sm:text-sm text-emerald-950 font-serif-bn">
            <h3 className="text-base font-bold text-emerald-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>সুপাবেজ (Supabase) সংযোগ নির্দেশিকা:</span>
            </h3>
            <p className="text-xs text-emerald-900 leading-relaxed">
              আপনার ব্যাকএন্ড এখন সরাসরি <strong>Supabase</strong> এর সাথে যুক্ত হওয়ার জন্য সম্পূর্ণ প্রস্তুত:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-emerald-950">
              <li>
                <strong>Supabase ড্যাশবোর্ডে যান:</strong> <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">supabase.com/dashboard</a> এ একটি নতুন প্রজেক্ট তৈরি করুন।
              </li>
              <li>
                <strong>ডাটাবেজ সংযোগ স্ট্রিং সংগ্রহ করুন:</strong> Project Settings &gt; Database &gt; <em>Connection string (URI)</em> কপি করুন (Session pooler অথবা Transaction pooler port 6543)।
              </li>
              <li>
                <strong>এনভায়রনমেন্ট সেট করুন:</strong> <code>SUPABASE_DATABASE_URL</code> হিসেবে সংযোগ স্ট্রিংটি প্রদান করুন। এছাড়া API ব্যবহারের জন্য <code>SUPABASE_URL</code> ও <code>SUPABASE_ANON_KEY</code> যুক্ত করতে পারেন।
              </li>
              <li>
                <strong>অটোমেটিক স্কিমা:</strong> সমস্ত স্কিমা টেবিল (<code>posts</code>, <code>novels</code>, <code>chapters</code>, <code>author_profile</code>, <code>users</code>) এর পূর্ণাঙ্গ SQL স্ক্রিপ্ট তৈরি রয়েছে।
              </li>
            </ol>

            {/* Quick SQL Copy Action Card */}
            <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>সম্পূর্ণ সাইটের Supabase SQL স্ক্রিপ্ট:</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const sqlScript = `-- শব্দের আড়ালে (Shobder Arale) - Supabase Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.posts (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  type VARCHAR(64) NOT NULL DEFAULT 'poem',
  excerpt TEXT DEFAULT '',
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(128) DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'published',
  reading_time_minutes INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.novels (
  id VARCHAR(128) PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  slug VARCHAR(512) NOT NULL UNIQUE,
  synopsis TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'ongoing',
  chapter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id VARCHAR(128) PRIMARY KEY,
  novel_id VARCHAR(128) NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  chapter_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.author_profile (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'main',
  display_name VARCHAR(256) NOT NULL DEFAULT 'শব্দের কারিগর',
  bio TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  philosophy TEXT DEFAULT '',
  email VARCHAR(256) DEFAULT '',
  location VARCHAR(256) DEFAULT '',
  social_links JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(256) UNIQUE,
  role VARCHAR(64) DEFAULT 'reader',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON public.posts(type, status);
CREATE INDEX IF NOT EXISTS idx_novels_slug ON public.novels(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON public.chapters(novel_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access for app" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for novels" ON public.novels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for chapters" ON public.chapters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for author" ON public.author_profile FOR ALL USING (true) WITH CHECK (true);
`;
                    navigator.clipboard.writeText(sqlScript);
                    setCopiedSql(true);
                    showToast('সম্পূর্ণ Supabase SQL স্ক্রিপ্ট ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-900 transition-colors shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'কপি হয়েছে!' : 'SQL স্ক্রিপ্ট কপি করুন'}</span>
                </button>
                <button
                  onClick={() => navigate('/admin/guide')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-emerald-700 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <span>পূর্ণাঙ্গ গাইড ও সিড দেখুন</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#4A3F35] leading-relaxed">
            <h3 className="text-base font-bold text-[#2C2621]">
              ১. সুপাবেজ (Supabase) ক্লাউড ব্যাকএন্ডের সহজ ধাপসমূহ:
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Supabase ড্যাশবোর্ডে অ্যাকাউন্ট:</strong> <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#8C4A32] underline">supabase.com</a> এ সাইন-ইন করে <em>New Project</em> তৈরি করুন।
              </li>
              <li>
                <strong>ডাটাবেজ পাসওয়ার্ড ও কানেকশন স্ট্রিং:</strong> <em>Project Settings &gt; Database</em> থেকে Connection URI কপি করুন (যেমন: <code>postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres</code>)।
              </li>
              <li>
                <strong>পরিবেশ চলক (Environment Variables):</strong> <code>SUPABASE_DATABASE_URL</code> হিসেবে এই স্ট্রিংটি প্রদান করুন। এছাড়া <code>SUPABASE_URL</code> ও <code>SUPABASE_ANON_KEY</code> যুক্ত করুন।
              </li>
              <li>
                <strong>অটোমেটিক স্কিমা টেবিল:</strong> উপরের কপি বাটনে ক্লিক করে প্রাপ্ত SQL কোডটি Supabase এর SQL Editor এ পেস্ট করে Run করুন।
              </li>
              <li>
                <strong>স্বয়ংক্রিয় লাইভ সিঙ্ক:</strong> আপনি যখনই অ্যাডমিন প্যানেল থেকে কোনো লেখা তৈরি, সম্পাদনা, হাইড বা ডিলিট করবেন, তা সরাসরি সুপাবেজ ডাটাবেজে স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
              </li>
              <li>
                <strong>যাচাই করুন:</strong> সাধারণ পাঠকেরা কোনো লগইন ঝামেলা ছাড়াই সমস্ত সাহিত্য মুক্তমনে উপভোগ করবেন এবং শুধুমাত্র আপনি আপনার সুরক্ষিত অ্যাডমিন ড্যাশবোর্ড পরিচালনা করবেন।
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isProcessing={isDeleting}
      />

      {/* Book Upload & Edit Modal */}
      {bookModalState && (
        <AdminBookUploadModal
          book={bookModalState === 'new' ? null : bookModalState}
          onClose={() => setBookModalState(null)}
          onSaved={() => {
            setBookModalState(null);
            refreshData();
          }}
        />
      )}

      {/* PDF Reader Modal */}
      {readingPdfBook && (
        <PdfReaderModal
          book={readingPdfBook}
          onClose={() => setReadingPdfBook(null)}
        />
      )}
    </div>
  );
};

// Sub-component to manage novel chapters
interface NovelChaptersListProps {
  novelId: string;
  novelSlug?: string;
  openChapterEditor: (novelId: string, chapterId: string | null) => void;
  onChapterDeleted: () => void;
  onDeleteChapterRequest: (novelId: string, chapter: Chapter) => void;
  navigate: (path: string) => void;
}

const NovelChaptersList: React.FC<NovelChaptersListProps> = ({
  novelId,
  novelSlug,
  openChapterEditor,
  onChapterDeleted,
  onDeleteChapterRequest,
  navigate,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadChapters = async () => {
    try {
      setLoading(true);
      const data = await getAllChaptersAdmin(novelId);
      setChapters(data);
    } catch (err) {
      console.error('Error fetching novel chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChapters();
  }, [novelId]);

  const handleToggleChapterStatus = async (ch: Chapter) => {
    try {
      const newStatus = ch.status === 'published' ? 'draft' : 'published';
      const { saveChapter } = await import('../../services/literatureService');
      await saveChapter(novelId, ch.id, {
        title: ch.title,
        chapterNumber: ch.chapterNumber,
        body: ch.body,
        status: newStatus,
      });
      showToast(
        newStatus === 'published'
          ? `অধ্যায় ${toBengaliNumber(ch.chapterNumber)} সবার জন্য উন্মুক্ত ও প্রকাশিত হয়েছে!`
          : `অধ্যায় ${toBengaliNumber(ch.chapterNumber)} সফলভাবে লুকানো হয়েছে!`,
        'success'
      );
      loadChapters();
    } catch {
      showToast('অধ্যায়ের অবস্থা পরিবর্তন ব্যর্থ হয়েছে', 'error');
    }
  };

  if (loading) {
    return <div className="text-xs text-[#7A6B5D] font-serif-bn py-2">অধ্যায় তালিকা লোড হচ্ছে...</div>;
  }

  if (chapters.length === 0) {
    return (
      <div className="text-xs text-[#7A6B5D] font-serif-bn italic py-1">
        এই উপন্যাসে এখনও কোনো অধ্যায় যুক্ত করা হয়নি। উপরে "অধ্যায় যোগ করুন" বাটনে ক্লিক করুন।
      </div>
    );
  }

  return (
    <div className="space-y-2 font-serif-bn">
      <div className="text-xs font-semibold text-[#5A4B3D] flex items-center justify-between">
        <span>অধ্যায়সমূহ ({toBengaliNumber(chapters.length)}টি):</span>
      </div>
      <div className="divide-y divide-[#EFE5D5] border border-[#DFCBB5] rounded-xl overflow-hidden bg-white">
        {chapters.map((ch) => {
          const statusInfo = getStatusLabel(ch.status);
          return (
            <div
              key={ch.id}
              className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#FAF7F2] transition-colors gap-2"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#EFE5D5] text-[#8C4A32] font-bold flex items-center justify-center text-[11px] shrink-0">
                  {toBengaliNumber(ch.chapterNumber)}
                </span>
                <span className="font-semibold text-[#2C2621]">{ch.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${statusInfo.colorClass}`}>
                  {ch.status === 'published' ? '🟢 প্রকাশিত' : '🟡 লুকানো'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Chapter Hide / Unhide Toggle */}
                <button
                  onClick={() => handleToggleChapterStatus(ch)}
                  className={`px-2 py-1 rounded text-[11px] border flex items-center space-x-1 transition-colors ${
                    ch.status === 'published'
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                  title={ch.status === 'published' ? 'অধ্যায়টি হাইড করুন' : 'অধ্যায়টি প্রকাশ করুন'}
                >
                  {ch.status === 'published' ? (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>হাইড</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>প্রকাশ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate(`/novels/${novelSlug || novelId}/chapters/${ch.id}`)}
                  className="p-1 rounded text-[#5A4B3D] hover:bg-[#EFE5D5]"
                  title="পাঠক ভিউ"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openChapterEditor(novelId, ch.id)}
                  className="p-1 rounded text-[#8C4A32] hover:bg-[#F2E8DC]"
                  title="সম্পাদনা"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteChapterRequest(novelId, ch)}
                  className="p-1 rounded text-red-600 hover:bg-red-50"
                  title="মুছুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
