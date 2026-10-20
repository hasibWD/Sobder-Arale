const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(num: number | string): string {
  if (num === undefined || num === null) return '';
  return String(num).replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)]);
}

const bengaliMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function formatBengaliDate(timestamp?: number | null): string {
  if (!timestamp) return 'অজানা তারিখ';
  const date = new Date(timestamp);
  const day = toBengaliNumber(date.getDate());
  const month = bengaliMonths[date.getMonth()];
  const year = toBengaliNumber(date.getFullYear());
  return `${day} ${month}, ${year}`;
}

export function calculateBengaliReadingTime(text: string): { minutes: number; text: string } {
  if (!text) return { minutes: 1, text: '১ মিনিট পাঠ' };
  // Average reading speed in Bengali is about 150-180 words per minute
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 160));
  return {
    minutes,
    text: `${toBengaliNumber(minutes)} মিনিট পাঠ`,
  };
}

export function generateSlug(title: string): string {
  if (!title) return `post-${Date.now()}`;
  // Keep Bengali letters, English letters, digits, and replace spaces with hyphens
  const clean = title
    .trim()
    .toLowerCase()
    .replace(/[^\u0980-\u09FFa-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return clean.slice(0, 100) || `writing-${Date.now()}`;
}

export function getPostTypeLabel(type: string): string {
  switch (type) {
    case 'poem':
      return 'কবিতা';
    case 'story':
      return 'ছোটগল্প';
    case 'essay':
      return 'ব্যক্তিগত রচনা';
    case 'novel':
      return 'উপন্যাস';
    default:
      return 'সাহিত্য';
  }
}

export function getStatusLabel(status: string): { label: string; colorClass: string } {
  switch (status) {
    case 'published':
      return { label: 'প্রকাশিত', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'draft':
      return { label: 'খসড়া', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'ongoing':
      return { label: 'চলমান', colorClass: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'completed':
      return { label: 'সমাপ্ত', colorClass: 'bg-stone-100 text-stone-700 border-stone-300' };
    default:
      return { label: status, colorClass: 'bg-stone-50 text-stone-600 border-stone-200' };
  }
}
