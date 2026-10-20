import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './firebase/authContext';
import { ToastProvider } from './components/common/Toast';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { FirebaseNoticeBanner } from './components/common/FirebaseNoticeBanner';
import { HomePage } from './pages/HomePage';
import { PoetryPage } from './pages/PoetryPage';
import { StoriesPage } from './pages/StoriesPage';
import { NovelsPage } from './pages/NovelsPage';
import { NovelDetailPage } from './pages/NovelDetailPage';
import { NovelReadingPage } from './pages/NovelReadingPage';
import { WritingDetailPage } from './pages/WritingDetailPage';
import { AboutPage } from './pages/AboutPage';
import { SearchPage } from './pages/SearchPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminWritingEditorPage } from './pages/admin/AdminWritingEditorPage';
import { AdminNovelEditorPage } from './pages/admin/AdminNovelEditorPage';
import { AdminSetupGuidePage } from './pages/admin/AdminSetupGuidePage';
import { WritingStudioPage } from './pages/WritingStudioPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Feather } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, isLoading } = useAuth();

  // Simple stateful router sync with window.location
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Admin sub-editor modals/screens
  const [activeWritingEditorId, setActiveWritingEditorId] = useState<string | null | false>(false);
  const [activeNovelEditorState, setActiveNovelEditorState] = useState<{
    novelId: string | null;
    chapterId?: string | null;
  } | false>(false);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Close any open admin editors on path change
    setActiveWritingEditorId(false);
    setActiveNovelEditorState(false);
  };

  // Route matching logic
  const renderRoute = () => {
    if (isLoading) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner message="শব্দের আড়ালে খোলা হচ্ছে..." />
        </div>
      );
    }

    const path = currentPath;

    // Admin Guide route
    if (path === '/admin/guide') {
      return <AdminSetupGuidePage navigate={navigate} />;
    }

    // Admin Root route
    if (path.startsWith('/admin')) {
      if (!isAdmin) {
        return <AdminLoginPage navigate={navigate} />;
      }

      // If active writing editor is open
      if (activeWritingEditorId !== false) {
        return (
          <AdminWritingEditorPage
            postId={activeWritingEditorId}
            onClose={() => setActiveWritingEditorId(false)}
            onSaved={() => setActiveWritingEditorId(false)}
          />
        );
      }

      // If active novel editor is open
      if (activeNovelEditorState !== false) {
        return (
          <AdminNovelEditorPage
            novelId={activeNovelEditorState.novelId}
            initialChapterId={activeNovelEditorState.chapterId}
            onClose={() => setActiveNovelEditorState(false)}
            onSaved={() => setActiveNovelEditorState(false)}
          />
        );
      }

      return (
        <AdminDashboardPage
          navigate={navigate}
          openWritingEditor={(postId) => setActiveWritingEditorId(postId)}
          openNovelEditor={(novelId) => setActiveNovelEditorState({ novelId })}
          openChapterEditor={(novelId, chapterId) => setActiveNovelEditorState({ novelId, chapterId })}
        />
      );
    }

    // Public Route: Novel chapter reading (/novels/:novelId/chapters/:chapterId)
    const novelChapterMatch = path.match(/^\/novels\/([^/]+)\/chapters\/([^/]+)$/);
    if (novelChapterMatch) {
      return (
        <NovelReadingPage
          novelIdentifier={novelChapterMatch[1]}
          chapterIdentifier={novelChapterMatch[2]}
          navigate={navigate}
        />
      );
    }

    // Public Route: Novel detail (/novels/:slugOrId)
    const novelDetailMatch = path.match(/^\/novels\/([^/]+)$/);
    if (novelDetailMatch && path !== '/novels') {
      return (
        <NovelDetailPage
          identifier={novelDetailMatch[1]}
          navigate={navigate}
        />
      );
    }

    // Public Route: Writing detail (/read/:type/:slug)
    const writingDetailMatch = path.match(/^\/read\/([^/]+)\/([^/]+)$/);
    if (writingDetailMatch) {
      return (
        <WritingDetailPage
          type={writingDetailMatch[1]}
          slug={writingDetailMatch[2]}
          navigate={navigate}
        />
      );
    }

    // Dedicated Author Writing Studio route (Admin only)
    if (path === '/write') {
      if (!isAdmin) {
        return (
          <AdminLoginPage
            navigate={navigate}
            redirectAfter="/write"
            message="অনুমতি সংরক্ষিত: শুধুমাত্র সাইট স্বত্বাধিকারী / অ্যাডমিন লগইন করে নতুন সাহিত্য লিখতে ও পোস্ট করতে পারেন। সাধারণ পাঠকেরা লগইন ছাড়াই সম্পূর্ণ মুক্তমনে সমস্ত সাহিত্য পড়তে পারেন।"
          />
        );
      }
      return <WritingStudioPage navigate={navigate} />;
    }

    // Static standard routes
    if (path === '/poems') {
      return <PoetryPage navigate={navigate} />;
    }
    if (path === '/stories') {
      return <StoriesPage navigate={navigate} />;
    }
    if (path === '/novels') {
      return <NovelsPage navigate={navigate} />;
    }
    if (path === '/about') {
      return <AboutPage navigate={navigate} />;
    }
    if (path === '/search') {
      return <SearchPage navigate={navigate} />;
    }

    // Fallback: Home Page
    return <HomePage navigate={navigate} />;
  };

  const isAdminView = currentPath.startsWith('/admin') && (isAdmin || activeWritingEditorId !== false || activeNovelEditorState !== false);
  const isWritingStudio = currentPath === '/write';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2C2621] relative">
      {/* Top Banner if Firebase is unconfigured */}
      <FirebaseNoticeBanner navigate={navigate} />

      {/* Main Public Header */}
      {!isAdminView && (
        <Header currentPath={currentPath} navigate={navigate} />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {renderRoute()}
      </main>

      {/* Floating Action Button (FAB) for Instant Writing & Posting - ONLY for logged-in Admin */}
      {isAdmin && !isAdminView && !isWritingStudio && (
        <aside aria-label="দ্রুত লেখালিখি" className="fixed bottom-6 left-6 z-40">
          <button
            onClick={() => navigate('/write')}
            className="flex items-center space-x-2 px-4 py-3 rounded-full bg-[#8C4A32] text-white font-serif-bn text-sm font-bold shadow-xl hover:bg-[#723925] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#F2E8DC]/30 group"
            title="নতুন লেখা লিখুন ও পোস্ট করুন (অ্যাডমিন)"
          >
            <Feather className="w-4 h-4 transform -rotate-12 group-hover:rotate-0 transition-transform" />
            <span>নতুন লেখা ও পোস্ট</span>
          </button>
        </aside>
      )}

      {/* Public Footer */}
      {!isAdminView && (
        <Footer navigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
