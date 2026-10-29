import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2, Heart, User, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { Comment } from '../../types';
import { getPostComments, submitReaderComment } from '../../services/literatureService';

interface CommentsSectionProps {
  postId: string;
  postTitle?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, postTitle }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readerName, setReaderName] = useState('');
  const [readerEmail, setReaderEmail] = useState('');
  const [content, setContent] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getPostComments(postId, false);
      setComments(data);
    } catch (err) {
      console.warn('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();

    const handleUpdate = (e: any) => {
      if (e.detail?.type === 'comment') {
        loadComments();
      }
    };
    window.addEventListener('literature_updated', handleUpdate);
    return () => window.removeEventListener('literature_updated', handleUpdate);
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার অনুভূতি বা মন্তব্য লিখুন');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await submitReaderComment(postId, {
        readerName: readerName.trim() || 'সুধী পাঠক',
        readerEmail: readerEmail.trim() || undefined,
        content: content.trim(),
      });

      setSubmittedSuccess(true);
      setContent('');
      setReaderEmail('');
      // Reload comments in case an admin auto-approved
      loadComments();
    } catch (err: any) {
      setErrorMessage(err?.message || 'মন্তব্য পাঠাতে সমস্যা হয়েছে, আবার চেষ্টা করুন');
    } finally {
      setSubmitting(false);
    }
  };

  const formatBanglaDate = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const toBn = (num: number) =>
      num.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)]);

    if (minutes < 5) return 'এইমাত্র';
    if (minutes < 60) return `${toBn(minutes)} মিনিট আগে`;
    if (hours < 24) return `${toBn(hours)} ঘণ্টা আগে`;
    if (days === 1) return 'গতকাল';
    if (days < 30) return `${toBn(days)} দিন আগে`;

    return new Date(timestamp).toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <section className="mt-14 pt-10 border-t border-amber-900/10 dark:border-amber-100/10 max-w-3xl mx-auto">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-800 dark:text-amber-300">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              পাঠক প্রতিক্রিয়া ও অনুভূতি
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-sans font-medium">
                {comments.length.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d, 10)])}
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
              লগইন ছাড়াই আপনার ভাবনা বা মুগ্ধতা নিঃসংকোচে ভাগ করে নিন
            </p>
          </div>
        </div>
      </div>

      {/* Submission Form Card */}
      <div className="bg-stone-50 dark:bg-stone-900/60 border border-amber-900/10 dark:border-amber-100/10 rounded-2xl p-5 sm:p-7 shadow-sm mb-10 transition-all">
        {submittedSuccess ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-5 text-center transition-all animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif font-bold text-lg text-emerald-900 dark:text-emerald-200 mb-1">
              আপনার অনুভূতির জন্য আন্তরিক ধন্যবাদ!
            </h4>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
              আপনার মূল্যবান মন্তব্যটি সরাসরি প্রকাশিত হয়েছে এবং অ্যাডমিন প্যানেলে সংরক্ষিত হয়েছে। অন্য পাঠকেরা এটি দেখতে পারবেন।
            </p>
            <button
              onClick={() => setSubmittedSuccess(false)}
              className="mt-4 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
            >
              আরেকটি মন্তব্য লিখুন
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{postTitle ? `"${postTitle}" সম্পর্কে আপনার অনুভূতি লিখুন` : 'আপনার মুক্ত অভিব্যক্তি ব্যক্ত করুন'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  আপনার নাম (ঐচ্ছিক)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={readerName}
                    onChange={(e) => setReaderName(e.target.value)}
                    placeholder="সুধী পাঠক"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    maxLength={60}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  ইমেইল (ঐচ্ছিক, প্রকাশ করা হবে না)
                </label>
                <input
                  type="email"
                  value={readerEmail}
                  onChange={(e) => setReaderEmail(e.target.value)}
                  placeholder="reader@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                আপনার অনুভূতি বা মন্তব্য <span className="text-amber-700 dark:text-amber-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="রচনার কোন অংশটি আপনার হৃদয় ছুঁয়েছে? আপনার ভাবনা এখানে তুলে ধরুন..."
                rows={3}
                required
                maxLength={1000}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 leading-relaxed resize-y"
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-stone-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  সবার জন্য প্রকাশিত হবে ও লেখক কর্তৃক পর্যবেক্ষণযোগ্য
                </span>
                <span>{content.length}/১০০০</span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-800 hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>অনুভূতি পাঠান</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-8 text-center text-stone-400 text-sm">
            <div className="w-6 h-6 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-2" />
            মন্তব্য লোড হচ্ছে...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
            <Heart className="w-8 h-8 text-amber-800/30 dark:text-amber-400/30 mx-auto mb-2" />
            <p className="font-serif text-stone-700 dark:text-stone-300 font-medium">
              এখনো কোনো পাঠক অনুভূতি ব্যক্ত করেননি
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              প্রথম মন্তব্যটি করে লেখকের সৃষ্টিশীল অনুপ্রেরণা বাড়িয়ে দিন।
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 sm:p-5 rounded-xl border border-amber-900/10 dark:border-amber-100/10 bg-white dark:bg-stone-900/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-900 dark:to-stone-800 flex items-center justify-center font-serif text-amber-900 dark:text-amber-200 font-bold text-sm shadow-inner">
                    {comment.readerName ? comment.readerName.charAt(0) : 'প'}
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-stone-900 dark:text-stone-100">
                      {comment.readerName || 'সুধী পাঠক'}
                    </h5>
                    <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatBanglaDate(comment.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="font-serif text-stone-800 dark:text-stone-200 text-sm sm:text-base leading-relaxed pl-10 whitespace-pre-line">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
