import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Heart,
  BookOpen,
  Trash2,
  X,
  ExternalLink,
  Clock,
  Sparkles,
  BookMarked,
  ArrowRight,
} from 'lucide-react';
import {
  bookmarkProgressService,
  ReadingProgressItem,
  FavouriteItem,
} from '../../services/bookmarkProgressService';

interface BookmarksDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'progress' | 'favourites';
}

export const BookmarksDrawerModal: React.FC<BookmarksDrawerModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'progress',
}) => {
  const [activeTab, setActiveTab] = useState<'progress' | 'favourites'>(defaultTab);
  const [progressList, setProgressList] = useState<ReadingProgressItem[]>([]);
  const [favouritesList, setFavouritesList] = useState<FavouriteItem[]>([]);

  const loadData = () => {
    setProgressList(bookmarkProgressService.getAllProgress());
    setFavouritesList(bookmarkProgressService.getAllFavourites());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    const unsubscribe = bookmarkProgressService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleRemoveProgress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    bookmarkProgressService.removeProgress(id);
    loadData();
  };

  const handleRemoveFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    bookmarkProgressService.removeFavourite(id);
    loadData();
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} দিন আগে`;
    return new Date(timestamp).toLocaleDateString('bn-BD');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'poem':
        return 'কবিতা';
      case 'story':
        return 'ছোটগল্প';
      case 'essay':
        return 'প্রবন্ধ';
      case 'novel':
        return 'উপন্যাস';
      case 'chapter':
        return 'উপন্যাসের অধ্যায়';
      case 'book':
        return 'বই / পিডিএফ';
      default:
        return 'সাহিত্য';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-stone-900 border-l border-amber-900/40 text-stone-100 flex flex-col h-full shadow-2xl z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-900/30 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-500 border border-amber-600/30 flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-amber-100">আমার সংগ্রহ</h2>
              <p className="text-xs text-stone-400">আপনার পাঠ অগ্রগতি ও পছন্দের সাহিত্যতালিকা</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-950/40 border-b border-stone-800 text-sm font-medium">
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'progress'
                ? 'bg-amber-600/20 text-amber-300 font-semibold border border-amber-600/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>পড়ার অগ্রগতি</span>
            {progressList.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-sans">
                {progressList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('favourites')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'favourites'
                ? 'bg-rose-600/20 text-rose-300 font-semibold border border-rose-600/30 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/40" />
            <span>পছন্দের তালিকা</span>
            {favouritesList.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-sans">
                {favouritesList.length}
              </span>
            )}
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-800/40">
          {activeTab === 'progress' && (
            <>
              {progressList.length === 0 ? (
                <div className="py-16 text-center text-stone-400 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-stone-800/60 flex items-center justify-center text-stone-500 border border-stone-700/50">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-base text-stone-300">কোনো পড়ার অগ্রগতি নেই</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto">
                      যেকোনো গল্প, কবিতা বা উপন্যাস পড়ার সময় আপনার অগ্রগতি স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে এবং পরে আপনি সরাসরি সেখান থেকেই পড়তে পারবেন।
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {progressList.map((item) => (
                    <div
                      key={item.id}
                      className="group p-3.5 rounded-xl bg-stone-800/50 hover:bg-stone-800/80 border border-stone-700/40 hover:border-amber-600/40 transition-all cursor-pointer relative"
                      onClick={() => {
                        window.location.href = item.url;
                        onClose();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-block mb-1">
                            {getTypeLabel(item.type)}
                          </span>
                          <h4 className="font-serif font-semibold text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          {item.parentTitle && (
                            <p className="text-xs text-stone-400 line-clamp-1">
                              {item.parentTitle}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleRemoveProgress(item.id, e)}
                          className="opacity-60 hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-rose-400 hover:bg-stone-700/60 transition-all"
                          title="অগ্রগতি মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between text-xs text-stone-400">
                          <span className="flex items-center gap-1 text-[11px] text-amber-400/90">
                            <Sparkles className="w-3 h-3" />
                            {item.percentage}% পড়া সম্পন্ন
                          </span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.updatedAt)}
                          </span>
                        </div>
                        <div className="w-full bg-stone-700/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-600 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Action link */}
                      <div className="mt-3 pt-2 border-t border-stone-700/30 flex items-center justify-between text-xs font-medium text-amber-400/90 group-hover:text-amber-300">
                        <span>যেখান থেকে পড়া থামিয়েছেন সেখান থেকে পড়ুন</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'favourites' && (
            <>
              {favouritesList.length === 0 ? (
                <div className="py-16 text-center text-stone-400 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-stone-800/60 flex items-center justify-center text-rose-500/80 border border-stone-700/50">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif text-base text-stone-300">কোনো পছন্দের সাহিত্য যোগ করা হয়নি</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto">
                      যেকোনো লেখার উপরে থাকা হৃদয় (❤️) আইকনে ক্লিক করে আপনার প্রিয় কবিতা, গল্প বা উপন্যাস এখানে যুক্ত করে রাখুন।
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {favouritesList.map((item) => (
                    <div
                      key={item.id}
                      className="group p-3.5 rounded-xl bg-stone-800/50 hover:bg-stone-800/80 border border-stone-700/40 hover:border-rose-600/40 transition-all cursor-pointer relative"
                      onClick={() => {
                        window.location.href = item.url;
                        onClose();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {getTypeLabel(item.type)}
                            </span>
                            {item.category && (
                              <span className="text-[11px] text-stone-400">
                                • {item.category}
                              </span>
                            )}
                          </div>
                          <h4 className="font-serif font-semibold text-stone-100 group-hover:text-rose-200 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          {item.excerpt && (
                            <p className="text-xs text-stone-400 line-clamp-2 italic">
                              "{item.excerpt}"
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleRemoveFavourite(item.id, e)}
                          className="opacity-60 hover:opacity-100 p-1.5 rounded-md text-stone-400 hover:text-rose-400 hover:bg-stone-700/60 transition-all"
                          title="পছন্দের তালিকা থেকে মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-700/30 flex items-center justify-between text-xs font-medium text-rose-400/90 group-hover:text-rose-300">
                        <span>সম্পূর্ণ পড়ুন</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/80 text-center text-xs text-stone-400">
          আপনার ব্রাউজারে স্বয়ংক্রিয়ভাবে সংরক্ষিত • কোনো লগইনের প্রয়োজন নেই
        </div>
      </div>
    </div>
  );
};
