import React, { useState, useEffect } from 'react';
import { Book, ReadingTheme } from '../types';
import { getPublishedBooks, incrementBookDownload } from '../services/literatureService';
import { BookOpen, Download, Search, Sparkles, Plus, Eye, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { PdfReaderModal } from '../components/books/PdfReaderModal';

interface BooksPageProps {
  navigate: (path: string) => void;
}

export const BooksPage: React.FC<BooksPageProps> = ({ navigate }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();

    const handleUpdate = () => {
      loadBooks();
    };

    window.addEventListener('literature_updated', handleUpdate);
    return () => window.removeEventListener('literature_updated', handleUpdate);
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await getPublishedBooks();
      setBooks(data);
    } catch (err) {
      console.warn('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'সব বই' },
    { id: 'উপন্যাস', label: 'উপন্যাস' },
    { id: 'কাব্যগ্রন্থ', label: 'কাব্যগ্রন্থ' },
    { id: 'গল্প সংকলন', label: 'গল্প সংকলন' },
    { id: 'কাব্য ও গদ্য', label: 'কাব্য ও গদ্য' },
    { id: 'প্রবন্ধ', label: 'প্রবন্ধ' },
  ];

  const filteredBooks = books.filter((b) => {
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await incrementBookDownload(book.id);
      setDownloadSuccessId(book.id);
      setTimeout(() => setDownloadSuccessId(null), 2500);

      const link = document.createElement('a');
      link.href = book.pdfUrl;
      link.download = `${book.slug || 'bangla-book'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-10 px-4 sm:px-6 lg:px-8 font-serif-bn">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Page Banner Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#F2E8DC] border border-[#DFCBB5] text-xs font-semibold text-[#8C4A32] shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
            <span>ই-লাইব্রেরি ও বাংলা পিডিএফ সংকলন</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#2C2621] tracking-tight">
            বই ও প্রকাশিত পান্ডুলিপি
          </h1>

          <p className="text-sm sm:text-base text-[#7A6B5D] leading-relaxed">
            আমার প্রকাশিত কাব্যগ্রন্থ, উপন্যাস ও ছোটগল্প সংকলনগুলোর পূর্ণাঙ্গ ই-বুক সংস্করণ। অনলাইনে সরাসরি পড়ুন অথবা পিডিএফ কপি ডাউনলোড করে সংগ্রহে রাখুন।
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F5EDE1] p-3 sm:p-4 rounded-2xl border border-[#DFCBB5]">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-[#8C4A32] text-white shadow-sm'
                    : 'bg-[#FAF7F2] text-[#5A4F44] hover:bg-[#E8DCCF]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#7A6B5D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বই বা বিষয় খুঁজুন..."
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-[#FAF7F2] border border-[#DFCBB5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C4A32] text-[#2C2621] placeholder-[#9E9084]"
            />
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner message="বইয়ের তালিকা লোড হচ্ছে..." />
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-20 bg-[#F5EDE1]/50 rounded-2xl border border-[#E8DEC8] p-8 space-y-3">
            <BookOpen className="w-12 h-12 text-[#8C4A32]/60 mx-auto" />
            <h3 className="text-lg font-bold text-[#2C2621]">কোনো বই পাওয়া যায়নি</h3>
            <p className="text-xs text-[#7A6B5D]">
              {searchQuery ? 'আপনার খোঁজার সাথে মেলে এমন কোনো বই নেই।' : 'শীঘ্রই নতুন বাংলা বই এবং পিডিএফ সংস্করণ যুক্ত করা হবে।'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="bg-[#FAF7F2] rounded-2xl border border-[#DFD3C2] hover:border-[#8C4A32]/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Book Cover Banner */}
                <div className="relative h-64 sm:h-72 bg-[#EFE6D8] overflow-hidden flex items-center justify-center p-4">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="w-44 sm:w-48 h-full object-cover rounded-lg shadow-xl group-hover:scale-105 transition-transform duration-500 border border-[#DFCBB5]"
                      loading="lazy"
                    />
                  ) : (
                    /* Default Book Cover Mockup */
                    <div className="w-44 sm:w-48 h-56 bg-gradient-to-br from-[#8C4A32] to-[#5C2B1C] rounded-lg shadow-xl p-5 text-white flex flex-col justify-between border-l-4 border-amber-300/40">
                      <div>
                        <span className="text-[10px] tracking-widest uppercase text-amber-200/90 block mb-1">
                          {book.category}
                        </span>
                        <h3 className="text-base font-bold leading-snug line-clamp-3">
                          {book.title}
                        </h3>
                      </div>
                      <div className="text-xs text-amber-100/80 border-t border-amber-200/20 pt-2">
                        {book.author}
                      </div>
                    </div>
                  )}

                  {/* Badge */}
                  <div className="absolute top-3 right-3 bg-[#FAF7F2]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#8C4A32] shadow-sm border border-[#DFCBB5]">
                    {book.category}
                  </div>
                </div>

                {/* Book Content Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-[#7A6B5D]">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{book.publicationYear || '২০২৬'}</span>
                      </span>
                      {book.pageCount ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{book.pageCount} পৃষ্ঠা</span>
                          </span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span>{book.downloadCount} ডাউনলোড</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#2C2621] group-hover:text-[#8C4A32] transition-colors leading-snug line-clamp-2">
                      {book.title}
                    </h2>

                    <p className="text-xs text-[#5A4F44] leading-relaxed line-clamp-3">
                      {book.description || 'একাকীত্ব, প্রকৃতি ও মানবমনের গভীর অনুভূতির সংকলিত ই-বুক সংস্করণ।'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#E8DEC8] flex items-center justify-between gap-2">
                    <button
                      onClick={() => setActiveReadingBook(book)}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#8C4A32] text-white text-xs sm:text-sm font-semibold hover:bg-[#723924] transition-colors shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>অনলাইনে পড়ুন</span>
                    </button>

                    <button
                      onClick={(e) => handleDownload(book, e)}
                      className="inline-flex items-center justify-center space-x-1 py-2 px-3 rounded-xl bg-[#F2E8DC] text-[#4A3B2C] hover:bg-[#E8DCCF] text-xs sm:text-sm font-medium transition-colors border border-[#DFCBB5]"
                      title="পিডিএফ ফাইল ডাউনলোড করুন"
                    >
                      {downloadSuccessId === book.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {downloadSuccessId === book.id ? 'শুরু হয়েছে' : 'পিডিএফ'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive PDF Reader Modal */}
      {activeReadingBook && (
        <PdfReaderModal
          book={activeReadingBook}
          onClose={() => setActiveReadingBook(null)}
        />
      )}
    </div>
  );
};
