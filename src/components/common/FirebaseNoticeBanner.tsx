import React, { useState } from 'react';
import { Info, ExternalLink, X, Settings } from 'lucide-react';
import { useAuth } from '../../firebase/authContext';

interface FirebaseNoticeBannerProps {
  navigate: (path: string) => void;
}

export const FirebaseNoticeBanner: React.FC<FirebaseNoticeBannerProps> = ({ navigate }) => {
  const { isConfigured } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (isConfigured || dismissed) {
    return null;
  }

  return (
    <div className="bg-[#FAF3E7] border-b border-[#E8D6BD] text-[#4A3B2C] px-4 py-2.5 text-xs font-serif-bn transition-all">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-[#8C4A32] shrink-0" />
          <span>
            <strong>ফায়ারবেস কনফিগারেশন মোড:</strong> আপনার প্রকল্পটিতে ক্লাউড ফায়ারস্টোর যুক্ত করতে <code className="bg-[#EDE2CE] px-1 py-0.5 rounded text-[11px]">.env</code> ফাইলে ফায়ারবেস কী প্রদান করুন।
          </span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => navigate('/admin')}
            className="text-[#8C4A32] underline hover:text-[#692A15] font-medium"
          >
            সেটআপ গাইড দেখুন
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[#7A6B5D] hover:text-[#2C2621]"
            aria-label="বিজ্ঞপ্তি বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
