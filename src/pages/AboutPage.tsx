import React, { useEffect, useState } from 'react';
import { AuthorProfile } from '../types';
import { getAuthorProfile } from '../services/literatureService';
import { useAuth } from '../supabase/authContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Feather, Mail, Globe, MapPin, Sparkles, BookOpen, Edit } from 'lucide-react';

interface AboutPageProps {
  navigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  const { isAdmin } = useAuth();
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAuthor() {
      try {
        setLoading(true);
        const data = await getAuthorProfile();
        if (isMounted) {
          setAuthor(data);
        }
      } catch (err) {
        console.error('Error fetching author profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAuthor();

    const handleLiteratureUpdated = (e: any) => {
      if (!e.detail || e.detail.type === 'author') {
        loadAuthor();
      }
    };

    window.addEventListener('literature_updated', handleLiteratureUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('literature_updated', handleLiteratureUpdated);
    };
  }, []);

  if (loading) {
    return <LoadingSpinner message="লেখক পরিচিতি উন্মোচন করা হচ্ছে..." />;
  }

  // If author profile has not been set yet, show graceful placeholder
  const isDefaultProfile = !author || (!author.bio && !author.displayName);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-3 border-b border-[#E8DEC8] pb-8">
        <div className="inline-flex items-center space-x-2 text-[#8C4A32] text-xs font-serif-bn">
          <Feather className="w-4 h-4 transform -rotate-12" />
          <span>অক্ষরের পেছনের মানুষটি</span>
        </div>
        <h1 className="font-serif-bn text-3xl sm:text-5xl font-bold text-[#2C2621]">
          লেখক পরিচিতি
        </h1>
        <p className="font-serif-bn text-sm sm:text-base text-[#6F6052] max-w-xl mx-auto">
          শব্দের বাঁধনে অনুভূতিদের বুনে চলার এক নিঃসঙ্গ অভিযাত্রী।
        </p>
        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-1.5 rounded-full border border-[#8C4A32] text-[#8C4A32] bg-white font-serif-bn text-xs font-semibold hover:bg-[#F2E8DC] transition-colors inline-flex items-center space-x-1.5 shadow-sm"
              title="লেখক পরিচিতি ও ছবি সম্পাদনা করুন"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>পরিচিতি তথ্য সম্পাদনা করুন (অ্যাডমিন)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Author Showcase */}
      <div className="bg-[#FAF7F2] rounded-3xl border border-[#DFD3C2] p-8 sm:p-12 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
          {/* Author Photo or Literary Avatar */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#EFE5D5] border-2 border-[#DFCBB5] shrink-0 overflow-hidden shadow-md flex items-center justify-center text-[#8C4A32]">
            {author?.photoURL ? (
              <img
                src={author.photoURL}
                alt={author.displayName || 'লেখক'}
                className="w-full h-full object-cover"
              />
            ) : (
              <Feather className="w-12 h-12 transform -rotate-12 opacity-80" />
            )}
          </div>

          {/* Author Name and Details */}
          <div className="flex-1 text-center sm:text-left space-y-4">
            <div>
              <h2 className="font-serif-bn text-2xl sm:text-3xl font-bold text-[#2C2621]">
                {author?.displayName || 'শব্দের আড়ালের লেখক'}
              </h2>
              {author?.location && (
                <div className="flex items-center justify-center sm:justify-start space-x-1 text-xs text-[#7A6B5D] font-serif-bn mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{author.location}</span>
                </div>
              )}
            </div>

            {/* Biography */}
            <div className="font-serif-bn text-[#4A3B2C] text-sm sm:text-base leading-relaxed space-y-3">
              {author?.bio ? (
                author.bio.split('\n').map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <div className="p-4 rounded-xl bg-[#F5EDE1] border border-[#DFCBB5] text-xs sm:text-sm text-[#7A6B5D] italic">
                  স্বত্বাধিকারী এখনও তাঁর পূর্ণাঙ্গ জীবনবৃত্তান্ত বা লেখক পরিচিতি যুক্ত করেননি। ড্যাশবোর্ড থেকে "লেখক পরিচিতি ও সেটিংস" ট্যাবে গিয়ে বায়ো, ছবি ও সামাজিক মাধ্যমের লিঙ্ক যুক্ত করা যাবে।
                </div>
              )}
            </div>

            {/* Social & Contact Links if any */}
            {author?.socialLinks && Object.values(author.socialLinks).some(Boolean) && (
              <div className="pt-2 flex items-center justify-center sm:justify-start space-x-3 text-xs font-serif-bn">
                {author.socialLinks.facebook && (
                  <a
                    href={author.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full border border-[#DFCBB5] text-[#5A4B3D] hover:text-[#8C4A32] hover:bg-[#EFE5D5] transition-colors"
                  >
                    ফেসবুক
                  </a>
                )}
                {author.socialLinks.twitter && (
                  <a
                    href={author.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full border border-[#DFCBB5] text-[#5A4B3D] hover:text-[#8C4A32] hover:bg-[#EFE5D5] transition-colors"
                  >
                    টুইটার / এক্স
                  </a>
                )}
                {author.socialLinks.goodreads && (
                  <a
                    href={author.socialLinks.goodreads}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full border border-[#DFCBB5] text-[#5A4B3D] hover:text-[#8C4A32] hover:bg-[#EFE5D5] transition-colors"
                  >
                    গুডরিডস
                  </a>
                )}
                {author.socialLinks.website && (
                  <a
                    href={author.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-full border border-[#DFCBB5] text-[#5A4B3D] hover:text-[#8C4A32] hover:bg-[#EFE5D5] transition-colors flex items-center space-x-1"
                  >
                    <Globe className="w-3 h-3" />
                    <span>ওয়েবসাইট</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Author Philosophy or Literary Manifesto */}
        {author?.philosophy && (
          <div className="pt-8 border-t border-[#E8DEC8] space-y-3">
            <div className="flex items-center space-x-2 text-[#8C4A32]">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-serif-bn text-lg font-bold text-[#2C2621]">
                সাহিত্য চিন্তা ও দর্শন
              </h3>
            </div>
            <p className="font-serif-bn text-sm sm:text-base text-[#5A4B3D] leading-relaxed italic border-l-2 border-[#8C4A32] pl-4 py-1">
              "{author.philosophy}"
            </p>
          </div>
        )}
      </div>

      {/* Reader's invitation */}
      <div className="text-center pt-6 space-y-4">
        <p className="font-serif-bn text-sm text-[#7A6B5D]">
          আমার সাহিত্য সম্ভারের যেকোনো রচনা নির্দ্বিধায় পড়ুন ও অনুভব করুন।
        </p>
        <button
          onClick={() => navigate('/poems')}
          className="px-6 py-2 rounded-xl bg-[#8C4A32] text-white font-serif-bn text-sm hover:bg-[#723925] transition-colors shadow-sm inline-flex items-center space-x-2"
        >
          <BookOpen className="w-4 h-4" />
          <span>কবিতা ও উপন্যাস পড়া শুরু করুন</span>
        </button>
      </div>
    </div>
  );
};
