import React, { useState } from 'react';
import { X, Upload, FileText, Image, Check, AlertCircle, Sparkles, BookOpen } from 'lucide-react';
import { Book } from '../../types';
import { uploadBookPdf, uploadBookCover, saveBook } from '../../services/literatureService';
import { useToast } from '../common/Toast';

interface AdminBookUploadModalProps {
  book?: Book | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminBookUploadModal: React.FC<AdminBookUploadModalProps> = ({
  book,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();
  const isEditing = Boolean(book?.id);

  const [title, setTitle] = useState(book?.title || '');
  const [slug, setSlug] = useState(book?.slug || '');
  const [author, setAuthor] = useState(book?.author || 'শব্দের কারিগর');
  const [category, setCategory] = useState(book?.category || 'উপন্যাস');
  const [publicationYear, setPublicationYear] = useState(book?.publicationYear || '২০২৬');
  const [pageCount, setPageCount] = useState<number>(book?.pageCount || 0);
  const [description, setDescription] = useState(book?.description || '');
  const [status, setStatus] = useState<'published' | 'draft'>(book?.status || 'published');

  // File states
  const [pdfUrl, setPdfUrl] = useState(book?.pdfUrl || '');
  const [pdfKey, setPdfKey] = useState(book?.pdfKey || '');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(book?.fileSizeBytes || 0);
  const [pdfFileName, setPdfFileName] = useState(book?.pdfKey ? book.pdfKey.split('/').pop() : '');

  const [coverImageUrl, setCoverImageUrl] = useState(book?.coverImageUrl || '');
  const [coverImageKey, setCoverImageKey] = useState(book?.coverImageKey || '');

  // Upload progress states
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing || !slug) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated || `book-${Date.now()}`);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMsg('অনুগ্রহ করে একটি বৈধ পিডিএফ (.pdf) ফাইল নির্বাচন করুন।');
      return;
    }

    try {
      setErrorMsg(null);
      setIsUploadingPdf(true);
      setPdfFileName(file.name);

      const result = await uploadBookPdf(file);
      setPdfUrl(result.url);
      setPdfKey(result.key);
      setFileSizeBytes(result.size);

      // Auto-fill title if empty
      if (!title) {
        const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ');
        handleTitleChange(cleanName);
      }

      showToast('পিডিএফ সফলভাবে আপলোড হয়েছে!', 'success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'পিডিএফ আপলোড ব্যর্থ হয়েছে।');
      showToast('পিডিএফ আপলোড ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleCoverFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      setIsUploadingCover(true);
      const result = await uploadBookCover(file);
      setCoverImageUrl(result.url);
      setCoverImageKey(result.key);
      showToast('বইয়ের প্রচ্ছদ ছবি আপলোড হয়েছে!', 'success');
    } catch (err: any) {
      setErrorMsg(err?.message || 'প্রচ্ছদ ছবি আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('বইয়ের শিরোনাম আবশ্যক।');
      return;
    }

    if (!pdfUrl) {
      setErrorMsg('অনুগ্রহ করে বইটির বাংলা পিডিএফ ফাইল আপলোড করুন।');
      return;
    }

    try {
      setIsSaving(true);
      await saveBook(book?.id || null, {
        title: title.trim(),
        slug: slug.trim() || `book-${Date.now()}`,
        author: author.trim() || 'শব্দের কারিগর',
        category,
        publicationYear,
        pageCount: Number(pageCount) || 0,
        description: description.trim(),
        status,
        pdfUrl,
        pdfKey,
        fileSizeBytes,
        coverImageUrl,
        coverImageKey,
      });

      showToast(isEditing ? 'বইয়ের তথ্য আপডেট হয়েছে!' : 'নতুন বই সফলভাবে প্রকাশিত হয়েছে!', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'বই সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1412]/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn font-serif-bn">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#DFD3C2] w-full max-w-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F2E8DC] border-b border-[#DFCBB5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#8C4A32]" />
            <h2 className="text-lg font-bold text-[#2C2621]">
              {isEditing ? 'বইয়ের তথ্য সম্পাদনা' : 'নতুন বই বা বাংলা পিডিএফ আপলোড'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A6B5D] hover:text-[#8C4A32] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. PDF File Upload Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#4A3B2C]">
              বাংলা পিডিএফ ফাইল (.pdf) <span className="text-[#8C4A32]">*</span>
            </label>

            <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
              pdfUrl ? 'border-emerald-400 bg-emerald-50/50' : 'border-[#DFCBB5] hover:border-[#8C4A32] bg-[#F5EDE1]/60'
            }`}>
              {pdfUrl ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 text-left truncate">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-sm text-[#2C2621] truncate flex items-center space-x-1.5">
                        <span className="truncate">{pdfFileName || 'আপলোডকৃত পিডিএফ'}</span>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <span className="text-xs text-[#7A6B5D]">
                        {fileSizeBytes ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                        ইনসফোর্জ ক্লাউড স্টোরেজে সংরক্ষিত
                      </span>
                    </div>
                  </div>

                  <label className="px-3 py-1.5 bg-[#FAF7F2] text-[#4A3B2C] border border-[#DFCBB5] text-xs font-semibold rounded-lg cursor-pointer hover:bg-[#E8DCCF] transition-colors shrink-0">
                    পরিবর্তন করুন
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileSelect}
                      className="hidden"
                      disabled={isUploadingPdf}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-[#8C4A32] mx-auto opacity-80" />
                  <div>
                    <span className="text-sm font-bold text-[#2C2621] block">
                      {isUploadingPdf ? 'পিডিএফ ফাইল আপলোড হচ্ছে...' : 'পিডিএফ ফাইল নির্বাচন করুন'}
                    </span>
                    <span className="text-xs text-[#7A6B5D]">
                      ক্লিক করে আপনার কম্পিউটার বা মোবাইল থেকে বাংলা বইয়ের PDF আপলোড করুন (সর্বোচ্চ ৫০ মেগাবাইট)
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfFileSelect}
                    className="hidden"
                    disabled={isUploadingPdf}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2. Book Cover Image */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#4A3B2C]">
              বইয়ের প্রচ্ছদ ছবি (Cover Image)
            </label>

            <div className="flex gap-4 items-start">
              <div className="w-24 h-32 rounded-xl border border-[#DFCBB5] bg-[#F5EDE1] overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image className="w-8 h-8 text-[#9E9084]" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-1.5 bg-[#F2E8DC] text-[#4A3B2C] border border-[#DFCBB5] text-xs font-semibold rounded-xl cursor-pointer hover:bg-[#E8DCCF] transition-colors inline-flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingCover ? 'আপলোড হচ্ছে...' : 'প্রচ্ছদ আপলোড'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileSelect}
                      className="hidden"
                      disabled={isUploadingCover}
                    />
                  </label>
                  {coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImageUrl('');
                        setCoverImageKey('');
                      }}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="অথবা ছবির অনলাইন লিঙ্ক (URL) দিন..."
                    className="w-full px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
                  />
                </div>
                <p className="text-[11px] text-[#7A6B5D]">
                  প্রচ্ছদ না দিলে স্বয়ংক্রিয়ভাবে একটি মার্জিত ক্লাসিক বাংলা বইয়ের কভার তৈরি হবে।
                </p>
              </div>
            </div>
          </div>

          {/* 3. Book Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
                বইয়ের নাম (Title) <span className="text-[#8C4A32]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="যেমন: মেঘের চিঠি ও অন্যান্য কবিতা"
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
                লেখকের নাম (Author)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="শব্দের কারিগর"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
                গ্রন্থশ্রেণী / ধরন (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
              >
                <option value="উপন্যাস">উপন্যাস</option>
                <option value="কাব্যগ্রন্থ">কাব্যগ্রন্থ</option>
                <option value="গল্প সংকলন">গল্প সংকলন</option>
                <option value="কাব্য ও গদ্য">কাব্য ও গদ্য</option>
                <option value="প্রবন্ধ">প্রবন্ধ</option>
                <option value="দিনলিপি">দিনলিপি / স্মৃতিকথা</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
                  প্রকাশনা সাল
                </label>
                <input
                  type="text"
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(e.target.value)}
                  placeholder="২০২৬"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
                  মোট পৃষ্ঠা
                </label>
                <input
                  type="number"
                  value={pageCount || ''}
                  onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 0)}
                  placeholder="যেমন: ৪৮"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32]"
                />
              </div>
            </div>
          </div>

          {/* 4. Description / Synopsis */}
          <div>
            <label className="block text-xs font-bold text-[#4A3B2C] mb-1">
              বইয়ের সংক্ষিপ্ত ভূমিকা বা বিবরণ (Description)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="বইটি সম্পর্কে সংক্ষিপ্ত আলোচনা বা পাঠকদের উদ্দেশ্যে কিছু কথা..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DFCBB5] rounded-xl text-[#2C2621] focus:outline-none focus:ring-2 focus:ring-[#8C4A32] resize-none"
            />
          </div>

          {/* 5. Status Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#F5EDE1] rounded-xl border border-[#DFCBB5]">
            <div>
              <span className="text-xs font-bold text-[#2C2621] block">প্রকাশনার অবস্থা</span>
              <span className="text-[11px] text-[#7A6B5D]">
                {status === 'published' ? 'পাঠকদের জন্য উন্মুক্ত থাকবে' : 'খসড়া অবস্থায় থাকবে (শুধুমাত্র অ্যাডমিন দেখতে পাবেন)'}
              </span>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-[#DFCBB5] text-[#8C4A32] focus:outline-none focus:ring-1 focus:ring-[#8C4A32]"
            >
              <option value="published">🟢 প্রকাশিত (Published)</option>
              <option value="draft">🟡 খসড়া (Draft)</option>
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8DEC8]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#7A6B5D] hover:text-[#2C2621] rounded-xl transition-colors"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSaving || isUploadingPdf || isUploadingCover}
              className="px-6 py-2 bg-[#8C4A32] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#723924] transition-all shadow-md disabled:opacity-50 flex items-center space-x-2"
            >
              {isSaving && <span className="animate-spin mr-1">⏳</span>}
              <span>{isEditing ? 'পরিবর্তন সংরক্ষণ করুন' : 'বই আপলোড ও প্রকাশ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
