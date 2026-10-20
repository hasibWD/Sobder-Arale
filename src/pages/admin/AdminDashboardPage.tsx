import React, { useEffect, useState } from 'react';
import { useAuth } from '../../firebase/authContext';
import { Post, Novel, Chapter, AuthorProfile, PostType } from '../../types';
import {
  getAllPostsAdmin,
  getAllNovelsAdmin,
  getAllChaptersAdmin,
  deletePost,
  savePost,
  deleteNovel,
  getAuthorProfile,
  saveAuthorProfile,
} from '../../firebase/firestoreService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useToast } from '../../components/common/Toast';
import { toBengaliNumber, formatBengaliDate, getPostTypeLabel, getStatusLabel } from '../../utils/bengaliUtils';
import {
  Feather,
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
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

  const [activeTab, setActiveTab] = useState<'writings' | 'novels' | 'author' | 'guide'>('writings');
  const [posts, setPosts] = useState<Post[]>([]);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const refreshData = async () => {
    try {
      setLoading(true);
      const [allPosts, allNovels, authorData] = await Promise.all([
        getAllPostsAdmin(),
        getAllNovelsAdmin(),
        getAuthorProfile(),
      ]);
      setPosts(allPosts);
      setNovels(allNovels);
      if (authorData) {
        setAuthorProfile(authorData);
        setAuthorForm(authorData);
      }
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
      await savePost(post.id, {
        title: post.title,
        slug: post.slug,
        type: post.type,
        excerpt: post.excerpt,
        body: post.body,
        tags: post.tags,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        status: newStatus,
        publishedAt: newStatus === 'published' ? post.publishedAt || Date.now() : undefined,
      });
      showToast(newStatus === 'published' ? 'লেখাটি প্রকাশিত হয়েছে' : 'লেখাটি খসড়ায় স্থানান্তর করা হয়েছে', 'success');
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] space-y-2">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>প্রকাশিত রচনা</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif-bn text-3xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(publishedCount)}
          </div>
          <div className="text-[11px] text-[#8C4A32] font-serif-bn">কবিতা ও গল্প</div>
        </div>

        <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] space-y-2">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>খসড়া রচনা</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif-bn text-3xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(draftCount)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">অপ্রকাশিত পাণ্ডুলিপি</div>
        </div>

        <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] space-y-2">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>উপন্যাস সম্ভার</span>
            <BookOpen className="w-4 h-4 text-[#8C4A32]" />
          </div>
          <div className="font-serif-bn text-3xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(novelsCount)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">চলমান ও সমাপ্ত উপন্যাস</div>
        </div>

        <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#DFD3C2] space-y-2">
          <div className="flex items-center justify-between text-xs font-serif-bn text-[#7A6B5D]">
            <span>মোট অধ্যায় সংখ্যা</span>
            <BookMarked className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-serif-bn text-3xl font-extrabold text-[#2C2621]">
            {toBengaliNumber(totalChapters)}
          </div>
          <div className="text-[11px] text-[#7A6B5D] font-serif-bn">উপন্যাসের অধ্যায়সমূহ</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#DFCBB5] overflow-x-auto pb-1 font-serif-bn text-sm">
        <button
          onClick={() => setActiveTab('writings')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 ${
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
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 ${
            activeTab === 'novels'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>উপন্যাস ও অধ্যায় ({toBengaliNumber(novels.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('author')}
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 ${
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
          className={`px-4 py-2.5 rounded-t-xl transition-colors font-semibold flex items-center space-x-2 ${
            activeTab === 'guide'
              ? 'bg-[#FAF7F2] border-t-2 border-x border-[#DFCBB5] border-t-[#8C4A32] text-[#8C4A32]'
              : 'text-[#6F6052] hover:text-[#2C2621]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>ফায়ারবেস স্ট্যাটাস ও গাইড</span>
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
                            <button
                              onClick={() => handleTogglePostStatus(post)}
                              title="ক্লিক করে প্রকাশ/খসড়া পরিবর্তন করুন"
                              className={`px-2.5 py-0.5 rounded-full border text-xs font-medium cursor-pointer transition-all ${statusInfo.colorClass}`}
                            >
                              {statusInfo.label}
                            </button>
                          </td>
                          <td className="px-4 py-4 text-xs text-[#7A6B5D]">
                            {formatBengaliDate(post.publishedAt || post.updatedAt)}
                          </td>
                          <td className="px-5 py-4 text-right space-x-2 text-xs">
                            <button
                              onClick={() => navigate(`/read/${post.type}/${post.slug}`)}
                              className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#5A4B3D] hover:bg-[#EFE5D5] transition-colors"
                              title="পাঠ করুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openWritingEditor(post.id)}
                              className="p-1.5 rounded-lg border border-[#DFCBB5] text-[#8C4A32] hover:bg-[#F2E8DC] transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePostClick(post)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
            <h2 className="text-xl font-bold text-[#2C2621]">ফায়ারবেস কনফিগারেশন ও নিরাপত্তা নির্দেশিকা</h2>
            <p className="text-xs text-[#7A6B5D] mt-0.5">
              প্রোডাকশনে এই ব্যক্তিগত সাহিত্য পোর্টালটির পূর্ণাঙ্গ ডেপ্লয় ও সুরক্ষিত পরিচালনার গাইড
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] space-y-2 text-xs text-[#4A3B2C]">
            <span className="font-bold text-[#8C4A32] block text-sm">
              বর্তমান সিস্টেমের অবস্থা:
            </span>
            <p>
              • ফায়ারবেস কনফিগারেশন স্ট্যাটাস: <strong>{isConfigured ? 'সক্রিয় (Configured)' : 'অপ্রতুল (Not Configured / Local)'}</strong>
            </p>
            <p>
              • লগইনকৃত ব্যবহারকারী: <strong>{user?.email || 'অননুমোদিত'}</strong> (UID: {user?.uid || 'N/A'})
            </p>
            <p>
              • অ্যাডমিন রোল অনুমোদিত: <strong>{isAdmin ? 'হ্যাঁ (স্বত্বাধিকারী)' : 'না'}</strong>
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-[#4A3F35] leading-relaxed">
            <h3 className="text-base font-bold text-[#2C2621]">
              ১. ফায়ারবেস ক্লাউড ডেপ্লয়মেন্টের ১০টি ধাপ:
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Firebase Console:</strong> <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#8C4A32] underline">Firebase Console</a> এ গিয়ে একটি নতুন প্রকল্প তৈরি করুন।
              </li>
              <li>
                <strong>Authentication চালু করুন:</strong> Build &gt; Authentication থেকে <code>Email/Password</code> অথবা <code>Google</code> সাইন-ইন সক্রিয় করুন।
              </li>
              <li>
                <strong>Firestore Database তৈরি করুন:</strong> Build &gt; Firestore Database থেকে Production মোডে ডাটাবেজ তৈরি করুন।
              </li>
              <li>
                <strong>Web App রেজিস্টার করুন:</strong> প্রজেক্ট সেটিংসে গিয়ে Web App যোগ করে তার <code>firebaseConfig</code> কী-সমূহ সংগ্রহ করুন।
              </li>
              <li>
                <strong>.env ফাইল কনফিগারেশন:</strong> প্রোজেক্ট রুটে <code>.env</code> ফাইলে <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_PROJECT_ID</code> ইত্যাদি কী বসান।
              </li>
              <li>
                <strong>প্রথম অ্যাডমিন অনুমোদন:</strong> Firebase Console &gt; Firestore &gt; Data তে যান। একটি নতুন কালেকশন <code>admins</code> তৈরি করুন। ডকুমেন্ট ID হিসেবে আপনার Authentication UID দিন এবং ফিল্ড <code>role: "owner"</code> যুক্ত করুন।
              </li>
              <li>
                <strong>নিরাপত্তা রুলস ডেপ্লয়:</strong> প্রজেক্টের <code>firestore.rules</code> ফাইলে জিরো-ট্রাস্ট রুলস রয়েছে। টার্মিনাল থেকে <code>firebase deploy --only firestore:rules</code> চালান।
              </li>
              <li>
                <strong>বিল্ড তৈরি:</strong> টার্মিনালে <code>npm run build</code> কমান্ড চালিয়ে <code>dist</code> ফোল্ডার তৈরি করুন।
              </li>
              <li>
                <strong>Firebase Hosting ডেপ্লয়:</strong> <code>firebase deploy --only hosting</code> চালান।
              </li>
              <li>
                <strong>যাচাই করুন:</strong> সাধারণ দর্শকরা কোনো লগইন ছাড়াই সমস্ত প্রকাশিত কবিতা/উপন্যাস পড়তে পারছেন এবং শুধুমাত্র আপনি আপনার সুরক্ষিত অ্যাডমিন ড্যাশবোর্ড পরিচালনা করতে পারছেন।
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
    </div>
  );
};

// Sub-component to manage novel chapters
interface NovelChaptersListProps {
  novelId: string;
  novelSlug?: string;
  openChapterEditor: (novelId: string, chapterId: string | null) => void;
  onChapterDeleted: () => void;
  navigate: (path: string) => void;
}

const NovelChaptersList: React.FC<NovelChaptersListProps> = ({
  novelId,
  novelSlug,
  openChapterEditor,
  onChapterDeleted,
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

  const handleDeleteChapter = async (chapter: Chapter) => {
    if (!window.confirm(`অধ্যায় ${toBengaliNumber(chapter.chapterNumber)}: "${chapter.title}" মুছে ফেলতে চান?`)) {
      return;
    }
    try {
      const { deleteChapter } = await import('../../firebase/firestoreService');
      await deleteChapter(novelId, chapter.id);
      showToast('অধ্যায়টি সফলভাবে মুছে ফেলা হয়েছে', 'success');
      loadChapters();
      onChapterDeleted();
    } catch {
      showToast('অধ্যায় মোছা সম্ভব হয়নি', 'error');
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
              className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#EFE5D5] text-[#8C4A32] font-bold flex items-center justify-center text-[11px] shrink-0">
                  {toBengaliNumber(ch.chapterNumber)}
                </span>
                <span className="font-semibold text-[#2C2621]">{ch.title}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${statusInfo.colorClass}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
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
                  onClick={() => handleDeleteChapter(ch)}
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
