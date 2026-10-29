import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './supabase/authContext';
import { ToastProvider } from './components/common/Toast';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { PoetryPage } from './pages/PoetryPage';
import { StoriesPage } from './pages/StoriesPage';
import { NovelsPage } from './pages/NovelsPage';
import { NovelDetailPage } from './pages/NovelDetailPage';
import { NovelReadingPage } from './pages/NovelReadingPage';
import { WritingDetailPage } from './pages/WritingDetailPage';
import { AboutPage } from './pages/AboutPage';
import { BooksPage } from './pages/BooksPage';
import { SearchPage } from './pages/SearchPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminWritingEditorPage } from './pages/admin/AdminWritingEditorPage';
import { AdminNovelEditorPage } from './pages/admin/AdminNovelEditorPage';
import { AdminSetupGuidePage } from './pages/admin/AdminSetupGuidePage';
import { WritingStudioPage } from './pages/WritingStudioPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Feather } from 'lucide-react';

function normalizePath(rawPath: string): string {
  if (!rawPath) return '/';
  let path = rawPath.split('?')[0].split('#')[0].trim();
  try {
    path = decodeURI(path);
  } catch {}
  // Strip trailing slashes except for root
  path = path.replace(/\/+$/, '') || '/';
  return path;
}

function safeDecode(val: string): string {
  if (!val) return '';
  try {
    return decodeURIComponent(val).trim();
  } catch {
    return val.trim();
  }
}

function AppContent() {
  const { user, isAdmin, isLoading } = useAuth();

  // Simple stateful router sync with window.location
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return normalizePath(window.location.pathname);
  });

  // Admin sub-editor modals/screens
  const [activeWritingEditorId, setActiveWritingEditorId] = useState<string | null | false>(false);
  const [activeNovelEditorState, setActiveNovelEditorState] = useState<{
    novelId: string | null;
    chapterId?: string | null;
  } | false>(false);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path: string) => {
    const clean = normalizePath(path);
    if (window.location.pathname !== clean) {
      window.history.pushState({}, '', clean);
    }
    setCurrentPath(clean);
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

    const path = normalizePath(currentPath);

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

    // Public Route: Novel chapter reading (/novels/:novelId/chapters/:chapterId or /novel/:novelId/chapters/:chapterId)
    const novelChapterMatch = path.match(/^\/novels?\/([^/]+)\/chapters?\/([^/]+)$/i);
    if (novelChapterMatch) {
      const novelIdentifier = safeDecode(novelChapterMatch[1]);
      const chapterIdentifier = safeDecode(novelChapterMatch[2]);
      return (
        <NovelReadingPage
          novelIdentifier={novelIdentifier}
          chapterIdentifier={chapterIdentifier}
          navigate={navigate}
        />
      );
    }

    // Public Route: Novel detail (/novels/:slugOrId or /novel/:slugOrId)
    const novelDetailMatch = path.match(/^\/novels?\/([^/]+)$/i);
    if (novelDetailMatch) {
      const identifier = safeDecode(novelDetailMatch[1]);
      if (identifier !== 'novels' && identifier !== 'novel') {
        return (
          <NovelDetailPage
            identifier={identifier}
            navigate={navigate}
          />
        );
      }
    }

    // Public Route: Writing detail with type (/read/:type/:slug)
    const writingDetailMatch = path.match(/^\/read\/([^/]+)\/([^/]+)$/i);
    if (writingDetailMatch) {
      const type = safeDecode(writingDetailMatch[1]);
      const slug = safeDecode(writingDetailMatch[2]);
      return (
        <WritingDetailPage
          type={type}
          slug={slug}
          navigate={navigate}
        />
      );
    }

    // Public Route: Direct poem route (/poem/:slug or /poems/:slug)
    const poemDirectMatch = path.match(/^\/poems?\/([^/]+)$/i);
    if (poemDirectMatch) {
      const slug = safeDecode(poemDirectMatch[1]);
      if (slug !== 'poems' && slug !== 'poem') {
        return (
          <WritingDetailPage
            type="poem"
            slug={slug}
            navigate={navigate}
          />
        );
      }
    }

    // Public Route: Direct story route (/story/:slug or /stories/:slug)
    const storyDirectMatch = path.match(/^\/(?:stories|story)\/([^/]+)$/i);
    if (storyDirectMatch) {
      const slug = safeDecode(storyDirectMatch[1]);
      if (slug !== 'stories' && slug !== 'story') {
        return (
          <WritingDetailPage
            type="story"
            slug={slug}
            navigate={navigate}
          />
        );
      }
    }

    // Public Route: Fallback single slug read route (/read/:slug)
    const singleReadMatch = path.match(/^\/read\/([^/]+)$/i);
    if (singleReadMatch) {
      const slug = safeDecode(singleReadMatch[1]);
      return (
        <WritingDetailPage
          type="poem"
          slug={slug}
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
    if (path === '/poems' || path === '/poem' || path === '/poetry') {
      return <PoetryPage navigate={navigate} />;
    }
    if (path === '/stories' || path === '/story') {
      return <StoriesPage navigate={navigate} />;
    }
    if (path === '/novels' || path === '/novel') {
      return <NovelsPage navigate={navigate} />;
    }
    if (path === '/books' || path === '/book') {
      return <BooksPage navigate={navigate} />;
    }
    if (path === '/about' || path === '/author') {
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
      {/* Main Public Header */}
      {!isAdminView && (
        <Header currentPath={currentPath} navigate={navigate} />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {renderRoute()}
      </main>

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
