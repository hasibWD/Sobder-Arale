import React, { useState } from 'react';
import { X, Download, Maximize2, Minimize2, ExternalLink, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Book } from '../../types';
import { incrementBookDownload } from '../../services/literatureService';

interface PdfReaderModalProps {
  book: Book;
  onClose: () => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({ book, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await incrementBookDownload(book.id);

      // Trigger download
      const link = document.createElement('a');
      link.href = book.pdfUrl;
      link.download = `${book.slug || 'book'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('Download error:', e);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-fadeIn font-serif-bn">
      <div
        className={`bg-[#FAF7F2] rounded-2xl shadow-2xl flex flex-col border border-[#DFD3C2] overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[90vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#F2E8DC] border-b border-[#DFCBB5] flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#8C4A32] text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-base sm:text-lg font-bold text-[#2C2621] truncate leading-tight">
                {book.title}
              </h2>
              <p className="text-xs text-[#7A6B5D] truncate">
                {book.author} • {book.category} • {book.publicationYear}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-[#8C4A32] text-white rounded-lg hover:bg-[#723924] transition-colors shadow-sm disabled:opacity-75"
              title="পিডিএফ ডাউনলোড করুন"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isDownloading ? 'ডাউনলোড হচ্ছে...' : 'ডাউনলোড'}
              </span>
            </button>

            <a
              href={book.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-[#5A4F44] hover:text-[#2C2621] hover:bg-[#E8DCCF] rounded-lg transition-colors hidden sm:flex"
              title="নতুন ট্যাবে খুলুন"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-[#5A4F44] hover:text-[#2C2621] hover:bg-[#E8DCCF] rounded-lg transition-colors hidden md:flex"
              title={isFullscreen ? 'ছোট করুন' : 'পূর্ণপর্দা'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#5A4F44] hover:text-[#8C4A32] hover:bg-[#E8DCCF] rounded-lg transition-colors"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Viewport */}
        <div className="flex-1 bg-[#2C2621] relative overflow-hidden flex flex-col items-center justify-center">
          {hasError ? (
            <div className="max-w-md mx-auto p-6 bg-[#FAF7F2] rounded-2xl text-center space-y-4 border border-[#DFCBB5] m-4">
              <AlertCircle className="w-12 h-12 text-[#8C4A32] mx-auto" />
              <h3 className="text-lg font-bold text-[#2C2621]">
                ব্রাউজারে সরাসরি প্রিভিউ লোড করা যায়নি
              </h3>
              <p className="text-xs text-[#7A6B5D] leading-relaxed">
                কিছু মোবাইল ডিভাইস বা ব্রাউজারে ইনলাইন পিডিএফ লোড সমর্থিত নয়। আপনি নিচের বাটনে ক্লিক করে সরাসরি পিডিএফ ফাইলটি নতুন উইন্ডোতে পড়তে বা ডাউনলোড করতে পারেন।
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <a
                  href={book.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#8C4A32] text-white rounded-xl text-sm font-medium hover:bg-[#723924] transition-colors"
                >
                  সরাসরি ব্রাউজারে খুলুন
                </a>
                <button
                  onClick={() => setHasError(false)}
                  className="px-4 py-2 bg-[#F2E8DC] text-[#4A3B2C] rounded-xl text-sm font-medium hover:bg-[#E8DCCF] transition-colors flex items-center justify-center space-x-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> পুনরায় চেষ্টা
                </button>
              </div>
            </div>
          ) : (
            <iframe
              src={`${book.pdfUrl}#toolbar=1&navpanes=0`}
              title={book.title}
              className="w-full h-full border-none bg-white"
              onError={() => setHasError(true)}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="px-5 py-2.5 bg-[#FAF7F2] border-t border-[#E8DEC8] flex items-center justify-between text-xs text-[#7A6B5D]">
          <span>
            {book.pageCount ? `মোট ${book.pageCount} পৃষ্ঠা • ` : ''}
            {book.fileSizeBytes ? `${(book.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'পিডিএফ সংস্করণ'}
          </span>
          <span>
            সর্বমোট ডাউনলোড: <strong className="text-[#8C4A32]">{book.downloadCount}</strong> বার
          </span>
        </div>
      </div>
    </div>
  );
};
