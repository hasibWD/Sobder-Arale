import React from 'react';
import { Feather, Heart, ExternalLink, Shield } from 'lucide-react';
import { toBengaliNumber } from '../../utils/bengaliUtils';

interface FooterProps {
  navigate: (path: string) => void;
  authorName?: string;
}

export const Footer: React.FC<FooterProps> = ({ navigate, authorName = 'শব্দের কারিগর' }) => {
  const currentYear = toBengaliNumber(new Date().getFullYear());

  return (
    <footer className="bg-[#F3ECE1] border-t border-[#DFD3C2] text-[#4A3F35] mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Literary Quote & Brand */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-2 text-[#8C4A32]">
              <Feather className="w-5 h-5 transform -rotate-12" />
              <h3 className="font-serif-bn text-xl font-bold tracking-tight text-[#2C2621]">
                শব্দের আড়ালে
              </h3>
            </div>
            <p className="font-serif-bn text-lg text-[#5A4B3D] italic leading-relaxed border-l-2 border-[#8C4A32]/40 pl-4 py-1">
              "কিছু অনুভূতি শব্দেই বেঁচে থাকে… নিঃশব্দ হৃদয়ের গভীর আর্তি যখন অক্ষরের সাজে মূর্ত হয়।"
            </p>
            <p className="text-sm text-[#736353] font-serif-bn leading-relaxed">
              এটি লেখকের একটি নিভৃত সাহিত্য নীড়। এখানে প্রকাশিত সমস্ত কবিতা, উপন্যাস ও ছোটগল্প স্বত্বাধিকারীর ব্যক্তিগত সৃষ্টি।
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-serif-bn text-sm font-semibold uppercase tracking-wider text-[#2C2621]">
              সূচিপত্র
            </h4>
            <ul className="space-y-2 text-sm font-serif-bn">
              <li>
                <button
                  onClick={() => navigate('/poems')}
                  className="hover:text-[#8C4A32] transition-colors"
                >
                  কবিতাগুচ্ছ
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/novels')}
                  className="hover:text-[#8C4A32] transition-colors"
                >
                  উপন্যাস ও অধ্যায়
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/stories')}
                  className="hover:text-[#8C4A32] transition-colors"
                >
                  ছোটগল্প সম্ভার
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/about')}
                  className="hover:text-[#8C4A32] transition-colors"
                >
                  লেখক সম্পর্কিত তথ্য
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/search')}
                  className="hover:text-[#8C4A32] transition-colors"
                >
                  লেখা অনুসন্ধান
                </button>
              </li>
            </ul>
          </div>

          {/* Author & Admin Zone */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="font-serif-bn text-sm font-semibold uppercase tracking-wider text-[#2C2621]">
              লেখক ও পরিচালনা
            </h4>
            <p className="text-sm font-serif-bn text-[#6A5A4A] leading-relaxed">
              শুধুমাত্র স্বত্বাধিকারী এই পোর্টালে নতুন সৃষ্টি প্রকাশ করেন। পাঠকেরা কোনো অ্যাকাউন্ট বা সাইন-ইন ছাড়াই নির্বিঘ্নে সমস্ত লেখা পড়তে পারবেন।
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center space-x-2 text-xs font-serif-bn px-3 py-1.5 rounded border border-[#CDBEAA] bg-[#FAF7F2] text-[#5A4B3D] hover:border-[#8C4A32] hover:text-[#8C4A32] transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-[#8C4A32]" />
                <span>লেখক ড্যাশবোর্ড ও ব্যবস্থাপনা</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div className="mt-12 pt-8 border-t border-[#DFD3C2] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A6B5D] font-serif-bn gap-4">
          <p>© {currentYear} শব্দের আড়ালে। সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="flex items-center gap-1.5">
            শব্দ ও সাহিত্যের প্রতি ভালোবাসায় তৈরি
            <Heart className="w-3.5 h-3.5 text-[#8C4A32] fill-current" />
          </p>
        </div>
      </div>
    </footer>
  );
};
