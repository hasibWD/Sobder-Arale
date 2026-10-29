import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Menu, X, Feather, Bookmark, Heart } from 'lucide-react';
import { BookmarksDrawerModal } from '../public/BookmarksDrawerModal';
import { bookmarkProgressService } from '../../services/bookmarkProgressService';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookmarksDrawerOpen, setBookmarksDrawerOpen] = useState(false);
  const [totalSavedCount, setTotalSavedCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const p = bookmarkProgressService.getAllProgress().length;
      const f = bookmarkProgressService.getAllFavourites().length;
      setTotalSavedCount(p + f);
    };
    updateCount();
    const unsub = bookmarkProgressService.subscribe(updateCount);
    return unsub;
  }, []);

  const navLinks = [
    { name: 'প্রচ্ছদ', path: '/' },
    { name: 'কবিতা', path: '/poems' },
    { name: 'উপন্যাস', path: '/novels' },
    { name: 'গল্প', path: '/stories' },
    { name: 'বই ও পিডিএফ', path: '/books' },
    { name: 'লেখক পরিচিতি', path: '/about' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DEC8]/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo & Name */}
            <button
              onClick={() => handleNav('/')}
              className="flex items-center space-x-3 text-left group focus:outline-none focus:ring-2 focus:ring-[#8C4A32] rounded-md p-1"
              aria-label="শব্দের আড়ালে হোমপেজ"
            >
              <div className="w-11 h-11 rounded-full bg-[#F2E8DC] border border-[#DFCBB5] flex items-center justify-center text-[#8C4A32] group-hover:bg-[#8C4A32] group-hover:text-white transition-all duration-300">
                <Feather className="w-5 h-5 transform -rotate-12" />
              </div>
              <div>
                <span className="font-serif-bn text-2xl font-bold tracking-tight text-[#2C2621] block leading-none">
                  শব্দের আড়ালে
                </span>
                <span className="text-xs text-[#7A6B5D] font-serif-bn tracking-wider mt-1 block">
                  ব্যক্তিগত সাহিত্য অঙ্গন
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path;
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNav(link.path)}
                    className={`px-3 py-2 rounded-md font-serif-bn text-base tracking-wide transition-all ${
                      isActive
                        ? 'text-[#8C4A32] font-semibold bg-[#F2E8DC]/60'
                        : 'text-[#4A3F35] hover:text-[#8C4A32] hover:bg-[#F6EFE6]'
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
            </nav>

            {/* Actions: Bookmarks & Search */}
            <div className="hidden md:flex items-center space-x-2.5">
              <button
                onClick={() => setBookmarksDrawerOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-[#DFCBB5] text-[#5C4F43] hover:text-[#8C4A32] hover:bg-[#F2E8DC] transition-all text-sm font-serif-bn relative"
                title="আমার সংগ্রহ: পাঠ অগ্রগতি ও পছন্দের সাহিত্য"
                aria-label="আমার সংগ্রহ"
              >
                <Bookmark className="w-4 h-4 text-[#8C4A32]" />
                <span>আমার সংগ্রহ</span>
                {totalSavedCount > 0 && (
                  <span className="bg-[#8C4A32] text-white text-[10px] font-sans px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {totalSavedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNav('/search')}
                className={`p-2.5 rounded-full border transition-all ${
                  currentPath === '/search'
                    ? 'bg-[#8C4A32] text-white border-[#8C4A32]'
                    : 'text-[#5C4F43] border-[#DFCBB5] hover:bg-[#F2E8DC] hover:text-[#8C4A32]'
                }`}
                title="সাহিত্য সন্ধান করুন"
                aria-label="সন্ধান করুন"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu trigger button */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setBookmarksDrawerOpen(true)}
                className="p-2 text-[#5C4F43] hover:text-[#8C4A32] relative"
                aria-label="আমার সংগ্রহ"
                title="আমার সংগ্রহ"
              >
                <Bookmark className="w-5 h-5" />
                {totalSavedCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#8C4A32]" />
                )}
              </button>
              <button
                onClick={() => handleNav('/search')}
                className="p-2 text-[#5C4F43] hover:text-[#8C4A32] focus:outline-none"
                aria-label="অনুসন্ধান"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#4A3F35] hover:text-[#8C4A32] focus:outline-none focus:ring-2 focus:ring-[#8C4A32] rounded-md"
                aria-label="মেনু খুলুন বা বন্ধ করুন"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E8DEC8] bg-[#FAF7F2] px-4 pt-3 pb-6 space-y-2 shadow-lg">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNav(link.path)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg font-serif-bn text-base transition-colors ${
                    isActive
                      ? 'bg-[#F2E8DC] text-[#8C4A32] font-semibold'
                      : 'text-[#4A3F35] hover:bg-[#F5EDE1]'
                  }`}
                >
                  {link.name}
                </button>
              );
            })}
            <div className="pt-3 border-t border-[#E8DEC8] flex flex-col space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setBookmarksDrawerOpen(true);
                }}
                className="w-full flex items-center justify-between px-4 py-2 text-left font-serif-bn text-[#4A3F35] hover:bg-[#F5EDE1] rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Bookmark className="w-4 h-4 text-[#8C4A32]" />
                  <span>আমার সংগ্রহ (পড়ার অগ্রগতি ও পছন্দের তালিকা)</span>
                </div>
                {totalSavedCount > 0 && (
                  <span className="bg-[#8C4A32] text-white text-xs px-2 py-0.5 rounded-full font-sans font-bold">
                    {totalSavedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => handleNav('/search')}
                className="w-full flex items-center space-x-2 px-4 py-2 text-left font-serif-bn text-[#4A3F35] hover:bg-[#F5EDE1] rounded-lg"
              >
                <Search className="w-4 h-4 text-[#8C4A32]" />
                <span>সাহিত্য অনুসন্ধান</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Bookmarks & Reading Progress Drawer */}
      <BookmarksDrawerModal
        isOpen={bookmarksDrawerOpen}
        onClose={() => setBookmarksDrawerOpen(false)}
      />
    </>
  );
};
